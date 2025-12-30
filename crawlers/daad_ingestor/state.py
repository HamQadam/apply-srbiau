"""
State management for crawler checkpointing.

Allows the crawler to resume from where it left off after interruption.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Any


log = logging.getLogger("crawler.state")


class StateStore:
    """
    Persistent state store for crawler checkpoints.
    
    Stores offsets per degree level to allow resumption.
    Also tracks last run statistics.
    """
    
    def __init__(self, path: str):
        self.path = Path(path)
        self._state: dict[str, Any] = {}
        self._load()
    
    def _load(self) -> None:
        """Load state from disk."""
        if self.path.exists():
            try:
                with open(self.path) as f:
                    self._state = json.load(f)
                log.info("Loaded state from %s", self.path)
            except Exception as e:
                log.warning("Failed to load state from %s: %s", self.path, e)
                self._state = {}
        else:
            self._state = {}
    
    def _save(self) -> None:
        """Save state to disk."""
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.path, "w") as f:
                json.dump(self._state, f, indent=2, default=str)
        except Exception as e:
            log.error("Failed to save state to %s: %s", self.path, e)
    
    def get_offset(self, degree_level: str) -> int:
        """Get the current offset for a degree level."""
        offsets = self._state.get("offsets", {})
        return offsets.get(degree_level, 0)
    
    def set_offset(self, degree_level: str, offset: int) -> None:
        """Set the offset for a degree level and persist."""
        if "offsets" not in self._state:
            self._state["offsets"] = {}
        self._state["offsets"][degree_level] = offset
        self._state["last_updated"] = datetime.utcnow().isoformat()
        self._save()
    
    def reset_offsets(self) -> None:
        """Reset all offsets to 0."""
        self._state["offsets"] = {}
        self._state["last_reset"] = datetime.utcnow().isoformat()
        self._save()
        log.info("Reset all offsets")
    
    def record_run(
        self,
        source: str,
        total_processed: int,
        total_success: int,
        total_failed: int,
        duration_seconds: float,
    ) -> None:
        """Record statistics from a crawl run."""
        if "runs" not in self._state:
            self._state["runs"] = []
        
        run_info = {
            "source": source,
            "timestamp": datetime.utcnow().isoformat(),
            "total_processed": total_processed,
            "total_success": total_success,
            "total_failed": total_failed,
            "duration_seconds": round(duration_seconds, 2),
        }
        
        # Keep last 10 runs
        self._state["runs"].append(run_info)
        self._state["runs"] = self._state["runs"][-10:]
        self._save()
    
    def get_last_run(self, source: str | None = None) -> dict[str, Any] | None:
        """Get info about the last run, optionally filtered by source."""
        runs = self._state.get("runs", [])
        if not runs:
            return None
        
        if source:
            runs = [r for r in runs if r.get("source") == source]
        
        return runs[-1] if runs else None
    
    @property
    def state(self) -> dict[str, Any]:
        """Get a copy of the current state."""
        return dict(self._state)
