"""
Base crawler module - Abstract base class for all crawlers.

This module provides the foundation for building extensible crawlers
that can be easily added to the system.
"""
from __future__ import annotations

import abc
import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, AsyncIterator, TypeVar, Generic


class CrawlStatus(str, Enum):
    """Status of a crawl operation."""
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class CrawlError:
    """Represents an error that occurred during crawling."""
    source_id: str
    error_type: str
    message: str
    raw_data: dict[str, Any] | None = None
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "source_id": self.source_id,
            "error_type": self.error_type,
            "message": self.message,
            "timestamp": self.timestamp.isoformat(),
            "raw_data_keys": list(self.raw_data.keys()) if self.raw_data else [],
        }


@dataclass
class CrawlResult:
    """Result of processing a single item."""
    source_id: str
    status: CrawlStatus
    university_payload: dict[str, Any] | None = None
    course_payload: dict[str, Any] | None = None
    error: CrawlError | None = None
    warnings: list[str] = field(default_factory=list)
    
    @property
    def is_success(self) -> bool:
        return self.status in (CrawlStatus.SUCCESS, CrawlStatus.PARTIAL)


@dataclass
class CrawlStats:
    """Statistics for a crawl run."""
    source_name: str
    started_at: datetime = field(default_factory=datetime.utcnow)
    finished_at: datetime | None = None
    total_fetched: int = 0
    total_processed: int = 0
    total_success: int = 0
    total_partial: int = 0
    total_failed: int = 0
    total_skipped: int = 0
    errors: list[CrawlError] = field(default_factory=list)
    
    def record(self, result: CrawlResult) -> None:
        """Record a result in the stats."""
        self.total_processed += 1
        if result.status == CrawlStatus.SUCCESS:
            self.total_success += 1
        elif result.status == CrawlStatus.PARTIAL:
            self.total_partial += 1
        elif result.status == CrawlStatus.FAILED:
            self.total_failed += 1
            if result.error:
                self.errors.append(result.error)
        elif result.status == CrawlStatus.SKIPPED:
            self.total_skipped += 1
    
    def finish(self) -> None:
        self.finished_at = datetime.utcnow()
    
    @property
    def duration_seconds(self) -> float | None:
        if self.finished_at:
            return (self.finished_at - self.started_at).total_seconds()
        return None
    
    @property
    def success_rate(self) -> float:
        if self.total_processed == 0:
            return 0.0
        return (self.total_success + self.total_partial) / self.total_processed * 100
    
    def to_dict(self) -> dict[str, Any]:
        return {
            "source_name": self.source_name,
            "started_at": self.started_at.isoformat(),
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
            "duration_seconds": self.duration_seconds,
            "total_fetched": self.total_fetched,
            "total_processed": self.total_processed,
            "total_success": self.total_success,
            "total_partial": self.total_partial,
            "total_failed": self.total_failed,
            "total_skipped": self.total_skipped,
            "success_rate": f"{self.success_rate:.1f}%",
            "error_count": len(self.errors),
        }
    
    def log_summary(self, log: logging.Logger) -> None:
        """Log a summary of the crawl run."""
        log.info("=" * 60)
        log.info("CRAWL SUMMARY: %s", self.source_name)
        log.info("=" * 60)
        log.info("Duration: %.1f seconds", self.duration_seconds or 0)
        log.info("Total fetched: %d", self.total_fetched)
        log.info("Total processed: %d", self.total_processed)
        log.info("  ✓ Success: %d", self.total_success)
        log.info("  ~ Partial: %d", self.total_partial)
        log.info("  ✗ Failed: %d", self.total_failed)
        log.info("  - Skipped: %d", self.total_skipped)
        log.info("Success rate: %.1f%%", self.success_rate)
        
        if self.errors:
            log.warning("-" * 40)
            log.warning("ERRORS (%d):", len(self.errors))
            # Group errors by type
            error_types: dict[str, list[CrawlError]] = {}
            for err in self.errors:
                error_types.setdefault(err.error_type, []).append(err)
            
            for err_type, errs in error_types.items():
                log.warning("  %s: %d occurrences", err_type, len(errs))
                # Show first 3 examples
                for e in errs[:3]:
                    log.warning("    - [%s] %s", e.source_id, e.message[:100])
        
        log.info("=" * 60)


