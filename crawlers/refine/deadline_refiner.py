import html
import json
import os
import re
from dataclasses import dataclass
from datetime import date
from typing import Optional, Tuple, List, Dict, Any

from llama_cpp import Llama


# -----------------------------
# Config
# -----------------------------
MODEL_PATH = os.getenv("LLM_MODEL_PATH", "Phi-3-mini-4k-instruct-q4.gguf")
LLM_CTX = int(os.getenv("LLM_CTX", "1024"))
LLM_BATCH = int(os.getenv("LLM_BATCH", "128"))
LLM_THREADS = int(os.getenv("LLM_THREADS", "8"))

# CPU-only
_llm = Llama(
    model_path=MODEL_PATH,
    n_ctx=LLM_CTX,
    n_batch=LLM_BATCH,
    n_threads=LLM_THREADS,
    n_gpu_layers=0,
)

# -----------------------------
# Parsing helpers
# -----------------------------
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

# "15 July"
SINGLE_RE = re.compile(
    r"\b(\d{1,2})\s+"
    r"(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|"
    r"Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b",
    re.I,
)

# "1 October to 1 December", "1 April - 30 November", "... until ..."
RANGE_RE = re.compile(
    r"\b(\d{1,2})\s+"
    r"(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|"
    r"Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*"
    r"(?:-|–|—|to|until)\s*"
    r"(\d{1,2})\s+"
    r"(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|"
    r"Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b",
    re.I,
)


def _to_month(mname: str) -> Optional[int]:
    return MONTHS.get(mname.strip().lower())


def _next_occurrence(mm: int, dd: int, today: date) -> date:
    """Month/day -> next occurrence (DATE column needs a year)."""
    y = today.year
    candidate = date(y, mm, dd)
    if candidate < today:
        candidate = date(y + 1, mm, dd)
    return candidate


def _extract_candidates(txt: str) -> List[Tuple[str, int, int, Optional[int], Optional[int]]]:
    """
    Returns list of tuples:
      ("range", m1,d1,m2,d2) or ("single", m,d,None,None)
    """
    out: List[Tuple[str, int, int, Optional[int], Optional[int]]] = []
    for m in RANGE_RE.finditer(txt):
        d1, mon1, d2, mon2 = m.group(1), m.group(2), m.group(3), m.group(4)
        mm1 = _to_month(mon1)
        mm2 = _to_month(mon2)
        if mm1 and mm2:
            out.append(("range", mm1, int(d1), mm2, int(d2)))
    for m in SINGLE_RE.finditer(txt):
        d, mon = m.group(1), m.group(2)
        mm = _to_month(mon)
        if mm:
            out.append(("single", mm, int(d), None, None))
    return out


def _clamp_notes(s: str, limit: int = 500) -> str:
    s = (s or "").strip()
    return s[:limit]


# -----------------------------
# Semester detection + routing (FIXED spring bug)
# -----------------------------
# Use "word boundary" patterns to avoid false matches (e.g., "ss" inside words)
FALL_PATTERNS = [
    r"\bwinter semester\b",
    r"\bwinter term\b",
    r"\bfall intake\b",
    r"\boctober intake\b",
    r"\boctober\b",
    r"\bws\b",  # Germany shorthand
]
SPRING_PATTERNS = [
    r"\bsummer semester\b",
    r"\bsummer term\b",
    r"\bspring intake\b",
    r"\bmarch intake\b",
    r"\bmarch entries\b",
    r"\bmarch\b",
    r"\bss\b",  # Germany shorthand
]

FALL_RE = re.compile("|".join(FALL_PATTERNS), re.I)
SPRING_RE = re.compile("|".join(SPRING_PATTERNS), re.I)


def _detect_ctx(seg: str) -> Optional[str]:
    """Return 'fall', 'spring', or None if unclear/ambiguous."""
    has_fall = bool(FALL_RE.search(seg))
    has_spring = bool(SPRING_RE.search(seg))
    if has_fall and not has_spring:
        return "fall"
    if has_spring and not has_fall:
        return "spring"
    return None


