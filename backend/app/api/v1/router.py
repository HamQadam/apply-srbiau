"""API v1 router - combines all endpoint routers."""
from fastapi import APIRouter

from .auth import router as auth_router
from .tracker import router as tracker_router
from .universities import router as universities_router
from .courses import router as courses_router
from .ghadam import router as ghadam_router
from .matching import router as matching_router
from .applicants import router as applicants_router
from .applications import router as applicant_applications_router
from .applications import search_router as applications_search_router
from .documents import router as documents_router
from .documents import search_router as documents_search_router
from .languages import router as languages_router
from .languages import search_router as languages_search_router
from .activities import router as activities_router
from .activities import search_router as activities_search_router
from .subscriptions import router as subscriptions_router
from .wallet import router as wallet_router

router = APIRouter(prefix="/api/v1")

router.include_router(auth_router)
router.include_router(tracker_router)
router.include_router(universities_router)
router.include_router(courses_router)
router.include_router(ghadam_router)
router.include_router(matching_router)
router.include_router(applicants_router)
router.include_router(applicant_applications_router)
router.include_router(applications_search_router)
router.include_router(documents_router)
router.include_router(documents_search_router)
router.include_router(languages_router)
router.include_router(languages_search_router)
router.include_router(activities_router)
router.include_router(activities_search_router)
router.include_router(subscriptions_router)
router.include_router(wallet_router)
