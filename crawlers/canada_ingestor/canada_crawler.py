from __future__ import annotations
import asyncio
import logging
from typing import Any, AsyncIterator, Optional
from urllib.parse import urljoin
import httpx
from bs4 import BeautifulSoup
from base import BaseCrawler, CrawlResult, CrawlStatus, CrawlError


class UniversityStudyCrawler(BaseCrawler[dict[str, Any]]):
    source_name = "universitystudy"

    def __init__(self, base_url: str = "https://universitystudy.ca/programs/", rps: float = 1.0,
                 max_pages: Optional[int] = None):
        super().__init__()
        self.base_url = base_url
        self.max_pages = max_pages
        self.client: Optional[httpx.AsyncClient] = None
        self.uni_cache: dict[str, dict] = {}

    async def setup(self) -> None:
        # شبیه‌سازی دقیق مرورگر برای جلوگیری از مسدود شدن
        self.client = httpx.AsyncClient(
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            follow_redirects=True,
            timeout=30.0
        )
        await self._build_university_cache()

    async def _build_university_cache(self) -> None:
        self.log.info("Building university cache...")
        try:
            url = "https://universitystudy.ca/canadian-universities/"
            resp = await self.client.get(url)
            soup = BeautifulSoup(resp.text, "lxml")
            # پیدا کردن دانشگاه‌ها از لیست صفحه اصلی
            cards = soup.select("article") or soup.select(".uni-card")
            for card in cards:
                name_tag = card.find(["h2", "h3", "a"])
                if name_tag:
                    name = name_tag.get_text(strip=True)
                    self.uni_cache[name.lower()] = {"official_name": name, "location": "Canada"}
            self.log.info(f"Cached {len(self.uni_cache)} universities")
        except Exception as e:
            self.log.error(f"Failed to build cache: {e}")

    async def fetch_items(self) -> AsyncIterator[dict[str, Any]]:
        page = 1
        while True:
            if self.max_pages and page > self.max_pages: break

            self.log.info(f"Fetching page {page}")
            # استفاده از پارامتر paged برای جابجایی بین صفحات
            url = f"{self.base_url}?paged={page}"
            resp = await self.client.get(url)

            soup = BeautifulSoup(resp.text, "lxml")

            # پیدا کردن آیتم‌های برنامه (Selector جدید بر اساس HTML سایت)
            items = soup.find_all("article") or soup.select(".program-listing-item")

            if not items:
                self.log.warning(f"No programs found on page {page}. Stopping.")
                break

            for item in items:
                link_tag = item.find("a")
                if not link_tag: continue

                title = link_tag.get_text(strip=True)
                program_url = urljoin(self.base_url, link_tag["href"])

                # تلاش برای پیدا کردن نام دانشگاه در کارت
                uni_name = "Unknown University"
                uni_tag = item.find(class_="university-name") or item.find("p")
                if uni_tag:
                    uni_name = uni_tag.get_text(strip=True)

                yield {
                    "name": title,
                    "url": program_url,
                    "university_name": uni_name
                }

            page += 1
            await asyncio.sleep(2)  # وقفه برای اینکه سایت شک نکند

    async def transform(self, raw_item: dict[str, Any]) -> CrawlResult:
        source_id = raw_item["url"]
        uni_name = raw_item.get("university_name", "Unknown")
        cached_uni = self.uni_cache.get(uni_name.lower(), {})

        uni_payload = {
            "name": cached_uni.get("official_name", uni_name),
            "country": "Canada",
            "city": "Unknown"
        }

        course_payload = {
            "name": raw_item["name"],
            "degree_level": "MASTER",
            "field": "General",
            "program_url": raw_item["url"],
            "notes": f"source=universitystudy; url={raw_item['url']}"
        }

        return CrawlResult(
            source_id=source_id,
            status=CrawlStatus.SUCCESS,
            university_payload=uni_payload,
            course_payload=course_payload
        )

    async def teardown(self) -> None:
        if self.client: await self.client.aclose()