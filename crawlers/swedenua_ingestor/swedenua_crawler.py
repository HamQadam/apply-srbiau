"""
Sweden University Admissions Crawler — universityadmissions.se

Fetches Swedish academic programs from the official UHR (Swedish Council for
Higher Education) admissions portal.  The site is an Angular SPA that uses a
JSON POST API discovered via source-code analysis.

API endpoints (relative to https://www.universityadmissions.se):
  GET  /intl/api/session              → session data + JSESSIONID / CSRFTOKEN cookies
  GET  /intl/api/sok/terminer         → available semester IDs
  POST /intl/api/sok                  → paginated program search
       body: { termin, fritext, sida, sortering, sokfilter }

Authentication:
  The search endpoint requires a valid JSESSIONID session cookie AND the
  CSRFTOKEN cookie value sent as the X-Csrf-Token request header.  A GET to
  /intl/api/session establishes these cookies; subsequent POST calls reuse them.

Pagination:
  The API returns up to 50 items per page ("sida" = page number, 1-indexed).
  "totaltAntalTraffar" contains the total hit count.

Response structure (sokresultatItems[]):
  Each item has "anmalningsalternativ" (admissions alternative) containing:
    - titel             : program name
    - organisation      : university name
    - organisationKod   : university code (3–4 letters)
    - studieort         : city
    - utbildningsniva   : degree level (Swedish, e.g. "Master's", "Bachelor's")
    - undervisningssprak: language ("English", "Swedish", ...)
    - poang / poangEnhet: credits (hp = ECTS)
    - studieavgiftTotal : total tuition fee (SEK, non-EU students)
    - program           : bool — true if programme, false if course
    - undervisningsform : delivery mode ("On-campus", "Distance", ...)
    - studietakt        : study pace (50 = half-time, 100 = full-time)
    - kursbeskrivningUrl: URL to the institution's own course page
    - anmalningskod     : application code
    - valdaAmnesNamn    : list of subject area names
    - examinaNamn       : list of degree names
    - startperiod / terminsPeriod / ar: intake timing
"""
from __future__ import annotations

import logging
from typing import Any, AsyncIterator

import httpx
from aiolimiter import AsyncLimiter
from tenacity import (
    retry,
    wait_exponential_jitter,
    stop_after_attempt,
    retry_if_exception_type,
)

from base import BaseCrawler, CrawlResult, CrawlStatus, CrawlError


log = logging.getLogger(__name__)

RETRYABLE = (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError)

# The Angular SPA strips this prefix from JSON responses to prevent XSSI.
_XSSI_PREFIX = b")]}',"


