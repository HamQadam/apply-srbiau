"""Typed matching profile and recommendation response schemas."""
from __future__ import annotations

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

DegreePreference = Literal["BACHELOR", "MASTER", "PHD", "DIPLOMA", "CERTIFICATE"]
TeachingLanguagePreference = Literal[
    "english", "german", "french", "dutch", "spanish", "italian",
    "swedish", "norwegian", "danish", "finnish", "polish", "czech",
    "japanese", "chinese", "korean", "other",
]
GpaScale = Literal["4.0", "20", "100", "10"]
CurrencyCode = Literal["EUR", "USD", "CAD", "AUD", "GBP", "CHF", "SEK", "NOK", "DKK", "JPY", "CNY", "IRR"]

DEGREE_ALIASES = {
    "bachelor": "BACHELOR",
    "bachelors": "BACHELOR",
    "undergraduate": "BACHELOR",
    "master": "MASTER",
    "masters": "MASTER",
    "msc": "MASTER",
    "ma": "MASTER",
    "phd": "PHD",
    "doctorate": "PHD",
    "diploma": "DIPLOMA",
    "certificate": "CERTIFICATE",
}

LANGUAGE_ALIASES = {
    "English": "english",
    "German": "german",
    "French": "french",
    "Dutch": "dutch",
    "Spanish": "spanish",
    "Italian": "italian",
}

# Conservative static planning rates. Course tuition is stored in EUR-equivalent for matching.
BUDGET_TO_EUR_RATES: dict[str, float] = {
    "EUR": 1.0,
    "USD": 0.92,
    "CAD": 0.68,
    "AUD": 0.61,
    "GBP": 1.17,
    "CHF": 1.05,
    "SEK": 0.089,
    "NOK": 0.087,
    "DKK": 0.134,
    "JPY": 0.0060,
    "CNY": 0.127,
    "IRR": 0.000022,
}


class MatchingProfileModel(BaseModel):
    """Validated profile used by matching and persisted in users.matching_profile."""

    preferred_fields: list[str] = Field(default_factory=list, max_length=5)
    preferred_countries: list[str] = Field(default_factory=list, max_length=12)
    budget_min: Optional[int] = Field(default=None, ge=0)
    budget_max: Optional[int] = Field(default=None, ge=0)
    budget_currency: CurrencyCode = "EUR"
    budget_max_eur: Optional[int] = Field(default=None, ge=0)
    preferred_degree_level: Optional[DegreePreference] = None
    target_intake: Optional[str] = None
    language_preference: Optional[TeachingLanguagePreference] = "english"
    gre_score: Optional[int] = Field(default=None, ge=260, le=340)
    gmat_score: Optional[int] = Field(default=None, ge=200, le=800)
    gpa: Optional[float] = Field(default=None, ge=0)
    gpa_scale: GpaScale = "20"
    prefer_scholarships: bool = False

    @field_validator("preferred_fields", "preferred_countries", mode="before")
    @classmethod
    def clean_string_list(cls, value: Any) -> list[str]:
        if value is None:
            return []
        if not isinstance(value, list):
            raise ValueError("Expected a list")
        cleaned = []
        for item in value:
            text = str(item).strip()
            if text and text not in cleaned:
                cleaned.append(text)
        return cleaned

    @field_validator("preferred_degree_level", mode="before")
    @classmethod
    def normalize_degree(cls, value: Any) -> Any:
        if value is None or value == "":
            return None
        text = str(value).strip()
        return DEGREE_ALIASES.get(text.lower(), text.upper())

    @field_validator("language_preference", mode="before")
    @classmethod
    def normalize_language(cls, value: Any) -> Any:
        if value is None or value == "":
            return "english"
        text = str(value).strip()
        return LANGUAGE_ALIASES.get(text, text.lower())

    @field_validator("gpa")
    @classmethod
    def validate_gpa_for_common_scales(cls, value: Optional[float], info) -> Optional[float]:
        return value

    @model_validator(mode="after")
    def normalize_budget_and_gpa(self) -> "MatchingProfileModel":
        if self.budget_max is not None and self.budget_min is not None and self.budget_min > self.budget_max:
            raise ValueError("budget_min cannot be greater than budget_max")

        if self.budget_max is not None and self.budget_max_eur is None:
            rate = BUDGET_TO_EUR_RATES[self.budget_currency]
            self.budget_max_eur = int(round(self.budget_max * rate))

        if self.gpa is not None:
            scale_max = {"4.0": 4.0, "20": 20.0, "100": 100.0, "10": 10.0}[self.gpa_scale]
            if self.gpa > scale_max:
                raise ValueError(f"gpa cannot exceed {scale_max} for scale {self.gpa_scale}")
        return self

    @property
    def is_complete(self) -> bool:
        return bool(self.preferred_fields and self.preferred_countries and self.preferred_degree_level)

    def to_storage_dict(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


class MatchExplanation(BaseModel):
    code: str
    kind: Literal["strength", "warning", "info"]
    label: str
    detail: Optional[str] = None
    points: int = 0


class RecommendationRefinement(BaseModel):
    code: str
    label: str
    detail: str


class RecommendationSnapshot(BaseModel):
    course_id: int
    match_score: int
    match_reasons: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    match_explanations: list[MatchExplanation] = Field(default_factory=list)
    profile: dict[str, Any] = Field(default_factory=dict)
