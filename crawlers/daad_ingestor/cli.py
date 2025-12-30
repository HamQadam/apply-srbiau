#!/usr/bin/env python3
"""
DAAD Crawler CLI

Command-line interface for running the DAAD crawler with various options.

Usage:
    daad-ingest ingest [options]
    daad-ingest analyze-failures [options]
    
Examples:
    # Full crawl
    daad-ingest ingest
    
    # Dry run (no DB writes)
    daad-ingest ingest --dry-run
    
    # Resume from checkpoint
    daad-ingest ingest --resume
    
    # Analyze failed items
    daad-ingest analyze-failures --file /state/failed_items.jsonl
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

from .config import Settings
from .daad_crawler import DaadCrawler
from .db import PgStore
from .state import StateStore
from ..base import IngestionEngine, IngestionConfig


def setup_logging(verbose: bool = False, log_file: str | None = None) -> None:
    """Configure logging with structured output."""
    level = logging.DEBUG if verbose else logging.INFO
    
    # Format with timestamp and level
    fmt = "%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s"
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
    
    # Reduce noise from httpx
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


async def run_ingest(args: argparse.Namespace, cfg: Settings) -> int:
    """Run the ingestion process."""
    log = logging.getLogger("cli.ingest")
    
    # Load state for resumption
    state = StateStore(cfg.checkpoint_path)
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
        failed_items_path=cfg.failed_items_path,
        db_wait_timeout_s=cfg.db_wait_timeout_s,
    )
    engine = IngestionEngine(db, ingestion_config)
    
    try:
        await db.aopen()
        
        # Run ingestion
        crawl_stats, ingest_stats = await engine.run(crawler)
        
        # Save final state
        if not args.dry_run and crawl_stats:
            # Note: In production, you'd track offsets more granularly
            log.info("Crawl completed successfully")
        
        # Return non-zero if there were failures
        if crawl_stats and crawl_stats.total_failed > 0:
            return 1
        return 0
        
    finally:
        await db.aclose()


async def run_analyze(args: argparse.Namespace) -> int:
    """Analyze failed items from a previous run."""
    log = logging.getLogger("cli.analyze")
    
    failed_file = Path(args.file)
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
    
    print("\n" + "=" * 60)
    print("FAILURE ANALYSIS REPORT")
    print("=" * 60)
    print(f"\nTotal failures: {len(errors)}")
    
    print("\nBy Error Type:")
    for err_type, count in by_type.most_common():
        print(f"  {err_type}: {count}")
    
    print("\nBy Source:")
    for source, count in by_source.most_common():
        print(f"  {source}: {count}")
    
    # Show examples
    if args.examples > 0:
        print(f"\nSample failures (first {args.examples}):")
        for i, err in enumerate(errors[:args.examples]):
            print(f"\n  [{i+1}] Source ID: {err.get('source_id', 'unknown')}")
            err_info = err.get("error") or {}
            print(f"      Type: {err_info.get('error_type', 'UNKNOWN')}")
            print(f"      Message: {err_info.get('message', 'No message')[:100]}")
    
    print("\n" + "=" * 60)
    
    # Export detailed report if requested
    if args.output:
        report = {
            "generated_at": datetime.utcnow().isoformat(),
            "total_failures": len(errors),
            "by_error_type": dict(by_type),
            "by_source": dict(by_source),
            "errors": errors,
        }
        with open(args.output, "w") as f:
            json.dump(report, f, indent=2)
        log.info("Detailed report written to: %s", args.output)
    
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="daad-ingest",
        description="DAAD Crawler - Fetch and ingest German study programs",
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
    
    # Ingest command
    ingest_parser = subparsers.add_parser(
        "ingest",
        help="Run the DAAD crawler and ingest to database",
    )
    ingest_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Don't write to database, just log what would happen",
    )
    ingest_parser.add_argument(
        "--resume",
        action="store_true",
        help="Resume from last checkpoint",
    )
    
    # Analyze command
    analyze_parser = subparsers.add_parser(
        "analyze-failures",
        help="Analyze failed items from a previous run",
    )
    analyze_parser.add_argument(
        "--file",
        type=str,
        default="/state/failed_items.jsonl",
        help="Path to failed items file",
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
    
    args = parser.parse_args()
    setup_logging(verbose=args.verbose, log_file=args.log_file)
    
    cfg = Settings()
    
    if args.command == "ingest":
        return asyncio.run(run_ingest(args, cfg))
    elif args.command == "analyze-failures":
        return asyncio.run(run_analyze(args))
    else:
        parser.print_help()
        return 1


if __name__ == "__main__":
    sys.exit(main())
