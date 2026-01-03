from typing import Optional
from pydantic import Field, AliasChoices
from pydantic_settings import BaseSettings, SettingsConfigDict

class CanadaSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="CANADA_",
        extra="ignore",
        env_file=".env",
        env_file_encoding="utf-8",
    )

    base_url: str = "https://universitystudy.ca"
    rps: float = Field(
        default=2.0,
        validation_alias=AliasChoices("CANADA_RPS", "rps"),
        description="Requests per second for Canada crawler"
    )
    # تغییر این خط از int | None به Optional[int]
    max_pages: Optional[int] = Field(default=None, description="Limit pages for testing")