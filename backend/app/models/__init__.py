"""Data models for the application database."""

from app.models.user import (
    User,
    UserRole,
    UserCreate,
    UserRead,
    UserPublic,
    OTP,
    Transaction,
    TransactionType,
    TransactionRead,
)
from app.models.subscription import (
    Subscription,
    SubscriptionType,
    SubscriptionRead,
    SubscriptionCreate,
    GhadamRewards,
)
from app.models.applicant import (
    Applicant,
    ApplicantCreate,
    ApplicantRead,
    ApplicantReadFull,
    ApplicantPreview,
    ApplicantUpdate,
)
from app.models.language import (
    LanguageCredential,
    LanguageCredentialCreate,
    LanguageCredentialRead,
    LanguageCredentialUpdate,
)
from app.models.document import (
    Document,
    DocumentType,
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
)
from app.models.activity import (
    ExtracurricularActivity,
    ActivityType,
    ExtracurricularActivityCreate,
    ExtracurricularActivityRead,
    ExtracurricularActivityUpdate,
)
from app.models.application import (
    Application,
    ApplicationStatus,
    DegreeLevel,
    ApplicationCreate,
    ApplicationRead,
    ApplicationUpdate,
)

__all__ = [
    # User & Auth
    "User",
    "UserRole",
    "UserCreate",
    "UserRead",
    "UserPublic",
    "OTP",
    "Transaction",
    "TransactionType",
    "TransactionRead",
    # Subscription
    "Subscription",
    "SubscriptionType",
    "SubscriptionRead",
    "SubscriptionCreate",
    "GhadamRewards",
    # Applicant
    "Applicant",
    "ApplicantCreate",
    "ApplicantRead",
    "ApplicantReadFull",
    "ApplicantPreview",
    "ApplicantUpdate",
    # Language
    "LanguageCredential",
    "LanguageCredentialCreate",
    "LanguageCredentialRead",
    "LanguageCredentialUpdate",
    # Document
    "Document",
    "DocumentType",
    "DocumentCreate",
    "DocumentRead",
    "DocumentUpdate",
    # Activity
    "ExtracurricularActivity",
    "ActivityType",
    "ExtracurricularActivityCreate",
    "ExtracurricularActivityRead",
    "ExtracurricularActivityUpdate",
    # Application
    "Application",
    "ApplicationStatus",
    "DegreeLevel",
    "ApplicationCreate",
    "ApplicationRead",
    "ApplicationUpdate",
]
