"""
Tests for StudyInNL Crawler.

Run with: pytest tests/test_studyinnl.py -v
"""
import pytest
from datetime import date

from studyinnl_ingestor.studyinnl_crawler import StudyInNLTransformer
from base import CrawlStatus


@pytest.fixture
def transformer():
    return StudyInNLTransformer()


@pytest.fixture
def sample_program():
    """Sample program from StudyInNL API."""
    return {
        "id": 58466,
        "hodex_id": "15902",
        "slug": "machine-learning-and-neural-computing-58466-radboud-university",
        "name": "Machine Learning and Neural Computing",
        "type": "Master",
        "description": "<p>This program covers machine learning...</p>",
        "website": "https://www.ru.nl/en/education/masters/machine-learning-and-neural-computing",
        "qualification": "Master of Science",
        "full_time": 1,
        "duration": "2 years",
        "ects_credits": 120,
        "field_of_study": "General programmes",
        "institution": {
            "id": 56,
            "name": "Radboud University",
            "address": "Houtlaan 4",
            "postal_code": "6525 XZ",
            "city": "Nijmegen",
            "url": "https://www.ru.nl/english/",
            "logo_url": "https://dbm.studyinnl.org/sites/default/files/institutions/56/logo/56_0.png",
            "sector": "Research university",
        },
        "locations": [
            {"name": "Nijmegen", "address": "Houtlaan 4", "postal_code": "6525 XZ"}
        ],
        "languages": [{"name": "English"}],
        "language_requirements": [
            {"minimum_score": "80", "description": "TOEFL internet based"},
            {"minimum_score": "6", "description": "IELTS overall band"},
            {"minimum_score": "C1", "description": "Cambridge Certificate in Advanced English"},
        ],
        "scholarships": [
            {"name": "Radboud Scholarship Programme", "url": "http://www.ru.nl/masters/..."},
        ],
        "start_months": [
            {
                "start_date": "2026-09-01",
                "application_deadline": "2026-07-01",
                "application_deadline_non_eu": "2026-04-01",
                "month": 9,
            }
        ],
        "tuitions": [
            {"year": 2025, "amount": 2601, "tuition_fee_type": "statutory", "period": "year"},
            {"year": 2026, "amount": 2694, "tuition_fee_type": "statutory", "period": "year"},
            {"year": 2026, "amount": 19714, "tuition_fee_type": "international", "period": "year"},
        ],
        "admission_url": ["https://www.ru.nl/en/education/masters/.../admission"],
    }


