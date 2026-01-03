# src/postprocess/jobs/__init__.py
from typing import Dict, Callable

from ..config import AppConfig
from .deadlines import DeadlinesJob

JOB_FACTORIES: Dict[str, Callable[[AppConfig], object]] = {
    DeadlinesJob.name: lambda cfg: DeadlinesJob(cfg),
}

def list_jobs() -> list[str]:
    return sorted(JOB_FACTORIES.keys())

def make_job(name: str, cfg: AppConfig):
    try:
        factory = JOB_FACTORIES[name]
    except KeyError as e:
        raise KeyError(f"Unknown job: {name}. Available: {', '.join(list_jobs())}") from e
    return factory(cfg)
