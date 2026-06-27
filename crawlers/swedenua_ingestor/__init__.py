"""
Sweden University Admissions Ingestor - Crawler for Swedish academic programs.

Crawls universityadmissions.se — the official Swedish admissions portal (UHR)
— via its internal JSON API, which powers the Angular SPA search.

API discovery notes:
  - Base:        https://www.universityadmissions.se/intl/
  - Session:     GET  /intl/api/session  (returns JSESSIONID + CSRFTOKEN)
  - Semesters:   GET  /intl/api/sok/terminer
  - Search:      POST /intl/api/sok  (body: SwedenUASearchRequest)
  - Institutions: GET /intl/api/sok/larosaten
  - Subjects:    GET  /intl/api/sok/amnen
  - Degrees:     GET  /intl/api/sok/examina

Usage:
    from swedenua_ingestor import SwedenUACrawler

    crawler = SwedenUACrawler()
    async for result in crawler.crawl():
        print(result.raw_payload)
"""
from .swedenua_crawler import SwedenUACrawler

__all__ = ["SwedenUACrawler"]

__version__ = "1.0.0"
