"""
DAAD source transformer (Stage-2 lexical parse).

Converts a raw dict from raw_crawl_items.raw_data (source='daad') into
structured university + course payloads.  All logic is deterministic /
rule-based.  Fields that cannot be determined are listed in missing_fields
so the LLM job can handle them later.
"""
from __future__ import annotations

import html
import re
from typing import Any

from .base import ParsedItem


class DaadTransformer:
    """Lexical transformer for DAAD raw API payloads."""

    # ------------------------------------------------------------------ #
    # Public entry point
    # ------------------------------------------------------------------ #

    def transform(self, raw: dict[str, Any]) -> ParsedItem:
        warnings: list[str] = []
        missing: list[str] = []

        university_payload = self._build_university(raw, warnings, missing)
        course_payload = self._build_course(raw, warnings, missing)

        return ParsedItem(
            university_payload=university_payload,
            course_payload=course_payload,
            missing_fields=missing,
            warnings=warnings,
        )

    # ------------------------------------------------------------------ #
    # University
    # ------------------------------------------------------------------ #

    def _build_university(
        self,
        raw: dict[str, Any],
        warnings: list[str],
        missing: list[str],
    ) -> dict[str, Any]:
        name = (raw.get("academy") or "").strip() or "Unknown University"
        city = (raw.get("city") or "").strip()

        if not city:
            city = "Unknown"
            warnings.append("Missing city for university")

        return {
            "name": name,
            "country": "Germany",
            "city": city,
            "website": None,
            "logo_url": None,
        }

    # ------------------------------------------------------------------ #
    # Course
    # ------------------------------------------------------------------ #

    def _build_course(
        self,
        raw: dict[str, Any],
        warnings: list[str],
        missing: list[str],
    ) -> dict[str, Any]:
        degree_level = raw.get("_degree_level", "master")

        teaching_language = self._parse_language(raw.get("languages"), warnings)
        if teaching_language is None:
            missing.append("teaching_language")
            teaching_language = "OTHER"

        duration_months = self._parse_duration(raw.get("programmeDuration"), warnings)
        if duration_months is None:
            missing.append("duration_months")

        is_free, fee_amount = self._parse_tuition(raw.get("tuitionFees"), warnings)

        d_fall, d_spring, d_notes = self._parse_deadlines(
            raw.get("applicationDeadline"), warnings, missing
        )

        link = raw.get("link")
        program_url = f"https://www2.daad.de{link}" if link else None

        source_note = f"source=daad; daad_course_id={raw.get('id')}"

        field = (raw.get("subject") or raw.get("fieldOfStudy") or "").strip()
        if not field:
            field = "General"
            missing.append("field")

        return {
            "name": (raw.get("courseName") or "Unknown Program").strip(),
            "degree_level": degree_level.upper(),
            "field": field,
            "teaching_language": teaching_language,
            "duration_months": duration_months,
            "credits_ects": None,
            "tuition_fee_amount": fee_amount,
            "tuition_fee_currency": "EUR" if fee_amount is not None else None,
            "tuition_fee_per": "year",
            "is_tuition_free": is_free,
            "deadline_fall": d_fall,
            "deadline_spring": d_spring,
            "deadline_notes": d_notes,
            "program_url": program_url,
            "application_url": None,
            "description": self._clean_html(raw.get("description")),
            "notes": source_note,
            "gpa_scale": "4.0",
            "gre_required": False,
            "gmat_required": False,
            "scholarships_available": False,
            "verified_by_count": 0,
            "view_count": 0,
        }

    # ------------------------------------------------------------------ #
    # Field parsers
    # ------------------------------------------------------------------ #

    def _parse_language(
        self,
        langs: list[str] | None,
        warnings: list[str],
    ) -> str | None:
        if not langs:
            warnings.append("Missing teaching language")
            return None

        norm = {ll.strip().lower() for ll in langs if ll}

        if norm == {"english"}:
            return "ENGLISH"
        if norm == {"german"}:
            return "GERMAN"
        if "english" in norm:
            return "ENGLISH"
        if "german" in norm:
            return "GERMAN"

        # Known other language names → enum values
        _LANG_MAP = {
            "french": "FRENCH",
            "dutch": "DUTCH",
            "spanish": "SPANISH",
            "italian": "ITALIAN",
            "swedish": "SWEDISH",
            "norwegian": "NORWEGIAN",
            "danish": "DANISH",
            "finnish": "FINNISH",
            "polish": "POLISH",
            "czech": "CZECH",
            "japanese": "JAPANESE",
            "chinese": "CHINESE",
            "korean": "KOREAN",
        }
        for name, code in _LANG_MAP.items():
            if name in norm:
                return code

        warnings.append(f"Unrecognised teaching language(s): {langs}")
        return None

    def _parse_duration(
        self,
        duration_str: str | None,
        warnings: list[str],
    ) -> int | None:
        if not duration_str:
            warnings.append("Missing program duration")
            return None

        s = duration_str.strip().lower()

        m = re.search(r"(\d+)\s*semester", s)
        if m:
            return int(m.group(1)) * 6

        m = re.search(r"(\d+)\s*month", s)
        if m:
            return int(m.group(1))

        m = re.search(r"(\d+)\s*year", s)
        if m:
            return int(m.group(1)) * 12

        warnings.append(f"Could not parse duration: {duration_str!r}")
        return None

    def _parse_tuition(
        self,
        tuition_str: str | None,
        warnings: list[str],
    ) -> tuple[bool, int | None]:
        """Returns (is_free, amount)."""
        if not tuition_str:
            return (False, None)

        s = tuition_str.strip().lower()

        if s in {"none", "no", "0", "0.0", "no tuition fees"}:
            return (True, 0)

        if "varied" in s or "depending" in s or "varies" in s:
            warnings.append("Tuition fee varies — not extracted")
            return (False, None)

        digits = re.sub(r"[^\d]", "", tuition_str)
        if digits:
            return (False, int(digits))

        return (False, None)

    def _parse_deadlines(
        self,
        deadline_html: str | None,
        warnings: list[str],
        missing: list[str],
    ) -> tuple[None, None, str | None]:
        """
        For DAAD the raw deadline field is an HTML blob — actual date
        extraction is done by the postprocess deadline parser (already
        existing) once the row is in courses.deadline_notes.

        We just clean the HTML and store it as notes; both fall/spring are
        left as None so the existing deadlines job picks them up.
        """
        notes = self._clean_html(deadline_html)
        if not notes:
            missing.append("deadline_fall")
            missing.append("deadline_spring")
            return (None, None, None)

        # Mark as needing the deadline parser rather than the LLM job;
        # the existing postprocess/deadlines job will handle these.
        missing.append("deadline_fall")
        missing.append("deadline_spring")
        return (None, None, notes)

    def _clean_html(self, html_str: str | None) -> str | None:
        if not html_str:
            return None

        s = html.unescape(html_str)
        s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
        s = re.sub(r"</p\s*>", "\n", s, flags=re.I)
        s = re.sub(r"<li\s*>", "• ", s, flags=re.I)
        s = re.sub(r"<[^>]+>", "", s)
        s = re.sub(r"\n{3,}", "\n\n", s)
        s = re.sub(r"[ \t]+", " ", s)
        s = s.strip()

        return s if s else None
