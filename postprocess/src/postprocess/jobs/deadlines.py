# postprocess/jobs/deadlines.py
import logging
from datetime import date
from typing import Optional, List, Tuple

import psycopg

from ..config import AppConfig
from ..llm_fallback import LLMFallback, LLMConfig
from ..parsers.deadlines import parse_deadlines_notes
from .base import JobArgs

log = logging.getLogger(__name__)


class DeadlinesJob:
    name = "deadlines"

    def __init__(self, cfg: AppConfig) -> None:
        self.cfg = cfg
        self.llm = LLMFallback(
            LLMConfig(
                model_path=cfg.llm_model_path,
                n_ctx=cfg.llm_ctx,
                n_batch=cfg.llm_batch,
                n_threads=cfg.llm_threads,
            ),
            enabled=cfg.llm_enabled,
        )

    def _select_one(self, cur: psycopg.Cursor) -> Optional[Tuple[int, Optional[date], Optional[date], Optional[str]]]:
        # lock rows to allow safe parallel workers (multiple containers)
        lock_clause = "FOR UPDATE SKIP LOCKED" if self.cfg.lock_rows else ""
        q = f"""
            SELECT {self.cfg.id_column},
                   {self.cfg.fall_column},
                   {self.cfg.spring_column},
                   {self.cfg.notes_column}
            FROM {self.cfg.table_name}
            WHERE {self.cfg.notes_column} IS NOT NULL
              AND ({self.cfg.fall_column} IS NULL OR {self.cfg.spring_column} IS NULL)
            ORDER BY {self.cfg.id_column}
            LIMIT 1
            {lock_clause}
        """
        cur.execute(q)
        return cur.fetchone()

    def _update_row(
        self,
        cur: psycopg.Cursor,
        row_id: int,
        new_fall: Optional[date],
        new_spring: Optional[date],
    ) -> None:
        # only fill missing values; never overwrite existing
        q = f"""
            UPDATE {self.cfg.table_name}
            SET {self.cfg.fall_column}   = COALESCE({self.cfg.fall_column}, %s),
                {self.cfg.spring_column} = COALESCE({self.cfg.spring_column}, %s),
                updated_at = NOW()
            WHERE {self.cfg.id_column} = %s
        """
        cur.execute(q, (new_fall, new_spring, row_id))

    def run(self, conn: psycopg.Connection, args: JobArgs) -> int:
        updated = 0
        processed = 0
        today = date.today()

        while processed < args.max_rows:
            try:
                # ONE row per transaction => commit immediately after each successful update
                with conn.transaction():
                    with conn.cursor() as cur:
                        row = self._select_one(cur)
                        if not row:
                            break

                        row_id, fall, spring, notes = row
                        processed += 1

                        need_fall = fall is None
                        need_spring = spring is None
                        if not (need_fall or need_spring):
                            continue

                        pr = parse_deadlines_notes(
                            deadline_notes=notes or "",
                            today=today,
                            llm=self.llm,
                            need_fall=need_fall,
                            need_spring=need_spring,
                        )

                        if pr.fall is None and pr.spring is None:
                            log.debug(
                                "[id=%s] no parse (need_fall=%s need_spring=%s) %s",
                                row_id, need_fall, need_spring, pr.debug
                            )
                            continue

                        log.info(
                            "[id=%s] parsed fall=%s spring=%s used_llm=%s (%s)",
                            row_id, pr.fall, pr.spring, pr.used_llm, pr.debug
                        )

                        if not args.dry_run:
                            self._update_row(cur, row_id, pr.fall, pr.spring)
                            updated += 1

                # leaving `with conn.transaction()` commits immediately per row

            except Exception as e:
                # Don't let one bad row stop the job
                log.exception("Row processing failed (continuing). error=%s", type(e).__name__)
                continue

        if args.dry_run:
            log.info("Dry-run complete. processed=%s updated_would_be=%s", processed, updated)
        else:
            log.info("Job complete. processed=%s updated=%s", processed, updated)

        return updated
