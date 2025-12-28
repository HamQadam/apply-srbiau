"""Seed database with sample universities and courses."""
import sys
sys.path.insert(0, "/app")
from sqlalchemy import func, text 
from datetime import date
from sqlmodel import Session, select
from app.database import engine
from app.models import (
    University, Course, CourseLanguageRequirement,
    DegreeLevel, TeachingLanguage, Currency, LanguageTestType, CEFRLevel,
)


UNIVERSITIES = [
    # France
    {
        "name": "Université Paris-Saclay",
        "country": "France",
        "city": "Paris",
        "ranking_qs": 71,
        "ranking_the": 65,
        "university_type": "public",
        "website": "https://www.universite-paris-saclay.fr/",
    },
    {
        "name": "Sorbonne Université",
        "country": "France",
        "city": "Paris",
        "ranking_qs": 59,
        "ranking_the": 88,
        "university_type": "public",
        "website": "https://www.sorbonne-universite.fr/",
    },
    {
        "name": "Université de Lille",
        "country": "France",
        "city": "Lille",
        "ranking_qs": 851,
        "university_type": "public",
        "website": "https://www.univ-lille.fr/",
    },
    {
        "name": "Institut Polytechnique de Paris",
        "country": "France",
        "city": "Paris",
        "ranking_qs": 48,
        "university_type": "public",
        "website": "https://www.ip-paris.fr/",
    },
    # Germany
    {
        "name": "Technical University of Munich",
        "country": "Germany",
        "city": "Munich",
        "ranking_qs": 37,
        "ranking_the": 30,
        "university_type": "public",
        "website": "https://www.tum.de/",
    },
    {
        "name": "RWTH Aachen University",
        "country": "Germany",
        "city": "Aachen",
        "ranking_qs": 106,
        "university_type": "public",
        "website": "https://www.rwth-aachen.de/",
    },
    {
        "name": "Technical University of Berlin",
        "country": "Germany",
        "city": "Berlin",
        "ranking_qs": 154,
        "university_type": "public",
        "website": "https://www.tu.berlin/",
    },
    # Netherlands
    {
        "name": "Delft University of Technology",
        "country": "Netherlands",
        "city": "Delft",
        "ranking_qs": 47,
        "ranking_the": 48,
        "university_type": "public",
        "website": "https://www.tudelft.nl/",
    },
    {
        "name": "University of Amsterdam",
        "country": "Netherlands",
        "city": "Amsterdam",
        "ranking_qs": 53,
        "ranking_the": 60,
        "university_type": "public",
        "website": "https://www.uva.nl/",
    },
    {
        "name": "Vrije Universiteit Amsterdam",
        "country": "Netherlands",
        "city": "Amsterdam",
        "ranking_qs": 207,
        "university_type": "public",
        "website": "https://www.vu.nl/",
    },
    {
        "name": "Eindhoven University of Technology",
        "country": "Netherlands",
        "city": "Eindhoven",
        "ranking_qs": 120,
        "university_type": "public",
        "website": "https://www.tue.nl/",
    },
    # Canada
    {
        "name": "University of Toronto",
        "country": "Canada",
        "city": "Toronto",
        "ranking_qs": 21,
        "ranking_the": 18,
        "university_type": "public",
        "website": "https://www.utoronto.ca/",
    },
    {
        "name": "University of British Columbia",
        "country": "Canada",
        "city": "Vancouver",
        "ranking_qs": 38,
        "ranking_the": 41,
        "university_type": "public",
        "website": "https://www.ubc.ca/",
    },
    # Estonia
    {
        "name": "University of Tartu",
        "country": "Estonia",
        "city": "Tartu",
        "ranking_qs": 285,
        "university_type": "public",
        "website": "https://www.ut.ee/",
    },
    {
        "name": "Tallinn University of Technology",
        "country": "Estonia",
        "city": "Tallinn",
        "ranking_qs": 751,
        "university_type": "public",
        "website": "https://taltech.ee/",
    },
]


def create_course_with_requirements(session: Session, uni_id: int, course_data: dict, lang_reqs: list):
    """Create course and its language requirements."""
    course = Course(university_id=uni_id, **course_data)
    session.add(course)
    session.flush()  # Get ID
    
    for req in lang_reqs:
        lr = CourseLanguageRequirement(course_id=course.id, **req)
        session.add(lr)
    
    return course


