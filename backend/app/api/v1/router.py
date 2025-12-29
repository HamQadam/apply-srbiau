"""API v1 router - combines all endpoint routers."""
from fastapi import APIRouter

from .auth import router as auth_router
from .tracker import router as tracker_router
from .universities import router as universities_router
from .courses import router as courses_router
from .ghadam import router as ghadam_router
from .matching import router as matching_router

router = APIRouter(prefix="/api/v1")

router.include_router(auth_router)
router.include_router(tracker_router)
router.include_router(universities_router)
router.include_router(courses_router)
router.include_router(ghadam_router)
router.include_router(matching_router)