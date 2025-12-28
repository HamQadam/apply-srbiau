from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from rapidfuzz.fuzz import ratio
from sqlalchemy import create_engine, MetaData, Table, select, insert, update, and_, or_
from sqlalchemy.engine import Engine, RowMapping

def _utcnow():
    return datetime.now(timezone.utc)

def _norm(s: str) -> str:
    return " ".join("".join(ch.lower() if ch.isalnum() or ch.isspace() else " " for ch in s).split())

def _best_match(target: str, rows: list[RowMapping], key: str, min_score: int) -> RowMapping | None:
    t = _norm(target)
    best = None
    best_score = 0
    for r in rows:
        v = r.get(key) or ""
        sc = ratio(t, _norm(str(v)))
        if sc > best_score:
            best_score = sc
            best = r
    return best if best and best_score >= min_score else None

def _wise_patch(existing: RowMapping, new_payload: dict[str, Any], allowlist_text_updates: set[str]) -> dict[str, Any]:
    """
    Wise update strategy:
      - Fill missing (NULL/empty)
      - For allowlisted text fields, update if different
    """
    patch: dict[str, Any] = {}
    for k, v in new_payload.items():
        if v is None:
            continue
        old = existing.get(k)
        if old in (None, "", [], {}):
            patch[k] = v
        elif k in allowlist_text_updates and isinstance(v, str) and isinstance(old, str) and v.strip() != old.strip():
            patch[k] = v
    return patch