class SwedenUACrawler(BaseCrawler[dict[str, Any]]):
    """
    Crawler for Sweden's universityadmissions.se (UHR) program database.

    Features:
    - Session-based authentication (JSESSIONID + CSRFTOKEN from /api/session)
    - Paginated POST search across all semesters
    - Optional semester filter (defaults to all available semesters)
    - Rate limiting and tenacity-backed retry
    """

    source_name = "swedenua"

    BASE_URL = "https://www.universityadmissions.se/intl"
    PAGE_SIZE = 50  # API maximum per page

    def __init__(
        self,
        rps: float = 1.5,
        timeout_s: float = 30.0,
        semester_ids: list[str] | None = None,
        max_programs: int | None = None,
        start_page: int = 1,
    ):
        super().__init__()
        self.timeout = httpx.Timeout(timeout_s)
        self.semester_ids = semester_ids  # None → fetch all available semesters
        self.max_programs = max_programs  # for testing
        self.start_page = start_page
        self.limiter = AsyncLimiter(max_rate=max(1, int(rps)), time_period=1) if rps > 0 else None

        self._client: httpx.AsyncClient | None = None
        self._csrf_token: str = ""
        self._available_semesters: list[dict[str, Any]] = []

    # ------------------------------------------------------------------ #
    # Lifecycle
    # ------------------------------------------------------------------ #

    async def setup(self) -> None:
        """Create HTTP client and establish session cookies."""
        self._client = httpx.AsyncClient(
            headers={
                "Accept": "application/json, text/plain, */*",
                "User-Agent": (
                    "ghadam-crawler/2.0 "
                    "(+https://github.com/ghadam-app; respectful-crawler)"
                ),
                "Origin": "https://www.universityadmissions.se",
                "Referer": "https://www.universityadmissions.se/intl/search",
            },
            timeout=self.timeout,
            http2=True,
            follow_redirects=True,
        )
        await self._establish_session()
        await self._fetch_semesters()

    async def teardown(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    # ------------------------------------------------------------------ #
    # Session bootstrap
    # ------------------------------------------------------------------ #

    async def _establish_session(self) -> None:
        """
        GET /intl/api/session to receive JSESSIONID and CSRFTOKEN cookies,
        then extract the CSRF value for subsequent POST requests.
        """
        assert self._client is not None

        if self.limiter:
            async with self.limiter:
                resp = await self._client.get(f"{self.BASE_URL}/api/session")
        else:
            resp = await self._client.get(f"{self.BASE_URL}/api/session")

        resp.raise_for_status()

        # Extract CSRF token from the cookie jar
        for cookie in self._client.cookies.jar:
            if cookie.name == "CSRFTOKEN":
                self._csrf_token = cookie.value
                break

        if not self._csrf_token:
            self.log.warning(
                "CSRFTOKEN cookie not found after session init — "
                "POST requests may fail"
            )
        else:
            self.log.info("Session established (CSRF token present)")

    # ------------------------------------------------------------------ #
    # Reference data helpers
    # ------------------------------------------------------------------ #

    async def _fetch_semesters(self) -> None:
        """
        Retrieve available semester IDs from /api/sok/terminer and filter
        down to requested ones (or keep all if none specified).
        """
        assert self._client is not None

        resp = await self._client.get(
            f"{self.BASE_URL}/api/sok/terminer",
            headers={"X-Csrf-Token": self._csrf_token},
        )
        resp.raise_for_status()

        data = self._parse_json(resp.content)
        all_semesters: list[dict[str, Any]] = data.get("terminer") or []

        if self.semester_ids:
            self._available_semesters = [
                s for s in all_semesters
                if str(s.get("terminId")) in self.semester_ids
            ]
        else:
            self._available_semesters = all_semesters

        self.log.info(
            "Found %d semester(s) to crawl: %s",
            len(self._available_semesters),
            [s.get("beskrivning") for s in self._available_semesters],
        )

    # ------------------------------------------------------------------ #
    # Pagination
    # ------------------------------------------------------------------ #

    @retry(
        wait=wait_exponential_jitter(initial=2, max=30),
        stop=stop_after_attempt(6),
        retry=retry_if_exception_type(RETRYABLE),
    )
    async def _search_page(
        self,
        termin_id: str,
        page: int,
    ) -> dict[str, Any]:
        """POST /intl/api/sok for a single page of results."""
        assert self._client is not None

        body = {
            "termin": termin_id,
            "fritext": "",
            "sida": page,
            "sortering": "",
            "sokfilter": {},
        }

        if self.limiter:
            async with self.limiter:
                resp = await self._client.post(
                    f"{self.BASE_URL}/api/sok",
                    json=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Csrf-Token": self._csrf_token,
                    },
                )
        else:
            resp = await self._client.post(
                f"{self.BASE_URL}/api/sok",
                json=body,
                headers={
                    "Content-Type": "application/json",
                    "X-Csrf-Token": self._csrf_token,
                },
            )

        resp.raise_for_status()
        return self._parse_json(resp.content)

    # ------------------------------------------------------------------ #
    # Main iteration
    # ------------------------------------------------------------------ #

    async def fetch_items(self) -> AsyncIterator[dict[str, Any]]:
        """
        Iterate over all semesters and pages, yielding raw item dicts.

        Each yielded item is the raw "sokresultatItems" element enriched
        with metadata fields prefixed by "_":
          _source   : "swedenua"
          _termin_id: the semester ID
          _termin_name: the human-readable semester name
          _page     : the page number this item came from
        """
        total_yielded = 0

        for semester in self._available_semesters:
            termin_id = str(semester.get("terminId", ""))
            termin_name = semester.get("beskrivning", termin_id)

            self.log.info("Crawling semester: %s (%s)", termin_name, termin_id)

            page = self.start_page
            consecutive_empty = 0
            max_consecutive_empty = 3
            total_for_semester: int | None = None

            while True:
                try:
                    result = await self._search_page(termin_id, page)
                except Exception as exc:
                    self.log.error(
                        "Error fetching semester=%s page=%d: %s",
                        termin_id, page, exc,
                    )
                    consecutive_empty += 1
                    if consecutive_empty >= max_consecutive_empty:
                        self.log.warning(
                            "Stopping semester %s after %d consecutive errors",
                            termin_id, consecutive_empty,
                        )
                        break
                    page += 1
                    continue

                items: list[dict[str, Any]] = result.get("sokresultatItems") or []

                if total_for_semester is None:
                    total_for_semester = result.get("totaltAntalTraffar", 0)
                    self.log.info(
                        "Semester %s: %d total programs available",
                        termin_name, total_for_semester,
                    )

                if not items:
                    consecutive_empty += 1
                    if consecutive_empty >= max_consecutive_empty:
                        self.log.info(
                            "Finished semester %s (no more pages after %d empties)",
                            termin_name, consecutive_empty,
                        )
                        break
                    page += 1
                    continue

                consecutive_empty = 0

                for item in items:
                    # Inject metadata so the transform/parse steps know context
                    item["_source"] = "swedenua"
                    item["_termin_id"] = termin_id
                    item["_termin_name"] = termin_name
                    item["_page"] = page

                    yield item
                    total_yielded += 1

                    if self.max_programs and total_yielded >= self.max_programs:
                        self.log.info(
                            "Reached max_programs limit (%d)", self.max_programs
                        )
                        return

                self.log.debug(
                    "Semester %s page %d: fetched %d items (%d total so far)",
                    termin_name, page, len(items), total_yielded,
                )

                page += 1

                # Stop when we've fetched all items for this semester
                if total_for_semester and (page - 1) * self.PAGE_SIZE >= total_for_semester:
                    self.log.info(
                        "Finished semester %s — fetched all %d programs",
                        termin_name, total_yielded,
                    )
                    break

    # ------------------------------------------------------------------ #
    # Stage-1 transform (guard only, no data parsing)
    # ------------------------------------------------------------------ #

    def transform(self, raw_item: dict[str, Any]) -> CrawlResult:
        """
        Stage-1 transform: validate mandatory fields, return untouched raw payload.

        The actual field-level parsing is deferred to the postprocess parse pipeline
        (SwedenUATransformer in postprocess/transformers/swedenua.py).
        """
        aa = raw_item.get("anmalningsalternativ") or {}
        source_id = str(aa.get("anmalningsalternativKod") or raw_item.get("_page", "unknown"))

        # Require a non-empty code and a title
        required = [("anmalningsalternativKod", aa.get("anmalningsalternativKod")),
                    ("titel", aa.get("titel"))]
        missing = [name for name, val in required if not val]

        if missing:
            return CrawlResult(
                source_id=source_id,
                status=CrawlStatus.FAILED,
                error=CrawlError(
                    source_id=source_id,
                    error_type="MISSING_REQUIRED_FIELDS",
                    message=f"Missing required fields in anmalningsalternativ: {missing}",
                    raw_data=raw_item,
                ),
            )

        if not aa.get("organisation"):
            return CrawlResult(
                source_id=source_id,
                status=CrawlStatus.FAILED,
                error=CrawlError(
                    source_id=source_id,
                    error_type="MISSING_INSTITUTION",
                    message="No organisation/university in program",
                    raw_data=raw_item,
                ),
            )

        return CrawlResult(
            source_id=source_id,
            status=CrawlStatus.SUCCESS,
            raw_payload=raw_item,
        )

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    @staticmethod
    def _parse_json(content: bytes) -> dict[str, Any]:
        """
        Strip the Angular XSSI protection prefix ")]}',\\n" before parsing.
        """
        import json

        stripped = content
        if content.startswith(b")]}"):
            newline_pos = content.find(b"\n")
            if newline_pos != -1:
                stripped = content[newline_pos + 1:]

        return json.loads(stripped)
