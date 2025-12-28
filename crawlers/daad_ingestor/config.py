from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="", extra="ignore")

    # DAAD
    daad_base_url: str = "https://www2.daad.de/deutschland/studienangebote/international-programmes/api/solr"
    daad_lang: str = "en"
    daad_rps: float = 2.0
    daad_page_size: int = 100  # fetch pages of 100 from DAAD

    # Degree code mapping (DAAD side)
    daad_degree_bachelor: int = 1
    daad_degree_master: int = 2
    daad_degree_phd: int = 3

    # Ghadam API
    ghadam_base_url: str = Field(..., description="e.g. https://api.yourdomain.com")
    ghadam_admin_token: str = Field(..., description="Bearer token for admin write endpoints")
    ghadam_timeout_s: float = 30.0

    # Write endpoints (override if your routes differ)
    uni_create_path: str = "/api/v1/admin/universities"
    uni_update_path_tpl: str = "/api/v1/admin/universities/{id}"
    course_create_path: str = "/api/v1/admin/courses"
    course_update_path_tpl: str = "/api/v1/admin/courses/{id}"
    course_bulk_path: str | None = None  # e.g. "/api/v1/admin/courses:bulk"

    # Batching / runtime
    batch_size: int = 50
    concurrency: int = 10
    checkpoint_path: str = ".state/daad_checkpoint.json"

    # Behavior
    dry_run: bool = False
