"""Application configuration."""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    postgres_user: str = "postgres"
    postgres_password: str = "postgres"
    postgres_db: str = "apply_db"
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    use_sqlite: bool = False	  # Use SQLite for local development
    
    @property
    def database_url(self) -> str:
        if self.use_sqlite:
            return "sqlite:///./ghadam.db"
        return f"postgresql://{self.postgres_user}:{self.postgres_password}@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
    
    # JWT
    jwt_secret: str = "super-secret-key-change-in-production-please"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 1 week
    
    # OTP
    debug_otp: bool = True  # All OTPs are 000000 in debug mode
    otp_expire_minutes: int = 5
    
    # App
    debug: bool = True
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # File storage
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 10
    
    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
