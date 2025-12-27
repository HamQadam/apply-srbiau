from fastapi import APIRouter

from app.api.v1 import applicants, languages, documents, activities, applications, auth, wallet, subscriptions, universities, courses

router = APIRouter(prefix="/api/v1")

# Auth routes (no prefix needed, auth.py has its own)
router.include_router(auth.router)
router.include_router(wallet.router)
router.include_router(subscriptions.router)

# Applicant-scoped routes
router.include_router(applicants.router)
router.include_router(languages.router)
router.include_router(documents.router)
router.include_router(activities.router)
router.include_router(applications.router)

# Global search routes
router.include_router(languages.search_router)
router.include_router(documents.search_router)
router.include_router(activities.search_router)
router.include_router(applications.search_router)

# University and Course routes
router.include_router(universities.router)
router.include_router(courses.router)
