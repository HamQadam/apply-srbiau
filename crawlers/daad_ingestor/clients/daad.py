import httpx
from tenacity import retry, wait_exponential_jitter, stop_after_attempt, retry_if_exception_type
from typing import Any
from aiolimiter import AsyncLimiter

RETRYABLE = (httpx.TimeoutException, httpx.NetworkError, httpx.HTTPStatusError)

class DaadClient:
    def __init__(self, base_url: str, lang: str, rps: float, timeout_s: float = 30.0):
        self.base_url = base_url.rstrip("/")
        self.lang = lang
        self.timeout = httpx.Timeout(timeout_s)
        self.limiter = AsyncLimiter(max_rate=max(1, int(rps)), time_period=1) if rps > 0 else None
        self.client = httpx.AsyncClient(
            headers={
                "Accept": "application/json",
                "User-Agent": "ghadam-daad-ingestor/1.0 (+respectful-crawler)",
            },
            timeout=self.timeout,
            http2=True,
            follow_redirects=True,
        )

    async def aclose(self):
        await self.client.aclose()

    @retry(
        wait=wait_exponential_jitter(initial=1, max=20),
        stop=stop_after_attempt(8),
        retry=retry_if_exception_type(RETRYABLE),
    )
    async def search(self, degree_code: int, limit: int, offset: int) -> dict[str, Any]:
        # Keep params minimal; DAAD accepts many empty filters but doesn’t need them.
        url = f"{self.base_url}/{self.lang}/search.json"
        params = {
            "degree[]": str(degree_code),
            "q": "",
            "sort": "4",
            "display": "list",
            "limit": str(limit),
            "offset": str(offset),
        }
        if self.limiter:
            async with self.limiter:
                resp = await self.client.get(url, params=params)
        else:
            resp = await self.client.get(url, params=params)

        resp.raise_for_status()
        return resp.json()
