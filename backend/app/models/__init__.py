"""Data models for the application."""

from .university import (
    University,
    UniversityBase,
    UniversityCreate,
    UniversityRead,
    UniversitySearch,
)

from .course import (
    Course,
    CourseBase,
    CourseCreate,
    CourseRead,
    CourseSearch,
    CourseSummary,
    DegreeLevel,
    Currency,
    TeachingLanguage,
    IntakeType,
)

from .course_language_requirement import (
    CourseLanguageRequirement,
    CourseLanguageRequirementBase,
    CourseLanguageRequirementCreate,
    CourseLanguageRequirementRead,
    LanguageTestType,
    CEFRLevel,
    COMMON_REQUIREMENTS,
)

from .tracked_program import (
    TrackedProgram,
    TrackedProgramBase,
    TrackedProgramCreate,
    TrackedProgramUpdate,
    TrackedProgramRead,
    TrackerStats,
    ApplicationStatus,
    Priority,
    IntakePeriod,
    DEFAULT_CHECKLIST,
)

from .user import (
    User,
    UserBase,
    UserCreate,
    UserRead,
    UserUpdate,
    UserOnboarding,
    UserGoal,
    OnboardingStep,
    OTPCode,
    SIGNUP_BONUS_GHADAMS,
    FIRST_PROGRAM_BONUS,
    COMPLETE_ONBOARDING_BONUS,
)

from .ghadam import (
    GhadamTransaction,
    GhadamTransactionRead,
    TransactionType,
    GHADAM_REWARDS,
    GHADAM_COSTS,
    PROFILE_VIEW_COST,
    CONTRIBUTOR_SHARE,
)

from .applicant_work_experience import ApplicantWorkExperience
from .applicant_language_test import ApplicantLanguageTest


__all__ = [
    # University
    "University",
    "UniversityBase",
    "UniversityCreate",
    "UniversityRead",
    "UniversitySearch",
    # Course
    "Course",
    "CourseBase",
    "CourseCreate",
    "CourseRead",
    "CourseSearch",
    "CourseSummary",
    "DegreeLevel",
    "Currency",
    "TeachingLanguage",
    "IntakeType",
    # Language Requirements
    "CourseLanguageRequirement",
    "CourseLanguageRequirementBase",
    "CourseLanguageRequirementCreate",
    "CourseLanguageRequirementRead",
    "LanguageTestType",
    "CEFRLevel",
    "COMMON_REQUIREMENTS",
    # Tracked Program
    "TrackedProgram",
    "TrackedProgramBase",
    "TrackedProgramCreate",
    "TrackedProgramUpdate",
    "TrackedProgramRead",
    "TrackerStats",
    "ApplicationStatus",
    "Priority",
    "IntakePeriod",
    "DEFAULT_CHECKLIST",
    # User
    "User",
    "UserBase",
    "UserCreate",
    "UserRead",
    "UserUpdate",
    "UserOnboarding",
    "UserGoal",
    "OnboardingStep",
    "OTPCode",
    "SIGNUP_BONUS_GHADAMS",
    "FIRST_PROGRAM_BONUS",
    "COMPLETE_ONBOARDING_BONUS",
    # Ghadam
    "GhadamTransaction",
    "GhadamTransactionRead",
    "TransactionType",
    "GHADAM_REWARDS",
    "GHADAM_COSTS",
    "PROFILE_VIEW_COST",
    "CONTRIBUTOR_SHARE",
    # Applicant Extra
    "ApplicantWorkExperience",
    "ApplicantLanguageTest",
]