def _consider_best(best: Optional[Tuple[int, int]], mm: int, dd: int) -> Tuple[int, int]:
    """Pick the latest MM-DD within a year."""
    if best is None:
        return (mm, dd)
    return (mm, dd) if (mm, dd) > best else best


def _heuristic_semester_from_month(mm: int) -> Optional[str]:
    """
    When text has dates but no semester keywords:
    - Spring/summer intake deadlines are often Oct–Feb (and sometimes Mar)
    - Fall/winter intake deadlines are often Apr–Sep (and sometimes Oct, but less for deadlines)
    """
    if mm in (10, 11, 12, 1, 2, 3):
        return "spring"
    if mm in (4, 5, 6, 7, 8, 9):
        return "fall"
    return None


# -----------------------------
# LLM fallback (for ambiguous / messy text)
# -----------------------------
INSTRUCTION = """Extract application deadlines for two DB fields:

- deadline_spring (date): summer semester / March entries / spring intake
- deadline_fall   (date): winter semester / October entries / fall intake
- deadline_notes  (string <= 500): keep ranges, multi-step deadlines, and any ambiguity.

Return ONLY valid JSON:
{
  "spring_mmdd": "MM-DD" | null,
  "fall_mmdd": "MM-DD" | null,
  "notes": "..."
}

Rules:
- If multiple deadlines exist for the SAME semester (e.g., uni-assist until 15 June AND hochschulstart until 15 July),
  choose the LATEST date as that semester's deadline and mention both in notes.
- If a range is given (e.g., 1 April - 30 November), choose the END date as the stored deadline and put the full range in notes.
- If semester/intake is unclear, set the mmdd to null and explain in notes.
- Dates must be MM-DD.
"""


def _first_json_obj(s: str) -> Optional[str]:
    m = re.search(r"\{.*\}", s, re.S)
    return m.group(0) if m else None


def _llm_extract_mmdd(txt: str) -> Dict[str, Any]:
    resp = _llm.create_chat_completion(
        messages=[{"role": "user", "content": f"{INSTRUCTION}\n\nTEXT:\n{txt}\n"}],
        temperature=0.0,
        max_tokens=256,
        stop=["<|end|>", "<|endoftext|>"],
    )
    content = resp["choices"][0]["message"]["content"]
    js = _first_json_obj(content)
    if not js:
        return {"spring_mmdd": None, "fall_mmdd": None, "notes": "LLM produced no JSON."}
    try:
        return json.loads(js)
    except Exception:
        return {"spring_mmdd": None, "fall_mmdd": None, "notes": "LLM JSON parse failed."}


def _mmdd_to_date(mmdd: Optional[str], today: date) -> Optional[date]:
    if not mmdd:
        return None
    try:
        mm_s, dd_s = mmdd.split("-")
        return _next_occurrence(int(mm_s), int(dd_s), today)
    except Exception:
        return None


# -----------------------------
# Public API
# -----------------------------
@dataclass
class DeadlineResult:
    deadline_fall: Optional[date]
    deadline_spring: Optional[date]
    deadline_notes: str


