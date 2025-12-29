from __future__ import annotations

import argparse
import asyncio
import logging
from typing import Any

from .config import Settings
from .clients.daad import DaadClient
from .cleaning import map_teaching_language, parse_duration_months, parse_tuition, extract_deadlines
from .state import StateStore
from .db import PgStore

log = logging.getLogger("daad-ingestor")

def build_university_payload(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": item.get("academy") or "Unknown",
        "country": "Germany",
        "city": item.get("city") or "Unknown",
        "website": None,
        "logo_url": None,
    }

def build_course_payload(item: dict[str, Any], degree_level: str, university_id: int) -> dict[str, Any]:
    is_free, fee_amount = parse_tuition(item.get("tuitionFees"))
    d_fall, d_spring, d_notes = extract_deadlines(item.get("applicationDeadline"))

    source_note = f"source=daad; daad_course_id={item.get('id')}"
    return {
        "name": item.get("courseName") or "Unknown",
        #"degree_level": degree_level,
        "degree_level": (degree_level or "").upper() or None,
        "field": item.get("subject") or "Unknown",
        "teaching_language": map_teaching_language(item.get("languages")),
        "duration_months": parse_duration_months(item.get("programmeDuration")),
        "credits_ects": None,
        "tuition_fee_amount": fee_amount,
        "tuition_fee_currency": "EUR" if fee_amount is not None else None,
        "tuition_fee_per": "year",
        "is_tuition_free": is_free,
        "deadline_fall": d_fall,
        "deadline_spring": d_spring,
        "deadline_notes": d_notes,
        "program_url": f"https://www2.daad.de{item.get('link')}" if item.get("link") else None,
        "application_url": None,
        "description": None,
        "notes": source_note,
        "university_id": university_id,

        # very common NOT NULL / defaults in your API model
        "gpa_scale": "4.0",
        "gre_required": False,
        "gmat_required": False,
        "scholarships_available": False,
        "verified_by_count": 0,
        "view_count": 0,
    }

async def ingest(cfg: Settings):
    state = StateStore(cfg.checkpoint_path)
    daad = DaadClient(cfg.daad_base_url, cfg.daad_lang, cfg.daad_rps, timeout_s=30.0)
    #db = PgStore(cfg.database_url, schema=cfg.db_schema, pool_max=cfg.db_pool_max)
    db = PgStore(cfg.effective_database_url(), schema=cfg.db_schema, pool_max=cfg.db_pool_max)
    await db.aopen()
    await db.wait_until_ready(timeout_s=cfg.db_wait_timeout_s)
    buffer: list[dict[str, Any]] = []

    degree_map = {
        "bachelor": cfg.daad_degree_bachelor,
        "master": cfg.daad_degree_master,
        "phd": cfg.daad_degree_phd,
    }

    try:
        for degree_level, degree_code in degree_map.items():
            offset = state.get_offset(degree_level)
            log.info("Degree=%s (code=%s) starting offset=%s", degree_level, degree_code, offset)

            while True:
                page = await daad.search(degree_code=degree_code, limit=cfg.daad_page_size, offset=offset)
                courses = page.get("courses") or []
                if not courses:
                    log.info("Degree=%s done.", degree_level)
                    break

                for item in courses:
                    uni_payload = build_university_payload(item)
                    if cfg.dry_run:
                        uni_id = 0
                        log.info("[DRY] university: %s", uni_payload)
                    else:
                        uni_id = await db.upsert_university(uni_payload)

                    course_payload = build_course_payload(item, degree_level, uni_id)
                    buffer.append(course_payload)

                    if len(buffer) >= cfg.batch_size:
                        await flush_buffer(cfg, db, buffer)
                        buffer.clear()

                offset += cfg.daad_page_size
                state.set_offset(degree_level, offset)
                log.info("Checkpoint: %s offset=%s", degree_level, offset)

        if buffer:
            await flush_buffer(cfg, db, buffer)

    finally:
        await daad.aclose()
        await db.aclose()

async def flush_buffer(cfg: Settings, db: PgStore, buffer: list[dict[str, Any]]):
    log.info("Flushing batch=%s", len(buffer))
    if cfg.dry_run:
        for c in buffer:
            log.info("[DRY] course: %s", {k: c.get(k) for k in ("name", "degree_level", "university_id")})
        return

    # batch of 50 inside a single transaction
    await db.upsert_courses_batch(buffer)

def main():
    parser = argparse.ArgumentParser(prog="daad-ingest")
    parser.add_argument("cmd", choices=["ingest"])
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    cfg = Settings(dry_run=args.dry_run)
    asyncio.run(ingest(cfg))

if __name__ == "__main__":
    main()
