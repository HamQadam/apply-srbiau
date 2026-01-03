import argparse
import logging

from dotenv import load_dotenv

from .config import AppConfig
from .db import db_conn
from .logging_config import setup_logging
from .jobs import list_jobs, make_job
from .jobs.base import JobArgs

log = logging.getLogger(__name__)


def main():
    load_dotenv()
    setup_logging()

    p = argparse.ArgumentParser(prog="postprocess", description="Run post-process jobs.")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_list = sub.add_parser("list-jobs", help="List available jobs.")

    p_run = sub.add_parser("run", help="Run a job by name.")
    p_run.add_argument("job", type=str, help="Job name (see list-jobs).")
    p_run.add_argument("--batch-size", type=int, default=200)
    p_run.add_argument("--max-rows", type=int, default=5000)
    p_run.add_argument("--dry-run", action="store_true")

    args = p.parse_args()

    if args.cmd == "list-jobs":
        for j in list_jobs():
            print(j)
        return

    cfg = AppConfig.from_env()
    job = make_job(args.job, cfg)

    job_args = JobArgs(
        batch_size=args.batch_size,
        max_rows=args.max_rows,
        dry_run=args.dry_run,
    )

    with db_conn(cfg.database_url) as conn:
        updated = job.run(conn, job_args)
        log.info("Updated rows: %s", updated)
