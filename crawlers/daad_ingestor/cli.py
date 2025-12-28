from __future__ import annotations

import argparse
import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from .config import Settings
from .clients.daad import DaadClient
from .clients.ghadam import GhadamClient
from .cleaning import (
    map_teaching_language, parse_duration_months, parse_tuition, extract_deadlines
)
from .dedupe import best_fuzzy_match
from .state import StateStore

log = logging.getLogger("daad-ingestor")

DEGREE_LEVELS = ["bachelor", "master", "phd"]

def build_university_payload(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": item.get("academy") or "Unknown",
        "country": "Germany",
        "city": item.get("city") or "Unknown",
        # optional enrich later:
        "website": None,
        "logo_url": None,
    }

def build_course_payload(item: dict[str, Any], degree_level: str, university_id: int) -> dict[str, Any]:
    is_free, fee_amount = parse_tuition(item.get("tuitionFees"))
    d_fall, d_spring, d_notes = extract_deadlines(item.get("applicationDeadline"))

    # provenance
    source_note = f"source=daad; daad_course_id={item.get('id')}"
    now = datetime.now(timezone.utc).isoformat()

    return {
        "name": item.get("courseName") or "Unknown",
        "degree_level": degree_level,
        "field": item.get("subject") or "Unknown",
        "teaching_language": map_teaching_language(item.get("languages")),
        "duration_months": parse_duration_months(item.get("programmeDuration")),
        "tuition_fee_amount": fee_amount,
        "tuition_fee_currency": "EUR" if fee_amount is not None else None,
        "tuition_fee_per": "year",
        "is_tuition_free": is_free,
        "deadline_fall": d_fall.isoformat() if d_fall else None,
        "deadline_spring": d_spring.isoformat() if d_spring else None,
        "deadline_notes": d_notes,
        "program_url": f"https://www2.daad.de{item.get('link')}" if item.get("link") else None,
        "application_url": None,
        "description": None,
        "notes": source_note,
        "last_verified_at": now,
        "university_id": university_id,
        # defaults expected by your DB layer
        "gpa_scale": "4.0",
        "gre_required": False,
        "gmat_required": False,
        "scholarships_available": False,
    }

def merge_patch(existing: dict[str, Any], new: dict[str, Any]) -> dict[str, Any]:
    """
    Wise patch: only fill missing or clearly outdated values.
    """
    patch: dict[str, Any] = {}
    for k, v in new.items():
        if v is None:
            continue
        old = existing.get(k)
        if old in (None, "", [], {}):
            patch[k] = v
        elif isinstance(v, str) and isinstance(old, str) and v.strip() != old.strip() and k in {
            "deadline_notes", "notes", "program_url", "application_url"
        }:
            # for text fields, update only if meaningfully different
            patch[k] = v
    return patch

async def upsert_university(cfg: Settings, api: GhadamClient, uni_cache: dict[str, int], uni_payload: dict[str, Any]) -> int:
    name = uni_payload["name"]
    city = uni_payload.get("city")
    cache_key = f"{name}::{city}".lower()
    if cache_key in uni_cache:
        return uni_cache[cache_key]

    candidates = await api.list_universities(query=name, country="Germany", limit=20)
    best = best_fuzzy_match(name, candidates, key="name", min_score=90)

    if best:
        uni_id = int(best["id"])
        patch = merge_patch(best, uni_payload)
        if patch and not cfg.dry_run:
            await api.patch(cfg.uni_update_path_tpl.format(id=uni_id), patch)
        uni_cache[cache_key] = uni_id
        return uni_id

    if cfg.dry_run:
        log.info("[DRY] create university: %s", uni_payload)
        # fake id in dry run
        uni_cache[cache_key] = -1
        return -1

    created = await api.create(cfg.uni_create_path, uni_payload)
    uni_id = int(created["id"])
    uni_cache[cache_key] = uni_id
    return uni_id

async def upsert_course(cfg: Settings, api: GhadamClient, course_payload: dict[str, Any]) -> None:
    name = course_payload["name"]
    degree_level = course_payload["degree_level"]

    candidates = await api.list_courses(query=name, degree_level=degree_level, country="Germany", limit=20)

    # prefer same university_id if your API returns it
    uni_id = course_payload["university_id"]
    same_uni = [c for c in candidates if int(c.get("university_id") or -999999) == int(uni_id)]
    best = best_fuzzy_match(name, same_uni or candidates, key="name", min_score=92)

    if best:
        course_id = int(best["id"])
        patch = merge_patch(best, course_payload)
        if patch:
            if cfg.dry_run:
                log.info("[DRY] patch course %s (%s): %s", course_id, name, patch)
            else:
                await api.patch(cfg.course_update_path_tpl.format(id=course_id), patch)
        return

    if cfg.dry_run:
        log.info("[DRY] create course: %s", course_payload)
        return

    await api.create(cfg.course_create_path, course_payload)

async def ingest(cfg: Settings):
    state = StateStore(cfg.checkpoint_path)
    daad = DaadClient(cfg.daad_base_url, cfg.daad_lang, cfg.daad_rps, timeout_s=cfg.ghadam_timeout_s)
    api = GhadamClient(cfg.ghadam_base_url, cfg.ghadam_admin_token, timeout_s=cfg.ghadam_timeout_s)

    uni_cache: dict[str, int] = {}
    buffer: list[dict[str, Any]] = []

    degree_map = {
        "bachelor": cfg.daad_degree_bachelor,
        "master": cfg.daad_degree_master,
        "phd": cfg.daad_degree_phd,
    }

    try:
        for degree_level, degree_code in degree_map.items():
            offset = state.get_offset(degree_level)
            log.info("Degree=%s (code=%s) starting at offset=%s", degree_level, degree_code, offset)

            while True:
                page = await daad.search(degree_code=degree_code, limit=cfg.daad_page_size, offset=offset)
                courses = page.get("courses") or []
                if not courses:
                    log.info("Degree=%s done.", degree_level)
                    break

                for item in courses:
                    uni_payload = build_university_payload(item)
                    uni_id = await upsert_university(cfg, api, uni_cache, uni_payload)

                    course_payload = build_course_payload(item, degree_level, uni_id)
                    buffer.append(course_payload)

                    if len(buffer) >= cfg.batch_size:
                        await flush_buffer(cfg, api, buffer)
                        buffer.clear()

                offset += cfg.daad_page_size
                state.set_offset(degree_level, offset)
                log.info("Checkpoint saved: %s offset=%s", degree_level, offset)

        if buffer:
            await flush_buffer(cfg, api, buffer)

    finally:
        await daad.aclose()
        await api.aclose()

async def flush_buffer(cfg: Settings, api: GhadamClient, buffer: list[dict[str, Any]]):
    log.info("Flushing batch size=%s", len(buffer))

    # Optional bulk endpoint support
    if cfg.course_bulk_path:
        payload = {"items": buffer}
        if cfg.dry_run:
            log.info("[DRY] bulk upsert %s items to %s", len(buffer), cfg.course_bulk_path)
            return
        await api.bulk_upsert(cfg.course_bulk_path, payload)
        return

    # No bulk endpoint → still “batch of 50”, just executed sequentially
    for c in buffer:
        await upsert_course(cfg, api, c)

def main():
    parser = argparse.ArgumentParser(prog="daad-ingest")
    parser.add_argument("cmd", choices=["ingest"])
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    cfg = Settings(dry_run=args.dry_run)
    asyncio.run(ingest(cfg))
