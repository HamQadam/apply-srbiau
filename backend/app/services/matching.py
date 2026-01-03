"""Matching service - intelligent program recommendations based on user preferences."""
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, timedelta
from sqlmodel import Session, select
from sqlalchemy import or_, and_

from ..models.course import Course
from ..models.university import University
from ..models.user import User

# Available fields for selection
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
    "Design", "Architecture", "Media Studies", "Communications"
]

# Available countries
AVAILABLE_COUNTRIES = [
    "Germany", "Netherlands", "France", "United Kingdom", "Sweden",
    "Denmark", "Finland", "Norway", "Austria", "Switzerland",
    "Belgium", "Ireland", "Italy", "Spain", "Portugal",
    "United States", "Canada", "Australia", "New Zealand",
    "Japan", "South Korea", "Singapore", "Hong Kong"
]

# Budget ranges (annual tuition in EUR)
BUDGET_RANGES = {
    "free": {"min": 0, "max": 0, "label": "Tuition-Free"},
    "low": {"min": 1, "max": 5000, "label": "Under €5,000"},
    "medium": {"min": 5001, "max": 15000, "label": "€5,000 - €15,000"},
    "high": {"min": 15001, "max": 30000, "label": "€15,000 - €30,000"},
    "premium": {"min": 30001, "max": 50000, "label": "€30,000 - €50,000"},
    "unlimited": {"min": 0, "max": 999999, "label": "No Budget Limit"}
}

# Intake periods
INTAKE_OPTIONS = [
    {"value": "fall_2025", "label": "Fall 2025"},
    {"value": "spring_2026", "label": "Spring 2026"},
    {"value": "fall_2026", "label": "Fall 2026"},
    {"value": "spring_2027", "label": "Spring 2027"},
    {"value": "fall_2027", "label": "Fall 2027"}
]

# Degree levels
# DEGREE_LEVELS = ["Bachelor", "Master", "PhD", "MBA"]
# Degree levels (MUST match Postgres enum degreelevel exactly)
DEGREE_LEVELS = ["BACHELOR", "MASTER", "PHD", "DIPLOMA", "CERTIFICATE"]


# Teaching languages
TEACHING_LANGUAGES = ["English", "German", "French", "Dutch", "Spanish", "Italian"]

# Field similarity mappings for fuzzy matching
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

# Country groupings for regional matching
COUNTRY_GROUPS = {
    "Western Europe": ["Germany", "Netherlands", "France", "Belgium", "Austria", "Switzerland"],
    "Nordic": ["Sweden", "Denmark", "Finland", "Norway"],
    "Southern Europe": ["Italy", "Spain", "Portugal"],
    "English-speaking Europe": ["United Kingdom", "Ireland"],
    "North America": ["United States", "Canada"],
    "Oceania": ["Australia", "New Zealand"],
    "Asia-Pacific": ["Japan", "South Korea", "Singapore", "Hong Kong"]
}

def normalize_degree_level(raw: str | None):
    if not raw:
        return None
    return DEGREE_LEVEL_INPUT_MAP.get(raw) or DEGREE_LEVEL_INPUT_MAP.get(raw.strip().lower())

