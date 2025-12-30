"""
DAAD Crawler - Fetches German academic programs from DAAD.

DAAD (German Academic Exchange Service) provides a comprehensive
database of international study programs in Germany.
"""
from __future__ import annotations

import re
from typing import Any, AsyncIterator
from datetime import date

import httpx
from aiolimiter import AsyncLimiter
from tenacity import retry, wait_exponential_jitter, stop_after_attempt, retry_if_exception_type

from ..base import BaseCrawler, CrawlResult, CrawlStatus
from .transformers import DaadTransformer


RETRYABLE = (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError)


class DaadCrawler(BaseCrawler[dict[str, Any]]):
    """
    Crawler for DAAD international programs database.
    
    Supports crawling bachelor, master, and PhD programs.
    """
    
    source_name = "daad"
    
    def __init__(
        self,
        base_url: str = "https://www2.daad.de/deutschland/studienangebote/international-programmes/api/solr",
        lang: str = "en",
        rps: float = 2.0,
        timeout_s: float = 30.0,
        page_size: int = 100,
        degree_codes: dict[str, int] | None = None,
        start_offsets: dict[str, int] | None = None,
    ):
        super().__init__()
        self.base_url = base_url.rstrip("/")
        self.lang = lang
        self.timeout = httpx.Timeout(timeout_s)
        self.page_size = page_size
        self.limiter = AsyncLimiter(max_rate=max(1, int(rps)), time_period=1) if rps > 0 else None
        
        # Degree type codes (DAAD's internal mapping)
        self.degree_codes = degree_codes or {
            "bachelor": 1,
            "master": 2,
            "phd": 3,
        }
        
        # Allow resuming from specific offsets
        self.start_offsets = start_offsets or {}
        
        # HTTP client - created in setup
        self._client: httpx.AsyncClient | None = None
        self._transformer = DaadTransformer()
    
    async def setup(self) -> None:
        self._client = httpx.AsyncClient(
            headers={
                "Accept": "application/json",
                "User-Agent": "ghadam-crawler/2.0 (+https://github.com/ghadam-app; respectful-crawler)",
            },
            timeout=self.timeout,
            http2=True,
            follow_redirects=True,
        )
    
    async def teardown(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None
    
    @retry(
        wait=wait_exponential_jitter(initial=1, max=20),
        stop=stop_after_attempt(8),
        retry=retry_if_exception_type(RETRYABLE),
    )
    async def _fetch_page(self, degree_code: int, offset: int) -> dict[str, Any]:
        """Fetch a single page of results from DAAD API."""
        assert self._client is not None
        
        url = f"{self.base_url}/{self.lang}/search.json"
        params = {
            "degree[]": str(degree_code),
            "q": "",
            "sort": "4",  # Sort by relevance
            "display": "list",
            "limit": str(self.page_size),
            "offset": str(offset),
        }
        
        if self.limiter:
            async with self.limiter:
                resp = await self._client.get(url, params=params)
        else:
            resp = await self._client.get(url, params=params)
        
        resp.raise_for_status()
        return resp.json()
    
    async def fetch_items(self) -> AsyncIterator[dict[str, Any]]:
        """
        Fetch all programs from DAAD, iterating through degree types and pages.
        
        Each yielded item contains the raw program data plus degree_level metadata.
        """
        for degree_level, degree_code in self.degree_codes.items():
            offset = self.start_offsets.get(degree_level, 0)
            self.log.info(
                "Starting %s programs (code=%d) from offset=%d",
                degree_level, degree_code, offset
            )
            
            consecutive_empty = 0
            max_consecutive_empty = 3  # Stop after 3 empty pages (safety)
            
            while True:
                try:
                    page = await self._fetch_page(degree_code, offset)
                    courses = page.get("courses") or []
                    
                    if not courses:
                        consecutive_empty += 1
                        self.log.info(
                            "Empty page for %s at offset=%d (%d consecutive)",
                            degree_level, offset, consecutive_empty
                        )
                        if consecutive_empty >= max_consecutive_empty:
                            self.log.info("Finished %s programs", degree_level)
                            break
                        offset += self.page_size
                        continue
                    
                    consecutive_empty = 0
                    
                    for course in courses:
                        # Add metadata for transform
                        course["_degree_level"] = degree_level
                        course["_offset"] = offset
                        yield course
                    
                    offset += self.page_size
                    self.log.debug(
                        "%s: processed page at offset=%d (%d items)",
                        degree_level, offset - self.page_size, len(courses)
                    )
                    
                except Exception as e:
                    self.log.error(
                        "Error fetching %s at offset=%d: %s",
                        degree_level, offset, str(e)
                    )
                    # Continue to next page after error
                    offset += self.page_size
                    consecutive_empty += 1
                    if consecutive_empty >= max_consecutive_empty:
                        break
    
    def transform(self, raw_item: dict[str, Any]) -> CrawlResult:
        """Transform a DAAD program into university and course payloads."""
        return self._transformer.transform(raw_item)


class DaadTransformer:
    """
    Transforms raw DAAD API data into structured payloads.
    
    Separated from crawler for easier testing and maintenance.
    """
    
    REQUIRED_FIELDS = ["id", "courseName", "academy"]
    
    def transform(self, raw: dict[str, Any]) -> CrawlResult:
        """Transform raw DAAD data to CrawlResult."""
        source_id = str(raw.get("id", "unknown"))
        degree_level = raw.get("_degree_level", "master")
        warnings: list[str] = []
        
        # Check required fields
        missing = [f for f in self.REQUIRED_FIELDS if not raw.get(f)]
        if missing:
            return CrawlResult(
                source_id=source_id,
                status=CrawlStatus.FAILED,
                error=CrawlError(
                    source_id=source_id,
                    error_type="MISSING_REQUIRED_FIELDS",
                    message=f"Missing required fields: {missing}",
                    raw_data=raw,
                ),
            )
        
        # Build university payload
        university_payload = self._build_university(raw, warnings)
        
        # Build course payload
        try:
            course_payload = self._build_course(raw, degree_level, warnings)
        except Exception as e:
            return CrawlResult(
                source_id=source_id,
                status=CrawlStatus.FAILED,
                error=CrawlError(
                    source_id=source_id,
                    error_type="COURSE_BUILD_ERROR",
                    message=str(e),
                    raw_data=raw,
                ),
            )
        
        # Determine status based on data completeness
        status = CrawlStatus.SUCCESS
        if warnings:
            status = CrawlStatus.PARTIAL
        
        return CrawlResult(
            source_id=source_id,
            status=status,
            university_payload=university_payload,
            course_payload=course_payload,
            warnings=warnings,
        )
    
    def _build_university(self, raw: dict[str, Any], warnings: list[str]) -> dict[str, Any]:
        """Build university payload from raw data."""
        name = raw.get("academy") or "Unknown University"
        city = raw.get("city")
        
        if not city:
            city = "Unknown"
            warnings.append("Missing city for university")
        
        return {
            "name": name.strip(),
            "country": "Germany",
            "city": city.strip() if city else "Unknown",
            "website": None,
            "logo_url": None,
        }
    
    def _build_course(
        self,
        raw: dict[str, Any],
        degree_level: str,
        warnings: list[str]
    ) -> dict[str, Any]:
        """Build course payload from raw data."""
        # Parse complex fields
        teaching_language = self._parse_language(raw.get("languages"), warnings)
        duration_months = self._parse_duration(raw.get("programmeDuration"), warnings)
        is_free, fee_amount = self._parse_tuition(raw.get("tuitionFees"), warnings)
        d_fall, d_spring, d_notes = self._parse_deadlines(raw.get("applicationDeadline"), warnings)
        
        # Build program URL
        link = raw.get("link")
        program_url = f"https://www2.daad.de{link}" if link else None
        
        # Source tracking note
        source_note = f"source=daad; daad_course_id={raw.get('id')}"
        
        # Field/subject
        field = raw.get("subject") or raw.get("fieldOfStudy") or "General"
        if field == "General":
            warnings.append("Missing or generic field of study")
        
        return {
            "name": (raw.get("courseName") or "Unknown Program").strip(),
            "degree_level": degree_level.upper(),
            "field": field.strip(),
            "teaching_language": teaching_language,
            "duration_months": duration_months,
            "credits_ects": None,
            "tuition_fee_amount": fee_amount,
            "tuition_fee_currency": "EUR" if fee_amount is not None else None,
            "tuition_fee_per": "year",
            "is_tuition_free": is_free,
            "deadline_fall": d_fall,
            "deadline_spring": d_spring,
            "deadline_notes": d_notes,
            "program_url": program_url,
            "application_url": None,
            "description": self._clean_html(raw.get("description")),
            "notes": source_note,
            # Defaults
            "gpa_scale": "4.0",
            "gre_required": False,
            "gmat_required": False,
            "scholarships_available": False,
            "verified_by_count": 0,
            "view_count": 0,
        }
    
    def _parse_language(self, langs: list[str] | None, warnings: list[str]) -> str:
        """Parse teaching language from DAAD format."""
        if not langs:
            warnings.append("Missing teaching language, defaulting to OTHER")
            return "OTHER"
        
        norm = {l.strip().lower() for l in langs if l}
        
        if norm == {"english"}:
            return "ENGLISH"
        if norm == {"german"}:
            return "GERMAN"
        if "english" in norm:
            return "ENGLISH"  # Prefer English for searchability
        if "german" in norm:
            return "GERMAN"
        
        return "OTHER"
    
    def _parse_duration(self, duration_str: str | None, warnings: list[str]) -> int | None:
        """Parse duration string to months."""
        if not duration_str:
            warnings.append("Missing program duration")
            return None
        
        s = duration_str.strip().lower()
        
        # Try semester pattern
        m = re.search(r"(\d+)\s*semester", s)
        if m:
            return int(m.group(1)) * 6
        
        # Try month pattern
        m = re.search(r"(\d+)\s*month", s)
        if m:
            return int(m.group(1))
        
        # Try year pattern
        m = re.search(r"(\d+)\s*year", s)
        if m:
            return int(m.group(1)) * 12
        
        warnings.append(f"Could not parse duration: {duration_str}")
        return None
    
    def _parse_tuition(self, tuition_str: str | None, warnings: list[str]) -> tuple[bool, int | None]:
        """Parse tuition fees. Returns (is_free, amount)."""
        if not tuition_str:
            return (False, None)
        
        s = tuition_str.strip().lower()
        
        # Check for free
        if s in {"none", "no", "0", "0.0", "no tuition fees"}:
            return (True, 0)
        
        # Check for "varied" or "depends"
        if "varied" in s or "depending" in s or "varies" in s:
            warnings.append("Tuition fee varies - not extracted")
            return (False, None)
        
        # Extract digits
        digits = re.sub(r"[^\d]", "", tuition_str)
        if digits:
            return (False, int(digits))
        
        return (False, None)
    
    def _parse_deadlines(
        self,
        deadline_html: str | None,
        warnings: list[str]
    ) -> tuple[date | None, date | None, str | None]:
        """
        Parse deadline HTML to structured dates.
        Returns (deadline_fall, deadline_spring, deadline_notes).
        """
        notes = self._clean_html(deadline_html)
        if not notes:
            return (None, None, None)
        
        # For now, just preserve notes - date parsing is complex
        # TODO: Add dateparser integration if needed
        
        return (None, None, notes)
    
    def _clean_html(self, html: str | None) -> str | None:
        """Convert HTML to plain text."""
        if not html:
            return None
        
        s = html
        s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
        s = re.sub(r"</p\s*>", "\n", s, flags=re.I)
        s = re.sub(r"<[^>]+>", "", s)
        s = re.sub(r"\n{3,}", "\n\n", s)
        s = s.strip()
        
        return s if s else None


# Need to import CrawlError here to avoid circular import
from ..base.crawler import CrawlError
