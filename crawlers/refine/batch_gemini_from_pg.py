import os
import time
import json
import argparse
from typing import Optional, List, Tuple

import requests
import psycopg2
from psycopg2 import sql

try:
    from dotenv import load_dotenv
except Exception:
    load_dotenv = None


GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"


def build_prompt(deadline_text: str) -> str:
    # You can change this prompt to whatever you want the model to do.
    return (
        "You are an information extraction engine.\n"
        "From the text below, extract application deadlines.\n\n"
        "Rules:\n"
        "- deadline_spring = summer semester / March intake\n"
        "- deadline_fall   = winter semester / October intake\n"
        "- Return ONLY valid JSON (no markdown)\n"
        '- Dates must be "MM-DD" (no year). If unknown, use null.\n\n'
        "JSON schema:\n"
        '{ "deadline_spring": "MM-DD|null", "deadline_fall": "MM-DD|null", "notes": "string" }\n\n'
        "Text:\n"
        f"{deadline_text}"
    )


def call_gemini(api_key: str, prompt: str, timeout_s: int = 60) -> str:
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": api_key,
    }
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    r = requests.post(GEMINI_URL, headers=headers, json=payload, timeout=timeout_s)
    r.raise_for_status()
    data = r.json()

    # Typical shape: candidates[0].content.parts[0].text
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception:
        # Fallback to printing raw JSON if format changes
        return json.dumps(data, ensure_ascii=False)


def get_pg_conn() -> psycopg2.extensions.connection:
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = int(os.getenv("POSTGRES_PORT", "5432"))
    user = os.getenv("POSTGRES_USER")
    password = os.getenv("POSTGRES_PASSWORD")
    dbname = os.getenv("POSTGRES_DB")

    missing = [k for k, v in [
        ("POSTGRES_USER", user),
        ("POSTGRES_PASSWORD", password),
        ("POSTGRES_DB", dbname),
    ] if not v]
    if missing:
        raise RuntimeError(f"Missing env vars: {', '.join(missing)}")

    return psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        dbname=dbname,
    )


def fetch_batch(
    conn,
    table: str,
    id_col: str,
    text_col: str,
    last_id: int,
    batch_size: int,
    where_sql: Optional[str] = None,
) -> List[Tuple[int, str]]:
    """
    Keyset pagination: WHERE id > last_id ORDER BY id LIMIT batch_size
    """
    where_parts = [sql.SQL("{} > %s").format(sql.Identifier(id_col))]
    params = [last_id]

    # Ensure text exists
    where_parts.append(sql.SQL("{} IS NOT NULL").format(sql.Identifier(text_col)))

    # Optional extra filter (raw SQL string). Use carefully.
    if where_sql:
        where_parts.append(sql.SQL("(") + sql.SQL(where_sql) + sql.SQL(")"))

    query = sql.SQL("SELECT {id_col}, {text_col} FROM {table} WHERE {where} "
                    "ORDER BY {id_col} ASC LIMIT %s").format(
        id_col=sql.Identifier(id_col),
        text_col=sql.Identifier(text_col),
        table=sql.Identifier(table),
        where=sql.SQL(" AND ").join(where_parts),
    )
    params.append(batch_size)

    with conn.cursor() as cur:
        cur.execute(query, params)
        rows = cur.fetchall()
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--env-file", default=None, help="Path to .env (optional). Example: ../../.env")
    ap.add_argument("--table", required=True, help="Table name. Example: programs")
    ap.add_argument("--id-col", default="id", help="ID column. Default: id")
    ap.add_argument("--text-col", required=True, help="Text column to send to Gemini. Example: deadlines_text")
    ap.add_argument("--where", default=None, help="Extra SQL filter (optional). Example: \"country='Germany'\"")
    ap.add_argument("--batch-size", type=int, default=10, help="Rows per DB batch. Default: 10")
    ap.add_argument("--max-rows", type=int, default=0, help="Stop after N rows (0 = no limit)")
    ap.add_argument("--sleep", type=float, default=0.2, help="Sleep between API calls (seconds). Default: 0.2")
    args = ap.parse_args()

    if args.env_file and load_dotenv:
        load_dotenv(args.env_file)

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GOOGLE_API_KEY env var")

    conn = get_pg_conn()
    conn.autocommit = True

    last_id = 0
    processed = 0

    try:
        while True:
            rows = fetch_batch(
                conn=conn,
                table=args.table,
                id_col=args.id_col,
                text_col=args.text_col,
                last_id=last_id,
                batch_size=args.batch_size,
                where_sql=args.where,
            )

            if not rows:
                print("No more rows.")
                break

            for row_id, text_value in rows:
                prompt = build_prompt(text_value)

                try:
                    response_text = call_gemini(api_key, prompt)
                except requests.HTTPError as e:
                    print("\n" + "=" * 80)
                    print(f"ID: {row_id}")
                    print("REQUEST (prompt):")
                    print(prompt)
                    print("\nERROR calling Gemini:")
                    print(str(e))
                    print("=" * 80 + "\n")
                    last_id = row_id
                    processed += 1
                    if args.max_rows and processed >= args.max_rows:
                        return
                    time.sleep(args.sleep)
                    continue

                print("\n" + "=" * 80)
                print(f"ID: {row_id}")
                print("\nREQUEST (prompt):")
                print(prompt)
                print("\nORIGINAL TEXT:")
                print(text_value)
                print("\nMODEL RESPONSE:")
                print(response_text)
                print("=" * 80 + "\n")

                last_id = row_id
                processed += 1

                if args.max_rows and processed >= args.max_rows:
                    print(f"Reached max_rows={args.max_rows}.")
                    return

                time.sleep(args.sleep)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
