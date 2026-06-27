"""
Per-source transformers used by the Stage-2 lexical parse job.

Each transformer takes a raw dict (as stored in raw_crawl_items.raw_data)
and returns a ParsedItem that carries:
  - university_payload   dict ready to upsert into universities
  - course_payload       dict ready to upsert into courses
  - missing_fields       list of field names that could not be determined
  - warnings             non-fatal issues found during parsing
"""
from .base import ParsedItem, MISSING
from .daad import DaadTransformer
from .studyinnl import StudyInNLTransformer
from .swedenua import SwedenUATransformer

_REGISTRY: dict[str, type] = {
    "daad": DaadTransformer,
    "studyinnl": StudyInNLTransformer,
    "swedenua": SwedenUATransformer,
}


def get_transformer(source: str):
    """Return an instantiated transformer for the given source name."""
    cls = _REGISTRY.get(source)
    if cls is None:
        raise KeyError(f"No transformer registered for source '{source}'. "
                       f"Known sources: {sorted(_REGISTRY)}")
    return cls()


__all__ = [
    "ParsedItem", "MISSING",
    "DaadTransformer", "StudyInNLTransformer", "SwedenUATransformer",
    "get_transformer",
]