def refine_deadlines(raw_text: str, today: Optional[date] = None) -> DeadlineResult:
    """
    DDL-aligned output:
      deadline_fall DATE NULL
      deadline_spring DATE NULL
      deadline_notes VARCHAR(500) NULL
    """
    today = today or date.today()

    txt = html.unescape(raw_text or "")
    txt = txt.replace("\xa0", " ").strip()
    if not txt:
        return DeadlineResult(None, None, "")

    notes_parts: List[str] = []

    spring_best: Optional[Tuple[int, int]] = None
    fall_best: Optional[Tuple[int, int]] = None

    # Segment-aware routing to avoid the bug you hit.
    # Example: "15 July ... winter; 15 January ... summer"
    segments = [s.strip() for s in re.split(r"[;\n•]+", txt) if s.strip()]

    current_ctx: Optional[str] = None
    unassigned: List[Tuple[int, int, str]] = []  # mm, dd, segment

    def apply_candidates(ctx: str, seg: str):
        nonlocal spring_best, fall_best
        seg_cands = _extract_candidates(seg)
        if not seg_cands:
            return

        for kind, m1, d1, m2, d2 in seg_cands:
            if kind == "single":
                mm, dd = m1, d1
            else:
                mm, dd = m2, d2  # range -> END date
                notes_parts.append(f"{ctx} range: {m1:02d}-{d1:02d}..{m2:02d}-{d2:02d}")

            if ctx == "fall":
                fall_best = _consider_best(fall_best, mm, dd)
            else:
                spring_best = _consider_best(spring_best, mm, dd)

    # Pass 1: assign by explicit semester keywords, carrying context downwards
    for seg in segments:
        seg_ctx = _detect_ctx(seg)
        if seg_ctx:
            current_ctx = seg_ctx

        ctx = seg_ctx or current_ctx
        if ctx in ("fall", "spring"):
            apply_candidates(ctx, seg)
        else:
            # no context; store candidates for heuristic second pass
            for kind, m1, d1, m2, d2 in _extract_candidates(seg):
                if kind == "single":
                    unassigned.append((m1, d1, seg))
                else:
                    unassigned.append((m2, d2, seg))
                    notes_parts.append(f"unassigned range: {m1:02d}-{d1:02d}..{m2:02d}-{d2:02d}")

    # Pass 2: heuristic assignment for remaining
    if unassigned and (spring_best is None or fall_best is None):
        for mm, dd, seg in unassigned:
            guess = _heuristic_semester_from_month(mm)
            if guess == "spring" and spring_best is None:
                spring_best = (mm, dd)
                notes_parts.append(f"heuristic spring from month: {mm:02d}-{dd:02d}")
            elif guess == "fall" and fall_best is None:
                fall_best = (mm, dd)
                notes_parts.append(f"heuristic fall from month: {mm:02d}-{dd:02d}")

    # If still nothing, or only very messy: LLM fallback
    if spring_best is None and fall_best is None:
        j = _llm_extract_mmdd(txt)
        spring_date = _mmdd_to_date(j.get("spring_mmdd"), today)
        fall_date = _mmdd_to_date(j.get("fall_mmdd"), today)
        notes = _clamp_notes(j.get("notes", ""))
        return DeadlineResult(fall_date, spring_date, notes)

    # Convert MM-DD -> concrete dates
    spring_date = _next_occurrence(spring_best[0], spring_best[1], today) if spring_best else None
    fall_date = _next_occurrence(fall_best[0], fall_best[1], today) if fall_best else None

    # Useful notes
    if segments:
        # show final picks
        if fall_best:
            notes_parts.append(f"picked fall={fall_best[0]:02d}-{fall_best[1]:02d}")
        if spring_best:
            notes_parts.append(f"picked spring={spring_best[0]:02d}-{spring_best[1]:02d}")

    # If you still want a compact candidates list:
    all_cands = _extract_candidates(txt)
    if all_cands:
        flat = []
        for kind, m1, d1, m2, d2 in all_cands:
            flat.append(f"{m1:02d}-{d1:02d}" if kind == "single" else f"{m1:02d}-{d1:02d}..{m2:02d}-{d2:02d}")
        notes_parts.insert(0, "candidates: " + ", ".join(flat))

    return DeadlineResult(fall_date, spring_date, _clamp_notes("; ".join(notes_parts)))


# -----------------------------
# CLI
# -----------------------------
def main():
    import argparse

    p = argparse.ArgumentParser(description="Extract deadline_fall/deadline_spring/deadline_notes from text.")
    p.add_argument("--text", type=str, default=None, help="Raw deadline text")
    p.add_argument("--file", type=str, default=None, help="Read raw text from a file")
    p.add_argument("--today", type=str, default=None, help="Override today (YYYY-MM-DD) for deterministic output")
    args = p.parse_args()

    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            raw = f.read()
    elif args.text is not None:
        raw = args.text
    else:
        # default sample
        raw = "All applicants: 15 July for the following winter semester; 15 January for the following summer semester"

    t = date.fromisoformat(args.today) if args.today else date.today()
    res = refine_deadlines(raw, today=t)
    print(res)


if __name__ == "__main__":
    main()
