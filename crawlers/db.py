"""
Database operations for crawler ingestion.

This module provides async PostgreSQL operations with:
- Connection pooling
- Automatic column detection
- String truncation for varchar limits
- Fuzzy matching for deduplication
- Batch operations
"""
from __future__ import annotations

import asyncio
import asyncpg
import logging
import re
import time
from datetime import datetime, timezone
from typing import Any


log = logging.getLogger("crawler.db")


def _now_utc() -> datetime:
    return datetime.utcnow()

def _norm(s: str) -> str:
    """Normalize string for comparison."""
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def best_fuzzy_match(
    needle: str,
    candidates: list[dict[str, Any]],
    key: str = "name",
    min_score: int = 85
) -> dict[str, Any] | None:
    """
    Find best fuzzy match for needle in candidates.
    
    Uses simple ratio matching. Returns None if no match above min_score.
    """
    try:
        from rapidfuzz import fuzz
    except ImportError:
        # Fallback to exact match if rapidfuzz not available
        needle_norm = _norm(needle)
        for c in candidates:
            if _norm(c.get(key, "")) == needle_norm:
                return c
        return None
    
    needle_norm = _norm(needle)
    best: dict[str, Any] | None = None
    best_score = 0
    
    for c in candidates:
        cand_norm = _norm(c.get(key, ""))
        score = fuzz.ratio(needle_norm, cand_norm)
        if score > best_score and score >= min_score:
            best = c
            best_score = score
    
    return best