class MatchingService:
    """Service for matching users with programs based on preferences."""
    
    def __init__(self, session: Session):
        self.session = session
    
    def calculate_match_score(
        self,
        course: Course,
        profile: Dict[str, Any]
    ) -> Tuple[int, List[str], List[str]]:
        """
        Calculate match score between a course and user profile.
        
        Returns:
            Tuple of (score 0-100, list of match reasons, list of warnings)
        """
        score = 0
        max_score = 100
        reasons = []
        warnings = []
        
        # --- Field matching (30 points max) ---
        preferred_fields = profile.get("preferred_fields", [])
        if preferred_fields and course.field:
            course_field = course.field
            
            # Exact match
            if course_field in preferred_fields:
                score += 30
                reasons.append(f"✓ Perfect field match: {course_field}")
            else:
                # Check similar fields
                similar_score = 0
                matched_via = None
                for pref_field in preferred_fields:
                    if pref_field in FIELD_SIMILARITIES:
                        if course_field in FIELD_SIMILARITIES[pref_field]:
                            similar_score = 20
                            matched_via = pref_field
                            break
                if similar_score > 0:
                    score += similar_score
                    reasons.append(f"✓ Related to {matched_via}")
        
        # --- Country matching (25 points max) ---
        preferred_countries = profile.get("preferred_countries", [])
        if preferred_countries and course.university:
            course_country = course.university.country
            
            if course_country in preferred_countries:
                score += 25
                reasons.append(f"✓ In preferred country: {course_country}")
            else:
                # Check regional match
                for group_name, countries in COUNTRY_GROUPS.items():
                    if course_country in countries:
                        for pref_country in preferred_countries:
                            if pref_country in countries:
                                score += 15
                                reasons.append(f"✓ Same region as {pref_country}")
                                break
                        break
        
        # --- Budget matching (20 points max) ---
        budget_max = profile.get("budget_max")
        if budget_max is not None and course.tuition_fee_amount is not None:
            if course.tuition_fee_amount <= budget_max:
                score += 20
                if course.tuition_fee_amount == 0 or course.is_tuition_free:
                    reasons.append("✓ Tuition-free program!")
                else:
                    reasons.append(f"✓ Within budget (€{course.tuition_fee_amount:,}/year)")
            elif course.tuition_fee_amount <= budget_max * 1.2:  # Within 20% overage
                score += 10
                warnings.append(f"⚠ Slightly over budget (€{course.tuition_fee_amount:,}/year)")
            else:
                warnings.append(f"⚠ Over budget (€{course.tuition_fee_amount:,}/year)")
        
        preferred_level = profile.get("preferred_degree_level")
        if preferred_level and course.degree_level:
            course_level = course.degree_level.value if hasattr(course.degree_level, "value") else str(course.degree_level)
            if course_level.strip().upper() == preferred_level.strip().upper():
                score += 10
                reasons.append(f"✓ {course_level} level")

        
        # --- Language matching (10 points max) ---
        language_pref = profile.get("language_preference")
        if language_pref and course.teaching_language:
            course_lang = course.teaching_language.value if hasattr(course.teaching_language, 'value') else str(course.teaching_language)
            if course_lang.lower() == language_pref.lower():
                score += 10
                reasons.append(f"✓ Taught in {course_lang.capitalize()}")
            elif course_lang.lower() == "english":
                score += 5
                reasons.append("✓ English-taught")
        
        # --- Bonus points ---
        
        # University ranking bonus (up to 5 points)
        if course.university and course.university.ranking_qs:
            if course.university.ranking_qs <= 50:
                score += 5
                reasons.append(f"★ Top 50 university (QS #{course.university.ranking_qs})")
            elif course.university.ranking_qs <= 100:
                score += 3
                reasons.append(f"★ Top 100 university (QS #{course.university.ranking_qs})")
            elif course.university.ranking_qs <= 200:
                score += 1
        
        # Scholarship availability bonus
        if course.scholarships_available:
            score += 3
            reasons.append("✓ Scholarships available")
        
        # --- Warnings for requirements ---
        
        # GRE/GMAT requirements
        if course.gre_required:
            gre_score = profile.get("gre_score")
            if not gre_score:
                warnings.append("⚠ GRE required")
            elif course.gre_minimum and gre_score < course.gre_minimum:
                warnings.append(f"⚠ GRE score below minimum ({course.gre_minimum})")
        
        if course.gmat_required:
            gmat_score = profile.get("gmat_score")
            if not gmat_score:
                warnings.append("⚠ GMAT required")
            elif course.gmat_minimum and gmat_score < course.gmat_minimum:
                warnings.append(f"⚠ GMAT score below minimum ({course.gmat_minimum})")
        
        # Deadline warning
        if course.deadline_fall:
            days_until = (course.deadline_fall - date.today()).days
            if days_until < 0:
                warnings.append("⚠ Deadline passed")
                score = max(0, score - 20)  # Penalize closed applications
            elif days_until <= 14:
                warnings.append(f"⚠ Deadline in {days_until} days!")
            elif days_until <= 30:
                warnings.append(f"⚠ Deadline in {days_until} days")
        
        # GPA check
        user_gpa = profile.get("gpa")
        gpa_scale = profile.get("gpa_scale", "4.0")
        if user_gpa and course.gpa_minimum:
            normalized_gpa = self._normalize_gpa(user_gpa, gpa_scale)
            if normalized_gpa < course.gpa_minimum:
                warnings.append(f"⚠ GPA below minimum ({course.gpa_minimum})")
        
        # Cap score at 100
        score = min(score, max_score)
        
        return score, reasons, warnings
    
    def _normalize_gpa(self, gpa: float, scale: str) -> float:
        """Normalize GPA to 4.0 scale."""
        if scale == "4.0":
            return gpa
        elif scale == "20":  # French system
            return (gpa / 20) * 4
        elif scale == "100":
            return (gpa / 100) * 4
        elif scale == "10":  # Indian system
            return (gpa / 10) * 4
        return gpa
    
    def get_recommendations(
        self,
        user: User,
        limit: int = 20,
        offset: int = 0,
        min_score: int = 40
    ) -> Tuple[List[Dict], int]:
        """
        Get personalized program recommendations for a user.
        
        Returns:
            Tuple of (list of recommendations, total count)
        """
        if not user.matching_profile:
            return [], 0
        
        profile = user.matching_profile
        
        # Build base query
        query = (
            select(Course)
            .join(University, Course.university_id == University.id)
        )
        
        # Pre-filter by countries if specified
        preferred_countries = profile.get("preferred_countries", [])
        if preferred_countries:
            # Include regional matches too
            expanded_countries = set(preferred_countries)
            for country in preferred_countries:
                for group_name, countries in COUNTRY_GROUPS.items():
                    if country in countries:
                        expanded_countries.update(countries)
            query = query.where(University.country.in_(list(expanded_countries)))
        
        # Pre-filter by degree level
        preferred_level = profile.get("preferred_degree_level")
        if preferred_level:
            preferred_level = preferred_level.strip().upper()
            query = query.where(Course.degree_level == preferred_level)

        
        # Pre-filter by budget (with some margin)
        budget_max = profile.get("budget_max")
        if budget_max is not None and budget_max < 999999:
            query = query.where(
                or_(
                    Course.tuition_fee_amount.is_(None),
                    Course.tuition_fee_amount <= budget_max * 1.5
                )
            )
        
        # Execute query
        courses = self.session.exec(query).all()
        
        # Calculate scores for all courses
        scored_courses = []
        for course in courses:
            score, reasons, warnings = self.calculate_match_score(course, profile)
            if score >= min_score:
                scored_courses.append({
                    "course": course,
                    "score": score,
                    "match_reasons": reasons,
                    "warnings": warnings
                })
        
        # Sort by score descending
        scored_courses.sort(key=lambda x: x["score"], reverse=True)
        
        total = len(scored_courses)
        
        # Apply pagination
        paginated = scored_courses[offset:offset + limit]
        
        # Format results
        results = []
        for item in paginated:
            course = item["course"]
            course_level = course.degree_level.value if hasattr(course.degree_level, 'value') else str(course.degree_level)
            course_lang = course.teaching_language.value if hasattr(course.teaching_language, 'value') else str(course.teaching_language)
            results.append({
                "id": course.id,
                "program_name": course.name,
                "university_name": course.university.name if course.university else None,
                "country": course.university.country if course.university else None,
                "city": course.university.city if course.university else None,
                "degree_level": course_level,
                "field_of_study": course.field,
                "tuition_fee": course.tuition_fee_amount,
                "teaching_language": course_lang,
                "duration_months": course.duration_months,
                "application_deadline": course.deadline_fall.isoformat() if course.deadline_fall else None,
                "university_ranking_qs": course.university.ranking_qs if course.university else None,
                "scholarship_available": course.scholarships_available,
                "match_score": item["score"],
                "match_reasons": item["match_reasons"],
                "warnings": item["warnings"]
            })
        
        return results, total
    
    def get_quick_recommendations(
        self,
        profile: Dict[str, Any],
        limit: int = 5
    ) -> List[Dict]:
        """
        Get quick recommendations without requiring authentication.
        Used for preview/demo purposes.
        """
        # Build base query
        query = (
            select(Course)
            .join(University, Course.university_id == University.id)
        )
        
        # Simple filters
        preferred_countries = profile.get("preferred_countries", [])
        if preferred_countries:
            query = query.where(University.country.in_(preferred_countries))
        
        preferred_level = profile.get("preferred_degree_level")
        if preferred_level:
            preferred_level = preferred_level.strip().upper()
            query = query.where(Course.degree_level == preferred_level)

        # Limit query
        query = query.limit(50)
        courses = self.session.exec(query).all()
        
        # Score and sort
        scored = []
        for course in courses:
            score, reasons, warnings = self.calculate_match_score(course, profile)
            scored.append({
                "course": course,
                "score": score,
                "match_reasons": reasons[:3],  # Limit reasons for preview
                "warnings": warnings[:2]
            })
        
        scored.sort(key=lambda x: x["score"], reverse=True)
        
        # Format top results
        results = []
        for item in scored[:limit]:
            course = item["course"]
            results.append({
                "id": course.id,
                "program_name": course.name,
                "university_name": course.university.name if course.university else None,
                "country": course.university.country if course.university else None,
                "match_score": item["score"],
                "match_reasons": item["match_reasons"]
            })
        
        return results


def get_matching_options() -> Dict[str, Any]:
    """Return all available options for the profile wizard."""
    return {
        "fields": AVAILABLE_FIELDS,
        "countries": AVAILABLE_COUNTRIES,
        "budget_ranges": BUDGET_RANGES,
        "intake_options": INTAKE_OPTIONS,
        "degree_levels": DEGREE_LEVELS,
        "teaching_languages": TEACHING_LANGUAGES
    }
