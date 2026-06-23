"""
Stage-2: Lexical parse job.

Reads raw_crawl_items WHERE parse_status='pending', runs the appropriate
source transformer, and either:
  - Upserts university + course rows (parse_status → 'parsed')
  - Flags the row for LLM processing (parse_status → 'needs_llm')

The existing `deadlines` job still runs afterwards to fill in
deadline_fall / deadline_spring from deadline_notes, so we don't need to
fully resolve dates here — we just store what we can.

University deduplication uses the same fuzzy-match logic that was previously
in the crawler's PgStore (rapidfuzz ratio >= 90 for universities, >= 92 for
courses), preserving the wise-patch behaviour (never overwrite existing data).
"""
from __future__ import annotations

import json
import logging
import re
import time
from dataclasses import dataclass, field
from typing import Any, Optional

import psycopg

from ..config import AppConfig
from .base import JobArgs
from ..transformers import get_transformer, ParsedItem

log = logging.getLogger(__name__)

# Columns we never try to insert/update directly (handled by DB/constraints)
_SKIP_COLS = frozenset({"id", "created_at", "university_id"})


# ─────────────────────────────────────────────────────────────────────────────
# Fuzzy match helpers  (mirror of what was in crawlers/db.py)
# ─────────────────────────────────────────────────────────────────────────────

def _norm(s: str) -> str:
    s = (s or "").strip().lower()
    return re.sub(r"\s+", " ", s)


def _fuzzy_best(
    needle: str,
    candidates: list[dict[str, Any]],
    key: str = "name",
    min_score: int = 85,
) -> dict[str, Any] | None:
    try:
        from rapidfuzz import fuzz
    except ImportError:
        needle_n = _norm(needle)
        for c in candidates:
            if _norm(c.get(key, "")) == needle_n:
                return c
        return None

    needle_n = _norm(needle)
    best = None
    best_score = 0
    for c in candidates:
        score = fuzz.ratio(needle_n, _norm(c.get(key, "")))
        if score > best_score and score >= min_score:
            best, best_score = c, score
    return best


def _wise_patch(existing: dict[str, Any], new: dict[str, Any]) -> dict[str, Any]:
    """
    Build a patch dict that only fills empty fields or refreshes certain
    mutable fields.  Never overwrites data that already exists.
    """
    patch: dict[str, Any] = {}
    for k, v in new.items():
        if v is None:
            continue
        old = existing.get(k)
        if old in (None, "", [], {}):
            patch[k] = v
        elif k in ("notes", "deadline_notes", "program_url", "application_url"):
            if isinstance(v, str) and isinstance(old, str) and v.strip() != old.strip():
                patch[k] = v
    return patch


# ─────────────────────────────────────────────────────────────────────────────
# DB helpers
# ─────────────────────────────────────────────────────────────────────────────

def _build_set_clause(keys: list[str]) -> str:
    return ", ".join(f"{k} = %s" for k in keys)


def _upsert_university(
    cur: psycopg.Cursor,
    payload: dict[str, Any],
) -> int:
    """Fuzzy-match or insert university.  Returns university id."""
    name = payload.get("name") or "Unknown"
    country = payload.get("country") or "Unknown"

    cur.execute(
        """
        SELECT id, name, country, city, website, logo_url
        FROM universities
        WHERE country = %s AND name ILIKE %s
        ORDER BY id DESC LIMIT 30
        """,
        (country, f"%{name[:40]}%"),
    )
    candidates = [dict(zip([d[0] for d in cur.description], row)) for row in cur.fetchall()]
    best = _fuzzy_best(name, candidates, key="name", min_score=90)

    if best:
        uni_id = int(best["id"])
        patch = _wise_patch(best, payload)
        if patch:
            patch["updated_at"] = "NOW()"
            keys = [k for k in patch if k != "updated_at"]
            vals = [patch[k] for k in keys]
            set_sql = ", ".join(f"{k} = %s" for k in keys) + ", updated_at = NOW()"
            cur.execute(
                f"UPDATE universities SET {set_sql} WHERE id = %s",
                (*vals, uni_id),
            )
        return uni_id

    # Insert
    clean = {k: v for k, v in payload.items() if k not in _SKIP_COLS and v is not None}
    cols = list(clean.keys())
    vals = [clean[k] for k in cols]
    ph = ", ".join(["%s"] * len(vals))
    cur.execute(
        f"INSERT INTO universities ({', '.join(cols)}, created_at, updated_at) "
        f"VALUES ({ph}, NOW(), NOW()) RETURNING id",
        vals,
    )
    row = cur.fetchone()
    return int(row[0])


