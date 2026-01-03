# postprocess/parsers/deadlines.py
import html
import logging
import re
from dataclasses import dataclass
from datetime import date
from typing import Optional, List, Tuple

from ..llm_fallback import LLMFallback

log = logging.getLogger(__name__)

MONTHS = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

# Month-name formats: "15 July" and "July 15"
RE_DD_MON = re.compile(
    r"\b(\d{1,2})\s+"
    r"(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|"
    r"Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"(?:\s+(20\d{2}))?\b",
    re.I,
)
RE_MON_DD = re.compile(
    r"\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|"
    r"Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})"
    r"(?:,\s*(20\d{2})|\s+(20\d{2}))?\b",
    re.I,
)

# ISO: 2026-07-15
RE_ISO = re.compile(r"\b(20\d{2})-(\d{1,2})-(\d{1,2})\b")

# EU numeric: 15.07.2026 or 15/07/2026 or 15.07
RE_EU = re.compile(r"\b(\d{1,2})[./-](\d{1,2})(?:[./-](20\d{2}))?\b")

# Range connectors: use proximity between two mentions + connectors in-between
CONNECTOR_RE = re.compile(r"\b(to|until|till|through|thru|bis)\b|[-–—]", re.I)

# Semester/context patterns
FALL_RE = re.compile(
    r"\b(winter semester|winter term|fall intake|october intake|october|ws)\b", re.I
)
SPRING_RE = re.compile(
    r"\b(summer semester|summer term|spring intake|march intake|march entries|march|ss)\b", re.I
)

# Keywords indicating an end/deadline (if multiple dates exist)
END_HINT_RE = re.compile(
    r"\b(deadline|until|latest|at the latest|no later than|by)\b", re.I
)

# Split segments (bullets, semicolons, newlines). Keep it conservative.
SEG_SPLIT_RE = re.compile(r"[;\n•]+")

# Fast “is there any date-like thing here?” gate to avoid wasting LLM calls.
DATE_SIGNAL_RE = re.compile(
    r"\b20\d{2}-\d{1,2}-\d{1,2}\b"  # ISO
    r"|\b\d{1,2}[./-]\d{1,2}(?:[./-]20\d{2})?\b"  # 15/07/2026 or 15-07 or 15.07
    r"|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b"  # month word
    r"|\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b"  # 15 July
    r"|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}\b",  # July 15
    re.I,
)


def _has_date_signal(txt: str) -> bool:
    return bool(DATE_SIGNAL_RE.search(txt or ""))


def _clean_text(raw: str) -> str:
    if not raw:
        return ""
    txt = html.unescape(raw).replace("\xa0", " ")
    # remove HTML tags if crawler stored them
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def _to_month(name: str) -> Optional[int]:
    return MONTHS.get(name.strip().lower())


def _is_valid_mmdd(mm: int, dd: int) -> bool:
    # Use leap year 2024 so Feb 29 is allowed; rejects Apr 31, etc.
    try:
        date(2024, mm, dd)
        return True
    except ValueError:
        return False


def _next_occurrence(mm: int, dd: int, today: date) -> Optional[date]:
    """
    Return the next occurrence of mm-dd >= today.
    If the date is invalid in a given year (e.g., Feb 29 on non-leap year),
    search forward up to 8 years. Return None if never valid.
    """
    if not _is_valid_mmdd(mm, dd):
        return None

    for y in range(today.year, today.year + 9):
        try:
            candidate = date(y, mm, dd)
        except ValueError:
            continue
        if candidate >= today:
            return candidate
    return None


@dataclass
class Mention:
    start: int
    end: int
    mm: int
    dd: int
    year: Optional[int]
    raw: str


def _parse_valid_date(year: int, mm: int, dd: int) -> Optional[date]:
    try:
        return date(year, mm, dd)
    except Exception:
        return None


