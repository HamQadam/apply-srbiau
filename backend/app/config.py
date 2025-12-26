from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "apply_db"
    postgres_host: str = "database"
    postgres_port: int = 5432
    
    upload_dir: str = "/app/uploads"
    max_file_size_mb: int = 10
    
    # JWT Secret - CHANGE IN PRODUCTION!
    secret_key: str = "super-secret-key-change-in-production-please"
    
    @property
    def database_url(self) -> str:
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
