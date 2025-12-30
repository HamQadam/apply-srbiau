"""
Configuration for StudyInNL Crawler.

Environment variables are loaded with pydantic-settings.
"""
from __future__ import annotations

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class StudyInNLSettings(BaseSettings):
    """
    Configuration settings for StudyInNL crawler.
    
    All settings have sensible defaults but can be overridden via environment variables.
    """
    
    model_config = SettingsConfigDict(
        env_prefix="STUDYINNL_",
        extra="ignore",
        env_file=".env",
        env_file_encoding="utf-8",
    )

    # ─────────────────────────────────────────────────────────────
    # API Configuration
    # ─────────────────────────────────────────────────────────────
    base_url: str = Field(
        default="https://www.studyinnl.org/api/programs",
        description="StudyInNL API base URL",
    )
    rps: float = Field(
        default=2.0,
        validation_alias=AliasChoices("STUDYINNL_RPS", "rps"),
        description="Requests per second limit",
    )
    timeout_s: float = Field(
        default=30.0,
        validation_alias=AliasChoices("STUDYINNL_TIMEOUT", "timeout_s"),
        description="Request timeout in seconds",
    )
    page_size: int = Field(
        default=50,
        validation_alias=AliasChoices("STUDYINNL_PAGE_SIZE", "page_size"),
        description="Number of programs per API request",
    )
    
    # ─────────────────────────────────────────────────────────────
    # Crawl Control
    # ─────────────────────────────────────────────────────────────
    start_offset: int = Field(
        default=0,
        description="Starting offset for pagination (for resumption)",
    )
    max_programs: int | None = Field(
        default=None,
        description="Maximum programs to fetch (None for all)",
    )
