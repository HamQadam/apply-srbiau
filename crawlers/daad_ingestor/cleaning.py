from __future__ import annotations

import re
from datetime import date
from dateutil.relativedelta import relativedelta
import dateparser

def html_to_text(s: str | None) -> str | None:
    if not s:
        return None
    s = re.sub(r"<br\s*/?>", "\n", s, flags=re.I)
    s = re.sub(r"</p\s*>", "\n", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip() or None

def map_teaching_language(langs: list[str] | None) -> str:
    langs = langs or []
    norm = {l.strip().lower() for l in langs}
    if norm == {"english"}:
        return "english"
    if norm == {"german"}:
        return "german"
    if "english" in norm and "german" not in norm and len(norm) == 1:
        return "english"
    if "english" in norm and len(norm) >= 2:
        # your schema is single-valued; pick english for search usefulness
        return "english"
    if "german" in norm and len(norm) >= 2:
        return "german"
    return "other"

def parse_duration_months(programme_duration: str | None) -> int | None:
    if not programme_duration:
        return None
    s = programme_duration.strip().lower()

    m = re.search(r"(\d+)\s*semester", s)
    if m:
        semesters = int(m.group(1))
        return semesters * 6

    m = re.search(r"(\d+)\s*month", s)
    if m:
        return int(m.group(1))

    m = re.search(r"(\d+)\s*year", s)
    if m:
        return int(m.group(1)) * 12

    return None

def parse_tuition(tuition_fees: str | None) -> tuple[bool, int | None]:
    if not tuition_fees:
        return (False, None)
    s = tuition_fees.strip().lower()
    if s in {"none", "no", "0", "0.0"}:
        return (True, 0)
    # "varied" -> unknown
    if "varied" in s or "depending" in s:
        return (False, None)

    digits = re.sub(r"[^\d]", "", tuition_fees)
    if digits:
        return (False, int(digits))
    return (False, None)

def extract_deadlines(deadline_html: str | None) -> tuple[date | None, date | None, str | None]:
    """
    Returns (deadline_fall, deadline_spring, deadline_notes).
    Heuristic: we mostly preserve notes; parse if clear.
    """
    notes = html_to_text(deadline_html)
    if not notes:
        return (None, None, None)

    # Try to find “winter” and “summer” lines
    lines = [ln.strip() for ln in notes.splitlines() if ln.strip()]
    fall_line = next((ln for ln in lines if "winter" in ln.lower()), None)
    spring_line = next((ln for ln in lines if "summer" in ln.lower()), None)

    def pick_last_date(text: str) -> date | None:
        # parse all date-like tokens; pick the last one
        # works with "15 July" etc
        tokens = re.split(r"[;,\n]|to|–|-", text, flags=re.I)
        parsed = []
        for t in tokens:
            dt = dateparser.parse(t.strip(), settings={"PREFER_DATES_FROM": "future"})
            if dt:
                parsed.append(dt.date())
        return parsed[-1] if parsed else None

    deadline_fall = pick_last_date(fall_line) if fall_line else None
    deadline_spring = pick_last_date(spring_line) if spring_line else None

    return (deadline_fall, deadline_spring, notes)
