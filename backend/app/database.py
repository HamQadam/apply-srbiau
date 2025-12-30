"""Database connection and session management."""
from sqlmodel import SQLModel, create_engine, Session
from app.config import get_settings

settings = get_settings()

# Engine configuration differs for SQLite vs PostgreSQL
if settings.use_sqlite:
    engine = create_engine(
        settings.database_url,
        echo=False,
        connect_args={"check_same_thread": False},  # Required for SQLite with FastAPI
    )
else:
    engine = create_engine(
        settings.database_url,
        echo=False,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )


def init_db():
    """Create all tables - use only for development/testing."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Dependency for FastAPI routes."""
    with Session(engine) as session:
        yield session

def create_db_and_tables():
    """Create all tables - use migrations in production."""
    SQLModel.metadata.create_all(engine)