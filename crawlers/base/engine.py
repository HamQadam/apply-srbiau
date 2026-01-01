"""
Ingestion Engine - Orchestrates crawlers and database operations.

This module provides the main engine that:
1. Takes a crawler instance
2. Processes crawl results
3. Upserts to database
4. Handles batching and transactions
"""
from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from .crawler import BaseCrawler, CrawlResult, CrawlStats

from db import PgStore


@dataclass
class IngestionConfig:
    """Configuration for the ingestion engine."""
    batch_size: int = 50
    dry_run: bool = False
    save_failed_items: bool = True
    failed_items_path: str = "/state/failed_items.jsonl"
    db_wait_timeout_s: int = 120


@dataclass
class IngestionStats:
    """Statistics for ingestion run."""
    started_at: datetime = field(default_factory=datetime.utcnow)
    finished_at: datetime | None = None
    universities_created: int = 0
    universities_updated: int = 0
    courses_created: int = 0
    courses_updated: int = 0
    items_skipped: int = 0
    items_failed: int = 0
    
    def finish(self) -> None:
        self.finished_at = datetime.utcnow()
    
    @property
    def duration_seconds(self) -> float | None:
        if self.finished_at:
            return (self.finished_at - self.started_at).total_seconds()
        return None
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "started_at": self.started_at.isoformat(),
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "duration_seconds": self.duration_seconds,
            "universities_created": self.universities_created,
            "universities_updated": self.universities_updated,
            "courses_created": self.courses_created,
            "courses_updated": self.courses_updated,
            "items_skipped": self.items_skipped,
            "items_failed": self.items_failed,
        }


class IngestionEngine:
    """
    Engine that processes crawler results and ingests into database.
    
    Usage:
        engine = IngestionEngine(db_store, config)
        await engine.run(crawler)
    """
    
    def __init__(self, db: PgStore, config: IngestionConfig | None = None):
        self.db = db
        self.config = config or IngestionConfig()
        self.log = logging.getLogger("ingestion-engine")
        self._stats: IngestionStats | None = None
        self._failed_items_file: Path | None = None
    
    async def run(self, crawler: "BaseCrawler") -> tuple["CrawlStats", IngestionStats]:
        """
        Run a crawler and ingest results into database.
        
        Returns:
            Tuple of (crawl_stats, ingestion_stats)
        """
        self._stats = IngestionStats()
        
        # Setup failed items file
        if self.config.save_failed_items:
            self._failed_items_file = Path(self.config.failed_items_path)
            self._failed_items_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Wait for database
        if not self.config.dry_run:
            self.log.info("Waiting for database to be ready...")
            await self.db.wait_until_ready(timeout_s=self.config.db_wait_timeout_s)
            self.log.info("Database ready!")
        
        # Buffer for batch processing
        buffer: list[tuple["CrawlResult", int]] = []  # (result, university_id)
        
        try:
            async for result in crawler.crawl():
                if not result.is_success:
                    self._stats.items_failed += 1
                    self._save_failed_item(result, crawler.source_name)
                    continue
                
                if result.university_payload is None or result.course_payload is None:
                    self._stats.items_skipped += 1
                    continue
                
                # Upsert university
                if self.config.dry_run:
                    uni_id = 0
                    self.log.debug("[DRY] University: %s", result.university_payload.get("name"))
                else:
                    uni_id = await self.db.upsert_university(result.university_payload)
                
                # Add to buffer
                buffer.append((result, uni_id))
                
                # Flush when buffer is full
                if len(buffer) >= self.config.batch_size:
                    await self._flush_buffer(buffer)
                    buffer.clear()
            
            # Flush remaining
            if buffer:
                await self._flush_buffer(buffer)
        
        finally:
            self._stats.finish()
            self._log_summary()
        
        return crawler.stats, self._stats
    
    async def _flush_buffer(self, buffer: list[tuple["CrawlResult", int]]) -> None:
        """Flush buffered items to database."""
        self.log.info("Flushing batch of %d items", len(buffer))
        
        if self.config.dry_run:
            for result, uni_id in buffer:
                self.log.debug(
                    "[DRY] Course: %s (uni_id=%d)",
                    result.course_payload.get("name") if result.course_payload else "?",
                    uni_id
                )
            return
        
        # Prepare course payloads with university_id
        course_payloads = []
        for result, uni_id in buffer:
            if result.course_payload:
                payload = dict(result.course_payload)
                payload["university_id"] = uni_id
                course_payloads.append(payload)
        
        # Batch upsert
        await self.db.upsert_courses_batch(course_payloads)
        
        # Update stats (simplified - assumes all are new/updated)
        self._stats.courses_created += len(course_payloads)
    
    def _save_failed_item(self, result: "CrawlResult", source_name: str) -> None:
        """Save failed item to file for later analysis."""
        if not self._failed_items_file:
            return
        
        record = {
            "timestamp": datetime.utcnow().isoformat(),
            "source": source_name,
            "source_id": result.source_id,
            "status": result.status.value,
            "error": result.error.to_dict() if result.error else None,
            "warnings": result.warnings,
        }
        
        with open(self._failed_items_file, "a") as f:
            f.write(json.dumps(record) + "\n")
    
    def _log_summary(self) -> None:
        """Log ingestion summary."""
        if not self._stats:
            return
        
        self.log.info("-" * 40)
        self.log.info("INGESTION SUMMARY")
        self.log.info("-" * 40)
        self.log.info("Duration: %.1f seconds", self._stats.duration_seconds or 0)
        self.log.info("Courses ingested: %d", self._stats.courses_created)
        self.log.info("Items skipped: %d", self._stats.items_skipped)
        self.log.info("Items failed: %d", self._stats.items_failed)
        
        if self._stats.items_failed > 0 and self._failed_items_file:
            self.log.info("Failed items saved to: %s", self._failed_items_file)
        
        self.log.info("-" * 40)
    
    @property
    def stats(self) -> IngestionStats | None:
        return self._stats
