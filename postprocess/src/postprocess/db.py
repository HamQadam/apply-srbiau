import psycopg
from contextlib import contextmanager
from typing import Iterator


@contextmanager
def db_conn(database_url: str) -> Iterator[psycopg.Connection]:
    conn = psycopg.connect(database_url)
    try:
        # psycopg3 defaults to autocommit=False (good for row locks)
        yield conn
    finally:
        conn.close()
