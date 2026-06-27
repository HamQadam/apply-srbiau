"""
Sweden University Admissions (universityadmissions.se) source transformer — Stage-2 lexical parse.

Converts a raw dict from raw_crawl_items.raw_data (source='swedenua') into
structured university + course payloads.

Raw payload structure (stored by SwedenUACrawler):
  {
    "_source":     "swedenua",
    "_termin_id":  "28",
    "_termin_name": "Spring 2027",
    "_page":       1,
    "status":      "ej.publicerad" | "anmalan.oppen" | ...,
    "terminsId":   "28",
    "anmalningsalternativ": {
      "anmalningsalternativKod": "40084",    ← source_id / unique key
      "titel":                  "...",       ← program name
      "organisation":           "KTH Royal Institute of Technology",
      "organisationKod":        "KTH",
      "studieort":              "Stockholm",
      "utbildningsniva":        "Master's" | "Bachelor's" | "Research (PhD)" | ...
      "undervisningssprak":     "English" | "Swedish" | "English/Swedish" | ...
      "poang":                  "60",        ← credits
      "poangEnhet":             "hp",        ← hp == ECTS
      "studieavgiftTotal":      135000,      ← SEK, non-EU students (0 for EU)
      "studietakt":             100 | 50,    ← % of full-time
      "program":                true | false ← true=programme, false=standalone course
      "undervisningsform":      "On-campus" | "Distance" | "Blended" | ...
      "kursbeskrivningUrl":     "https://...",
      "anmalningskod":          "-KTH-12345",
      "valdaAmnesNamn":         ["Computer Science", ...],
      "examinaNamn":            ["Master of Science (120 credits)", ...],
      "antalTraffar":           -1 | n,      ← seats (-1 = not published yet)
      "ar":                     2027,        ← year
      "terminsPeriod":          1 | 2,       ← semester period (1=Spring, 2=Autumn within year)
      "startperiod":            null | {...},
      "oppnarForSenAnmalanDatum": null | "YYYY-MM-DD",
    }
  }

Degree-level mapping (utbildningsniva field):
  "Bachelor's"        → BACHELOR
  "Master's"          → MASTER
  "Research (PhD)"    → PHD
  "Single-subject course" or others → CERTIFICATE / LLM escalation

Language mapping (undervisningssprak field):
  API returns e.g. "English", "Swedish", "English/Swedish", "English/Other"

Tuition:
  studieavgiftTotal is in SEK for non-EU students.  0 means no fee (EU or fee-waived).
  We store it as SEK.  The LLM / postprocess step can convert to EUR if desired.

Deadlines:
  The API does not return application deadlines directly in the search results.
  Deadlines are semester-specific and published on the UHR key-dates page.
  We set deadline_notes to the semester name and mark both fall/spring as missing
  so the LLM enrichment job can fill them.

  Canonical autumn deadline: 15 January of the application year (for non-EU)
  Canonical spring deadline: 15 October (for non-EU)
  These are stored as notes, not parsed dates, because the exact dates vary yearly.
"""
from __future__ import annotations

import re
from typing import Any

from .base import ParsedItem


# ---------------------------------------------------------------------------
# Degree level map (utbildningsniva → our enum)
# ---------------------------------------------------------------------------
_DEGREE_MAP: dict[str, str] = {
    "bachelor's":                           "BACHELOR",
    "bachelor":                             "BACHELOR",
    "bachelor of science":                  "BACHELOR",
    "bachelor of arts":                     "BACHELOR",
    "master's":                             "MASTER",
    "master":                               "MASTER",
    "master of science":                    "MASTER",
    "master of arts":                       "MASTER",
    "master of laws":                       "MASTER",
    "master of fine arts":                  "MASTER",
    "master of architecture":               "MASTER",
    "advanced":                             "MASTER",
    "second cycle":                         "MASTER",
    "research (phd)":                       "PHD",
    "research":                             "PHD",
    "doctoral":                             "PHD",
    "third cycle":                          "PHD",
    "first cycle":                          "BACHELOR",
}


# ---------------------------------------------------------------------------
# Language map (undervisningssprak → our enum)
# ---------------------------------------------------------------------------
_LANGUAGE_MAP: dict[str, str] = {
    "english":          "ENGLISH",
    "english/swedish":  "ENGLISH",          # bilingual, mostly English for int'l
    "english/other":    "ENGLISH",
    "swedish":          "SWEDISH",
    "swedish/english":  "ENGLISH",
    "german":           "GERMAN",
    "french":           "FRENCH",
    "spanish":          "SPANISH",
    "italian":          "ITALIAN",
    "dutch":            "DUTCH",
    "norwegian":        "NORWEGIAN",
    "danish":           "DANISH",
    "finnish":          "FINNISH",
    "polish":           "POLISH",
    "japanese":         "JAPANESE",
    "chinese":          "CHINESE",
    "arabic":           "ARABIC",
}


