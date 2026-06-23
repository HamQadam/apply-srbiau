"""
Base types for source transformers.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

# Sentinel: field was not found / could not be determined lexically
MISSING = object()


@dataclass
class ParsedItem:
    """
    The output of a source transformer.

    university_payload and course_payload are dicts ready to be upserted
    into the database — None values inside are skipped by the upsert logic.

    missing_fields lists the names of course fields that the lexical pass
    could not determine (e.g. deadline_fall, teaching_language).  Any item
    with missing_fields will be flagged as needs_llm.

    warnings are non-fatal notes logged but not blocking the upsert.
    """
    university_payload: dict[str, Any]
    course_payload: dict[str, Any]
    missing_fields: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
