from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    # DAAD
    daad_base_url: str = "https://www2.daad.de/deutschland/studienangebote/international-programmes/api/solr"
    daad_lang: str = "en"
    daad_rps: float = 2.0
    daad_page_size: int = 100

    daad_degree_bachelor: int = 1
    daad_degree_master: int = 2
    daad_degree_phd: int = 3

    # Postgres
    database_url: str = Field(..., description="e.g. postgresql://user:pass@host:5432/dbname")
    university_table: str = "universities"
    course_table: str = "courses"

    # Runtime
    batch_size: int = 50
    checkpoint_path: str = ".state/daad_checkpoint.json"

    dry_run: bool = False
