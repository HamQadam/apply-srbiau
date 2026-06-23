"""Matching service - explainable program recommendations based on typed profiles."""
from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Tuple

from sqlalchemy import or_
from sqlmodel import Session, select

from ..models.course import Course
from ..models.matching_profile import MatchExplanation, MatchingProfileModel, RecommendationRefinement
from ..models.university import University
from ..models.user import User

AVAILABLE_FIELDS = [
    "Computer Science", "Data Science", "Artificial Intelligence", "Machine Learning",
    "Software Engineering", "Information Systems", "Cybersecurity",
    "Business Administration", "MBA", "Finance", "Marketing", "Management",
    "Economics", "International Business",
    "Mechanical Engineering", "Electrical Engineering", "Civil Engineering",
    "Chemical Engineering", "Biomedical Engineering", "Aerospace Engineering",
    "Physics", "Mathematics", "Statistics", "Chemistry", "Biology",
    "Medicine", "Public Health", "Nursing", "Pharmacy",
    "Law", "International Relations", "Political Science",
    "Psychology", "Sociology", "Education", "Linguistics",
    "Design", "Architecture", "Media Studies", "Communications",
]

AVAILABLE_COUNTRIES = [
    "Germany", "Netherlands", "France", "United Kingdom", "Sweden",
    "Denmark", "Finland", "Norway", "Austria", "Switzerland",
    "Belgium", "Ireland", "Italy", "Spain", "Portugal",
    "United States", "Canada", "Australia", "New Zealand",
    "Japan", "South Korea", "Singapore", "Hong Kong",
]

BUDGET_RANGES = {
    "free": {"min": 0, "max": 0, "label": "Tuition-Free"},
    "low": {"min": 1, "max": 5000, "label": "Under EUR 5,000"},
    "medium": {"min": 5001, "max": 15000, "label": "EUR 5,000 - EUR 15,000"},
    "high": {"min": 15001, "max": 30000, "label": "EUR 15,000 - EUR 30,000"},
    "premium": {"min": 30001, "max": 50000, "label": "EUR 30,000 - EUR 50,000"},
    "unlimited": {"min": 0, "max": 999999, "label": "No Budget Limit"},
}

INTAKE_OPTIONS = [
    {"value": "fall_2025", "label": "Fall 2025"},
    {"value": "spring_2026", "label": "Spring 2026"},
    {"value": "fall_2026", "label": "Fall 2026"},
    {"value": "spring_2027", "label": "Spring 2027"},
    {"value": "fall_2027", "label": "Fall 2027"},
]

DEGREE_LEVELS = ["BACHELOR", "MASTER", "PHD", "DIPLOMA", "CERTIFICATE"]
TEACHING_LANGUAGES = ["english", "german", "french", "dutch", "spanish", "italian"]
MAX_RECOMMENDATION_RESULTS = 150
TOO_MANY_RESULTS_THRESHOLD = 80

FIELD_SIMILARITIES = {
    "Computer Science": ["Data Science", "Software Engineering", "Information Systems", "Artificial Intelligence", "Machine Learning", "Cybersecurity"],
    "Data Science": ["Computer Science", "Statistics", "Machine Learning", "Artificial Intelligence", "Mathematics"],
    "Artificial Intelligence": ["Machine Learning", "Data Science", "Computer Science", "Statistics"],
    "Machine Learning": ["Artificial Intelligence", "Data Science", "Computer Science", "Statistics"],
    "Software Engineering": ["Computer Science", "Information Systems"],
    "Business Administration": ["MBA", "Management", "Finance", "Marketing", "International Business"],
    "MBA": ["Business Administration", "Management", "Finance", "International Business"],
    "Finance": ["Economics", "Business Administration", "MBA"],
    "Economics": ["Finance", "Business Administration", "International Business"],
    "Mechanical Engineering": ["Aerospace Engineering", "Civil Engineering"],
    "Electrical Engineering": ["Computer Science", "Biomedical Engineering"],
    "Medicine": ["Public Health", "Biomedical Engineering", "Pharmacy"],
    "Psychology": ["Sociology", "Education"],
    "Law": ["Political Science", "International Relations"],
}

