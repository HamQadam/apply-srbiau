from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import router as api_router
from app.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: create tables if they don't exist (dev only, use alembic in prod)
    init_db()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="Apply SRBIAU",
    description="""
    📚 **Student Application Journey Database**
    
    A knowledge-sharing platform where students document their foreign university 
    application experiences to help future applicants learn from real journeys.
    
    ## What you can share:
    - **Academic Profile**: GPA, university, major
    - **Language Credentials**: IELTS, TOEFL, DELF scores
    - **Documents**: CVs, SOPs, motivation letters
    - **Activities**: Work experience, research, volunteering
    - **Applications**: Programs applied to, results, tips
    
    ## Privacy
    You can choose to be anonymous while still sharing valuable data.
    
    Built with ❤️ by SRBIAU students for students everywhere.
    """,
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router)


@app.get("/", tags=["root"])
def root():
    """Welcome endpoint."""
    return {
        "message": "Welcome to Apply SRBIAU API",
        "docs": "/docs",
        "description": "Share your application journey, learn from others",
    }


@app.get("/health", tags=["health"])
def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
