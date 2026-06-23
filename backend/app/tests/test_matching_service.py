from datetime import date, timedelta

import pytest

from app.models.course import Course, DegreeLevel, TeachingLanguage
from app.models.matching_profile import MatchingProfileModel
from app.models.university import University
from app.services.matching import MatchingService


def make_course(**overrides):
    university = University(
        id=1,
        name="TU Example",
        country="Germany",
        city="Berlin",
        ranking_qs=85,
    )
    data = {
        "id": 1,
        "university_id": 1,
        "name": "MSc Computer Science",
        "degree_level": DegreeLevel.MASTER,
        "field": "Computer Science",
        "teaching_language": TeachingLanguage.ENGLISH,
        "tuition_fee_amount": 9000,
        "tuition_fee_currency": "EUR",
        "is_tuition_free": False,
        "deadline_fall": date.today() + timedelta(days=90),
        "gpa_minimum": 3.0,
        "scholarships_available": True,
        "university": university,
    }
    data.update(overrides)
    return Course(**data)


def test_matching_profile_normalizes_degree_language_budget_and_iranian_gpa():
    profile = MatchingProfileModel(
        preferred_fields=["Computer Science", "Computer Science", ""],
        preferred_countries=["Germany"],
        preferred_degree_level="master",
        language_preference="English",
        budget_max=10_000,
        budget_currency="USD",
        gpa=16,
        gpa_scale="20",
    )

    assert profile.preferred_fields == ["Computer Science"]
    assert profile.preferred_degree_level == "MASTER"
    assert profile.language_preference == "english"
    assert profile.budget_max_eur == 9200
    assert profile.is_complete is True


def test_matching_profile_rejects_gpa_above_selected_scale():
    with pytest.raises(ValueError):
        MatchingProfileModel(
            preferred_fields=["Computer Science"],
            preferred_countries=["Germany"],
            preferred_degree_level="MASTER",
            gpa=21,
            gpa_scale="20",
        )


def test_match_score_uses_iranian_gpa_budget_conversion_and_structured_explanations():
    profile = MatchingProfileModel(
        preferred_fields=["Computer Science"],
        preferred_countries=["Germany"],
        preferred_degree_level="MASTER",
        language_preference="english",
        budget_max=10_000,
        budget_currency="USD",
        gpa=16,
        gpa_scale="20",
        prefer_scholarships=True,
    )
    course = make_course()

    details = MatchingService(session=None).calculate_match_details(course, profile)

    assert details["score"] >= 90
    codes = {item["code"] for item in details["match_explanations"]}
    assert "field_exact" in codes
    assert "budget_fit" in codes
    assert "gpa_fit" in codes
    assert details["warnings"] == []


def test_match_score_warns_for_low_iranian_gpa():
    profile = MatchingProfileModel(
        preferred_fields=["Computer Science"],
        preferred_countries=["Germany"],
        preferred_degree_level="MASTER",
        gpa=13,
        gpa_scale="20",
    )
    course = make_course(gpa_minimum=3.0)

    details = MatchingService(session=None).calculate_match_details(course, profile)

    assert any(item["code"] == "gpa_low" for item in details["match_explanations"])
    assert any("GPA below minimum" in warning for warning in details["warnings"])
