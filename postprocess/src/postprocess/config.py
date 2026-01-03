import os
from dataclasses import dataclass
from typing import Optional


def env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "y", "on")


@dataclass(frozen=True)
class AppConfig:
    database_url: str

    # table/columns
    table_name: str = "public.courses"
    id_column: str = "id"
    notes_column: str = "deadline_notes"
    fall_column: str = "deadline_fall"
    spring_column: str = "deadline_spring"

    # LLM
    llm_enabled: bool = True
    llm_model_path: str = "Phi-3-mini-4k-instruct-q4.gguf"
    llm_ctx: int = 1024
    llm_batch: int = 128
    llm_threads: int = 8

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
            llm_enabled=env_bool("LLM_ENABLED", True),
            llm_model_path=os.getenv("LLM_MODEL_PATH", "Phi-3-mini-4k-instruct-q4.gguf"),
            llm_ctx=int(os.getenv("LLM_CTX", "1024")),
            llm_batch=int(os.getenv("LLM_BATCH", "128")),
            llm_threads=int(os.getenv("LLM_THREADS", "8")),
            lock_rows=env_bool("LOCK_ROWS", True),
        )
