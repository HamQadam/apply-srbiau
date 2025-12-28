from __future__ import annotations

import httpx
from tenacity import retry, wait_exponential_jitter, stop_after_attempt, retry_if_exception_type
from typing import Any

RETRYABLE = (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError)

class GhadamClient:
    def __init__(self, base_url: str, admin_token: str, timeout_s: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.timeout = httpx.Timeout(timeout_s)
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {admin_token}",
                "User-Agent": "ghadam-daad-ingestor/1.0",
            },
            timeout=self.timeout,
            follow_redirects=True,
        )

    async def aclose(self):
        await self.client.aclose()

    @retry(wait=wait_exponential_jitter(initial=1, max=20), stop=stop_after_attempt(8),
           retry=retry_if_exception_type(RETRYABLE))
    async def list_universities(self, query: str, country: str = "Germany", limit: int = 20) -> list[dict[str, Any]]:
        # Public GET endpoint (no auth needed typically; but ok if auth present)
        resp = await self.client.get("/api/v1/universities", params={"query": query, "country": country, "limit": limit, "offset": 0})
        resp.raise_for_status()
        return resp.json()

    @retry(wait=wait_exponential_jitter(initial=1, max=20), stop=stop_after_attempt(8),
           retry=retry_if_exception_type(RETRYABLE))
    async def list_courses(self, query: str, degree_level: str, country: str = "Germany", limit: int = 20) -> list[dict[str, Any]]:
        resp = await self.client.get("/api/v1/courses", params={"query": query, "degree_level": degree_level, "country": country, "limit": limit, "offset": 0})
        resp.raise_for_status()
        return resp.json()

    @retry(wait=wait_exponential_jitter(initial=1, max=20), stop=stop_after_attempt(8),
           retry=retry_if_exception_type(RETRYABLE))
    async def create(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        resp = await self.client.post(path, json=payload)
        resp.raise_for_status()
        return resp.json()

    @retry(wait=wait_exponential_jitter(initial=1, max=20), stop=stop_after_attempt(8),
           retry=retry_if_exception_type(RETRYABLE))
    async def patch(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        resp = await self.client.patch(path, json=payload)
        resp.raise_for_status()
        return resp.json()

    @retry(wait=wait_exponential_jitter(initial=1, max=20), stop=stop_after_attempt(8),
           retry=retry_if_exception_type(RETRYABLE))
    async def bulk_upsert(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        resp = await self.client.post(path, json=payload)
        resp.raise_for_status()
        return resp.json()