def _source_id_from_notes(notes: str | None, source: str) -> str | None:
    """Extract e.g. daad_course_id=12345 or studyinnl_id=abc from a notes string."""
    if not notes:
        return None
    patterns = [
        rf"{source}_course_id=(\S+)",
        rf"{source}_id=(\S+)",
        r"daad_course_id=(\S+)",
        r"studyinnl_id=(\S+)",
    ]
    for pat in patterns:
        m = re.search(pat, notes)
        if m:
            return m.group(1)
    return None


def _upsert_course(
    cur: psycopg.Cursor,
    payload: dict[str, Any],
    university_id: int,
    source: str,
) -> int:
    """Fuzzy-match or insert course.  Returns course id."""
    name = payload.get("name") or "Unknown"
    degree_level = (payload.get("degree_level") or "MASTER").upper()
    notes = payload.get("notes") or ""

    # 1) Exact match by source id in notes
    src_id = _source_id_from_notes(notes, source)
    if src_id:
        cur.execute(
            "SELECT * FROM courses WHERE notes ILIKE %s LIMIT 1",
            (f"%{src_id}%",),
        )
        row = cur.fetchone()
        if row:
            existing = dict(zip([d[0] for d in cur.description], row))
            cid = int(existing["id"])
            patch = _wise_patch(existing, {**payload, "university_id": university_id})
            if patch:
                keys = list(patch.keys())
                vals = [patch[k] for k in keys]
                set_sql = ", ".join(f"{k} = %s" for k in keys) + ", updated_at = NOW()"
                cur.execute(
                    f"UPDATE courses SET {set_sql} WHERE id = %s",
                    (*vals, cid),
                )
            return cid

    # 2) Fuzzy match by name
    cur.execute(
        """
        SELECT id, name, degree_level, university_id, notes
        FROM courses
        WHERE degree_level = %s AND university_id = %s
          AND name ILIKE %s
        ORDER BY id DESC LIMIT 40
        """,
        (degree_level, university_id, f"%{name[:50]}%"),
    )
    candidates = [dict(zip([d[0] for d in cur.description], row)) for row in cur.fetchall()]
    best = _fuzzy_best(name, candidates, key="name", min_score=92)

    if best:
        cid = int(best["id"])
        patch = _wise_patch(best, {**payload, "university_id": university_id})
        if patch:
            keys = list(patch.keys())
            vals = [patch[k] for k in keys]
            set_sql = ", ".join(f"{k} = %s" for k in keys) + ", updated_at = NOW()"
            cur.execute(
                f"UPDATE courses SET {set_sql} WHERE id = %s",
                (*vals, cid),
            )
        return cid

    # 3) Insert
    full_payload = {**payload, "university_id": university_id}
    clean = {k: v for k, v in full_payload.items() if k not in _SKIP_COLS and v is not None}
    cols = list(clean.keys())
    vals = [clean[k] for k in cols]
    ph = ", ".join(["%s"] * len(vals))
    cur.execute(
        f"INSERT INTO courses ({', '.join(cols)}, created_at, updated_at) "
        f"VALUES ({ph}, NOW(), NOW()) RETURNING id",
        vals,
    )
    row = cur.fetchone()
    return int(row[0])


# ─────────────────────────────────────────────────────────────────────────────
# Job
# ─────────────────────────────────────────────────────────────────────────────

# Fields whose absence causes us to flag needs_llm.
# Deadline fields are handled by the existing `deadlines` job, so we don't
# escalate to LLM just for missing dates.
_LLM_ESCALATION_FIELDS = frozenset({
    "teaching_language",
    "field",
    "duration_months",
})


