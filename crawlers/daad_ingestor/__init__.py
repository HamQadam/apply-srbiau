"""
DAAD Ingestor - Crawler for German academic programs.

This module provides a crawler for the DAAD (German Academic Exchange Service)
database of international study programs in Germany.

Usage:
    from daad_ingestor import DaadCrawler, IngestionEngine
    
    crawler = DaadCrawler()
    engine = IngestionEngine(db_store)
    stats = await engine.run(crawler)
"""
from .daad_crawler import DaadCrawler
from .db import PgStore
from .config import Settings
from .state import StateStore

__all__ = [
    "DaadCrawler",
    "PgStore",
    "Settings",
    "StateStore",
]

__version__ = "2.0.0"
