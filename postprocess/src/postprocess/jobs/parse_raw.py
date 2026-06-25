"""
Stage-2: Lexical parse job.

Reads raw_crawl_items WHERE parse_status IN ('pending','failed'), runs the
appropriate source transformer, and either:
  - Upserts university + course rows (parse_status → 'parsed')
  - Flags the row for LLM processing (parse_status → 'needs_llm')

One transaction per row — a single bad row never aborts the whole batch.
"""
from __future__ import annotations

import json
import logging
import re
from typing import Any

import psycopg

from ..config import AppConfig
from .base import JobArgs
from ..transformers import get_transformer, ParsedItem

log = logging.getLogger(__name__)

# Columns skipped when building a generic INSERT (handled separately or by DB)
_INSERT_SKIP = frozenset({"id", "created_at", "updated_at"})

# varchar(n) limits for columns we write — prevents StringDataRightTruncation.
# Values are the DB column sizes from the schema migrations.
_VARCHAR_LIMITS: dict[str, int] = {
    "name":                 300,   # courses.name
    "field":                200,   # courses.field
    "deadline_notes":       500,
    "notes":               1000,
    "description":         3000,
    "scholarship_details": 1000,
    "program_url":          500,   # reuse for varchar(500) cols
    "application_url":      500,
    # universities
    "city":                 100,
    "country":              100,
    "website":              300,
    "logo_url":             500,
}


def _truncate(key: str, value: Any) -> Any:
    """Truncate string values to their column limit, adding '…' suffix."""
    if not isinstance(value, str):
        return value
    limit = _VARCHAR_LIMITS.get(key)
    if limit and len(value) > limit:
        return value[: limit - 1] + "…"
    return value


def _clean_payload(payload: dict[str, Any], skip: frozenset[str]) -> dict[str, Any]:
    """Drop skip-cols, None values, and truncate strings."""
    return {
        k: _truncate(k, v)
        for k, v in payload.items()
        if k not in skip and v is not None
    }


# ─────────────────────────────────────────────────────────────────────────────
# Fuzzy match helpers
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
    """Only fill empty fields or refresh certain mutable fields."""
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

def _upsert_university(cur: psycopg.Cursor, payload: dict[str, Any]) -> int:
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
    cols = [d[0] for d in cur.description]
    candidates = [dict(zip(cols, row)) for row in cur.fetchall()]
    best = _fuzzy_best(name, candidates, key="name", min_score=90)

    if best:
        uni_id = int(best["id"])
        patch = _clean_payload(_wise_patch(best, payload), _INSERT_SKIP)
        if patch:
            keys = list(patch.keys())
            vals = [patch[k] for k in keys]
            set_sql = ", ".join(f"{k} = %s" for k in keys) + ", updated_at = NOW()"
            cur.execute(
                f"UPDATE universities SET {set_sql} WHERE id = %s",
                (*vals, uni_id),
            )
        return uni_id

    clean = _clean_payload(payload, _INSERT_SKIP)
    cols_list = list(clean.keys())
    vals = [clean[k] for k in cols_list]
    ph = ", ".join(["%s"] * len(vals))
    cur.execute(
        f"INSERT INTO universities ({', '.join(cols_list)}, created_at, updated_at) "
        f"VALUES ({ph}, NOW(), NOW()) RETURNING id",
        vals,
    )
    return int(cur.fetchone()[0])


def _source_id_from_notes(notes: str | None, source: str) -> str | None:
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
            # strip trailing semicolons/whitespace that sneak in
            return m.group(1).rstrip(";, \t")
    return None


def _upsert_course(
    cur: psycopg.Cursor,
    payload: dict[str, Any],
    university_id: int,
    source: str,
) -> int:
    name = payload.get("name") or "Unknown"
    degree_level = (payload.get("degree_level") or "MASTER").upper()
    notes = payload.get("notes") or ""

    # 1) Exact match by source id in notes field
    src_id = _source_id_from_notes(notes, source)
    if src_id:
        cur.execute(
            "SELECT * FROM courses WHERE notes ILIKE %s LIMIT 1",
            (f"%{src_id}%",),
        )
        row = cur.fetchone()
        if row:
            cols = [d[0] for d in cur.description]
            existing = dict(zip(cols, row))
            cid = int(existing["id"])
            merged = {**payload, "university_id": university_id}
            patch = _clean_payload(_wise_patch(existing, merged), _INSERT_SKIP)
            if patch:
                keys = list(patch.keys())
                vals = [patch[k] for k in keys]
                set_sql = ", ".join(f"{k} = %s" for k in keys) + ", updated_at = NOW()"
                cur.execute(f"UPDATE courses SET {set_sql} WHERE id = %s", (*vals, cid))
            return cid

    # 2) Fuzzy match by name within the same university
    cur.execute(
        """
        SELECT id, name, degree_level, university_id, notes
        FROM courses
        WHERE degree_level = %s AND university_id = %s AND name ILIKE %s
        ORDER BY id DESC LIMIT 40
        """,
        (degree_level, university_id, f"%{name[:50]}%"),
    )
    cols = [d[0] for d in cur.description]
    candidates = [dict(zip(cols, row)) for row in cur.fetchall()]
    best = _fuzzy_best(name, candidates, key="name", min_score=92)

    if best:
        cid = int(best["id"])
        merged = {**payload, "university_id": university_id}
        patch = _clean_payload(_wise_patch(best, merged), _INSERT_SKIP)
        if patch:
            keys = list(patch.keys())
            vals = [patch[k] for k in keys]
            set_sql = ", ".join(f"{k} = %s" for k in keys) + ", updated_at = NOW()"
            cur.execute(f"UPDATE courses SET {set_sql} WHERE id = %s", (*vals, cid))
        return cid

    # 3) Insert new course — university_id is included explicitly here
    full = {**payload, "university_id": university_id}
    clean = _clean_payload(full, _INSERT_SKIP)
    cols_list = list(clean.keys())
    vals = [clean[k] for k in cols_list]
    ph = ", ".join(["%s"] * len(vals))
    cur.execute(
        f"INSERT INTO courses ({', '.join(cols_list)}, created_at, updated_at) "
        f"VALUES ({ph}, NOW(), NOW()) RETURNING id",
        vals,
    )
    return int(cur.fetchone()[0])