class SwedenUATransformer:
    """Lexical transformer for universityadmissions.se (UHR) raw payloads."""

    # ------------------------------------------------------------------ #
    # Public entry point
    # ------------------------------------------------------------------ #

    def transform(self, raw: dict[str, Any]) -> ParsedItem:
        warnings: list[str] = []
        missing: list[str] = []

        aa: dict[str, Any] = raw.get("anmalningsalternativ") or {}

        university_payload = self._build_university(aa, warnings, missing)
        course_payload = self._build_course(raw, aa, warnings, missing)

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
        aa: dict[str, Any],
        warnings: list[str],
        missing: list[str],
    ) -> dict[str, Any]:
        name = (aa.get("organisation") or "").strip() or "Unknown University"
        city = (aa.get("studieort") or "").strip()

        if not city:
            city = "Unknown"
            warnings.append("Missing city (studieort) for university")

        # Build a basic website hint from the org code if available
        # e.g. "KTH" → programmatic hint only; real URL comes from kursbeskrivningUrl
        website: str | None = None
        org_code = (aa.get("organisationKod") or "").strip().lower()
        if org_code:
            # We store the code so the LLM / manual curation can map it later
            website = None  # real websites are in the course URL domain

        return {
            "name": name,
            "country": "Sweden",
            "city": city,
            "website": website,
            "logo_url": None,
            "university_type": None,   # not available from search API
        }

    # ------------------------------------------------------------------ #
    # Course
    # ------------------------------------------------------------------ #

    def _build_course(
        self,
        raw: dict[str, Any],
        aa: dict[str, Any],
        warnings: list[str],
        missing: list[str],
    ) -> dict[str, Any]:
        # Degree level
        degree_level = self._parse_degree_level(
            aa.get("utbildningsniva") or "", warnings
        )
        if degree_level is None:
            missing.append("degree_level")
            degree_level = "MASTER"  # safe default

        # Teaching language
        teaching_language = self._parse_language(
            aa.get("undervisningssprak") or "", warnings
        )
        if teaching_language is None:
            missing.append("teaching_language")
            teaching_language = "ENGLISH"

        # Credits / duration
        credits_ects = self._parse_credits(
            aa.get("poang"), aa.get("poangEnhet"), warnings
        )
        duration_months = self._credits_to_months(credits_ects, aa.get("studietakt"))
        if duration_months is None:
            missing.append("duration_months")

        # Tuition fee
        tuition_total = aa.get("studieavgiftTotal")
        is_free: bool
        tuition_amount: int | None
        if tuition_total is None:
            is_free = False
            tuition_amount = None
            missing.append("tuition_fee_amount")
        elif tuition_total == 0:
            is_free = True
            tuition_amount = 0
        else:
            is_free = False
            tuition_amount = int(tuition_total)

        # Field / subject
        subjects: list[str] = aa.get("valdaAmnesNamn") or []
        field = subjects[0].strip() if subjects else ""
        if not field:
            field = "General"
            missing.append("field")

        # Deadlines — not in search API; mark for LLM/deadline job
        # The semester + type (autumn/spring) gives us a rough deadline note.
        termin_name = raw.get("_termin_name") or aa.get("terminsId") or ""
        deadline_notes = self._build_deadline_notes(raw, aa, termin_name)
        missing.append("deadline_fall")
        missing.append("deadline_spring")

        # Program URL
        program_url = aa.get("kursbeskrivningUrl") or None

        # Application URL — universityadmissions.se deep-link
        anmalan_url = aa.get("anmalanUrl") or None
        anmalan_kod = aa.get("anmalningskod") or None
        application_url = anmalan_url or (
            f"https://www.universityadmissions.se/intl/search#{anmalan_kod}"
            if anmalan_kod else None
        )

        # Delivery mode note
        undervisningsform = (aa.get("undervisningsform") or "").strip()
        is_distance = "distance" in undervisningsform.lower()

        # Degree names
        examina: list[str] = aa.get("examinaNamn") or []

        # Source tracking note
        kod = aa.get("anmalningsalternativKod") or ""
        org_kod = aa.get("organisationKod") or ""
        source_note = f"source=swedenua; anmalningskod={anmalan_kod or kod}"
        if org_kod:
            source_note += f"; org={org_kod}"
        if examina:
            source_note += f"; examina={'; '.join(examina[:3])}"
        if undervisningsform:
            source_note += f"; form={undervisningsform}"
        if aa.get("studietakt"):
            source_note += f"; pace={aa['studietakt']}%"

        return {
            "name": (aa.get("titel") or "Unknown Program").strip(),
            "degree_level": degree_level,
            "field": field,
            "teaching_language": teaching_language,
            "duration_months": duration_months,
            "credits_ects": credits_ects,
            "tuition_fee_amount": tuition_amount,
            "tuition_fee_currency": "SEK" if tuition_amount is not None else None,
            "tuition_fee_per": "programme",   # studieavgiftTotal is per full programme
            "is_tuition_free": is_free,
            "deadline_fall": None,
            "deadline_spring": None,
            "deadline_notes": deadline_notes,
            "program_url": program_url,
            "application_url": application_url,
            "description": None,              # not in search API; could be scraped separately
            "notes": source_note,
            "scholarships_available": False,  # not in search API
            "scholarship_details": None,
            "gpa_scale": "4.0",
            "gre_required": False,
            "gmat_required": False,
            "verified_by_count": 0,
            "view_count": 0,
        }

    # ------------------------------------------------------------------ #
    # Field parsers
    # ------------------------------------------------------------------ #

    def _parse_degree_level(
        self,
        utbildningsniva: str,
        warnings: list[str],
    ) -> str | None:
        key = utbildningsniva.strip().lower()
        if key in _DEGREE_MAP:
            return _DEGREE_MAP[key]

        # Partial match
        for pattern, code in _DEGREE_MAP.items():
            if pattern in key:
                return code

        if key:
            warnings.append(f"Unrecognised utbildningsniva: {utbildningsniva!r}")
        return None

    def _parse_language(
        self,
        undervisningssprak: str,
        warnings: list[str],
    ) -> str | None:
        key = undervisningssprak.strip().lower()
        if key in _LANGUAGE_MAP:
            return _LANGUAGE_MAP[key]

        # Partial match — if "english" appears anywhere, treat as English
        if "english" in key:
            return "ENGLISH"
        if "swedish" in key and "english" not in key:
            return "SWEDISH"

        if key:
            warnings.append(f"Unrecognised undervisningssprak: {undervisningssprak!r}")
        return None

    def _parse_credits(
        self,
        poang: str | float | None,
        poang_enhet: str | None,
        warnings: list[str],
    ) -> int | None:
        """
        Parse credits.  Swedish "hp" (högskolepoäng) is equivalent to ECTS credits.
        """
        if poang is None:
            return None

        try:
            val = float(str(poang).replace(",", "."))
            credits = int(round(val))
            return credits if credits > 0 else None
        except (ValueError, TypeError):
            warnings.append(f"Could not parse credits: {poang!r}")
            return None

    def _credits_to_months(
        self,
        credits_ects: int | None,
        studietakt: int | None,
    ) -> int | None:
        """
        Estimate duration in months from ECTS credits and study pace.

        Assumptions (standard Swedish HE):
          - 30 ECTS per semester (6 months at 100% pace)
          - studietakt = percentage of full-time (e.g. 50 → half-time → 2× longer)
        """
        if not credits_ects:
            return None

        pace = (studietakt or 100) / 100.0
        if pace <= 0:
            return None

        months_full_time = (credits_ects / 30) * 6
        return max(1, round(months_full_time / pace))

    def _build_deadline_notes(
        self,
        raw: dict[str, Any],
        aa: dict[str, Any],
        termin_name: str,
    ) -> str | None:
        """
        Build a human-readable deadline hint from semester information.

        The actual deadline dates vary by year and are published at:
        https://www.universityadmissions.se/en/key-dates-and-deadlines/

        Typical deadlines for non-EU/EEA students:
          - Autumn intake: application opens in October, deadline ~15 January
          - Spring intake: application opens in June, deadline ~15 October
        """
        parts: list[str] = []

        if termin_name:
            parts.append(f"Semester: {termin_name}")

        # Determine intake type from terminsPeriod + year (or termin_name)
        termin_period = aa.get("terminsPeriod")
        year = aa.get("ar")

        if termin_name:
            name_lower = termin_name.lower()
            if "autumn" in name_lower or "fall" in name_lower:
                parts.append("Intake: Autumn (starts ~August/September)")
                parts.append(
                    "Non-EU/EEA application deadline: approx. 15 January "
                    "(see universityadmissions.se for exact date)"
                )
            elif "spring" in name_lower:
                parts.append("Intake: Spring (starts ~January/February)")
                parts.append(
                    "Non-EU/EEA application deadline: approx. 15 October "
                    "(see universityadmissions.se for exact date)"
                )
            elif "summer" in name_lower:
                parts.append("Intake: Summer")

        # Late application info if present
        late_date = aa.get("oppnarForSenAnmalanDatum")
        if late_date:
            parts.append(f"Late application opens: {late_date}")

        status = raw.get("status") or ""
        if status and status != "ej.publicerad":
            parts.append(f"Admission status: {status}")

        return "\n".join(parts) if parts else None
