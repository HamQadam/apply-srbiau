"""Experience sharing API with moderation and public browsing."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, col

from app.api.deps import CurrentUser, CurrentUserRequired
from app.config import get_settings
from app.database import get_session
from app.models import (
    Applicant,
    Course,
    University,
    TrackedProgram,
    Application,
    ApplicationRead,
    ExperienceModerationStatus,
    ExperienceModerationUpdate,
    ExperienceSubmitFromTracker,
    ExperienceVisibility,
    PublicExperienceRead,
    ApplicantStatus,
    ProfileVisibility,
)
from app.models.application import ApplicationStatus as ExperienceApplicationStatus, DegreeLevel as ExperienceDegreeLevel
from app.models.tracked_program import ApplicationStatus as TrackerApplicationStatus
from app.services.ghadam import can_view_applicant, reward_application_added

router = APIRouter(prefix="/experiences", tags=["experiences"])

PUBLIC_STATUSES = {ExperienceModerationStatus.APPROVED}
REVIEWABLE_STATUSES = {
    ExperienceModerationStatus.SUBMITTED,
    ExperienceModerationStatus.APPROVED,
    ExperienceModerationStatus.REJECTED,
    ExperienceModerationStatus.HIDDEN,
}


def require_admin(user) -> None:
    if not getattr(user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")


def get_or_create_applicant(session: Session, user) -> Applicant:
    applicant = session.exec(select(Applicant).where(Applicant.user_id == user.id)).first()
    if applicant:
        return applicant
    applicant = Applicant(
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        is_anonymous=True,
        visibility=ProfileVisibility.ANONYMIZED,
        university=user.origin_university,
        major=user.field_of_study,
        graduation_year=user.graduation_year,
    )
    session.add(applicant)
    session.flush()
    return applicant


def degree_from_course(course: Optional[Course]) -> ExperienceDegreeLevel:
    raw = (course.degree_level.value if course and course.degree_level else "masters").lower()
    mapping = {
        "master": ExperienceDegreeLevel.MASTERS,
        "masters": ExperienceDegreeLevel.MASTERS,
        "msc": ExperienceDegreeLevel.MASTERS,
        "phd": ExperienceDegreeLevel.PHD,
        "mba": ExperienceDegreeLevel.MBA,
        "postdoc": ExperienceDegreeLevel.POSTDOC,
    }
    return mapping.get(raw, ExperienceDegreeLevel.MASTERS)


def status_from_tracker(status: TrackerApplicationStatus) -> ExperienceApplicationStatus:
    if status == TrackerApplicationStatus.ACCEPTED:
        return ExperienceApplicationStatus.ACCEPTED
    if status == TrackerApplicationStatus.REJECTED:
        return ExperienceApplicationStatus.REJECTED
    if status == TrackerApplicationStatus.WAITLISTED:
        return ExperienceApplicationStatus.WAITLISTED
    if status == TrackerApplicationStatus.WITHDRAWN:
        return ExperienceApplicationStatus.WITHDRAWN
    if status == TrackerApplicationStatus.INTERVIEW:
        return ExperienceApplicationStatus.INTERVIEW
    if status == TrackerApplicationStatus.UNDER_REVIEW:
        return ExperienceApplicationStatus.UNDER_REVIEW
    if status == TrackerApplicationStatus.SUBMITTED:
        return ExperienceApplicationStatus.SUBMITTED
    return ExperienceApplicationStatus.PREPARING


def find_or_create_university(
    payload: ExperienceSubmitFromTracker,
    session: Session,
    current_user,
) -> Optional[University]:
    if payload.university_id:
        return session.get(University, payload.university_id)
    if not payload.university_name or not payload.country:
        return None

    existing = session.exec(
        select(University)
        .where(col(University.name).ilike(payload.university_name.strip()))
        .where(col(University.country).ilike(payload.country.strip()))
    ).first()
    if existing:
        return existing

    settings = get_settings()
    can_add_catalog_entry = settings.debug or bool(getattr(current_user, "is_admin", False))
    if not can_add_catalog_entry:
        return None

    university = University(
        name=payload.university_name.strip(),
        country=payload.country.strip(),
        city=(payload.city or "Unknown").strip() or "Unknown",
    )
    session.add(university)
    session.flush()
    return university


def sync_applicant_visibility(applicant: Applicant, visibility: ExperienceVisibility, payload: ExperienceSubmitFromTracker) -> None:
    applicant.visibility = ProfileVisibility(visibility.value)
    applicant.is_anonymous = visibility == ExperienceVisibility.ANONYMIZED
    applicant.status = ApplicantStatus.PUBLISHED if visibility != ExperienceVisibility.PRIVATE else ApplicantStatus.DRAFT
    applicant.consented_at = datetime.utcnow() if payload.pii_warning_accepted else applicant.consented_at
    applicant.consent_version = "experience-sharing-v1" if payload.pii_warning_accepted else applicant.consent_version
    if payload.visibility == ExperienceVisibility.PUBLIC and not applicant.display_name:
        applicant.display_name = "Applicant"


def to_public_experience(application: Application, viewer=None, *, force_full: bool = False) -> PublicExperienceRead:
    applicant = application.applicant
    has_full_access = force_full or bool(
        applicant and viewer and (applicant.view_price == 0 or applicant.user_id == viewer.id)
    )
    requires_unlock = bool(applicant and applicant.view_price > 0 and not has_full_access)
    show_identity = application.visibility == ExperienceVisibility.PUBLIC and applicant and not applicant.is_anonymous

    notes = application.notes
    interview = application.interview_experience
    advice = application.advice_for_applicants
    timeline = application.timeline_notes
    if requires_unlock:
        notes = (notes[:260] + "...") if notes and len(notes) > 260 else notes
        interview = None
        advice = None
        timeline = None

    university_name = application.university_name or (application.university.name if application.university else None)
    country = application.country or (application.university.country if application.university else None)
    city = application.city or (application.university.city if application.university else None)

    return PublicExperienceRead(
        id=application.id,
        university_id=application.university_id,
        course_id=application.course_id,
        university_name=university_name,
        country=country,
        city=city,
        program_name=application.program_name,
        department=application.department,
        degree_level=application.degree_level,
        application_year=application.application_year,
        application_round=application.application_round,
        status=application.status,
        decision_date=application.decision_date,
        scholarship_applied=application.scholarship_applied,
        scholarship_received=application.scholarship_received,
        scholarship_name=application.scholarship_name,
        scholarship_amount=application.scholarship_amount,
        notes=notes,
        interview_experience=interview,
        advice_for_applicants=advice,
        timeline_notes=timeline,
        would_recommend=application.would_recommend,
        visibility=application.visibility,
        view_price=applicant.view_price if applicant else 0,
        requires_unlock=requires_unlock,
        applicant_display_name=applicant.display_name if show_identity else None,
        applicant_degree_level=applicant.degree_level if applicant else None,
        applicant_major=applicant.major if applicant and (has_full_access or show_identity) else None,
        created_at=application.created_at,
    )


@router.get("", response_model=list[PublicExperienceRead])
@router.get("/", response_model=list[PublicExperienceRead])
def browse_experiences(
    session: Session = Depends(get_session),
    current_user: CurrentUser = None,
    country: Optional[str] = None,
    university_id: Optional[int] = None,
    course_id: Optional[int] = None,
    degree_level: Optional[ExperienceDegreeLevel] = None,
    status: Optional[ExperienceApplicationStatus] = None,
    scholarship_received: Optional[bool] = None,
    query: Optional[str] = Query(default=None, min_length=2),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    q = select(Application).where(Application.moderation_status == ExperienceModerationStatus.APPROVED)
    q = q.where(Application.visibility != ExperienceVisibility.PRIVATE)
    if country:
        q = q.where(col(Application.country).ilike(f"%{country}%"))
    if university_id:
        q = q.where(Application.university_id == university_id)
    if course_id:
        q = q.where(Application.course_id == course_id)
    if degree_level:
        q = q.where(Application.degree_level == degree_level)
    if status:
        q = q.where(Application.status == status)
    if scholarship_received is not None:
        q = q.where(Application.scholarship_received == scholarship_received)
    if query:
        pattern = f"%{query}%"
        q = q.where(col(Application.program_name).ilike(pattern) | col(Application.university_name).ilike(pattern))

    q = q.order_by(Application.created_at.desc()).offset(skip).limit(limit)
    return [to_public_experience(item, current_user) for item in session.exec(q).all()]


@router.get("/my", response_model=list[ApplicationRead])
def my_experiences(session: Session = Depends(get_session), current_user: CurrentUserRequired = None):
    applicant = session.exec(select(Applicant).where(Applicant.user_id == current_user.id)).first()
    if not applicant:
        return []
    q = select(Application).where(Application.applicant_id == applicant.id).order_by(Application.created_at.desc())
    return session.exec(q).all()


@router.get("/admin/review", response_model=list[ApplicationRead])
def admin_review_queue(
    session: Session = Depends(get_session),
    current_user: CurrentUserRequired = None,
    moderation_status: Optional[ExperienceModerationStatus] = Query(default=ExperienceModerationStatus.SUBMITTED),
    limit: int = Query(50, ge=1, le=200),
):
    require_admin(current_user)
    q = select(Application)
    if moderation_status:
        q = q.where(Application.moderation_status == moderation_status)
    q = q.order_by(Application.submitted_for_review_at.desc()).limit(limit)
    return session.exec(q).all()


@router.patch("/admin/{experience_id}", response_model=ApplicationRead)
def moderate_experience(
    experience_id: int,
    update: ExperienceModerationUpdate,
    session: Session = Depends(get_session),
    current_user: CurrentUserRequired = None,
):
    require_admin(current_user)
    if update.moderation_status not in REVIEWABLE_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid moderation status")
    application = session.get(Application, experience_id)
    if not application:
        raise HTTPException(status_code=404, detail="Experience not found")
    application.moderation_status = update.moderation_status
    application.moderation_notes = update.moderation_notes
    application.reviewer_id = current_user.id
    application.reviewed_at = datetime.utcnow()
    application.updated_at = datetime.utcnow()
    session.add(application)
    session.commit()
    session.refresh(application)
    return application


@router.get("/{experience_id}", response_model=PublicExperienceRead)
def get_public_experience(experience_id: int, session: Session = Depends(get_session), current_user: CurrentUser = None):
    application = session.get(Application, experience_id)
    if not application or application.moderation_status != ExperienceModerationStatus.APPROVED or application.visibility == ExperienceVisibility.PRIVATE:
        raise HTTPException(status_code=404, detail="Experience not found")
    return to_public_experience(application, current_user)


def create_experience_from_payload(
    payload: ExperienceSubmitFromTracker,
    session: Session,
    current_user,
    tracked: Optional[TrackedProgram] = None,
) -> Application:
    if payload.visibility != ExperienceVisibility.PRIVATE and not payload.pii_warning_accepted:
        raise HTTPException(status_code=400, detail="PII warning must be accepted before submitting a public or anonymized experience")

    course_id = payload.course_id or (tracked.course_id if tracked else None)
    course = session.get(Course, course_id) if course_id else None
    university_id = payload.university_id or (course.university_id if course else None)
    university = session.get(University, university_id) if university_id else None
    if not university and not course:
        university = find_or_create_university(payload, session, current_user)
    applicant = get_or_create_applicant(session, current_user)
    sync_applicant_visibility(applicant, payload.visibility, payload)

    program_name = payload.program_name or (tracked.custom_program_name if tracked else None) or (course.name if course else None)
    university_name = payload.university_name or (tracked.custom_university_name if tracked else None) or (university.name if university else None)
    country = payload.country or (tracked.custom_country if tracked else None) or (university.country if university else None)
    if not program_name or not university_name:
        raise HTTPException(status_code=400, detail="Program and university names are required")

    tracked_status = status_from_tracker(tracked.status) if tracked else None
    scholarship_amount = payload.scholarship_amount
    if not scholarship_amount and tracked and tracked.scholarship_amount:
        scholarship_amount = str(tracked.scholarship_amount)

    application = Application(
        applicant_id=applicant.id,
        source_tracked_program_id=tracked.id if tracked else None,
        university_id=university.id if university else payload.university_id,
        course_id=course.id if course else payload.course_id,
        university_name=university_name,
        country=country,
        city=payload.city or (university.city if university else None),
        program_name=program_name,
        degree_level=payload.degree_level or degree_from_course(course),
        application_year=payload.application_year,
        application_round=payload.application_round or (tracked.intake.value if tracked and tracked.intake else None),
        application_deadline=payload.application_deadline or (tracked.deadline if tracked else None) or (tracked.custom_deadline if tracked else None) or (course.deadline_fall if course else None),
        submitted_date=payload.submitted_date or (tracked.submitted_date if tracked else None),
        status=tracked_status or payload.status or ExperienceApplicationStatus.ACCEPTED,
        decision_date=payload.decision_date or (tracked.result_date if tracked else None),
        scholarship_applied=payload.scholarship_applied or bool(tracked and tracked.scholarship_offered),
        scholarship_received=payload.scholarship_received or bool(tracked and tracked.scholarship_offered),
        scholarship_name=payload.scholarship_name,
        scholarship_amount=scholarship_amount,
        notes=payload.notes,
        interview_experience=payload.interview_experience,
        advice_for_applicants=payload.advice_for_applicants,
        timeline_notes=payload.timeline_notes,
        how_found=payload.how_found,
        would_recommend=payload.would_recommend,
        visibility=payload.visibility,
        moderation_status=ExperienceModerationStatus.SUBMITTED if payload.visibility != ExperienceVisibility.PRIVATE else ExperienceModerationStatus.DRAFT,
        pii_warning_accepted=payload.pii_warning_accepted,
        submitted_for_review_at=datetime.utcnow() if payload.visibility != ExperienceVisibility.PRIVATE else None,
    )
    session.add(applicant)
    session.add(application)
    session.flush()

    if tracked:
        tracked.shared_as_experience = True
        tracked.shared_experience_id = application.id
        tracked.shared_at = datetime.utcnow()
        tracked.updated_at = datetime.utcnow()
        session.add(tracked)

    reward_application_added(session, current_user, application.id, has_notes=True)
    session.commit()
    session.refresh(application)
    return application


@router.post("/", response_model=ApplicationRead, status_code=201)
@router.post("", response_model=ApplicationRead, status_code=201)
def submit_manual_experience(
    payload: ExperienceSubmitFromTracker,
    session: Session = Depends(get_session),
    current_user: CurrentUserRequired = None,
):
    return create_experience_from_payload(payload, session, current_user)


@router.post("/from-tracker/{program_id}", response_model=ApplicationRead, status_code=201)
def submit_from_tracker(
    program_id: int,
    payload: ExperienceSubmitFromTracker,
    session: Session = Depends(get_session),
    current_user: CurrentUserRequired = None,
):
    tracked = session.get(TrackedProgram, program_id)
    if not tracked or tracked.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Tracked program not found")
    if tracked.status not in {TrackerApplicationStatus.ACCEPTED, TrackerApplicationStatus.REJECTED, TrackerApplicationStatus.WAITLISTED, TrackerApplicationStatus.WITHDRAWN}:
        raise HTTPException(status_code=400, detail="Share experiences after a result is recorded")
    if tracked.shared_as_experience and tracked.shared_experience_id:
        existing = session.get(Application, tracked.shared_experience_id)
        if existing:
            return existing
    return create_experience_from_payload(payload, session, current_user, tracked)