class ParseRawJob:
    name = "parse-raw"

    def __init__(self, cfg: AppConfig) -> None:
        self.cfg = cfg

    def _select_batch(
        self,
        cur: psycopg.Cursor,
        batch_size: int,
        lock: bool,
    ) -> list[tuple[int, str, str, dict]]:
        """
        Fetch a batch of pending raw_crawl_items.
        Returns list of (id, source, source_id, raw_data).
        """
        lock_clause = "FOR UPDATE SKIP LOCKED" if lock else ""
        cur.execute(
            f"""
            SELECT id, source, source_id, raw_data
            FROM raw_crawl_items
            WHERE parse_status = 'pending'
            ORDER BY id
            LIMIT %s
            {lock_clause}
            """,
            (batch_size,),
        )
        rows = cur.fetchall()
        result = []
        for row in rows:
            rid, source, source_id, raw_data = row
            if isinstance(raw_data, str):
                raw_data = json.loads(raw_data)
            result.append((rid, source, source_id, raw_data))
        return result

    def _mark_status(
        self,
        cur: psycopg.Cursor,
        row_id: int,
        status: str,
        course_id: int | None = None,
        error: str | None = None,
        missing_fields: list[str] | None = None,
    ) -> None:
        cur.execute(
            """
            UPDATE raw_crawl_items
            SET parse_status   = %s,
                parse_error    = %s,
                missing_fields = %s,
                course_id      = %s,
                parsed_at      = NOW()
            WHERE id = %s
            """,
            (
                status,
                error,
                json.dumps(missing_fields) if missing_fields else None,
                course_id,
                row_id,
            ),
        )

    def run(self, conn: psycopg.Connection, args: JobArgs) -> int:
        processed = 0
        updated = 0

        while processed < args.max_rows:
            # Fetch a batch inside its own transaction
            with conn.transaction():
                with conn.cursor() as cur:
                    batch = self._select_batch(
                        cur, min(args.batch_size, args.max_rows - processed),
                        lock=self.cfg.lock_rows,
                    )

                if not batch:
                    break

                for row_id, source, source_id, raw_data in batch:
                    processed += 1
                    try:
                        transformer = get_transformer(source)
                    except KeyError as e:
                        with conn.cursor() as cur:
                            self._mark_status(
                                cur, row_id, "failed",
                                error=f"No transformer for source '{source}'",
                            )
                        log.warning("[id=%s source=%s] %s", row_id, source, e)
                        continue

                    try:
                        parsed: ParsedItem = transformer.transform(raw_data)
                    except Exception as e:
                        with conn.cursor() as cur:
                            self._mark_status(
                                cur, row_id, "failed",
                                error=f"Transformer error: {e}",
                            )
                        log.exception(
                            "[id=%s source=%s source_id=%s] Transformer raised",
                            row_id, source, source_id,
                        )
                        continue

                    if args.dry_run:
                        log.info(
                            "[DRY id=%s source=%s] missing=%s warnings=%s",
                            row_id, source, parsed.missing_fields, parsed.warnings,
                        )
                        continue

                    # Determine target status
                    # Deadline fields are handled by the existing deadlines job,
                    # so filter them out before deciding LLM escalation.
                    llm_missing = [
                        f for f in parsed.missing_fields
                        if f in _LLM_ESCALATION_FIELDS
                    ]
                    target_status = "needs_llm" if llm_missing else "parsed"

                    try:
                        with conn.transaction():
                            with conn.cursor() as cur:
                                uni_id = _upsert_university(
                                    cur, parsed.university_payload
                                )
                                course_id = _upsert_course(
                                    cur, parsed.course_payload, uni_id, source
                                )
                                self._mark_status(
                                    cur,
                                    row_id,
                                    target_status,
                                    course_id=course_id,
                                    missing_fields=parsed.missing_fields or None,
                                    error="; ".join(parsed.warnings) if parsed.warnings else None,
                                )

                        log.info(
                            "[id=%s source=%s] → %s (course_id=%s missing=%s)",
                            row_id, source, target_status,
                            course_id, parsed.missing_fields,
                        )
                        updated += 1

                    except Exception as e:
                        with conn.cursor() as cur:
                            self._mark_status(
                                cur, row_id, "failed",
                                error=f"DB upsert error: {e}",
                            )
                        log.exception(
                            "[id=%s source=%s source_id=%s] DB upsert failed",
                            row_id, source, source_id,
                        )

        if args.dry_run:
            log.info("Dry-run complete. processed=%s", processed)
        else:
            log.info("Job complete. processed=%s promoted=%s", processed, updated)

        return updated
