"""
StudyInNL source transformer (Stage-2 lexical parse).

Converts a raw dict from raw_crawl_items.raw_data (source='studyinnl') into
structured university + course payloads.
"""
from __future__ import annotations

import html as _html
import re
from datetime import datetime
from typing import Any

from .base import ParsedItem


class StudyInNLTransformer:
    """Lexical transformer for StudyInNL raw API payloads."""

    DEGREE_MAP = {
        "master": "MASTER",
        "bachelor": "BACHELOR",
        "phd": "PHD",
        "short or summer course": "CERTIFICATE",
        "other": "CERTIFICATE",
    }

    LANGUAGE_TEST_MAP = {
        "ielts": "IELTS",
        "toefl internet": "TOEFL_IBT",
        "toefl paper": "TOEFL_PBT",
        "toefl computer": "TOEFL_IBT",
        "cambridge certificate in advanced": "CAMBRIDGE_CAE",
        "cambridge certificate of proficiency": "CAMBRIDGE_CPE",
        "pearson": "PTE",
        "duolingo": "DUOLINGO",
    }

    # ------------------------------------------------------------------ #
    # Public entry point
    # ------------------------------------------------------------------ #

    def transform(self, raw: dict[str, Any]) -> ParsedItem:
        warnings: list[str] = []
        missing: list[str] = []

        institution = raw.get("institution") or {}
        university_payload = self._build_university(institution, raw, warnings, missing)
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
        institution: dict[str, Any],
        raw: dict[str, Any],
        warnings: list[str],
        missing: list[str],
    ) -> dict[str, Any]:
        name = (institution.get("name") or "").strip() or "Unknown University"
        city = (institution.get("city") or "").strip()

        if not city:
            for loc in raw.get("locations") or []:
                city = (loc.get("name") or loc.get("city") or "").strip()
                if city:
                    break

        if not city:
            city = "Unknown"
            warnings.append("Missing city for university")

        sector = (institution.get("sector") or "").lower()
        uni_type = None
        if "research" in sector:
            uni_type = "research"
        elif "applied" in sector:
            uni_type = "applied_sciences"
        elif "international" in sector:
            uni_type = "international"

        return {
            "name": name,
            "country": "Netherlands",
            "city": city,
            "website": institution.get("url"),
            "logo_url": institution.get("logo_url"),
            "university_type": uni_type,
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
        program_type = (raw.get("type") or "Master").lower()
        degree_level = self.DEGREE_MAP.get(program_type, "MASTER")

        languages = raw.get("languages") or []
        teaching_language = self._parse_teaching_language(languages, warnings)
        if teaching_language is None:
            missing.append("teaching_language")
            teaching_language = "ENGLISH"

        duration_months = self._parse_duration(
            raw.get("duration"), raw.get("ects_credits"), warnings
        )
        if duration_months is None:
            missing.append("duration_months")

        tuition = self._parse_tuition(raw.get("tuitions") or [], warnings)
        if tuition.get("amount") is None:
            missing.append("tuition_fee_amount")

        deadlines = self._parse_deadlines(raw.get("start_months") or [], warnings)
        if deadlines.get("fall") is None:
            missing.append("deadline_fall")
        if deadlines.get("spring") is None:
            missing.append("deadline_spring")

        field = (raw.get("field_of_study") or "").strip()
        if field == "General programmes" or not field:
            field = "General"
            missing.append("field")

        description = self._clean_html(raw.get("description"))

        scholarships = raw.get("scholarships") or []
        has_scholarships = len(scholarships) > 0
        scholarship_details = self._format_scholarships(scholarships) if has_scholarships else None

        lang_reqs = raw.get("language_requirements") or []
        lang_req_notes = self._format_language_requirements(lang_reqs)

        source_note = f"source=studyinnl; studyinnl_id={raw.get('id')}"
        if raw.get("hodex_id"):
            source_note += f"; hodex_id={raw.get('hodex_id')}"
        if lang_req_notes:
            source_note += f"\n\nLanguage Requirements:\n{lang_req_notes}"

        return {
            "name": (raw.get("name") or "Unknown Program").strip(),
            "degree_level": degree_level,
            "field": field,
            "teaching_language": teaching_language,
            "duration_months": duration_months,
            "credits_ects": raw.get("ects_credits"),
            "tuition_fee_amount": tuition.get("amount"),
            "tuition_fee_currency": "EUR" if tuition.get("amount") is not None else None,
            "tuition_fee_per": tuition.get("per", "year"),
            "is_tuition_free": tuition.get("amount") == 0,
            "deadline_fall": deadlines.get("fall"),
            "deadline_spring": deadlines.get("spring"),
            "deadline_notes": deadlines.get("notes"),
            "program_url": raw.get("website"),
            "application_url": self._get_admission_url(raw),
            "description": description,
            "notes": source_note,
            "scholarships_available": has_scholarships,
            "scholarship_details": scholarship_details,
            "gpa_scale": "4.0",
            "gre_required": False,
            "gmat_required": False,
            "verified_by_count": 0,
            "view_count": 0,
        }

    # ------------------------------------------------------------------ #
    # Field parsers
    # ------------------------------------------------------------------ #

    def _parse_teaching_language(
        self,
        languages: list[dict[str, Any]],
        warnings: list[str],
    ) -> str | None:
        if not languages:
            warnings.append("No teaching language specified")
            return None

        lang_names = {(ll.get("name") or "").lower() for ll in languages}

        _LANG_MAP = {
            "english": "ENGLISH",
            "dutch": "DUTCH",
            "german": "GERMAN",
            "french": "FRENCH",
            "spanish": "SPANISH",
            "italian": "ITALIAN",
            "swedish": "SWEDISH",
            "norwegian": "NORWEGIAN",
            "danish": "DANISH",
            "finnish": "FINNISH",
            "polish": "POLISH",
            "czech": "CZECH",
        }
        for name, code in _LANG_MAP.items():
            if name in lang_names:
                return code

        warnings.append(f"Unrecognised teaching language(s): {lang_names}")
        return None

    def _parse_duration(
        self,
        duration_str: str | None,
        ects: int | None,
        warnings: list[str],
    ) -> int | None:
        if duration_str:
            s = duration_str.lower().strip()

            m = re.search(r"(\d+)\s*year", s)
            if m:
                return int(m.group(1)) * 12

            m = re.search(r"(\d+)\s*month", s)
            if m:
                return int(m.group(1))

            m = re.search(r"(\d+)\s*semester", s)
            if m:
                return int(m.group(1)) * 6

        if ects:
            return (ects // 30) * 6 or 12

        warnings.append("Could not determine program duration")
        return None

    def _parse_tuition(
        self,
        tuitions: list[dict[str, Any]],
        warnings: list[str],
    ) -> dict[str, Any]:
        if not tuitions:
            warnings.append("No tuition information available")
            return {"amount": None, "per": "year"}

        by_type: dict[str, dict[str, Any]] = {}
        for t in tuitions:
            fee_type = t.get("tuition_fee_type") or t.get("tuition_fee_rate") or "unknown"
            year = t.get("year") or 0
            existing = by_type.get(fee_type)
            if not existing or (existing.get("year") or 0) < year:
                by_type[fee_type] = t

        for pref in ["international", "institutional", "statutory"]:
            if pref in by_type:
                t = by_type[pref]
                return {
                    "amount": t.get("amount"),
                    "per": t.get("period") or "year",
                    "type": pref,
                    "year": t.get("year"),
                }

        t = tuitions[0]
        return {"amount": t.get("amount"), "per": t.get("period") or "year"}

    def _parse_deadlines(
        self,
        start_months: list[dict[str, Any]],
        warnings: list[str],
    ) -> dict[str, Any]:
        if not start_months:
            return {"fall": None, "spring": None, "notes": None}

        from datetime import date as _date

        fall_deadline = None
        spring_deadline = None
        notes_parts: list[str] = []

        for sm in start_months:
            month = sm.get("month") or 0
            start_date = sm.get("start_date")
            deadline_eu = sm.get("application_deadline")
            deadline_non_eu = sm.get("application_deadline_non_eu")

            deadline_str = deadline_non_eu or deadline_eu

            try:
                if deadline_str:
                    deadline = datetime.strptime(deadline_str, "%Y-%m-%d").date()

                    if month in [8, 9, 10]:
                        if not fall_deadline or deadline < fall_deadline:
                            fall_deadline = deadline
                    elif month in [1, 2, 3]:
                        if not spring_deadline or deadline < spring_deadline:
                            spring_deadline = deadline

                    start_str = start_date or f"Month {month}"
                    note = f"Start: {start_str}"
                    if deadline_non_eu:
                        note += f" | Non-EU deadline: {deadline_non_eu}"
                    if deadline_eu and deadline_eu != deadline_non_eu:
                        note += f" | EU deadline: {deadline_eu}"
                    notes_parts.append(note)

            except (ValueError, TypeError):
                warnings.append(f"Could not parse deadline: {deadline_str!r}")

        return {
            "fall": fall_deadline,
            "spring": spring_deadline,
            "notes": "\n".join(notes_parts) if notes_parts else None,
        }

    def _format_scholarships(self, scholarships: list[dict[str, Any]]) -> str | None:
        if not scholarships:
            return None
        parts = []
        for s in scholarships[:10]:
            name = s.get("name")
            url = s.get("url")
            if name:
                parts.append(f"• {name}: {url}" if url else f"• {name}")
        return "\n".join(parts) if parts else None

    def _format_language_requirements(self, reqs: list[dict[str, Any]]) -> str | None:
        if not reqs:
            return None
        parts = []
        for r in reqs:
            desc = r.get("description") or ""
            score = r.get("minimum_score") or ""
            if desc and score:
                parts.append(f"• {desc}: {score}")
        return "\n".join(parts) if parts else None

    def _get_admission_url(self, raw: dict[str, Any]) -> str | None:
        admission = raw.get("admission_url")
        if not admission:
            return None
        if isinstance(admission, list) and admission:
            return admission[0]
        if isinstance(admission, str):
            return admission
        return None

    def _clean_html(self, html_str: str | None) -> str | None:
        if not html_str:
            return None

        s = _html.unescape(html_str)
        s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
        s = re.sub(r"</p\s*>", "\n", s, flags=re.I)
        s = re.sub(r"</li\s*>", "\n", s, flags=re.I)
        s = re.sub(r"<li\s*>", "• ", s, flags=re.I)
        s = re.sub(r"<[^>]+>", "", s)
        s = re.sub(r"\n{3,}", "\n\n", s)
        s = re.sub(r"[ \t]+", " ", s)
        s = s.strip()

        if len(s) > 2900:
            s = s[:2900] + "..."

        return s if s else None
