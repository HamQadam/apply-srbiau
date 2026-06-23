"""
Ingestion Engine - Orchestrates crawlers and raw storage.

Stage 1 of the two-phase pipeline:
  Crawler fetches raw items → IngestionEngine batches them → RawStore writes
  to raw_crawl_items with parse_status='pending'.

Stage 2 (parsing) and Stage 3 (LLM) happen entirely in postprocess/ jobs.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from .crawler import BaseCrawler, CrawlResult, CrawlStats

from db import RawStore


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
    items_stored: int = 0
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
            "items_stored": self.items_stored,
            "items_skipped": self.items_skipped,
            "items_failed": self.items_failed,
        }


class IngestionEngine:
    """
    Engine that streams crawler results into raw_crawl_items.

    The engine no longer transforms data — it purely writes the raw payload
    that the crawler fetched from the source.  Transformation is handled by
    the parse pipeline in postprocess/.

    Each CrawlResult must carry:
      - source_id  (str)
      - raw_payload (dict)  ← the untouched API response item

    Usage:
        engine = IngestionEngine(raw_store, config)
        await engine.run(crawler)
    """

    def __init__(self, db: RawStore, config: IngestionConfig | None = None):
        self.db = db
        self.config = config or IngestionConfig()
        self.log = logging.getLogger("ingestion-engine")
        self._stats: IngestionStats | None = None
        self._failed_items_file: Path | None = None

    async def run(self, crawler: "BaseCrawler") -> tuple["CrawlStats", IngestionStats]:
        """
        Run a crawler and write raw results to raw_crawl_items.

        Returns:
            Tuple of (crawl_stats, ingestion_stats)
        """
        self._stats = IngestionStats()

        if self.config.save_failed_items:
            self._failed_items_file = Path(self.config.failed_items_path)
            self._failed_items_file.parent.mkdir(parents=True, exist_ok=True)

        if not self.config.dry_run:
            self.log.info("Waiting for database to be ready…")
            await self.db.wait_until_ready(timeout_s=self.config.db_wait_timeout_s)
            self.log.info("Database ready.")

        # Buffer: list of (source_id, raw_data)
        buffer: list[tuple[str, dict[str, Any]]] = []

        try:
            async for result in crawler.crawl():
                if not result.is_success:
                    self._stats.items_failed += 1
                    self._save_failed_item(result, crawler.source_name)
                    continue

                raw = result.raw_payload
                if raw is None:
                    self._stats.items_skipped += 1
                    continue

                buffer.append((result.source_id, raw))

                if len(buffer) >= self.config.batch_size:
                    await self._flush_buffer(buffer, crawler.source_name)
                    buffer.clear()

            if buffer:
                await self._flush_buffer(buffer, crawler.source_name)

        finally:
            self._stats.finish()
            self._log_summary()

        return crawler.stats, self._stats

    async def _flush_buffer(
        self,
        buffer: list[tuple[str, dict[str, Any]]],
        source_name: str,
    ) -> None:
        """Write a batch of raw items to raw_crawl_items."""
        self.log.info("Flushing batch of %d raw items (%s)", len(buffer), source_name)

        if self.config.dry_run:
            for source_id, raw in buffer:
                self.log.debug("[DRY] raw item source_id=%s", source_id)
            return

        items = [(source_name, source_id, raw) for source_id, raw in buffer]
        await self.db.upsert_batch(items)
        self._stats.items_stored += len(items)

    def _save_failed_item(self, result: "CrawlResult", source_name: str) -> None:
        """Save failed item to JSONL file for later analysis."""
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
        if not self._stats:
            return

        self.log.info("-" * 40)
        self.log.info("INGESTION SUMMARY")
        self.log.info("-" * 40)
        self.log.info("Duration:      %.1f seconds", self._stats.duration_seconds or 0)
        self.log.info("Items stored:  %d", self._stats.items_stored)
        self.log.info("Items skipped: %d", self._stats.items_skipped)
        self.log.info("Items failed:  %d", self._stats.items_failed)

        if self._stats.items_failed > 0 and self._failed_items_file:
            self.log.info("Failed items saved to: %s", self._failed_items_file)

        self.log.info("-" * 40)

    @property
    def stats(self) -> IngestionStats | None:
        return self._stats
