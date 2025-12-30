"""
StudyInNL Crawler - Fetches Dutch academic programs from studyinnl.org.

Study in Netherlands provides a comprehensive database of international
study programs in the Netherlands, including detailed information about:
- Tuition fees (statutory, international, institutional)
- Language requirements (IELTS, TOEFL, Cambridge, etc.)
- Scholarships
- Application deadlines
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any, AsyncIterator
from html import unescape

import httpx
from aiolimiter import AsyncLimiter
from tenacity import (
    retry,
    wait_exponential_jitter,
    stop_after_attempt,
    retry_if_exception_type,
)

from ..base import BaseCrawler, CrawlResult, CrawlStatus, CrawlError


RETRYABLE = (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError)


class StudyInNLCrawler(BaseCrawler[dict[str, Any]]):
    """
    Crawler for Study in Netherlands (studyinnl.org) programs database.
    
    Features:
    - Pagination support with configurable page size
    - Rate limiting to be respectful to the API
    - Rich data extraction including scholarships and language requirements
    - Automatic retry with exponential backoff
    """
    
    source_name = "studyinnl"
    
    def __init__(
        self,
        base_url: str = "https://www.studyinnl.org/api/programs",
        rps: float = 2.0,
        timeout_s: float = 30.0,
        page_size: int = 50,
        start_offset: int = 0,
        max_programs: int | None = None,  # Limit for testing
    ):
        super().__init__()
        self.base_url = base_url.rstrip("/")
        self.timeout = httpx.Timeout(timeout_s)
        self.page_size = page_size
        self.start_offset = start_offset
        self.max_programs = max_programs
        self.limiter = AsyncLimiter(max_rate=max(1, int(rps)), time_period=1) if rps > 0 else None
        
        self._client: httpx.AsyncClient | None = None
        self._transformer = StudyInNLTransformer()
        self._total_available: int | None = None
    
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
    async def _fetch_page(self, offset: int) -> dict[str, Any]:
        """Fetch a single page of results from StudyInNL API."""
        assert self._client is not None
        
        params = {
            "limit": str(self.page_size),
            "offset": str(offset),
        }
        
        if self.limiter:
            async with self.limiter:
                resp = await self._client.get(self.base_url, params=params)
        else:
            resp = await self._client.get(self.base_url, params=params)
        
        resp.raise_for_status()
        return resp.json()
    
    async def fetch_items(self) -> AsyncIterator[dict[str, Any]]:
        """
        Fetch all programs from StudyInNL, handling pagination.
        
        Each yielded item contains the raw program data from the API.
        """
        offset = self.start_offset
        total_yielded = 0
        consecutive_empty = 0
        max_consecutive_empty = 3
        
        while True:
            try:
                response = await self._fetch_page(offset)
                data = response.get("data", response)  # Handle both wrapped and unwrapped
                
                # Get total count on first request
                if self._total_available is None:
                    self._total_available = data.get("totalAmount") or data.get("numPrograms") or 0
                    self.log.info(
                        "StudyInNL reports %d total programs available",
                        self._total_available
                    )
                
                programs = data.get("programs") or []
                
                if not programs:
                    consecutive_empty += 1
                    self.log.info(
                        "Empty page at offset=%d (%d consecutive)",
                        offset, consecutive_empty
                    )
                    if consecutive_empty >= max_consecutive_empty:
                        self.log.info("Finished fetching - no more programs")
                        break
                    offset += self.page_size
                    continue
                
                consecutive_empty = 0
                
                for program in programs:
                    # Add metadata for debugging
                    program["_offset"] = offset
                    program["_source"] = "studyinnl"
                    yield program
                    total_yielded += 1
                    
                    # Check max limit
                    if self.max_programs and total_yielded >= self.max_programs:
                        self.log.info(
                            "Reached max_programs limit (%d)",
                            self.max_programs
                        )
                        return
                
                offset += self.page_size
                
                # Check if we've fetched all available
                if self._total_available and offset >= self._total_available:
                    self.log.info(
                        "Fetched all %d programs",
                        total_yielded
                    )
                    break
                
                self.log.debug(
                    "Fetched page at offset=%d (%d items, %d total so far)",
                    offset - self.page_size, len(programs), total_yielded
                )
                
            except Exception as e:
                self.log.error(
                    "Error fetching at offset=%d: %s",
                    offset, str(e)
                )
                offset += self.page_size
                consecutive_empty += 1
                if consecutive_empty >= max_consecutive_empty:
                    break
    
    def transform(self, raw_item: dict[str, Any]) -> CrawlResult:
        """Transform a StudyInNL program into university and course payloads."""
        return self._transformer.transform(raw_item)


class StudyInNLTransformer:
    """
    Transforms raw StudyInNL API data into structured payloads.
    
    Handles the rich data format including:
    - Institution details with logos and addresses
    - Multiple tuition fee types
    - Language requirements with different test types
    - Scholarships
    - Application deadlines (EU vs non-EU)
    """
    
    REQUIRED_FIELDS = ["id", "name"]
    
    # Map StudyInNL degree types to our schema
    DEGREE_MAP = {
        "master": "MASTER",
        "bachelor": "BACHELOR",
        "phd": "PHD",
        "short or summer course": "CERTIFICATE",
        "other": "CERTIFICATE",
    }
    
    # Map language test descriptions to our test types
    LANGUAGE_TEST_MAP = {
        "ielts": "IELTS",
        "toefl internet": "TOEFL_IBT",
        "toefl paper": "TOEFL_PBT",
        "toefl computer": "TOEFL_IBT",  # Map to IBT
        "cambridge certificate in advanced": "CAMBRIDGE_CAE",
        "cambridge certificate of proficiency": "CAMBRIDGE_CPE",
        "pearson": "PTE",
        "duolingo": "DUOLINGO",
    }
    
    def transform(self, raw: dict[str, Any]) -> CrawlResult:
        """Transform raw StudyInNL data to CrawlResult."""
        source_id = str(raw.get("id", "unknown"))
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
        
        # Check for institution
        institution = raw.get("institution")
        if not institution:
            return CrawlResult(
                source_id=source_id,
                status=CrawlStatus.FAILED,
                error=CrawlError(
                    source_id=source_id,
                    error_type="MISSING_INSTITUTION",
                    message="No institution data in program",
                    raw_data=raw,
                ),
            )
        
        # Build university payload
        try:
            university_payload = self._build_university(institution, raw, warnings)
        except Exception as e:
            return CrawlResult(
                source_id=source_id,
                status=CrawlStatus.FAILED,
                error=CrawlError(
                    source_id=source_id,
                    error_type="UNIVERSITY_BUILD_ERROR",
                    message=str(e),
                    raw_data=raw,
                ),
            )
        
        # Build course payload
        try:
            course_payload = self._build_course(raw, warnings)
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
        
        # Determine status
        status = CrawlStatus.SUCCESS if not warnings else CrawlStatus.PARTIAL
        
        return CrawlResult(
            source_id=source_id,
            status=status,
            university_payload=university_payload,
            course_payload=course_payload,
            warnings=warnings,
        )
    
    def _build_university(
        self,
        institution: dict[str, Any],
        raw: dict[str, Any],
        warnings: list[str]
    ) -> dict[str, Any]:
        """Build university payload from institution data."""
        name = institution.get("name") or "Unknown University"
        city = institution.get("city")
        
        # Try to get city from locations if not in institution
        if not city:
            locations = raw.get("locations") or []
            if locations:
                city = locations[0].get("name") or locations[0].get("city")
        
        if not city:
            city = "Unknown"
            warnings.append("Missing city for university")
        
        # Map sector to university type
        sector = institution.get("sector") or ""
        uni_type = None
        if "research" in sector.lower():
            uni_type = "research"
        elif "applied" in sector.lower():
            uni_type = "applied_sciences"
        elif "international" in sector.lower():
            uni_type = "international"
        
        return {
            "name": name.strip(),
            "country": "Netherlands",
            "city": city.strip(),
            "website": institution.get("url"),
            "logo_url": institution.get("logo_url"),
            "university_type": uni_type,
        }
    
    def _build_course(
        self,
        raw: dict[str, Any],
        warnings: list[str]
    ) -> dict[str, Any]:
        """Build course payload from program data."""
        # Parse degree level
        program_type = (raw.get("type") or "Master").lower()
        degree_level = self.DEGREE_MAP.get(program_type, "MASTER")
        
        # Parse teaching language
        languages = raw.get("languages") or []
        teaching_language = self._parse_teaching_language(languages, warnings)
        
        # Parse duration
        duration_months = self._parse_duration(raw.get("duration"), raw.get("ects_credits"), warnings)
        
        # Parse tuition - prefer international rate for our use case
        tuition = self._parse_tuition(raw.get("tuitions") or [], warnings)
        
        # Parse deadlines
        deadlines = self._parse_deadlines(raw.get("start_months") or [], warnings)
        
        # Parse field of study
        field = raw.get("field_of_study") or "General"
        if field == "General programmes":
            field = "General"
        
        # Build description
        description = self._clean_html(raw.get("description"))
        
        # Scholarships
        scholarships = raw.get("scholarships") or []
        has_scholarships = len(scholarships) > 0
        scholarship_details = self._format_scholarships(scholarships) if has_scholarships else None
        
        # Language requirements as notes
        lang_reqs = raw.get("language_requirements") or []
        lang_req_notes = self._format_language_requirements(lang_reqs)
        
        # Source tracking
        source_note = f"source=studyinnl; studyinnl_id={raw.get('id')}"
        if raw.get("hodex_id"):
            source_note += f"; hodex_id={raw.get('hodex_id')}"
        if lang_req_notes:
            source_note += f"\n\nLanguage Requirements:\n{lang_req_notes}"
        
        return {
            "name": (raw.get("name") or "Unknown Program").strip(),
            "degree_level": degree_level,
            "field": field.strip(),
            "teaching_language": teaching_language,
            "duration_months": duration_months,
            "credits_ects": raw.get("ects_credits"),
            "tuition_fee_amount": tuition.get("amount"),
            "tuition_fee_currency": "EUR" if tuition.get("amount") else None,
            "tuition_fee_per": tuition.get("per", "year"),
            "is_tuition_free": tuition.get("amount") == 0,
            "deadline_fall": deadlines.get("fall"),
            "deadline_spring": deadlines.get("spring"),
            "deadline_notes": deadlines.get("notes"),
            "program_url": raw.get("website"),
            "application_url": self._get_admission_url(raw),
            "description": description,
            "notes": source_note,
            "scholarships_available": has_scholarships,
            "scholarship_details": scholarship_details,
            # Defaults
            "gpa_scale": "4.0",
            "gre_required": False,
            "gmat_required": False,
            "verified_by_count": 0,
            "view_count": 0,
        }
    
    def _parse_teaching_language(
        self,
        languages: list[dict[str, Any]],
        warnings: list[str]
    ) -> str:
        """Parse teaching language from languages array."""
        if not languages:
            warnings.append("No teaching language specified, defaulting to ENGLISH")
            return "ENGLISH"
        
        lang_names = {(l.get("name") or "").lower() for l in languages}
        
        if "english" in lang_names:
            return "ENGLISH"
        if "dutch" in lang_names:
            return "DUTCH"
        if "german" in lang_names:
            return "GERMAN"
        if "french" in lang_names:
            return "FRENCH"
        
        # Default to English for Dutch international programs
        return "ENGLISH"
    
    def _parse_duration(
        self,
        duration_str: str | None,
        ects: int | None,
        warnings: list[str]
    ) -> int | None:
        """Parse duration to months."""
        if duration_str:
            s = duration_str.lower().strip()
            
            # Try year pattern
            m = re.search(r"(\d+)\s*year", s)
            if m:
                return int(m.group(1)) * 12
            
            # Try month pattern
            m = re.search(r"(\d+)\s*month", s)
            if m:
                return int(m.group(1))
            
            # Try semester pattern
            m = re.search(r"(\d+)\s*semester", s)
            if m:
                return int(m.group(1)) * 6
        
        # Estimate from ECTS (30 ECTS ≈ 6 months)
        if ects:
            return (ects // 30) * 6 or 12
        
        warnings.append("Could not determine program duration")
        return None
    
    def _parse_tuition(
        self,
        tuitions: list[dict[str, Any]],
        warnings: list[str]
    ) -> dict[str, Any]:
        """
        Parse tuition fees.
        
        Prioritizes: international > institutional > statutory
        Uses most recent year.
        """
        if not tuitions:
            warnings.append("No tuition information available")
            return {"amount": None, "per": "year"}
        
        # Group by type and get most recent year
        by_type: dict[str, dict[str, Any]] = {}
        for t in tuitions:
            fee_type = t.get("tuition_fee_type") or t.get("tuition_fee_rate") or "unknown"
            year = t.get("year") or 0
            
            existing = by_type.get(fee_type)
            if not existing or (existing.get("year") or 0) < year:
                by_type[fee_type] = t
        
        # Priority order for international students
        for pref in ["international", "institutional", "statutory"]:
            if pref in by_type:
                t = by_type[pref]
                return {
                    "amount": t.get("amount"),
                    "per": t.get("period") or "year",
                    "type": pref,
                    "year": t.get("year"),
                }
        
        # Fallback to first available
        t = tuitions[0]
        return {
            "amount": t.get("amount"),
            "per": t.get("period") or "year",
        }
    
    def _parse_deadlines(
        self,
        start_months: list[dict[str, Any]],
        warnings: list[str]
    ) -> dict[str, Any]:
        """Parse application deadlines from start_months."""
        if not start_months:
            return {"fall": None, "spring": None, "notes": None}
        
        fall_deadline: date | None = None
        spring_deadline: date | None = None
        notes_parts: list[str] = []
        
        for sm in start_months:
            month = sm.get("month") or 0
            start_date = sm.get("start_date")
            deadline_eu = sm.get("application_deadline")
            deadline_non_eu = sm.get("application_deadline_non_eu")
            
            # Use non-EU deadline as primary (more restrictive)
            deadline_str = deadline_non_eu or deadline_eu
            
            try:
                if deadline_str:
                    deadline = datetime.strptime(deadline_str, "%Y-%m-%d").date()
                    
                    # September start = Fall, February start = Spring
                    if month in [8, 9, 10]:  # Fall intake
                        if not fall_deadline or deadline < fall_deadline:
                            fall_deadline = deadline
                    elif month in [1, 2, 3]:  # Spring intake
                        if not spring_deadline or deadline < spring_deadline:
                            spring_deadline = deadline
                    
                    # Build notes
                    start_str = start_date or f"Month {month}"
                    note = f"Start: {start_str}"
                    if deadline_non_eu:
                        note += f" | Non-EU deadline: {deadline_non_eu}"
                    if deadline_eu and deadline_eu != deadline_non_eu:
                        note += f" | EU deadline: {deadline_eu}"
                    notes_parts.append(note)
                    
            except (ValueError, TypeError) as e:
                warnings.append(f"Could not parse deadline: {deadline_str}")
        
        return {
            "fall": fall_deadline,
            "spring": spring_deadline,
            "notes": "\n".join(notes_parts) if notes_parts else None,
        }
    
    def _format_scholarships(self, scholarships: list[dict[str, Any]]) -> str | None:
        """Format scholarships list into a readable string."""
        if not scholarships:
            return None
        
        parts = []
        for s in scholarships[:10]:  # Limit to 10
            name = s.get("name")
            url = s.get("url")
            if name:
                if url:
                    parts.append(f"• {name}: {url}")
                else:
                    parts.append(f"• {name}")
        
        return "\n".join(parts) if parts else None
    
    def _format_language_requirements(self, reqs: list[dict[str, Any]]) -> str | None:
        """Format language requirements into a readable string."""
        if not reqs:
            return None
        
        parts = []
        for r in reqs:
            desc = r.get("description") or ""
            score = r.get("minimum_score") or ""
            if desc and score:
                parts.append(f"• {desc}: {score}")
        
        return "\n".join(parts) if parts else None
    
    def _get_admission_url(self, raw: dict[str, Any]) -> str | None:
        """Extract admission URL from various possible fields."""
        admission = raw.get("admission_url")
        if admission:
            if isinstance(admission, list) and admission:
                return admission[0]
            if isinstance(admission, str):
                return admission
        return None
    
    def _clean_html(self, html: str | None) -> str | None:
        """Convert HTML to plain text."""
        if not html:
            return None
        
        s = html
        s = unescape(s)  # Handle HTML entities
        s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
        s = re.sub(r"</p\s*>", "\n", s, flags=re.I)
        s = re.sub(r"</li\s*>", "\n", s, flags=re.I)
        s = re.sub(r"<li\s*>", "• ", s, flags=re.I)
        s = re.sub(r"<[^>]+>", "", s)
        s = re.sub(r"\n{3,}", "\n\n", s)
        s = re.sub(r"[ \t]+", " ", s)
        s = s.strip()
        
        # Truncate if too long
        if len(s) > 2900:
            s = s[:2900] + "..."
        
        return s if s else None
