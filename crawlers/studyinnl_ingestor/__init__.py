"""
StudyInNL Ingestor - Crawler for Dutch academic programs.

This module provides a crawler for the Study in Netherlands (studyinnl.org)
database of international study programs in the Netherlands.

Usage:
    from studyinnl_ingestor import StudyInNLCrawler
    
    crawler = StudyInNLCrawler()
    async for result in crawler.crawl():
        print(result.course_payload)
"""
from .studyinnl_crawler import StudyInNLCrawler
from .config import StudyInNLSettings

__all__ = [
    "StudyInNLCrawler",
    "StudyInNLSettings",
]

__version__ = "1.0.0"