@dataclass
class DbClient:
    engine: Engine
    md: MetaData
    universities: Table
    courses: Table

    @classmethod
    def from_url(cls, database_url: str, university_table: str, course_table: str) -> "DbClient":
        engine = create_engine(database_url, pool_pre_ping=True)
        md = MetaData()
        md.reflect(bind=engine)

        if university_table not in md.tables:
            raise RuntimeError(f"University table '{university_table}' not found. موجود: {list(md.tables.keys())[:30]} ...")
        if course_table not in md.tables:
            raise RuntimeError(f"Course table '{course_table}' not found. موجود: {list(md.tables.keys())[:30]} ...")

        return cls(engine=engine, md=md, universities=md.tables[university_table], courses=md.tables[course_table])

    def _cols(self, table: Table) -> set[str]:
        return set(table.c.keys())

    def _filter_payload_to_existing_columns(self, table: Table, payload: dict[str, Any]) -> dict[str, Any]:
        cols = self._cols(table)
        return {k: v for k, v in payload.items() if k in cols}

    # ---------- Universities ----------
    def find_university_candidates(self, name: str, country: str = "Germany", limit: int = 50) -> list[RowMapping]:
        u = self.universities
        cols = [u.c.id, u.c.name]
        for opt in ["city", "country", "website", "logo_url", "ranking_qs"]:
            if opt in u.c:
                cols.append(u.c[opt])

        tokens = [t for t in _norm(name).split() if len(t) >= 3][:3]
        cond = [u.c.name.ilike(f"%{t}%") for t in tokens] if tokens else [u.c.name.ilike(f"%{name}%")]
        where = and_(u.c.country == country, or_(*cond)) if "country" in u.c else or_(*cond)

        with self.engine.begin() as conn:
            rows = conn.execute(select(*cols).where(where).limit(limit)).mappings().all()
        return rows

    def upsert_university(self, uni_payload: dict[str, Any], dry_run: bool = False) -> int:
        """
        Dedup by fuzzy name (min 90). Prefer same city if present.
        """
        u = self.universities
        uni_payload = self._filter_payload_to_existing_columns(u, uni_payload)

        name = uni_payload.get("name") or "Unknown"
        country = uni_payload.get("country") or "Germany"
        city = (uni_payload.get("city") or "").strip()

        candidates = self.find_university_candidates(name=name, country=country, limit=80)
        best = _best_match(name, candidates, key="name", min_score=90)

        if best:
            uni_id = int(best["id"])
            allow = {"website", "logo_url"}  # keep uni updates conservative
            patch = _wise_patch(best, uni_payload, allowlist_text_updates=allow)

            # city sometimes wrong; only fill if missing
            if "city" in u.c and city and (best.get("city") in (None, "")):
                patch["city"] = city

            if patch and not dry_run:
                with self.engine.begin() as conn:
                    conn.execute(update(u).where(u.c.id == uni_id).values(**patch))
            return uni_id

        # not found -> insert
        if dry_run:
            return -1

        with self.engine.begin() as conn:
            res = conn.execute(insert(u).values(**uni_payload).returning(u.c.id))
            uni_id = int(res.scalar_one())
        return uni_id

    # ---------- Courses ----------
    def find_course_by_program_url(self, program_url: str) -> RowMapping | None:
        c = self.courses
        if "program_url" not in c.c:
            return None
        cols = [c.c.id, c.c.name]
        for opt in ["university_id", "degree_level", "program_url", "deadline_fall", "deadline_spring", "deadline_notes",
                    "teaching_language", "duration_months", "tuition_fee_amount", "tuition_fee_currency",
                    "is_tuition_free", "notes", "last_verified_at"]:
            if opt in c.c:
                cols.append(c.c[opt])

        with self.engine.begin() as conn:
            row = conn.execute(select(*cols).where(c.c.program_url == program_url).limit(1)).mappings().first()
        return row

    def find_course_candidates(self, name: str, degree_level: str | None, university_id: int | None, limit: int = 50) -> list[RowMapping]:
        c = self.courses
        cols = [c.c.id, c.c.name]
        for opt in ["university_id", "degree_level", "program_url", "deadline_notes", "notes", "last_verified_at",
                    "teaching_language", "duration_months", "tuition_fee_amount", "is_tuition_free"]:
            if opt in c.c:
                cols.append(c.c[opt])

        tokens = [t for t in _norm(name).split() if len(t) >= 3][:3]
        cond = [c.c.name.ilike(f"%{t}%") for t in tokens] if tokens else [c.c.name.ilike(f"%{name}%")]
        where = or_(*cond)

        if degree_level and "degree_level" in c.c:
            where = and_(where, c.c.degree_level == degree_level)
        if university_id is not None and "university_id" in c.c:
            where = and_(where, c.c.university_id == university_id)

        with self.engine.begin() as conn:
            rows = conn.execute(select(*cols).where(where).limit(limit)).mappings().all()
        return rows

    def upsert_course(self, course_payload: dict[str, Any], dry_run: bool = False) -> int:
        """
        Dedup priority:
          1) program_url exact match (best)
          2) fuzzy name match within same university + same degree_level
        """
        c = self.courses
        course_payload = self._filter_payload_to_existing_columns(c, course_payload)

        name = course_payload.get("name") or "Unknown"
        degree_level = course_payload.get("degree_level")
        university_id = course_payload.get("university_id")
        program_url = course_payload.get("program_url")

        existing = None
        if program_url:
            existing = self.find_course_by_program_url(program_url)

        if not existing:
            candidates = self.find_course_candidates(
                name=name,
                degree_level=degree_level,
                university_id=university_id,
                limit=80,
            )
            existing = _best_match(name, candidates, key="name", min_score=92)

        if existing:
            course_id = int(existing["id"])

            allow = {
                "deadline_notes", "program_url", "application_url", "notes",
            }
            patch = _wise_patch(existing, course_payload, allowlist_text_updates=allow)

            # always safe to fill missing structured fields
            for k in ["deadline_fall", "deadline_spring", "duration_months", "credits_ects",
                      "tuition_fee_amount", "tuition_fee_currency", "is_tuition_free",
                      "teaching_language", "field", "description"]:
                if k in c.c and course_payload.get(k) is not None and existing.get(k) in (None, ""):
                    patch[k] = course_payload[k]

            # last_verified_at: update only if we actually changed something or it was null
            if "last_verified_at" in c.c:
                if existing.get("last_verified_at") is None or patch:
                    patch["last_verified_at"] = course_payload.get("last_verified_at") or _utcnow()

            if patch and not dry_run:
                with self.engine.begin() as conn:
                    conn.execute(update(c).where(c.c.id == course_id).values(**patch))
            return course_id

        # insert
        if dry_run:
            return -1

        with self.engine.begin() as conn:
            res = conn.execute(insert(c).values(**course_payload).returning(c.c.id))
            return int(res.scalar_one())