def _extract_mentions(seg: str) -> List[Mention]:
    mentions: List[Mention] = []

    # ISO
    for m in RE_ISO.finditer(seg):
        y, mm, dd = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if _parse_valid_date(y, mm, dd):
            mentions.append(Mention(m.start(), m.end(), mm, dd, y, m.group(0)))

    # Month name: "15 July 2026"
    for m in RE_DD_MON.finditer(seg):
        dd = int(m.group(1))
        mm = _to_month(m.group(2))
        y = int(m.group(3)) if m.group(3) else None
        if mm and 1 <= dd <= 31:
            mentions.append(Mention(m.start(), m.end(), mm, dd, y, m.group(0)))

    # Month name: "July 15, 2026"
    for m in RE_MON_DD.finditer(seg):
        mm = _to_month(m.group(1))
        dd = int(m.group(2))
        y = None
        if m.group(3):
            y = int(m.group(3))
        elif m.group(4):
            y = int(m.group(4))
        if mm and 1 <= dd <= 31:
            mentions.append(Mention(m.start(), m.end(), mm, dd, y, m.group(0)))

    # EU numeric: 15.07.2026 or 15.07
    for m in RE_EU.finditer(seg):
        d1, d2 = int(m.group(1)), int(m.group(2))
        y = int(m.group(3)) if m.group(3) else None

        # interpret as DD.MM
        dd, mm = d1, d2
        if not (1 <= mm <= 12 and 1 <= dd <= 31):
            continue
        if y is not None and _parse_valid_date(y, mm, dd) is None:
            continue
        mentions.append(Mention(m.start(), m.end(), mm, dd, y, m.group(0)))

    mentions.sort(key=lambda x: x.start)
    return mentions


def _detect_ctx(seg: str) -> Optional[str]:
    has_fall = bool(FALL_RE.search(seg))
    has_spring = bool(SPRING_RE.search(seg))
    if has_fall and not has_spring:
        return "fall"
    if has_spring and not has_fall:
        return "spring"
    return None


def _pick_deadline_from_segment(seg: str) -> Optional[Tuple[int, int]]:
    """
    Return best (mm, dd) for this segment, rules-first:
      - If range detected: return end date
      - Else prefer dates near "until/deadline/latest/by"
      - Else return latest mm-dd in segment
    """
    mentions = _extract_mentions(seg)
    if not mentions:
        return None

    # 1) Range detection: consecutive mentions with connector between them
    for i in range(len(mentions) - 1):
        between = seg[mentions[i].end : mentions[i + 1].start]
        if len(between) <= 40 and CONNECTOR_RE.search(between):
            mm, dd = mentions[i + 1].mm, mentions[i + 1].dd
            return (mm, dd) if _is_valid_mmdd(mm, dd) else None

    # 2) End/deadline hints: choose mention that is closest after hint
    hint_positions = [m.start() for m in END_HINT_RE.finditer(seg)]
    if hint_positions:
        best: Optional[Tuple[int, int, int]] = None  # (distance, mm, dd)
        for hp in hint_positions:
            for mn in mentions:
                if mn.start >= hp and (mn.start - hp) <= 50:
                    if not _is_valid_mmdd(mn.mm, mn.dd):
                        continue
                    cand = (mn.start - hp, mn.mm, mn.dd)
                    if best is None or cand < best:
                        best = cand
        if best:
            return (best[1], best[2])

    # 3) Otherwise pick latest valid mm-dd in segment
    latest = max(((m.mm, m.dd) for m in mentions if _is_valid_mmdd(m.mm, m.dd)), default=None)
    return latest


def _heuristic_semester_from_month(mm: int) -> Optional[str]:
    # Used only when no explicit context exists
    if mm in (10, 11, 12, 1, 2, 3):
        return "spring"
    if mm in (4, 5, 6, 7, 8, 9):
        return "fall"
    return None


def _mmdd_to_date(mm: int, dd: int, today: date) -> Optional[date]:
    return _next_occurrence(mm, dd, today)


def _parse_mmdd(s: Optional[str]) -> Optional[Tuple[int, int]]:
    if not s:
        return None
    m = re.match(r"^\s*(\d{2})-(\d{2})\s*$", s)
    if not m:
        return None
    mm, dd = int(m.group(1)), int(m.group(2))
    if _is_valid_mmdd(mm, dd):
        return (mm, dd)
    return None


