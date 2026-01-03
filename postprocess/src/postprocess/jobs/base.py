from dataclasses import dataclass
from typing import Protocol
import psycopg


@dataclass
class JobArgs:
    batch_size: int = 200
    max_rows: int = 5000
    dry_run: bool = False


class Job(Protocol):
    name: str

    def run(self, conn: psycopg.Connection, args: JobArgs) -> int:
        """Return number of rows updated."""
        ...