def _mark_status(
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


# ─────────────────────────────────────────────────────────────────────────────
# Job
# ─────────────────────────────────────────────────────────────────────────────

# Fields that trigger LLM escalation when missing.
# Deadline fields are included here: the existing rules-based deadlines job
# handles deadline_notes → structured dates, but many rows have no parseable
# notes at all — so we ask the LLM to fill them directly from the raw payload.
_LLM_ESCALATION_FIELDS = frozenset({
    "teaching_language",
    "field",
    "duration_months",
    "deadline_fall",
    "deadline_spring",
})


class ParseRawJob:
    name = "parse-raw"

    def __init__(self, cfg: AppConfig) -> None:
        self.cfg = cfg

    def _next_row(self, conn: psycopg.Connection) -> tuple | None:
        """Fetch and lock one pending/failed row. Returns None when queue empty."""
        lock_clause = "FOR UPDATE SKIP LOCKED" if self.cfg.lock_rows else ""
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, source, source_id, raw_data
                FROM raw_crawl_items
                WHERE parse_status IN ('pending', 'failed')
                ORDER BY id
                LIMIT 1
                {lock_clause}
                """,
            )
            row = cur.fetchone()
        if not row:
            return None
        rid, source, source_id, raw_data = row
        if isinstance(raw_data, str):
            raw_data = json.loads(raw_data)
        return rid, source, source_id, raw_data

    def run(self, conn: psycopg.Connection, args: JobArgs) -> int:
        processed = 0
        promoted = 0

        while processed < args.max_rows:
            # Each row is its own transaction so failures are fully isolated.
            try:
                with conn.transaction():
                    row = self._next_row(conn)
                    if row is None:
                        break

                    row_id, source, source_id, raw_data = row
                    processed += 1

                    # --- Transform ---
                    try:
                        transformer = get_transformer(source)
                        parsed: ParsedItem = transformer.transform(raw_data)
                    except KeyError:
                        _mark_status(
                            conn.cursor().__enter__(),  # won't work inside ctx mgr
                            row_id, "failed",
                            error=f"No transformer for source '{source}'",
                        )
                        raise  # let the transaction commit the mark

                    if args.dry_run:
                        log.info(
                            "[DRY id=%s source=%s] missing=%s warnings=%s",
                            row_id, source, parsed.missing_fields, parsed.warnings,
                        )
                        # Roll back by raising — dry run leaves row as-is
                        raise _DryRunRollback()

                    llm_missing = [
                        f for f in parsed.missing_fields
                        if f in _LLM_ESCALATION_FIELDS
                    ]
                    target_status = "needs_llm" if llm_missing else "parsed"

                    with conn.cursor() as cur:
                        uni_id = _upsert_university(cur, parsed.university_payload)
                        course_id = _upsert_course(cur, parsed.course_payload, uni_id, source)
                        _mark_status(
                            cur,
                            row_id,
                            target_status,
                            course_id=course_id,
                            missing_fields=parsed.missing_fields or None,
                            error="; ".join(parsed.warnings) if parsed.warnings else None,
                        )

                    log.info(
                        "[id=%s source=%s] → %s (course_id=%s missing=%s)",
                        row_id, source, target_status, course_id, parsed.missing_fields,
                    )
                    promoted += 1

            except _DryRunRollback:
                # Expected — just counting
                pass
            except Exception as e:
                # Transaction was rolled back by psycopg3 on exception exit.
                # Write failure status in a fresh transaction.
                log.exception(
                    "[id=%s source=%s source_id=%s] upsert failed: %s",
                    row_id if "row_id" in dir() else "?",
                    source if "source" in dir() else "?",
                    source_id if "source_id" in dir() else "?",
                    e,
                )
                try:
                    with conn.transaction():
                        with conn.cursor() as cur:
                            _mark_status(cur, row_id, "failed", error=str(e)[:500])
                except Exception:
                    pass  # best-effort

        if args.dry_run:
            log.info("Dry-run complete. processed=%s", processed)
        else:
            log.info("Job complete. processed=%s promoted=%s", processed, promoted)

        return promoted


class _DryRunRollback(Exception):
    """Sentinel used to roll back a dry-run transaction cleanly."""
