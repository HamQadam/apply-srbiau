import re
from rapidfuzz.fuzz import ratio

def norm_text(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^\w\s]", "", s)
    return s

def best_fuzzy_match(target: str, candidates: list[dict], key: str, min_score: int = 88) -> dict | None:
    t = norm_text(target)
    best = None
    best_score = 0
    for c in candidates:
        v = c.get(key) or ""
        sc = ratio(t, norm_text(v))
        if sc > best_score:
            best_score = sc
            best = c
    return best if best and best_score >= min_score else None

def prefer_city(match_a: dict | None, match_b: dict | None, wanted_city: str | None) -> dict | None:
    if not wanted_city:
        return match_a
    if not match_a:
        return match_b
    if not match_b:
        return match_a
    a_city = (match_a.get("city") or "").strip().lower()
    b_city = (match_b.get("city") or "").strip().lower()
    w = wanted_city.strip().lower()
    if a_city == w and b_city != w:
        return match_a
    if b_city == w and a_city != w:
        return match_b
    return match_a