class TestStudyInNLTransformer:
    """Tests for the StudyInNL transformer."""
    
    def test_successful_transform(self, transformer, sample_program):
        """Test successful transformation of a complete program."""
        result = transformer.transform(sample_program)
        
        assert result.status == CrawlStatus.SUCCESS
        assert result.source_id == "58466"
        assert result.university_payload is not None
        assert result.course_payload is not None
    
    def test_university_payload(self, transformer, sample_program):
        """Test university payload extraction."""
        result = transformer.transform(sample_program)
        uni = result.university_payload
        
        assert uni["name"] == "Radboud University"
        assert uni["country"] == "Netherlands"
        assert uni["city"] == "Nijmegen"
        assert uni["website"] == "https://www.ru.nl/english/"
        assert uni["university_type"] == "research"
    
    def test_course_payload(self, transformer, sample_program):
        """Test course payload extraction."""
        result = transformer.transform(sample_program)
        course = result.course_payload
        
        assert course["name"] == "Machine Learning and Neural Computing"
        assert course["degree_level"] == "MASTER"
        assert course["teaching_language"] == "ENGLISH"
        assert course["duration_months"] == 24  # 2 years
        assert course["credits_ects"] == 120
        assert course["scholarships_available"] is True
    
    def test_tuition_international_preferred(self, transformer, sample_program):
        """Test that international tuition is preferred over statutory."""
        result = transformer.transform(sample_program)
        course = result.course_payload
        
        # Should pick international rate (19714) over statutory (2694)
        assert course["tuition_fee_amount"] == 19714
        assert course["tuition_fee_currency"] == "EUR"
    
    def test_deadline_extraction(self, transformer, sample_program):
        """Test deadline extraction with EU/non-EU distinction."""
        result = transformer.transform(sample_program)
        course = result.course_payload
        
        # Non-EU deadline should be used (April 1)
        assert course["deadline_fall"] == date(2026, 4, 1)
        assert "Non-EU deadline: 2026-04-01" in course["deadline_notes"]
    
    def test_language_requirements_in_notes(self, transformer, sample_program):
        """Test that language requirements are captured in notes."""
        result = transformer.transform(sample_program)
        course = result.course_payload
        
        assert "TOEFL internet based: 80" in course["notes"]
        assert "IELTS overall band: 6" in course["notes"]
    
    def test_missing_institution_fails(self, transformer, sample_program):
        """Test that missing institution causes failure."""
        del sample_program["institution"]
        result = transformer.transform(sample_program)
        
        assert result.status == CrawlStatus.FAILED
        assert result.error.error_type == "MISSING_INSTITUTION"
    
    def test_missing_required_fields_fails(self, transformer):
        """Test that missing required fields causes failure."""
        result = transformer.transform({"institution": {"name": "Test"}})
        
        assert result.status == CrawlStatus.FAILED
        assert result.error.error_type == "MISSING_REQUIRED_FIELDS"
    
    def test_bachelor_degree_mapping(self, transformer, sample_program):
        """Test Bachelor degree type mapping."""
        sample_program["type"] = "Bachelor"
        result = transformer.transform(sample_program)
        
        assert result.course_payload["degree_level"] == "BACHELOR"
    
    def test_phd_degree_mapping(self, transformer, sample_program):
        """Test PhD degree type mapping (falls back to certificate)."""
        sample_program["type"] = "Short or summer course"
        result = transformer.transform(sample_program)
        
        assert result.course_payload["degree_level"] == "CERTIFICATE"
    
    def test_html_cleaning(self, transformer, sample_program):
        """Test HTML is cleaned from description."""
        sample_program["description"] = "<p>Test <strong>bold</strong></p><ul><li>Item 1</li></ul>"
        result = transformer.transform(sample_program)
        
        desc = result.course_payload["description"]
        assert "<p>" not in desc
        assert "<strong>" not in desc
        assert "• Item 1" in desc  # List items converted
    
    def test_missing_city_uses_location(self, transformer, sample_program):
        """Test that city falls back to location if not in institution."""
        del sample_program["institution"]["city"]
        result = transformer.transform(sample_program)
        
        # Should get city from locations
        assert result.university_payload["city"] == "Nijmegen"
    
    def test_duration_parsing_years(self, transformer, sample_program):
        """Test duration parsing for years."""
        sample_program["duration"] = "2 years"
        result = transformer.transform(sample_program)
        assert result.course_payload["duration_months"] == 24
    
    def test_duration_parsing_semesters(self, transformer, sample_program):
        """Test duration parsing for semesters."""
        sample_program["duration"] = "4 semesters"
        result = transformer.transform(sample_program)
        assert result.course_payload["duration_months"] == 24  # 4 * 6
    
    def test_duration_fallback_to_ects(self, transformer, sample_program):
        """Test duration estimation from ECTS when not parseable."""
        sample_program["duration"] = ""
        sample_program["ects_credits"] = 60
        result = transformer.transform(sample_program)
        assert result.course_payload["duration_months"] == 12  # 60 ECTS ≈ 1 year
    
    def test_scholarships_formatting(self, transformer, sample_program):
        """Test scholarship details formatting."""
        sample_program["scholarships"] = [
            {"name": "Scholarship A", "url": "http://example.com/a"},
            {"name": "Scholarship B", "url": None},
        ]
        result = transformer.transform(sample_program)
        
        details = result.course_payload["scholarship_details"]
        assert "• Scholarship A: http://example.com/a" in details
        assert "• Scholarship B" in details
    
    def test_source_tracking_in_notes(self, transformer, sample_program):
        """Test that source tracking is in notes."""
        result = transformer.transform(sample_program)
        notes = result.course_payload["notes"]
        
        assert "source=studyinnl" in notes
        assert "studyinnl_id=58466" in notes
        assert "hodex_id=15902" in notes


class TestStudyInNLTuitionParsing:
    """Tests specifically for tuition fee parsing."""
    
    def test_no_tuition_info(self, transformer, sample_program):
        """Test handling when no tuition info available."""
        sample_program["tuitions"] = []
        result = transformer.transform(sample_program)
        
        assert result.course_payload["tuition_fee_amount"] is None
        assert "No tuition information" in result.warnings[0]
    
    def test_statutory_only(self, transformer, sample_program):
        """Test when only statutory tuition available."""
        sample_program["tuitions"] = [
            {"year": 2026, "amount": 2694, "tuition_fee_type": "statutory", "period": "year"},
        ]
        result = transformer.transform(sample_program)
        
        assert result.course_payload["tuition_fee_amount"] == 2694
    
    def test_most_recent_year_preferred(self, transformer, sample_program):
        """Test that most recent year's tuition is used."""
        sample_program["tuitions"] = [
            {"year": 2025, "amount": 18000, "tuition_fee_type": "international", "period": "year"},
            {"year": 2026, "amount": 19000, "tuition_fee_type": "international", "period": "year"},
        ]
        result = transformer.transform(sample_program)
        
        assert result.course_payload["tuition_fee_amount"] == 19000
