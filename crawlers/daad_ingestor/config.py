from __future__ import annotations

from urllib.parse import quote_plus

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    # --- DAAD ---
    daad_base_url: str = "https://www2.daad.de/deutschland/studienangebote/international-programmes/api/solr"
    daad_lang: str = "en"
    daad_rps: float = 2.0
    daad_page_size: int = Field(100, validation_alias=AliasChoices("DAAD_PAGE_SIZE", "daad_page_size"))

    daad_degree_bachelor: int = 1
    daad_degree_master: int = 2
    daad_degree_phd: int = 3

    # --- Runtime ---
    batch_size: int = Field(50, validation_alias=AliasChoices("BATCH_SIZE", "batch_size"))
    checkpoint_path: str = Field(
        "/state/daad_checkpoint.json",
        validation_alias=AliasChoices("CHECKPOINT_PATH", "checkpoint_path"),
    )
    dry_run: bool = Field(False, validation_alias=AliasChoices("DRY_RUN", "dry_run"))

    # --- DB (direct Postgres ingest) ---
    # You MAY provide DATABASE_URL directly, otherwise we'll build it from POSTGRES_*
    database_url: str | None = Field(
        None, validation_alias=AliasChoices("DATABASE_URL", "database_url")
    )

    postgres_user: str | None = Field(None, validation_alias=AliasChoices("POSTGRES_USER", "postgres_user"))
    postgres_password: str | None = Field(None, validation_alias=AliasChoices("POSTGRES_PASSWORD", "postgres_password"))
    postgres_db: str | None = Field(None, validation_alias=AliasChoices("POSTGRES_DB", "postgres_db"))
    postgres_host: str = Field("database", validation_alias=AliasChoices("POSTGRES_HOST", "postgres_host"))
    postgres_port: int = Field(5432, validation_alias=AliasChoices("POSTGRES_PORT", "postgres_port"))

    db_schema: str = Field("public", validation_alias=AliasChoices("DB_SCHEMA", "db_schema"))
    db_pool_max: int = Field(10, validation_alias=AliasChoices("DB_POOL_MAX", "db_pool_max"))
    db_wait_timeout_s: int = Field(120, validation_alias=AliasChoices("DB_WAIT_TIMEOUT_S", "db_wait_timeout_s"))

    def effective_database_url(self) -> str:
        if self.database_url:
            return self.database_url

        missing = [k for k in ("postgres_user", "postgres_password", "postgres_db") if getattr(self, k) in (None, "")]
        if missing:
            raise ValueError(
                f"Missing DB config: {missing}. Provide DATABASE_URL or POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB."
            )

        user = quote_plus(self.postgres_user or "")
        pwd = quote_plus(self.postgres_password or "")
        db = quote_plus(self.postgres_db or "")
        host = self.postgres_host
        port = int(self.postgres_port)

        return f"postgresql://{user}:{pwd}@{host}:{port}/{db}"