@dataclass
class ParseResult:
    fall: Optional[date]
    spring: Optional[date]
    used_llm: bool
    debug: str


def parse_deadlines_notes(
    deadline_notes: str,
    today: date,
    llm: Optional[LLMFallback],
    need_fall: bool,
    need_spring: bool,
) -> ParseResult:
    """
    Deterministic first; LLM fallback only if missing required values.
    """
    txt = _clean_text(deadline_notes)
    if not txt:
        return ParseResult(None, None, False, "empty")

    segments = [s.strip() for s in SEG_SPLIT_RE.split(txt) if s.strip()]

    fall_best: Optional[Tuple[int, int]] = None
    spring_best: Optional[Tuple[int, int]] = None

    current_ctx: Optional[str] = None
    unassigned: List[Tuple[int, int]] = []

    # Segment-aware context routing
    for seg in segments:
        seg_ctx = _detect_ctx(seg)
        if seg_ctx:
            current_ctx = seg_ctx

        ctx = seg_ctx or current_ctx
        pick = _pick_deadline_from_segment(seg)
        if not pick:
            continue

        mm, dd = pick
        if ctx == "fall":
            fall_best = max(fall_best or (0, 0), (mm, dd))
        elif ctx == "spring":
            spring_best = max(spring_best or (0, 0), (mm, dd))
        else:
            unassigned.append((mm, dd))

    debug_parts: List[str] = []
    used_llm = False

    # Heuristic assignment (pick latest per guessed semester) only if needed
    if unassigned and ((need_fall and fall_best is None) or (need_spring and spring_best is None)):
        fall_cands = [(mm, dd) for (mm, dd) in unassigned if _heuristic_semester_from_month(mm) == "fall" and _is_valid_mmdd(mm, dd)]
        spring_cands = [(mm, dd) for (mm, dd) in unassigned if _heuristic_semester_from_month(mm) == "spring" and _is_valid_mmdd(mm, dd)]

        if need_fall and fall_best is None and fall_cands:
            fall_best = max(fall_cands)
            debug_parts.append(f"heuristic->fall {fall_best[0]:02d}-{fall_best[1]:02d}")

        if need_spring and spring_best is None and spring_cands:
            spring_best = max(spring_cands)
            debug_parts.append(f"heuristic->spring {spring_best[0]:02d}-{spring_best[1]:02d}")

    # LLM fallback only if still missing required AND there is a date-like signal
    still_need_llm = (need_fall and fall_best is None) or (need_spring and spring_best is None)
    if still_need_llm and llm is not None and llm.enabled:
        if not _has_date_signal(txt):
            debug_parts.append("skip_llm=no_date_signal")
        else:
            used_llm = True
            j = llm.extract_mmdd(txt)

            if need_fall and fall_best is None:
                mmdd = _parse_mmdd(j.get("fall_mmdd"))
                if mmdd:
                    fall_best = mmdd
                    debug_parts.append(f"llm->fall {mmdd[0]:02d}-{mmdd[1]:02d}")

            if need_spring and spring_best is None:
                mmdd = _parse_mmdd(j.get("spring_mmdd"))
                if mmdd:
                    spring_best = mmdd
                    debug_parts.append(f"llm->spring {mmdd[0]:02d}-{mmdd[1]:02d}")

            if j.get("notes"):
                debug_parts.append(f"llm_note={str(j.get('notes'))[:120]}")

    fall_date = _mmdd_to_date(*fall_best, today) if fall_best and need_fall else None
    spring_date = _mmdd_to_date(*spring_best, today) if spring_best and need_spring else None

    if fall_best:
        debug_parts.insert(0, f"picked_fall={fall_best[0]:02d}-{fall_best[1]:02d}")
    if spring_best:
        debug_parts.insert(0, f"picked_spring={spring_best[0]:02d}-{spring_best[1]:02d}")

    return ParseResult(
        fall=fall_date,
        spring=spring_date,
        used_llm=used_llm,
        debug="; ".join(debug_parts)[:500],
    )
