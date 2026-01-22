from datetime import datetime, date
from typing import Optional
from sqlmodel import Session, select

from app.models import Applicant
from app.models.applicant_language_test import ApplicantLanguageTest, LanguageTestType
from app.models.applicant_work_experience import ApplicantWorkExperience


def _add_years(d: date, years: int) -> date:
    try:
        return d.replace(year=d.year + years)
    except ValueError:
        # Feb 29 -> Feb 28
        return d.replace(month=2, day=28, year=d.year + years)


def compute_expiry(taken_at: Optional[date]) -> Optional[date]:
    if not taken_at:
        return None
    return _add_years(taken_at, 2)


def get_or_create_applicant_draft(session: Session, user_id: int) -> Applicant:
    applicant = session.exec(select(Applicant).where(Applicant.user_id == user_id)).first()
    if applicant:
        return applicant

    applicant = Applicant(user_id=user_id)  # draft with mostly nulls (after migration)
    applicant.created_at = datetime.utcnow()
    applicant.updated_at = datetime.utcnow()
    session.add(applicant)
    session.commit()
    session.refresh(applicant)
    return applicant


def replace_work_experiences(session: Session, applicant_id: int, items: list[dict]) -> None:
    # delete old
    old = session.exec(
        select(ApplicantWorkExperience).where(ApplicantWorkExperience.applicant_id == applicant_id)
    ).all()
    for o in old:
        session.delete(o)

    # insert new
    for i in items:
        session.add(ApplicantWorkExperience(applicant_id=applicant_id, **i))


def upsert_language_test(session: Session, applicant_id: int, payload: dict) -> None:
    # keep one row per applicant for wizard simplicity
    test_type = LanguageTestType(payload["test_type"])
    existing = session.exec(
        select(ApplicantLanguageTest)
        .where(ApplicantLanguageTest.applicant_id == applicant_id)
        .where(ApplicantLanguageTest.test_type == test_type)
    ).first()

    taken_at = payload.get("taken_at")
    expires_at = payload.get("expires_at") or compute_expiry(taken_at)

    if existing:
        existing.taken_at = taken_at
        existing.expires_at = expires_at
        existing.overall_score = payload.get("overall_score")
        existing.details = payload.get("details")
        existing.updated_at = datetime.utcnow()
    else:
        session.add(ApplicantLanguageTest(
            applicant_id=applicant_id,
            test_type=test_type,
            taken_at=taken_at,
            expires_at=expires_at,
            overall_score=payload.get("overall_score"),
            details=payload.get("details"),
        ))
