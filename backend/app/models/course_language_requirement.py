"""Course language requirements with detailed score breakdowns."""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import Enum as SAEnum

if TYPE_CHECKING:
    from .course import Course


class LanguageTestType(str, Enum):
    IELTS = "ielts"
    TOEFL_IBT = "toefl_ibt"
    TOEFL_PBT = "toefl_pbt"
    DUOLINGO = "duolingo"
    PTE = "pte"
    CAMBRIDGE = "cambridge"  # CAE, CPE, FCE
    DELF = "delf"
    DALF = "dalf"
    TCF = "tcf"
    TEF = "tef"
    GOETHE = "goethe"
    TELC = "telc"
    TESTDAF = "testdaf"
    DSH = "dsh"
    NT2 = "nt2"  # Dutch
    DELE = "dele"  # Spanish
    CELI = "celi"  # Italian
    JLPT = "jlpt"  # Japanese
    HSK = "hsk"  # Chinese
    TOPIK = "topik"  # Korean


class CEFRLevel(str, Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


class CourseLanguageRequirementBase(SQLModel):
    """Language requirement for a course - one course can have multiple options."""
    test_type: LanguageTestType = Field(sa_column=Column(SAEnum(LanguageTestType)))
    
    # Overall score
    minimum_overall: Optional[float] = Field(default=None)
    
    # Sub-scores (for tests that have them)
    minimum_reading: Optional[float] = Field(default=None)
    minimum_writing: Optional[float] = Field(default=None)
    minimum_speaking: Optional[float] = Field(default=None)
    minimum_listening: Optional[float] = Field(default=None)
    
    # Alternative: CEFR level (for European certs)
    cefr_level: Optional[CEFRLevel] = Field(default=None, sa_column=Column(SAEnum(CEFRLevel)))
    
    # For specific certifications
    certificate_level: Optional[str] = Field(default=None, max_length=50)  # "C1 Advanced", "TestDaF 4x4"
    
    # Notes
    notes: Optional[str] = Field(default=None, max_length=300)
    is_mandatory: bool = Field(default=True)  # False if it's one of multiple options


class CourseLanguageRequirement(CourseLanguageRequirementBase, table=True):
    __tablename__ = "course_language_requirements"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    course_id: int = Field(foreign_key="courses.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationship
    course: "Course" = Relationship(back_populates="language_requirements")


class CourseLanguageRequirementCreate(CourseLanguageRequirementBase):
    course_id: int


class CourseLanguageRequirementRead(CourseLanguageRequirementBase):
    id: int
    course_id: int


# Common requirement templates for quick creation
COMMON_REQUIREMENTS = {
    "ielts_65": {
        "test_type": LanguageTestType.IELTS,
        "minimum_overall": 6.5,
        "minimum_reading": 6.0,
        "minimum_writing": 6.0,
        "minimum_speaking": 6.0,
        "minimum_listening": 6.0,
    },
    "ielts_70": {
        "test_type": LanguageTestType.IELTS,
        "minimum_overall": 7.0,
        "minimum_reading": 6.5,
        "minimum_writing": 6.5,
        "minimum_speaking": 6.5,
        "minimum_listening": 6.5,
    },
    "toefl_90": {
        "test_type": LanguageTestType.TOEFL_IBT,
        "minimum_overall": 90,
        "minimum_reading": 20,
        "minimum_writing": 20,
        "minimum_speaking": 20,
        "minimum_listening": 20,
    },
    "toefl_100": {
        "test_type": LanguageTestType.TOEFL_IBT,
        "minimum_overall": 100,
        "minimum_reading": 22,
        "minimum_writing": 22,
        "minimum_speaking": 22,
        "minimum_listening": 22,
    },
    "delf_b2": {
        "test_type": LanguageTestType.DELF,
        "cefr_level": CEFRLevel.B2,
        "certificate_level": "DELF B2",
    },
    "testdaf_4": {
        "test_type": LanguageTestType.TESTDAF,
        "minimum_overall": 16,  # TDN 4 in all sections = 16 total
        "certificate_level": "TestDaF 4x4",
    },
}