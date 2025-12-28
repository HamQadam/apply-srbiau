from __future__ import annotations

import json
from pathlib import Path
from typing import Any

class StateStore:
    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.data: dict[str, Any] = {}
        if self.path.exists():
            self.data = json.loads(self.path.read_text(encoding="utf-8") or "{}")

    def get_offset(self, degree_level: str) -> int:
        return int(self.data.get(degree_level, 0))

    def set_offset(self, degree_level: str, offset: int) -> None:
        self.data[degree_level] = int(offset)
        self.path.write_text(json.dumps(self.data, indent=2, sort_keys=True), encoding="utf-8")
