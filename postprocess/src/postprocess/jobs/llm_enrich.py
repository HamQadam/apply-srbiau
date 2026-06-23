"""
Stage-3: LLM enrichment job.

Reads raw_crawl_items WHERE parse_status='needs_llm', sends the raw JSON +
the list of missing fields to the LLM (via LiteLLM), then patches the
already-created course row with the extracted values and marks the item
'done'.

Design principles:
  - Never overwrites fields that already have a value (COALESCE pattern).
  - One row per transaction — a crash doesn't undo bulk work.
  - Rows that the LLM can't help with are marked 'failed' with a reason.
  - The prompt is deliberately minimal: ask only for what's missing.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import psycopg

from ..config import AppConfig
from ..llm_client import LLMClient, LLMClientConfig
from .base import JobArgs

log = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Prompt helpers
# ─────────────────────────────────────────────────────────────────────────────

_FIELD_DESCRIPTIONS: dict[str, str] = {
    "teaching_language": (
        "Main language of instruction. "
        'Return one of: ENGLISH, GERMAN, FRENCH, DUTCH, SPANISH, ITALIAN, '
        'SWEDISH, NORWEGIAN, DANISH, FINNISH, POLISH, CZECH, JAPANESE, CHINESE, KOREAN, OTHER.'
    ),
    "field": (
        "Academic field / discipline of the program (e.g. 'Computer Science', "
        "'Business Administration', 'Mechanical Engineering'). "
        "Return a concise English string."
    ),
    "duration_months": (
        "Program duration in months (integer). "
        "E.g. a 2-year program = 24, a 3-semester program = 18."
    ),
    "tuition_fee_amount": (
        "Annual tuition fee for international students in EUR (integer). "
        "0 if free. null if unknown."
    ),
    "deadline_fall": (
        "Application deadline for fall/winter intake as MM-DD (e.g. '07-15'). "
        "null if unknown."
    ),
    "deadline_spring": (
        "Application deadline for spring/summer intake as MM-DD (e.g. '01-15'). "
        "null if unknown."
    ),
}

_SYSTEM_PROMPT = (
    "You are a data extraction assistant. "
    "Given a raw JSON record of an academic program, extract the requested fields. "
    "Return ONLY a valid JSON object with the requested keys. "
    "Use null for any field you cannot determine. "
    "Do not include any explanation or markdown — just the JSON object."
)


def _build_user_prompt(
    raw_data: dict[str, Any],
    missing_fields: list[str],
) -> str:
    # Only include field descriptions for what's actually missing
    fields_spec = "\n".join(
        f'  "{f}": {_FIELD_DESCRIPTIONS.get(f, "extract this field")}'
        for f in missing_fields
        if f in _FIELD_DESCRIPTIONS  # only ask for fields we know how to describe
    )
    if not fields_spec:
        return ""  # nothing we can usefully ask the LLM for

    # Trim raw_data to avoid blowing up the context window.
    # We keep the most useful keys and drop internal metadata.
    _USEFUL_KEYS = {
        "courseName", "name", "description", "subject", "fieldOfStudy",
        "languages", "programmeDuration", "duration", "tuitionFees", "tuitions",
        "applicationDeadline", "start_months", "type", "field_of_study",
        "academy", "institution",
    }
    trimmed = {k: v for k, v in raw_data.items() if k in _USEFUL_KEYS}

    raw_str = json.dumps(trimmed, ensure_ascii=False, default=str)
    # Hard cap at ~3000 chars to stay well within context limits
    if len(raw_str) > 3000:
        raw_str = raw_str[:3000] + "... (truncated)"

    return (
        f"Extract the following fields from this academic program record:\n"
        f"{fields_spec}\n\n"
        f"Program record (JSON):\n{raw_str}"
    )


# ─────────────────────────────────────────────────────────────────────────────
# Value normalisation
# ─────────────────────────────────────────────────────────────────────────────

_VALID_LANGUAGES = {
    "ENGLISH", "GERMAN", "FRENCH", "DUTCH", "SPANISH", "ITALIAN",
    "SWEDISH", "NORWEGIAN", "DANISH", "FINNISH", "POLISH", "CZECH",
    "JAPANESE", "CHINESE", "KOREAN", "OTHER",
}

import re as _re


def _parse_mmdd(s: Any) -> str | None:
    """Validate and normalise MM-DD string."""
    if not s or not isinstance(s, str):
        return None
    m = _re.match(r"^\s*(\d{1,2})-(\d{1,2})\s*$", s.strip())
    if not m:
        return None
    mm, dd = int(m.group(1)), int(m.group(2))
    if not (1 <= mm <= 12 and 1 <= dd <= 31):
        return None
    return f"{mm:02d}-{dd:02d}"


def _normalise_field_value(field_name: str, raw_value: Any) -> Any:
    """Coerce an LLM-returned value to the type the DB expects."""
    if raw_value is None:
        return None

    if field_name == "teaching_language":
        v = str(raw_value).strip().upper()
        return v if v in _VALID_LANGUAGES else None

    if field_name == "field":
        v = str(raw_value).strip()
        return v[:200] if v else None  # varchar(200) in schema

    if field_name == "duration_months":
        try:
            return int(raw_value)
        except (TypeError, ValueError):
            return None

    if field_name == "tuition_fee_amount":
        try:
            return int(float(str(raw_value)))
        except (TypeError, ValueError):
            return None

    if field_name in ("deadline_fall", "deadline_spring"):
        # LLM returns MM-DD; we need to convert to a full date using
        # next_occurrence logic from the existing deadline parser
        mmdd = _parse_mmdd(str(raw_value))
        if mmdd is None:
            return None
        # Return as "MM-DD" string; the caller will expand to a date
        return mmdd

    return raw_value


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────────────────

def _next_occurrence_date(mm: int, dd: int):
    """Return the next future date for mm-dd (reuse deadline parser logic)."""
    from datetime import date
    today = date.today()
    for y in range(today.year, today.year + 3):
        try:
            candidate = date(y, mm, dd)
            if candidate >= today:
                return candidate
        except ValueError:
            continue
    return None


def _patch_course(
    cur: psycopg.Cursor,
    course_id: int,
    extracted: dict[str, Any],
) -> int:
    """
    Apply extracted values to the course row using COALESCE so we never
    overwrite existing data.  Returns the number of fields actually patched.
    """
    # Build per-field COALESCE update
    set_parts: list[str] = []
    vals: list[Any] = []

    for field_name, value in extracted.items():
        if value is None:
            continue

        actual_value = value

        # Convert deadline MM-DD strings to full dates
        if field_name in ("deadline_fall", "deadline_spring") and isinstance(value, str):
            m = _re.match(r"^(\d{2})-(\d{2})$", value)
            if m:
                actual_value = _next_occurrence_date(int(m.group(1)), int(m.group(2)))
            if actual_value is None:
                continue

        set_parts.append(f"{field_name} = COALESCE({field_name}, %s)")
        vals.append(actual_value)

    if not set_parts:
        return 0

    vals.append(course_id)
    set_sql = ", ".join(set_parts) + ", updated_at = NOW()"
    cur.execute(
        f"UPDATE courses SET {set_sql} WHERE id = %s",
        vals,
    )
    return len(set_parts)


def _mark_done(
    cur: psycopg.Cursor,
    raw_item_id: int,
    error: str | None = None,
    status: str = "done",
) -> None:
    cur.execute(
        """
        UPDATE raw_crawl_items
        SET parse_status = %s,
            parse_error  = %s,
            parsed_at    = NOW()
        WHERE id = %s
        """,
        (status, error, raw_item_id),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Job
# ─────────────────────────────────────────────────────────────────────────────

class LLMEnrichJob:
    name = "llm-enrich"

    def __init__(self, cfg: AppConfig) -> None:
        self.cfg = cfg
        llm_cfg = LLMClientConfig.from_env()
        self.llm = LLMClient(llm_cfg)

    def _select_one(
        self,
        cur: psycopg.Cursor,
        lock: bool,
    ) -> tuple[int, str, str, dict, list[str], int | None] | None:
        """
        Fetch one needs_llm row.
        Returns (id, source, source_id, raw_data, missing_fields, course_id).
        """
        lock_clause = "FOR UPDATE SKIP LOCKED" if lock else ""
        cur.execute(
            f"""
            SELECT id, source, source_id, raw_data, missing_fields, course_id
            FROM raw_crawl_items
            WHERE parse_status = 'needs_llm'
              AND course_id IS NOT NULL
            ORDER BY id
            LIMIT 1
            {lock_clause}
            """
        )
        row = cur.fetchone()
        if not row:
            return None

        rid, source, source_id, raw_data, missing_fields, course_id = row

        if isinstance(raw_data, str):
            raw_data = json.loads(raw_data)
        if isinstance(missing_fields, str):
            missing_fields = json.loads(missing_fields)
        if missing_fields is None:
            missing_fields = []

        return rid, source, source_id, raw_data, missing_fields, course_id

    def run(self, conn: psycopg.Connection, args: JobArgs) -> int:
        if not self.llm.cfg.enabled:
            log.info("LLM is disabled (LITELLM_ENABLED=false) — skipping llm-enrich job.")
            return 0

        processed = 0
        enriched = 0

        while processed < args.max_rows:
            try:
                with conn.transaction():
                    with conn.cursor() as cur:
                        result = self._select_one(cur, lock=self.cfg.lock_rows)
                        if not result:
                            break

                        (
                            raw_item_id, source, source_id,
                            raw_data, missing_fields, course_id,
                        ) = result
                        processed += 1

                        # Filter to only fields we can usefully ask the LLM about
                        askable = [
                            f for f in missing_fields
                            if f in _FIELD_DESCRIPTIONS
                        ]
                        if not askable:
                            _mark_done(
                                cur, raw_item_id,
                                error="No LLM-enrichable fields remaining",
                            )
                            log.debug(
                                "[id=%s] No askable fields in missing_fields=%s — marking done",
                                raw_item_id, missing_fields,
                            )
                            continue

                        user_prompt = _build_user_prompt(raw_data, askable)
                        if not user_prompt:
                            _mark_done(
                                cur, raw_item_id,
                                error="Could not build LLM prompt",
                            )
                            continue

                        if args.dry_run:
                            log.info(
                                "[DRY id=%s source=%s] would ask LLM for fields=%s",
                                raw_item_id, source, askable,
                            )
                            continue

                        # Call LLM
                        messages = [
                            {"role": "system", "content": _SYSTEM_PROMPT},
                            {"role": "user", "content": user_prompt},
                        ]
                        llm_result = self.llm.extract_json(messages)

                        if not llm_result:
                            _mark_done(
                                cur, raw_item_id,
                                status="failed",
                                error="LLM returned no usable JSON",
                            )
                            log.warning(
                                "[id=%s source=%s] LLM returned no JSON",
                                raw_item_id, source,
                            )
                            continue

                        # Normalise extracted values
                        extracted: dict[str, Any] = {}
                        for field_name in askable:
                            raw_val = llm_result.get(field_name)
                            normalised = _normalise_field_value(field_name, raw_val)
                            if normalised is not None:
                                extracted[field_name] = normalised

                        if not extracted:
                            _mark_done(
                                cur, raw_item_id,
                                error="LLM response had no valid values after normalisation",
                            )
                            log.warning(
                                "[id=%s source=%s] LLM gave zero normalisable values. raw=%s",
                                raw_item_id, source, llm_result,
                            )
                            continue

                        # Patch the course row
                        patched = _patch_course(cur, course_id, extracted)

                        _mark_done(
                            cur, raw_item_id,
                            error=f"llm extracted {patched} field(s): {list(extracted.keys())}",
                        )

                        log.info(
                            "[id=%s source=%s course_id=%s] LLM patched %d field(s): %s",
                            raw_item_id, source, course_id,
                            patched, list(extracted.keys()),
                        )
                        enriched += 1

            except Exception as e:
                log.exception(
                    "Unexpected error processing row (continuing). error=%s",
                    type(e).__name__,
                )
                continue

        if args.dry_run:
            log.info("Dry-run complete. processed=%s", processed)
        else:
            log.info("Job complete. processed=%s enriched=%s", processed, enriched)

        return enriched
