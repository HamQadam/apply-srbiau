#!/usr/bin/env python3
"""
Ghadam Crawlers CLI

Unified command-line interface for running crawlers from various sources.

Usage:
    crawl daad [options]
    crawl studyinnl [options]
    crawl analyze-failures [options]
    
Examples:
    # Full DAAD crawl
    crawl daad
    
    # StudyInNL with limit for testing
    crawl studyinnl --max-programs 100
    
    # Dry run (no DB writes)
    crawl daad --dry-run
    crawl studyinnl --dry-run
    
    # Analyze failed items
    crawl analyze-failures --source studyinnl
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# ─────────────────────────────────────────────────────────────────────────────
# Unified Settings
# ─────────────────────────────────────────────────────────────────────────────

class CrawlerSettings(BaseSettings):
    """Unified settings for all crawlers."""
    
    model_config = SettingsConfigDict(
        env_prefix="",
        extra="ignore",
        env_file=".env",
        env_file_encoding="utf-8",
    )

    # ─────────────────────────────────────────────────────────────
    # Database Configuration
    # ─────────────────────────────────────────────────────────────
    database_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
    )
    postgres_user: str | None = Field(
        default=None,
        validation_alias=AliasChoices("POSTGRES_USER", "postgres_user"),
    )
    postgres_password: str | None = Field(
        default=None,
        validation_alias=AliasChoices("POSTGRES_PASSWORD", "postgres_password"),
    )
    postgres_db: str | None = Field(
        default=None,
        validation_alias=AliasChoices("POSTGRES_DB", "postgres_db"),
    )
    postgres_host: str = Field(
        default="database",
        validation_alias=AliasChoices("POSTGRES_HOST", "postgres_host"),
    )
    postgres_port: int = Field(
        default=5432,
        validation_alias=AliasChoices("POSTGRES_PORT", "postgres_port"),
    )
    db_schema: str = Field(
        default="public",
        validation_alias=AliasChoices("DB_SCHEMA", "db_schema"),
    )
    db_pool_max: int = Field(
        default=10,
        validation_alias=AliasChoices("DB_POOL_MAX", "db_pool_max"),
    )
    db_wait_timeout_s: int = Field(
        default=120,
        validation_alias=AliasChoices("DB_WAIT_TIMEOUT_S", "db_wait_timeout_s"),
    )

    # ─────────────────────────────────────────────────────────────
    # Runtime Configuration
    # ─────────────────────────────────────────────────────────────
    batch_size: int = Field(
        default=50,
        validation_alias=AliasChoices("BATCH_SIZE", "batch_size"),
    )
    state_dir: str = Field(
        default="/state",
        validation_alias=AliasChoices("STATE_DIR", "state_dir"),
    )

    # ─────────────────────────────────────────────────────────────
    # DAAD-specific
    # ─────────────────────────────────────────────────────────────
    daad_base_url: str = "https://www2.daad.de/deutschland/studienangebote/international-programmes/api/solr"
    daad_lang: str = "en"
    daad_rps: float = 2.0
    daad_page_size: int = Field(
        default=100,
        validation_alias=AliasChoices("DAAD_PAGE_SIZE", "daad_page_size"),
    )

    # ─────────────────────────────────────────────────────────────
    # StudyInNL-specific
    # ─────────────────────────────────────────────────────────────
    studyinnl_base_url: str = "https://www.studyinnl.org/api/programs"
    studyinnl_rps: float = 2.0
    studyinnl_page_size: int = Field(
        default=50,
        validation_alias=AliasChoices("STUDYINNL_PAGE_SIZE", "studyinnl_page_size"),
    )

    def effective_database_url(self) -> str:
        if self.database_url:
            return self.database_url

        missing = [
            k for k in ("postgres_user", "postgres_password", "postgres_db")
            if getattr(self, k) in (None, "")
        ]
        if missing:
            raise ValueError(
                f"Missing database configuration: {missing}. "
                f"Provide DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB."
            )

        user = quote_plus(self.postgres_user or "")
        pwd = quote_plus(self.postgres_password or "")
        db = quote_plus(self.postgres_db or "")
        host = self.postgres_host
        port = int(self.postgres_port)

        return f"postgresql://{user}:{pwd}@{host}:{port}/{db}"
    
    def failed_items_path(self, source: str) -> str:
        return f"{self.state_dir}/{source}_failed_items.jsonl"
    
    def checkpoint_path(self, source: str) -> str:
        return f"{self.state_dir}/{source}_checkpoint.json"


# ─────────────────────────────────────────────────────────────────────────────
# Logging Setup
# ─────────────────────────────────────────────────────────────────────────────

def setup_logging(verbose: bool = False, log_file: str | None = None) -> None:
    """Configure logging with structured output."""
    level = logging.DEBUG if verbose else logging.INFO
    
    fmt = "%(asctime)s | %(levelname)-8s | %(name)-25s | %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"
    
    handlers: list[logging.Handler] = [
        logging.StreamHandler(sys.stdout)
    ]
    
    if log_file:
        handlers.append(logging.FileHandler(log_file))
    
    logging.basicConfig(
        level=level,
        format=fmt,
        datefmt=datefmt,
        handlers=handlers,
    )
    
    # Reduce noise
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


# ─────────────────────────────────────────────────────────────────────────────
# Crawler Commands
# ─────────────────────────────────────────────────────────────────────────────

async def run_daad(args: argparse.Namespace, cfg: CrawlerSettings) -> int:
    """Run DAAD crawler."""
    from daad_ingestor import DaadCrawler, PgStore
    from daad_ingestor.state import StateStore
    from base import IngestionEngine, IngestionConfig
    
    log = logging.getLogger("cli.daad")
    
    # Load state for resumption
    state = StateStore(cfg.checkpoint_path("daad"))
    start_offsets = {}
    
    if args.resume:
        for degree in ["bachelor", "master", "phd"]:
            offset = state.get_offset(degree)
            if offset > 0:
                start_offsets[degree] = offset
                log.info("Resuming %s from offset %d", degree, offset)
    
    # Create crawler
    crawler = DaadCrawler(
        base_url=cfg.daad_base_url,
        lang=cfg.daad_lang,
        rps=cfg.daad_rps,
        page_size=cfg.daad_page_size,
        start_offsets=start_offsets,
    )
    
    # Create database store
    db = PgStore(
        dsn=cfg.effective_database_url(),
        schema=cfg.db_schema,
        pool_max=cfg.db_pool_max,
    )
    
    # Create ingestion engine
    ingestion_config = IngestionConfig(
        batch_size=cfg.batch_size,
        dry_run=args.dry_run,
        save_failed_items=True,
        failed_items_path=cfg.failed_items_path("daad"),
        db_wait_timeout_s=cfg.db_wait_timeout_s,
    )
    engine = IngestionEngine(db, ingestion_config)
    
    try:
        await db.aopen()
        crawl_stats, ingest_stats = await engine.run(crawler)
        
        if crawl_stats and crawl_stats.total_failed > 0:
            return 1
        return 0
        
    finally:
        await db.aclose()


async def run_studyinnl(args: argparse.Namespace, cfg: CrawlerSettings) -> int:
    """Run StudyInNL crawler."""
    from studyinnl_ingestor import StudyInNLCrawler
    from daad_ingestor import PgStore  # Reuse PgStore
    from base import IngestionEngine, IngestionConfig
    
    log = logging.getLogger("cli.studyinnl")
    
    # Create crawler
    crawler = StudyInNLCrawler(
        base_url=cfg.studyinnl_base_url,
        rps=cfg.studyinnl_rps,
        page_size=cfg.studyinnl_page_size,
        start_offset=args.offset or 0,
        max_programs=args.max_programs,
    )
    
    # Create database store
    db = PgStore(
        dsn=cfg.effective_database_url(),
        schema=cfg.db_schema,
        pool_max=cfg.db_pool_max,
    )
    
    # Create ingestion engine
    ingestion_config = IngestionConfig(
        batch_size=cfg.batch_size,
        dry_run=args.dry_run,
        save_failed_items=True,
        failed_items_path=cfg.failed_items_path("studyinnl"),
        db_wait_timeout_s=cfg.db_wait_timeout_s,
    )
    engine = IngestionEngine(db, ingestion_config)
    
    try:
        await db.aopen()
        crawl_stats, ingest_stats = await engine.run(crawler)
        
        if crawl_stats and crawl_stats.total_failed > 0:
            return 1
        return 0
        
    finally:
        await db.aclose()


async def run_analyze(args: argparse.Namespace, cfg: CrawlerSettings) -> int:
    """Analyze failed items from a previous run."""
    log = logging.getLogger("cli.analyze")
    
    # Determine file path
    if args.file:
        failed_file = Path(args.file)
    elif args.source:
        failed_file = Path(cfg.failed_items_path(args.source))
    else:
        log.error("Must specify --source or --file")
        return 1
    
    if not failed_file.exists():
        log.error("Failed items file not found: %s", failed_file)
        return 1
    
    # Load and analyze failures
    errors: list[dict[str, Any]] = []
    with open(failed_file) as f:
        for line in f:
            if line.strip():
                errors.append(json.loads(line))
    
    if not errors:
        log.info("No failures found in %s", failed_file)
        return 0
    
    log.info("Analyzing %d failures from %s", len(errors), failed_file)
    
    # Group by error type
    by_type: Counter[str] = Counter()
    by_source: Counter[str] = Counter()
    
    for err in errors:
        err_info = err.get("error") or {}
        by_type[err_info.get("error_type", "UNKNOWN")] += 1
        by_source[err.get("source", "unknown")] += 1
    
    print("\n" + "=" * 70)
    print("FAILURE ANALYSIS REPORT")
    print("=" * 70)
    print(f"\nFile: {failed_file}")
    print(f"Total failures: {len(errors)}")
    
    print("\n" + "-" * 40)
    print("By Error Type:")
    print("-" * 40)
    for err_type, count in by_type.most_common():
        pct = count / len(errors) * 100
        print(f"  {err_type:40s} {count:5d} ({pct:5.1f}%)")
    
    print("\n" + "-" * 40)
    print("By Source:")
    print("-" * 40)
    for source, count in by_source.most_common():
        print(f"  {source:40s} {count:5d}")
    
    # Show examples
    if args.examples > 0:
        print("\n" + "-" * 40)
        print(f"Sample failures (first {args.examples}):")
        print("-" * 40)
        for i, err in enumerate(errors[:args.examples]):
            print(f"\n  [{i+1}] Source ID: {err.get('source_id', 'unknown')}")
            err_info = err.get("error") or {}
            print(f"      Type: {err_info.get('error_type', 'UNKNOWN')}")
            msg = err_info.get("message", "No message")
            print(f"      Message: {msg[:100]}{'...' if len(msg) > 100 else ''}")
            if err.get("warnings"):
                print(f"      Warnings: {err.get('warnings')[:3]}")
    
    print("\n" + "=" * 70)
    
    # Export detailed report if requested
    if args.output:
        report = {
            "generated_at": datetime.utcnow().isoformat(),
            "source_file": str(failed_file),
            "total_failures": len(errors),
            "by_error_type": dict(by_type),
            "by_source": dict(by_source),
            "errors": errors,
        }
        with open(args.output, "w") as f:
            json.dump(report, f, indent=2)
        log.info("Detailed report written to: %s", args.output)
    
    return 0


async def run_list_sources(args: argparse.Namespace) -> int:
    """List available crawler sources."""
    print("\nAvailable Crawler Sources:")
    print("=" * 50)
    print()
    print("  daad")
    print("    German Academic Exchange Service")
    print("    Country: Germany")
    print("    Programs: ~2000+ (Bachelor, Master, PhD)")
    print()
    print("  studyinnl")
    print("    Study in Netherlands")
    print("    Country: Netherlands")
    print("    Programs: ~1700+ (Bachelor, Master, Short courses)")
    print()
    print("=" * 50)
    return 0


# ─────────────────────────────────────────────────────────────────────────────
# Main Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        prog="crawl",
        description="Ghadam Crawlers - Fetch academic programs from various sources",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  crawl daad                      # Crawl all DAAD programs
  crawl studyinnl --max-programs 100  # Crawl first 100 StudyInNL programs
  crawl daad --dry-run            # Test without database writes
  crawl analyze-failures --source daad  # Analyze DAAD failures
  crawl sources                   # List available sources
        """,
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose (debug) logging",
    )
    parser.add_argument(
        "--log-file",
        type=str,
        help="Write logs to file",
    )
    
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # ─────────────────────────────────────────────────────────────
    # DAAD Command
    # ─────────────────────────────────────────────────────────────
    daad_parser = subparsers.add_parser(
        "daad",
        help="Crawl DAAD (German programs)",
    )
    daad_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Don't write to database",
    )
    daad_parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from last checkpoint",
    )
    
    # ─────────────────────────────────────────────────────────────
    # StudyInNL Command
    # ─────────────────────────────────────────────────────────────
    studyinnl_parser = subparsers.add_parser(
        "studyinnl",
        help="Crawl StudyInNL (Dutch programs)",
    )
    studyinnl_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Don't write to database",
    )
    studyinnl_parser.add_argument(
        "--offset",
        type=int,
        default=0,
        help="Starting offset for pagination",
    )
    studyinnl_parser.add_argument(
        "--max-programs",
        type=int,
        default=None,
        help="Maximum programs to fetch (for testing)",
    )
    
    # ─────────────────────────────────────────────────────────────
    # Analyze Command
    # ─────────────────────────────────────────────────────────────
    analyze_parser = subparsers.add_parser(
        "analyze-failures",
        help="Analyze failed items from a crawl",
    )
    analyze_parser.add_argument(
        "--source",
        type=str,
        choices=["daad", "studyinnl"],
        help="Source to analyze (uses default path)",
    )
    analyze_parser.add_argument(
        "--file",
        type=str,
        help="Explicit path to failed items file",
    )
    analyze_parser.add_argument(
        "--examples",
        type=int,
        default=5,
        help="Number of example failures to show",
    )
    analyze_parser.add_argument(
        "--output",
        type=str,
        help="Write detailed JSON report to file",
    )
    
    # ─────────────────────────────────────────────────────────────
    # Sources Command
    # ─────────────────────────────────────────────────────────────
    sources_parser = subparsers.add_parser(
        "sources",
        help="List available crawler sources",
    )
    
    args = parser.parse_args()
    setup_logging(verbose=args.verbose, log_file=args.log_file)
    
    cfg = CrawlerSettings()
    
    if args.command == "daad":
        return asyncio.run(run_daad(args, cfg))
    elif args.command == "studyinnl":
        return asyncio.run(run_studyinnl(args, cfg))
    elif args.command == "analyze-failures":
        return asyncio.run(run_analyze(args, cfg))
    elif args.command == "sources":
        return asyncio.run(run_list_sources(args))
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
