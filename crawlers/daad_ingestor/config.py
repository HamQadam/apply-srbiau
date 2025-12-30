"""
Configuration for DAAD Crawler.

Environment variables are loaded with pydantic-settings.
"""
from __future__ import annotations

from urllib.parse import quote_plus

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Configuration settings loaded from environment variables.
    
    Required environment variables:
    - POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB (or DATABASE_URL)
    
    Optional:
    - DAAD_BASE_URL, DAAD_LANG, DAAD_RPS, DAAD_PAGE_SIZE
    - BATCH_SIZE, CHECKPOINT_PATH, DRY_RUN
    - DB_SCHEMA, DB_POOL_MAX, DB_WAIT_TIMEOUT_S
    """
    
    model_config = SettingsConfigDict(
        env_prefix="",
        extra="ignore",
        env_file=".env",
        env_file_encoding="utf-8",
    )

    # ─────────────────────────────────────────────────────────────
    # DAAD API Configuration
    # ─────────────────────────────────────────────────────────────
    daad_base_url: str = Field(
        default="https://www2.daad.de/deutschland/studienangebote/international-programmes/api/solr",
        description="DAAD API base URL",
    )
    daad_lang: str = Field(
        default="en",
        description="Language for DAAD API (en or de)",
    )
    daad_rps: float = Field(
        default=2.0,
        description="Requests per second limit",
    )
    daad_page_size: int = Field(
        default=100,
        validation_alias=AliasChoices("DAAD_PAGE_SIZE", "daad_page_size"),
        description="Number of items per page",
    )
    daad_degree_bachelor: int = Field(default=1, description="DAAD degree code for bachelor")
    daad_degree_master: int = Field(default=2, description="DAAD degree code for master")
    daad_degree_phd: int = Field(default=3, description="DAAD degree code for PhD")

    # ─────────────────────────────────────────────────────────────
    # Runtime Configuration
    # ─────────────────────────────────────────────────────────────
    batch_size: int = Field(
        default=50,
        validation_alias=AliasChoices("BATCH_SIZE", "batch_size"),
        description="Number of courses to batch in a single transaction",
    )
    checkpoint_path: str = Field(
        default="/state/daad_checkpoint.json",
        validation_alias=AliasChoices("CHECKPOINT_PATH", "checkpoint_path"),
        description="Path to checkpoint file for resumption",
    )
    failed_items_path: str = Field(
        default="/state/failed_items.jsonl",
        validation_alias=AliasChoices("FAILED_ITEMS_PATH", "failed_items_path"),
        description="Path to store failed items for analysis",
    )
    dry_run: bool = Field(
        default=False,
        validation_alias=AliasChoices("DRY_RUN", "dry_run"),
        description="If true, don't write to database",
    )

    # ─────────────────────────────────────────────────────────────
    # Database Configuration
    # ─────────────────────────────────────────────────────────────
    database_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
        description="Full database URL (overrides POSTGRES_* variables)",
    )
    postgres_user: str | None = Field(
        default=None,
        validation_alias=AliasChoices("POSTGRES_USER", "postgres_user"),
    )
    postgres_password: str | None = Field(
        default=None,
        validation_alias=AliasChoices("POSTGRES_PASSWORD", "postgres_password"),
    )
    postgres_db: str | None = Field(
        default=None,
        validation_alias=AliasChoices("POSTGRES_DB", "postgres_db"),
    )
    postgres_host: str = Field(
        default="database",
        validation_alias=AliasChoices("POSTGRES_HOST", "postgres_host"),
    )
    postgres_port: int = Field(
        default=5432,
        validation_alias=AliasChoices("POSTGRES_PORT", "postgres_port"),
    )
    db_schema: str = Field(
        default="public",
        validation_alias=AliasChoices("DB_SCHEMA", "db_schema"),
    )
    db_pool_max: int = Field(
        default=10,
        validation_alias=AliasChoices("DB_POOL_MAX", "db_pool_max"),
    )
    db_wait_timeout_s: int = Field(
        default=120,
        validation_alias=AliasChoices("DB_WAIT_TIMEOUT_S", "db_wait_timeout_s"),
        description="How long to wait for database tables to be ready",
    )

    def effective_database_url(self) -> str:
        """
        Get the effective database URL.
        
        Uses DATABASE_URL if provided, otherwise builds from POSTGRES_* variables.
        """
        if self.database_url:
            return self.database_url

        missing = [
            k for k in ("postgres_user", "postgres_password", "postgres_db")
            if getattr(self, k) in (None, "")
        ]
        if missing:
            raise ValueError(
                f"Missing database configuration: {missing}. "
                f"Provide DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB."
            )

        user = quote_plus(self.postgres_user or "")
        pwd = quote_plus(self.postgres_password or "")
        db = quote_plus(self.postgres_db or "")
        host = self.postgres_host
        port = int(self.postgres_port)

        return f"postgresql://{user}:{pwd}@{host}:{port}/{db}"