T = TypeVar('T')  # Raw item type from source


class BaseCrawler(abc.ABC, Generic[T]):
    """
    Abstract base class for all crawlers.
    
    Subclasses should implement:
    - source_name: Name of the data source
    - fetch_items: Async generator yielding raw items from source
    - transform: Convert raw item to CrawlResult with payloads
    """
    
    def __init__(self):
        self.log = logging.getLogger(f"crawler.{self.source_name}")
        self._stats: CrawlStats | None = None
    
    @property
    @abc.abstractmethod
    def source_name(self) -> str:
        """Name of this data source (e.g., 'daad', 'studyportals')."""
        pass
    
    @abc.abstractmethod
    async def fetch_items(self) -> AsyncIterator[T]:
        """
        Async generator that yields raw items from the source.
        Should handle pagination, rate limiting, etc.
        """
        pass
    
    @abc.abstractmethod
    def transform(self, raw_item: T) -> CrawlResult:
        """
        Transform a raw item into structured payloads.
        
        Should return a CrawlResult with:
        - university_payload: Dict for upserting university
        - course_payload: Dict for upserting course (without university_id yet)
        - status: SUCCESS, PARTIAL (some fields missing), FAILED, or SKIPPED
        - error: CrawlError if status is FAILED
        - warnings: List of non-fatal issues
        """
        pass
    
    async def setup(self) -> None:
        """Optional setup before crawling starts."""
        pass
    
    async def teardown(self) -> None:
        """Optional cleanup after crawling ends."""
        pass
    
    def create_error(
        self,
        source_id: str,
        error_type: str,
        message: str,
        raw_data: dict[str, Any] | None = None
    ) -> CrawlError:
        """Helper to create a CrawlError."""
        return CrawlError(
            source_id=source_id,
            error_type=error_type,
            message=message,
            raw_data=raw_data,
        )
    
    async def crawl(self) -> AsyncIterator[CrawlResult]:
        """
        Main crawl method. Yields CrawlResults for each item.
        Handles errors gracefully and logs progress.
        """
        self._stats = CrawlStats(source_name=self.source_name)
        
        try:
            await self.setup()
            self.log.info("Starting crawl for %s", self.source_name)
            
            async for raw_item in self.fetch_items():
                self._stats.total_fetched += 1
                
                try:
                    result = self.transform(raw_item)
                    self._stats.record(result)
                    
                    if result.warnings:
                        for w in result.warnings:
                            self.log.warning("[%s] %s", result.source_id, w)
                    
                    if result.status == CrawlStatus.FAILED:
                        self.log.error(
                            "[%s] Transform failed: %s",
                            result.source_id,
                            result.error.message if result.error else "Unknown"
                        )
                    
                    yield result
                    
                except Exception as e:
                    # Catch any unexpected errors during transform
                    source_id = self._extract_source_id(raw_item)
                    error = self.create_error(
                        source_id=source_id,
                        error_type="TRANSFORM_EXCEPTION",
                        message=str(e),
                        raw_data=raw_item if isinstance(raw_item, dict) else None,
                    )
                    result = CrawlResult(
                        source_id=source_id,
                        status=CrawlStatus.FAILED,
                        error=error,
                    )
                    self._stats.record(result)
                    self.log.exception("[%s] Unexpected error during transform", source_id)
                    yield result
                
                # Log progress every 100 items
                if self._stats.total_processed % 100 == 0:
                    self.log.info(
                        "Progress: %d processed (%d success, %d failed)",
                        self._stats.total_processed,
                        self._stats.total_success,
                        self._stats.total_failed,
                    )
        
        finally:
            await self.teardown()
            self._stats.finish()
            self._stats.log_summary(self.log)
    
    def _extract_source_id(self, raw_item: T) -> str:
        """Try to extract an ID from raw item for error reporting."""
        if isinstance(raw_item, dict):
            for key in ('id', 'course_id', 'program_id', 'url'):
                if key in raw_item:
                    return str(raw_item[key])
        return "unknown"
    
    @property
    def stats(self) -> CrawlStats | None:
        """Get current crawl statistics."""
        return self._stats