def seed():
    """Run seeding."""
    with Session(engine) as session:
        # Check if already seeded
        existing = session.exec(
            select(func.count()).select_from(University)
        ).one()
        if existing and existing > 0:

        
        print("Seeding universities...")
        uni_ids = {}
        for uni_data in UNIVERSITIES:
            uni = University(**uni_data)
            session.add(uni)
            session.flush()
            uni_ids[uni.name] = uni.id
            print(f"  Added: {uni.name}")
        
        print("\nSeeding courses...")
        
        # Sorbonne - DIGIT Master
        create_course_with_requirements(
            session,
            uni_ids["Sorbonne Université"],
            {
                "name": "Master DIGIT - Computer Science",
                "degree_level": DegreeLevel.MASTER,
                "field": "Computer Science",
                "teaching_language": TeachingLanguage.ENGLISH,
                "duration_months": 24,
                "credits_ects": 120,
                "is_tuition_free": False,
                "tuition_fee_amount": 243,
                "tuition_fee_currency": Currency.EUR,
                "deadline_fall": date(2025, 4, 15),
                "gpa_minimum": 3.0,
                "program_url": "https://sciences.sorbonne-universite.fr/formation-sciences/masters/master-informatique",
            },
            [
                {
                    "test_type": LanguageTestType.IELTS,
                    "minimum_overall": 6.5,
                    "minimum_speaking": 6.0,
                    "minimum_writing": 6.0,
                },
                {
                    "test_type": LanguageTestType.TOEFL_IBT,
                    "minimum_overall": 90,
                    "is_mandatory": False,
                },
            ]
        )
        print("  Added: Sorbonne - DIGIT Master")
        
        # Lille - Data Science Master
        create_course_with_requirements(
            session,
            uni_ids["Université de Lille"],
            {
                "name": "Master in Data Science",
                "degree_level": DegreeLevel.MASTER,
                "field": "Data Science",
                "teaching_language": TeachingLanguage.ENGLISH,
                "duration_months": 24,
                "credits_ects": 120,
                "is_tuition_free": False,
                "tuition_fee_amount": 243,
                "tuition_fee_currency": Currency.EUR,
                "deadline_fall": date(2025, 5, 1),
                "gpa_minimum": 3.0,
                "program_url": "https://www.univ-lille.fr/formations/fr-00002035",
            },
            [
                {
                    "test_type": LanguageTestType.IELTS,
                    "minimum_overall": 6.5,
                },
                {
                    "test_type": LanguageTestType.TOEFL_IBT,
                    "minimum_overall": 85,
                    "is_mandatory": False,
                },
            ]
        )
        print("  Added: Lille - Data Science Master")
        
        # TU Delft - Computer Science
        create_course_with_requirements(
            session,
            uni_ids["Delft University of Technology"],
            {
                "name": "MSc Computer Science",
                "degree_level": DegreeLevel.MASTER,
                "field": "Computer Science",
                "teaching_language": TeachingLanguage.ENGLISH,
                "duration_months": 24,
                "credits_ects": 120,
                "is_tuition_free": False,
                "tuition_fee_amount": 20550,
                "tuition_fee_currency": Currency.EUR,
                "deadline_fall": date(2025, 3, 1),
                "deadline_notes": "EU: May 1, Non-EU: March 1",
                "gpa_minimum": 3.0,
                "program_url": "https://www.tudelft.nl/onderwijs/opleidingen/masters/cs/msc-computer-science",
            },
            [
                {
                    "test_type": LanguageTestType.IELTS,
                    "minimum_overall": 6.5,
                    "minimum_speaking": 6.0,
                    "minimum_writing": 6.0,
                    "minimum_reading": 6.0,
                    "minimum_listening": 6.0,
                },
                {
                    "test_type": LanguageTestType.TOEFL_IBT,
                    "minimum_overall": 90,
                    "minimum_speaking": 21,
                    "minimum_writing": 21,
                    "is_mandatory": False,
                },
            ]
        )
        print("  Added: TU Delft - Computer Science")
        
        # VU Amsterdam - Computer Science
        create_course_with_requirements(
            session,
            uni_ids["Vrije Universiteit Amsterdam"],
            {
                "name": "MSc Computer Science",
                "degree_level": DegreeLevel.MASTER,
                "field": "Computer Science",
                "teaching_language": TeachingLanguage.ENGLISH,
                "duration_months": 24,
                "credits_ects": 120,
                "is_tuition_free": False,
                "tuition_fee_amount": 17900,
                "tuition_fee_currency": Currency.EUR,
                "deadline_fall": date(2025, 4, 1),
                "gpa_minimum": 3.0,
                "program_url": "https://vu.nl/en/education/master/computer-science",
            },
            [
                {
                    "test_type": LanguageTestType.IELTS,
                    "minimum_overall": 6.5,
                    "minimum_speaking": 6.0,
                    "minimum_writing": 6.0,
                },
                {
                    "test_type": LanguageTestType.TOEFL_IBT,
                    "minimum_overall": 92,
                    "minimum_speaking": 20,
                    "minimum_writing": 20,
                    "is_mandatory": False,
                },
            ]
        )
        print("  Added: VU Amsterdam - Computer Science")
        
        # TUM - Data Engineering
        create_course_with_requirements(
            session,
            uni_ids["Technical University of Munich"],
            {
                "name": "MSc Data Engineering and Analytics",
                "degree_level": DegreeLevel.MASTER,
                "field": "Data Science",
                "teaching_language": TeachingLanguage.ENGLISH,
                "duration_months": 24,
                "credits_ects": 120,
                "is_tuition_free": True,
                "tuition_fee_amount": 0,
                "tuition_fee_currency": Currency.EUR,
                "deadline_fall": date(2025, 5, 31),
                "gpa_minimum": 3.0,
                "gre_required": False,
                "program_url": "https://www.tum.de/en/studies/degree-programs/detail/data-engineering-and-analytics-master-of-science-msc",
            },
            [
                {
                    "test_type": LanguageTestType.IELTS,
                    "minimum_overall": 6.5,
                },
                {
                    "test_type": LanguageTestType.TOEFL_IBT,
                    "minimum_overall": 88,
                    "is_mandatory": False,
                },
            ]
        )
        print("  Added: TUM - Data Engineering")
        
        # TUM - Computer Science
        create_course_with_requirements(
            session,
            uni_ids["Technical University of Munich"],
            {
                "name": "MSc Informatics",
                "degree_level": DegreeLevel.MASTER,
                "field": "Computer Science",
                "teaching_language": TeachingLanguage.ENGLISH,
                "duration_months": 24,
                "credits_ects": 120,
                "is_tuition_free": True,
                "deadline_fall": date(2025, 5, 31),
                "gpa_minimum": 3.0,
                "program_url": "https://www.tum.de/en/studies/degree-programs/detail/informatics-master-of-science-msc",
            },
            [
                {
                    "test_type": LanguageTestType.IELTS,
                    "minimum_overall": 6.5,
                },
            ]
        )
        print("  Added: TUM - Informatics")
        
        # UofT - Computer Science
        create_course_with_requirements(
            session,
            uni_ids["University of Toronto"],
            {
                "name": "MSc Computer Science",
                "degree_level": DegreeLevel.MASTER,
                "field": "Computer Science",
                "teaching_language": TeachingLanguage.ENGLISH,
                "duration_months": 16,
                "is_tuition_free": False,
                "tuition_fee_amount": 9020,
                "tuition_fee_currency": Currency.CAD,
                "deadline_fall": date(2025, 1, 15),
                "gpa_minimum": 3.3,
                "program_url": "https://web.cs.toronto.edu/graduate/msc",
            },
            [
                {
                    "test_type": LanguageTestType.IELTS,
                    "minimum_overall": 7.0,
                    "minimum_speaking": 6.5,
                    "minimum_writing": 6.5,
                },
                {
                    "test_type": LanguageTestType.TOEFL_IBT,
                    "minimum_overall": 93,
                    "minimum_writing": 22,
                    "minimum_speaking": 22,
                    "is_mandatory": False,
                },
            ]
        )
        print("  Added: UofT - Computer Science")
        
        # University of Tartu - Computer Science
        create_course_with_requirements(
            session,
            uni_ids["University of Tartu"],
            {
                "name": "MSc Computer Science",
                "degree_level": DegreeLevel.MASTER,
                "field": "Computer Science",
                "teaching_language": TeachingLanguage.ENGLISH,
                "duration_months": 24,
                "credits_ects": 120,
                "is_tuition_free": False,
                "tuition_fee_amount": 0,  # Free for some nationalities
                "tuition_fee_currency": Currency.EUR,
                "deadline_fall": date(2025, 4, 15),
                "scholarships_available": True,
                "scholarship_details": "Estonian government scholarships available",
                "program_url": "https://cs.ut.ee/en/studying/masters-programmes",
            },
            [
                {
                    "test_type": LanguageTestType.IELTS,
                    "minimum_overall": 6.5,
                },
                {
                    "test_type": LanguageTestType.TOEFL_IBT,
                    "minimum_overall": 85,
                    "is_mandatory": False,
                },
            ]
        )
        print("  Added: Tartu - Computer Science")
        
        session.commit()
        print("\n✅ Seeding complete!")


if __name__ == "__main__":
    seed()