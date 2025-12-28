from __future__ import annotations

import asyncpg
from typing import Any
from datetime import datetime, timezone
import re

from .dedupe import best_fuzzy_match

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _norm(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s

class PgStore:
    def __init__(self, dsn: str, schema: str = "public", pool_max: int = 10):
        self.dsn = dsn
        self.schema = schema
        self.pool_max = pool_max
        self.pool: asyncpg.Pool | None = None
        self.cols: dict[str, set[str]] = {}

    async def aopen(self) -> None:
        self.pool = await asyncpg.create_pool(self.dsn, min_size=1, max_size=self.pool_max)
        await self._load_columns()

    async def aclose(self) -> None:
        if self.pool:
            await self.pool.close()
            self.pool = None

    async def _load_columns(self) -> None:
        assert self.pool
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT table_name, column_name
                FROM information_schema.columns
                WHERE table_schema = $1 AND table_name IN ('universities', 'courses')
                """,
                self.schema,
            )
        cols: dict[str, set[str]] = {}
        for r in rows:
            cols.setdefault(r["table_name"], set()).add(r["column_name"])
        self.cols = cols

    def _filter(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        allowed = self.cols.get(table, set())
        return {k: v for k, v in payload.items() if k in allowed}

    def _add_timestamps(self, table: str, payload: dict[str, Any], *, for_update: bool) -> dict[str, Any]:
        allowed = self.cols.get(table, set())
        p = dict(payload)
        now = _now_utc()
        if "updated_at" in allowed and not for_update and "updated_at" not in p:
            p["updated_at"] = now
        if "updated_at" in allowed and for_update:
            p["updated_at"] = now
        if "created_at" in allowed and not for_update and "created_at" not in p:
            p["created_at"] = now
        return p

    async def _insert_returning_id(self, conn: asyncpg.Connection, table: str, payload: dict[str, Any]) -> int:
        payload = self._filter(table, payload)
        payload = self._add_timestamps(table, payload, for_update=False)

        keys = list(payload.keys())
        vals = [payload[k] for k in keys]
        cols_sql = ", ".join(keys)
        ph_sql = ", ".join([f"${i}" for i in range(1, len(vals) + 1)])

        row = await conn.fetchrow(
            f"INSERT INTO {self.schema}.{table} ({cols_sql}) VALUES ({ph_sql}) RETURNING id",
            *vals,
        )
        return int(row["id"])

    async def _update_by_id(self, conn: asyncpg.Connection, table: str, row_id: int, patch: dict[str, Any]) -> None:
        patch = self._filter(table, patch)
        patch = self._add_timestamps(table, patch, for_update=True)
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

    async def _search_universities(self, conn: asyncpg.Connection, name: str, country: str, limit: int = 30) -> list[dict[str, Any]]:
        # use ILIKE filter to reduce candidate set, then fuzzy in python
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

    async def _search_courses(self, conn: asyncpg.Connection, name: str, degree_level: str, university_id: int, limit: int = 40) -> list[dict[str, Any]]:
        # prefer same university; if none, caller can broaden
        rows = await conn.fetch(
            f"""
            SELECT id, name, degree_level, university_id, notes
            FROM {self.schema}.courses
            WHERE degree_level = $1 AND university_id = $2 AND name ILIKE '%' || $3 || '%'
            ORDER BY id DESC
            LIMIT {limit}
            """,
            degree_level,
            university_id,
            name[:50],
        )
        return [dict(r) for r in rows]

    def _wise_patch(self, existing: dict[str, Any], new: dict[str, Any]) -> dict[str, Any]:
        patch: dict[str, Any] = {}
        for k, v in new.items():
            if v is None:
                continue
            old = existing.get(k)
            if old in (None, "", [], {}):
                patch[k] = v
            # allow “source notes” refresh
            if k in ("notes", "deadline_notes") and isinstance(v, str) and isinstance(old, str) and v.strip() != old.strip():
                patch[k] = v
            if k in ("program_url", "application_url") and isinstance(v, str) and isinstance(old, str) and v.strip() != old.strip():
                patch[k] = v
        return patch

    async def upsert_university(self, payload: dict[str, Any], *, min_score: int = 90) -> int:
        assert self.pool
        name = payload.get("name") or "Unknown"
        country = payload.get("country") or "Unknown"
        city = payload.get("city") or None

        async with self.pool.acquire() as conn:
            candidates = await self._search_universities(conn, name=name, country=country)
            best = best_fuzzy_match(name, candidates, key="name", min_score=min_score)

            if best:
                uni_id = int(best["id"])
                patch = self._wise_patch(best, payload)
                await self._update_by_id(conn, "universities", uni_id, patch)
                return uni_id

            return await self._insert_returning_id(conn, "universities", payload)

    async def upsert_course(self, payload: dict[str, Any], *, min_score: int = 92) -> int:
        assert self.pool
        name = payload.get("name") or "Unknown"
        degree_level = payload.get("degree_level") or "master"
        university_id = int(payload.get("university_id") or 0)

        daad_id = None
        notes = payload.get("notes") or ""
        m = re.search(r"daad_course_id=(\d+)", notes)
        if m:
            daad_id = m.group(1)

        async with self.pool.acquire() as conn:
            # strongest match: same DAAD id in notes (if column exists)
            if daad_id and "notes" in self.cols.get("courses", set()):
                row = await conn.fetchrow(
                    f"SELECT * FROM {self.schema}.courses WHERE notes ILIKE '%' || $1 || '%' LIMIT 1",
                    f"daad_course_id={daad_id}",
                )
                if row:
                    existing = dict(row)
                    cid = int(existing["id"])
                    patch = self._wise_patch(existing, payload)
                    await self._update_by_id(conn, "courses", cid, patch)
                    return cid

            candidates = await self._search_courses(conn, name=name, degree_level=degree_level, university_id=university_id)
            best = best_fuzzy_match(name, candidates, key="name", min_score=min_score)

            if best:
                cid = int(best["id"])
                patch = self._wise_patch(best, payload)
                await self._update_by_id(conn, "courses", cid, patch)
                return cid

            return await self._insert_returning_id(conn, "courses", payload)

    async def upsert_courses_batch(self, items: list[dict[str, Any]]) -> None:
        """Batch of 50: do it in a single transaction."""
        assert self.pool
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                for p in items:
                    # keep it simple: reuse per-item upsert logic
                    # (still in same txn)
                    name = p.get("name") or "Unknown"
                    degree_level = p.get("degree_level") or "master"
                    university_id = int(p.get("university_id") or 0)

                    daad_id = None
                    notes = p.get("notes") or ""
                    m = re.search(r"daad_course_id=(\d+)", notes)
                    if m:
                        daad_id = m.group(1)

                    if daad_id and "notes" in self.cols.get("courses", set()):
                        row = await conn.fetchrow(
                            f"SELECT * FROM {self.schema}.courses WHERE notes ILIKE '%' || $1 || '%' LIMIT 1",
                            f"daad_course_id={daad_id}",
                        )
                        if row:
                            existing = dict(row)
                            cid = int(existing["id"])
                            patch = self._wise_patch(existing, p)
                            await self._update_by_id(conn, "courses", cid, patch)
                            continue

                    candidates = await self._search_courses(conn, name=name, degree_level=degree_level, university_id=university_id)
                    best = best_fuzzy_match(name, candidates, key="name", min_score=92)
                    if best:
                        cid = int(best["id"])
                        patch = self._wise_patch(best, p)
                        await self._update_by_id(conn, "courses", cid, patch)
                        continue

                    await self._insert_returning_id(conn, "courses", p)