COUNTRY_GROUPS = {
    "Western Europe": ["Germany", "Netherlands", "France", "Belgium", "Austria", "Switzerland"],
    "Nordic": ["Sweden", "Denmark", "Finland", "Norway"],
    "Southern Europe": ["Italy", "Spain", "Portugal"],
    "English-speaking Europe": ["United Kingdom", "Ireland"],
    "North America": ["United States", "Canada"],
    "Oceania": ["Australia", "New Zealand"],
    "Asia-Pacific": ["Japan", "South Korea", "Singapore", "Hong Kong"],
}


def _enum_value(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)


def normalize_profile(profile: dict[str, Any] | MatchingProfileModel | None) -> MatchingProfileModel:
    if isinstance(profile, MatchingProfileModel):
        return profile
    return MatchingProfileModel.model_validate(profile or {})


class MatchingService:
    """Service for matching users with programs based on validated preferences."""

    def __init__(self, session: Session):
        self.session = session

    def calculate_match_score(self, course: Course, profile: Dict[str, Any]) -> Tuple[int, List[str], List[str]]:
        result = self.calculate_match_details(course, profile)
        return result["score"], result["match_reasons"], result["warnings"]

    def calculate_match_details(self, course: Course, profile: dict[str, Any] | MatchingProfileModel) -> dict[str, Any]:
        profile_model = normalize_profile(profile)
        score = 0
        reasons: list[str] = []
        warnings: list[str] = []
        explanations: list[MatchExplanation] = []

        def add_strength(code: str, label: str, points: int, detail: str | None = None) -> None:
            nonlocal score
            score += points
            reasons.append(label)
            explanations.append(MatchExplanation(code=code, kind="strength", label=label, detail=detail, points=points))

        def add_warning(code: str, label: str, points: int = 0, detail: str | None = None) -> None:
            warnings.append(label)
            explanations.append(MatchExplanation(code=code, kind="warning", label=label, detail=detail, points=points))

        preferred_fields = profile_model.preferred_fields
        if preferred_fields and course.field:
            if course.field in preferred_fields:
                add_strength("field_exact", f"Perfect field match: {course.field}", 30)
            else:
                for pref_field in preferred_fields:
                    if course.field in FIELD_SIMILARITIES.get(pref_field, []):
                        add_strength("field_related", f"Related to {pref_field}", 20, f"Program field: {course.field}")
                        break

        preferred_countries = profile_model.preferred_countries
        if preferred_countries and course.university:
            course_country = course.university.country
            if course_country in preferred_countries:
                add_strength("country_exact", f"In preferred country: {course_country}", 25)
            else:
                for countries in COUNTRY_GROUPS.values():
                    if course_country in countries:
                        for pref_country in preferred_countries:
                            if pref_country in countries:
                                add_strength("country_region", f"Same region as {pref_country}", 15, f"Program country: {course_country}")
                                break
                        break

        budget_max = profile_model.budget_max_eur
        if budget_max is not None and budget_max < 999999:
            tuition = 0 if course.is_tuition_free else course.tuition_fee_amount
            if tuition is None:
                explanations.append(MatchExplanation(code="budget_unknown", kind="info", label="Tuition not listed", points=0))
            elif tuition <= budget_max:
                label = "Tuition-free program" if tuition == 0 else f"Within budget (EUR {tuition:,}/year)"
                add_strength("budget_fit", label, 20)
            elif tuition <= budget_max * 1.2:
                score += 10
                add_warning("budget_near", f"Slightly over budget (EUR {tuition:,}/year)", 10)
            else:
                add_warning("budget_over", f"Over budget (EUR {tuition:,}/year)")

        preferred_level = profile_model.preferred_degree_level
        if preferred_level and course.degree_level:
            course_level = _enum_value(course.degree_level).strip().upper()
            if course_level == preferred_level:
                add_strength("degree_fit", f"{course_level.title()} level", 10)

        language_pref = profile_model.language_preference
        if language_pref and course.teaching_language:
            course_lang = _enum_value(course.teaching_language).lower()
            if course_lang == language_pref:
                add_strength("language_exact", f"Taught in {course_lang.capitalize()}", 10)
            elif course_lang == "english":
                add_strength("language_english", "English-taught", 5)

        if course.university and course.university.ranking_qs:
            rank = course.university.ranking_qs
            if rank <= 50:
                add_strength("ranking_top_50", f"Top 50 university (QS #{rank})", 5)
            elif rank <= 100:
                add_strength("ranking_top_100", f"Top 100 university (QS #{rank})", 3)
            elif rank <= 200:
                add_strength("ranking_top_200", f"Top 200 university (QS #{rank})", 1)

        if course.scholarships_available:
            points = 6 if profile_model.prefer_scholarships else 3
            add_strength("scholarship", "Scholarships available", points)

        if course.gre_required:
            gre_score = profile_model.gre_score
            if not gre_score:
                add_warning("gre_required", "GRE required")
            elif course.gre_minimum and gre_score < course.gre_minimum:
                add_warning("gre_low", f"GRE score below minimum ({course.gre_minimum})")

        if course.gmat_required:
            gmat_score = profile_model.gmat_score
            if not gmat_score:
                add_warning("gmat_required", "GMAT required")
            elif course.gmat_minimum and gmat_score < course.gmat_minimum:
                add_warning("gmat_low", f"GMAT score below minimum ({course.gmat_minimum})")

        if course.deadline_fall:
            days_until = (course.deadline_fall - date.today()).days
            if days_until < 0:
                add_warning("deadline_passed", "Deadline passed", -20)
                score = max(0, score - 20)
            elif days_until <= 14:
                add_warning("deadline_urgent", f"Deadline in {days_until} days")
            elif days_until <= 30:
                add_warning("deadline_soon", f"Deadline in {days_until} days")

        if profile_model.gpa is not None and course.gpa_minimum:
            normalized_gpa = self._normalize_gpa(profile_model.gpa, profile_model.gpa_scale)
            if normalized_gpa < course.gpa_minimum:
                add_warning("gpa_low", f"GPA below minimum ({course.gpa_minimum})", detail=f"Normalized GPA: {normalized_gpa:.2f}/4.0")
            else:
                add_strength("gpa_fit", "GPA meets listed minimum", 4, f"Normalized GPA: {normalized_gpa:.2f}/4.0")

        score = min(max(score, 0), 100)
        return {
            "score": score,
            "match_reasons": reasons,
            "warnings": warnings,
            "match_explanations": [item.model_dump() for item in explanations],
        }

    def _normalize_gpa(self, gpa: float, scale: str) -> float:
        if scale == "4.0":
            return gpa
        if scale == "20":
            return (gpa / 20) * 4
        if scale == "100":
            return (gpa / 100) * 4
        if scale == "10":
            return (gpa / 10) * 4
        return gpa

    def get_recommendations(self, user: User, limit: int = 20, offset: int = 0, min_score: int = 40) -> Tuple[List[Dict], int, List[Dict], Dict[str, Any]]:
        if not user.matching_profile:
            return [], 0, [], {"max_results": MAX_RECOMMENDATION_RESULTS, "capped": False}

        profile = normalize_profile(user.matching_profile)
        stmt = select(Course).join(University, Course.university_id == University.id)

        preferred_countries = profile.preferred_countries
        if preferred_countries:
            expanded_countries = set(preferred_countries)
            for country in preferred_countries:
                for countries in COUNTRY_GROUPS.values():
                    if country in countries:
                        expanded_countries.update(countries)
            stmt = stmt.where(University.country.in_(list(expanded_countries)))

        if profile.preferred_degree_level:
            stmt = stmt.where(Course.degree_level == profile.preferred_degree_level)

        budget_max = profile.budget_max_eur
        if budget_max is not None and budget_max < 999999:
            stmt = stmt.where(or_(Course.is_tuition_free == True, Course.tuition_fee_amount.is_(None), Course.tuition_fee_amount <= budget_max * 1.5))

        courses = self.session.exec(stmt).all()
        scored_courses = []
        for course in courses:
            details = self.calculate_match_details(course, profile)
            if details["score"] >= min_score:
                scored_courses.append({"course": course, **details})

        scored_courses.sort(key=lambda item: item["score"], reverse=True)
        uncapped_total = len(scored_courses)
        capped = uncapped_total > MAX_RECOMMENDATION_RESULTS
        scored_courses = scored_courses[:MAX_RECOMMENDATION_RESULTS]
        total = len(scored_courses)
        paginated = scored_courses[offset:offset + limit]
        results = [self._format_recommendation(item) for item in paginated]
        refinements = self.get_refinement_prompts(profile, uncapped_total)
        threshold = {"max_results": MAX_RECOMMENDATION_RESULTS, "uncapped_total": uncapped_total, "capped": capped, "too_many": uncapped_total > TOO_MANY_RESULTS_THRESHOLD}
        return results, total, refinements, threshold

    def _format_recommendation(self, item: dict[str, Any]) -> dict[str, Any]:
        course = item["course"]
        return {
            "id": course.id,
            "program_name": course.name,
            "university_name": course.university.name if course.university else None,
            "country": course.university.country if course.university else None,
            "city": course.university.city if course.university else None,
            "degree_level": _enum_value(course.degree_level),
            "field_of_study": course.field,
            "tuition_fee": course.tuition_fee_amount,
            "teaching_language": _enum_value(course.teaching_language),
            "duration_months": course.duration_months,
            "application_deadline": course.deadline_fall.isoformat() if course.deadline_fall else None,
            "university_ranking_qs": course.university.ranking_qs if course.university else None,
            "scholarship_available": course.scholarships_available,
            "match_score": item["score"],
            "match_reasons": item["match_reasons"],
            "warnings": item["warnings"],
            "match_explanations": item["match_explanations"],
        }

    def get_refinement_prompts(self, profile: MatchingProfileModel, total: int) -> list[dict[str, Any]]:
        prompts: list[RecommendationRefinement] = []
        if total == 0:
            prompts.append(RecommendationRefinement(code="broaden_country", label="Broaden countries", detail="Add nearby countries or remove strict country preferences."))
            prompts.append(RecommendationRefinement(code="raise_budget", label="Review budget", detail="Many programs are filtered out by tuition. Consider a higher ceiling or tuition-free only strategy."))
        elif total > TOO_MANY_RESULTS_THRESHOLD:
            prompts.append(RecommendationRefinement(code="add_field_focus", label="Narrow fields", detail="Choose one or two priority fields before comparing programs."))
            prompts.append(RecommendationRefinement(code="add_budget_focus", label="Tighten budget", detail="Set a realistic annual tuition ceiling to reduce noisy matches."))
        if profile.gpa is None:
            prompts.append(RecommendationRefinement(code="add_gpa", label="Add Iranian GPA", detail="Enter your GPA on the 20-point scale so requirement warnings are more accurate."))
        if not profile.language_preference:
            prompts.append(RecommendationRefinement(code="add_language", label="Pick teaching language", detail="Language preference helps separate English-taught programs from local-language options."))
        return [prompt.model_dump() for prompt in prompts[:3]]

    def get_quick_recommendations(self, profile: Dict[str, Any], limit: int = 5) -> List[Dict]:
        profile_model = normalize_profile(profile)
        stmt = select(Course).join(University, Course.university_id == University.id)
        if profile_model.preferred_countries:
            stmt = stmt.where(University.country.in_(profile_model.preferred_countries))
        if profile_model.preferred_degree_level:
            stmt = stmt.where(Course.degree_level == profile_model.preferred_degree_level)
        courses = self.session.exec(stmt.limit(50)).all()

        scored = []
        for course in courses:
            details = self.calculate_match_details(course, profile_model)
            scored.append({"course": course, **details})
        scored.sort(key=lambda item: item["score"], reverse=True)
        return [self._format_recommendation(item) for item in scored[:limit]]


def get_matching_options() -> Dict[str, Any]:
    return {
        "fields": AVAILABLE_FIELDS,
        "countries": AVAILABLE_COUNTRIES,
        "budget_ranges": BUDGET_RANGES,
        "intake_options": INTAKE_OPTIONS,
        "degree_levels": DEGREE_LEVELS,
        "teaching_languages": TEACHING_LANGUAGES,
        "gpa_scales": ["20", "4.0", "100", "10"],
        "budget_currencies": ["EUR", "USD", "CAD", "GBP", "IRR"],
    }