class PgStore:
    """
    PostgreSQL store for crawler data.
    
    Handles:
    - Connection pooling
    - Schema introspection for safe inserts
    - Upsert logic with fuzzy matching
    - Batch operations
    """
    
    def __init__(self, dsn: str, schema: str = "public", pool_max: int = 10):
        self.dsn = dsn
        self.schema = schema
        self.pool_max = pool_max
        self.pool: asyncpg.Pool | None = None
        self.cols: dict[str, set[str]] = {}
        self.maxlen: dict[str, dict[str, int | None]] = {}
    
    async def aopen(self) -> None:
        """Open connection pool."""
        log.info("Opening database connection pool (max=%d)", self.pool_max)
        self.pool = await asyncpg.create_pool(
            self.dsn,
            min_size=1,
            max_size=self.pool_max
        )
        await self._load_columns()
    
    async def aclose(self) -> None:
        """Close connection pool."""
        if self.pool:
            log.info("Closing database connection pool")
            await self.pool.close()
            self.pool = None
    
    async def open(self) -> None:
        await self.aopen()
    
    async def close(self) -> None:
        await self.aclose()
    
    async def _load_columns(self) -> None:
        """Load column metadata from information_schema."""
        assert self.pool
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT table_name, column_name, character_maximum_length
                FROM information_schema.columns
                WHERE table_schema = $1 
                  AND table_name IN ('universities', 'courses')
                """,
                self.schema,
            )
        
        cols: dict[str, set[str]] = {}
        maxlen: dict[str, dict[str, int | None]] = {}
        
        for r in rows:
            table = r["table_name"]
            column = r["column_name"]
            cols.setdefault(table, set()).add(column)
            maxlen.setdefault(table, {})[column] = r["character_maximum_length"]
        
        self.cols = cols
        self.maxlen = maxlen
        
        log.info(
            "Loaded schema: universities=%d cols, courses=%d cols",
            len(self.cols.get("universities", set())),
            len(self.cols.get("courses", set()))
        )
    
    def _filter(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Filter payload to only include valid columns for table."""
        allowed = self.cols.get(table, set())
        filtered = {k: v for k, v in payload.items() if k in allowed}
        
        # Log filtered out fields for debugging
        dropped = set(payload.keys()) - set(filtered.keys())
        if dropped:
            log.debug("Filtered out columns for %s: %s", table, dropped)
        
        return filtered
    
    def _truncate(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Truncate strings to match varchar(n) limits."""
        limits = self.maxlen.get(table, {})
        out: dict[str, Any] = {}
        
        for k, v in payload.items():
            if isinstance(v, str):
                ml = limits.get(k)
                if ml is not None and ml > 0 and len(v) > ml:
                    if ml <= 3:
                        out[k] = v[:ml]
                    else:
                        out[k] = v[:ml - 3] + "..."
                    log.debug(
                        "Truncated %s.%s from %d to %d chars",
                        table, k, len(v), ml
                    )
                else:
                    out[k] = v
            else:
                out[k] = v
        
        return out
    
    def _add_timestamps(
        self,
        table: str,
        payload: dict[str, Any],
        *,
        for_update: bool
    ) -> dict[str, Any]:
        """Add created_at/updated_at timestamps."""
        allowed = self.cols.get(table, set())
        p = dict(payload)
        now = _now_utc()
        
        if "updated_at" in allowed:
            p["updated_at"] = now
        
        if "created_at" in allowed and not for_update and "created_at" not in p:
            p["created_at"] = now
        
        return p
    
    async def _insert_returning_id(
        self,
        conn: asyncpg.Connection,
        table: str,
        payload: dict[str, Any]
    ) -> int:
        """Insert a row and return its ID."""
        payload = self._filter(table, payload)
        payload = self._add_timestamps(table, payload, for_update=False)
        payload = self._truncate(table, payload)
        
        keys = list(payload.keys())
        vals = [payload[k] for k in keys]
        cols_sql = ", ".join(keys)
        ph_sql = ", ".join([f"${i}" for i in range(1, len(vals) + 1)])
        
        row = await conn.fetchrow(
            f"INSERT INTO {self.schema}.{table} ({cols_sql}) "
            f"VALUES ({ph_sql}) RETURNING id",
            *vals,
        )
        return int(row["id"])
    
    async def _update_by_id(
        self,
        conn: asyncpg.Connection,
        table: str,
        row_id: int,
        patch: dict[str, Any]
    ) -> None:
        """Update a row by ID."""
        patch = self._filter(table, patch)
        patch = self._add_timestamps(table, patch, for_update=True)
        patch = self._truncate(table, patch)
        
        if not patch:
            return
        
        keys = list(patch.keys())
        vals = [patch[k] for k in keys]
        set_sql = ", ".join([f"{k} = ${i}" for i, k in enumerate(keys, start=1)])
        
        await conn.execute(
            f"UPDATE {self.schema}.{table} SET {set_sql} WHERE id = ${len(vals) + 1}",
            *vals,
            row_id,
        )
    
    async def _search_universities(
        self,
        conn: asyncpg.Connection,
        name: str,
        country: str,
        limit: int = 30
    ) -> list[dict[str, Any]]:
        """Search for universities by name and country."""
        rows = await conn.fetch(
            f"""
            SELECT id, name, country, city, website, logo_url
            FROM {self.schema}.universities
            WHERE country = $1 AND name ILIKE '%' || $2 || '%'
            ORDER BY id DESC
            LIMIT {limit}
            """,
            country,
            name[:40],
        )
        return [dict(r) for r in rows]
    
    async def _search_courses(
        self,
        conn: asyncpg.Connection,
        name: str,
        degree_level: str,
        university_id: int,
        limit: int = 40
    ) -> list[dict[str, Any]]:
        """Search for courses by name, degree, and university."""
        rows = await conn.fetch(
            f"""
            SELECT id, name, degree_level, university_id, notes
            FROM {self.schema}.courses
            WHERE degree_level = $1 AND university_id = $2 
              AND name ILIKE '%' || $3 || '%'
            ORDER BY id DESC
            LIMIT {limit}
            """,
            degree_level,
            university_id,
            name[:50],
        )
        return [dict(r) for r in rows]
    
    def _wise_patch(
        self,
        existing: dict[str, Any],
        new: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Create a patch that only updates empty fields or specific refresh fields.
        Preserves existing data while allowing URL and notes updates.
        """
        patch: dict[str, Any] = {}
        
        for k, v in new.items():
            if v is None:
                continue
            
            old = existing.get(k)
            
            # Fill in empty fields
            if old in (None, "", [], {}):
                patch[k] = v
            
            # Allow refresh of specific fields
            if k in ("notes", "deadline_notes", "program_url", "application_url"):
                if isinstance(v, str) and isinstance(old, str):
                    if v.strip() != old.strip():
                        patch[k] = v
        
        return patch
    
    async def upsert_university(
        self,
        payload: dict[str, Any],
        *,
        min_score: int = 90
    ) -> int:
        """
        Upsert a university.
        
        Uses fuzzy matching to find existing universities.
        Returns the university ID.
        """
        assert self.pool
        
        name = payload.get("name") or "Unknown"
        country = payload.get("country") or "Unknown"
        
        async with self.pool.acquire() as conn:
            # Search for existing
            candidates = await self._search_universities(conn, name=name, country=country)
            best = best_fuzzy_match(name, candidates, key="name", min_score=min_score)
            
            if best:
                uni_id = int(best["id"])
                patch = self._wise_patch(best, payload)
                if patch:
                    await self._update_by_id(conn, "universities", uni_id, patch)
                    log.debug("Updated university %d: %s", uni_id, name)
                return uni_id
            
            uni_id = await self._insert_returning_id(conn, "universities", payload)
            log.debug("Inserted university %d: %s", uni_id, name)
            return uni_id
    
    async def upsert_course(
        self,
        payload: dict[str, Any],
        *,
        min_score: int = 92
    ) -> int:
        """
        Upsert a course.
        
        First tries to match by source ID in notes, then by fuzzy name match.
        Returns the course ID.
        """
        assert self.pool
        
        name = payload.get("name") or "Unknown"
        degree_level = (payload.get("degree_level") or "MASTER").lower()
        university_id = int(payload.get("university_id") or 0)
        
        # Extract source ID for exact matching
        daad_id = None
        notes = payload.get("notes") or ""
        m = re.search(r"daad_course_id=(\d+)", notes)
        if m:
            daad_id = m.group(1)
        
        async with self.pool.acquire() as conn:
            # First: try exact match by source ID
            if daad_id and "notes" in self.cols.get("courses", set()):
                row = await conn.fetchrow(
                    f"SELECT * FROM {self.schema}.courses "
                    f"WHERE notes ILIKE '%' || $1 || '%' LIMIT 1",
                    f"daad_course_id={daad_id}",
                )
                if row:
                    existing = dict(row)
                    cid = int(existing["id"])
                    patch = self._wise_patch(existing, payload)
                    if patch:
                        await self._update_by_id(conn, "courses", cid, patch)
                    return cid
            
            # Second: fuzzy match by name
            candidates = await self._search_courses(
                conn, name=name, degree_level=degree_level, university_id=university_id
            )
            best = best_fuzzy_match(name, candidates, key="name", min_score=min_score)
            
            if best:
                cid = int(best["id"])
                patch = self._wise_patch(best, payload)
                if patch:
                    await self._update_by_id(conn, "courses", cid, patch)
                return cid
            
            # Insert new
            return await self._insert_returning_id(conn, "courses", payload)
    
    async def upsert_courses_batch(self, items: list[dict[str, Any]]) -> None:
        """
        Batch upsert courses in a single transaction.
        """
        assert self.pool
        
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                for p in items:
                    name = p.get("name") or "Unknown"
                    degree_level = (p.get("degree_level") or "MASTER").lower()
                    university_id = int(p.get("university_id") or 0)
                    
                    # Extract source ID
                    daad_id = None
                    notes = p.get("notes") or ""
                    m = re.search(r"daad_course_id=(\d+)", notes)
                    if m:
                        daad_id = m.group(1)
                    
                    # Try exact match
                    if daad_id and "notes" in self.cols.get("courses", set()):
                        row = await conn.fetchrow(
                            f"SELECT * FROM {self.schema}.courses "
                            f"WHERE notes ILIKE '%' || $1 || '%' LIMIT 1",
                            f"daad_course_id={daad_id}",
                        )
                        if row:
                            existing = dict(row)
                            cid = int(existing["id"])
                            patch = self._wise_patch(existing, p)
                            if patch:
                                await self._update_by_id(conn, "courses", cid, patch)
                            continue
                    
                    # Fuzzy match
                    candidates = await self._search_courses(
                        conn, name=name, degree_level=degree_level, university_id=university_id
                    )
                    best = best_fuzzy_match(name, candidates, key="name", min_score=92)
                    
                    if best:
                        cid = int(best["id"])
                        patch = self._wise_patch(best, p)
                        if patch:
                            await self._update_by_id(conn, "courses", cid, patch)
                        continue
                    
                    await self._insert_returning_id(conn, "courses", p)
    
    async def wait_until_ready(self, timeout_s: int = 120) -> None:
        """
        Wait until required tables exist.
        
        Blocks until universities and courses tables are available.
        """
        assert self.pool, "Call aopen() before wait_until_ready()"
        
        deadline = time.monotonic() + timeout_s
        uni_tbl = f"{self.schema}.universities"
        course_tbl = f"{self.schema}.courses"
        
        check_interval = 2
        
        while True:
            async with self.pool.acquire() as conn:
                dbname = await conn.fetchval("SELECT current_database()")
                uni_ok = await conn.fetchval("SELECT to_regclass($1)", uni_tbl)
                course_ok = await conn.fetchval("SELECT to_regclass($1)", course_tbl)
                
                if uni_ok and course_ok:
                    log.info("Database ready: %s (tables found)", dbname)
                    await self._load_columns()
                    return
                
                missing = []
                if not uni_ok:
                    missing.append("universities")
                if not course_ok:
                    missing.append("courses")
                
                log.info(
                    "[db] Waiting for tables in db=%s ... missing: %s",
                    dbname, ", ".join(missing)
                )
            
            if time.monotonic() > deadline:
                raise RuntimeError(
                    f"Database not ready after {timeout_s}s. "
                    f"Missing tables: {', '.join(missing)}"
                )
            
            await asyncio.sleep(check_interval)
