import os
from dataclasses import dataclass


def env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "y", "on")


@dataclass(frozen=True)
class AppConfig:
    database_url: str

    # table/columns (used by the deadlines job)
    table_name: str = "public.courses"
    id_column: str = "id"
    notes_column: str = "deadline_notes"
    fall_column: str = "deadline_fall"
    spring_column: str = "deadline_spring"

    # behavior
    lock_rows: bool = True  # FOR UPDATE SKIP LOCKED (safe for concurrent workers)

    @staticmethod
    def from_env() -> "AppConfig":
        db = os.getenv("DATABASE_URL")
        if not db:
            raise RuntimeError("DATABASE_URL is required")

        return AppConfig(
            database_url=db,
            table_name=os.getenv("TABLE_NAME", "public.courses"),
            id_column=os.getenv("ID_COLUMN", "id"),
            notes_column=os.getenv("NOTES_COLUMN", "deadline_notes"),
            fall_column=os.getenv("FALL_COLUMN", "deadline_fall"),
            spring_column=os.getenv("SPRING_COLUMN", "deadline_spring"),
            lock_rows=env_bool("LOCK_ROWS", True),
        )
        # LiteLLM settings (LITELLM_MODEL, LITELLM_API_KEY, etc.) are read
        # directly by LLMClientConfig.from_env() in llm_client.py.
