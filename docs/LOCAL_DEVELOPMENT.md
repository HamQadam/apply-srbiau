# Local Development

This project can run behind the same nginx service locally and in production. Production hostnames stay in `deploy/nginx/conf.d/apply.conf`; local browser traffic is handled by `deploy/nginx/conf.d/local.conf`.

## Local nginx

Default local URL:

```bash
DEBUG=true docker compose -f deploy/compose.yml up -d --build
```

Open:

```text
http://localhost
```

If port 80 is already used on your machine, choose another host port:

```bash
DEBUG=true NGINX_HTTP_PORT=8080 docker compose -f deploy/compose.yml up -d --build
```

Open:

```text
http://localhost:8080
```

Useful local routes:

- `http://localhost` or `http://localhost:8080`: frontend SPA.
- `/api/v1/...`: backend API through nginx.
- `/docs`: FastAPI docs through nginx.
- `/health`: API health check through nginx.

## Debug login

When `DEBUG=true` or `DEBUG_OTP=true`, OTP login accepts:

```text
phone: 09123456789
code: 000000
```

This is intentionally for local/debug environments only.

## Seeding

The active seed command is the API-based CLI registered in `backend/pyproject.toml`:

```text
seed = "app.tools.seed.fake_seed:main"
```

Run a small local seed:

```bash
make seed-small
```

The seed targets automatically restart `api` and `nginx` with `DEBUG=true DEBUG_OTP=true` before inserting data.

If nginx is on a non-default local port:

```bash
make seed-small LOCAL_BASE_URL=http://localhost:8080
```

Run a larger seed:

```bash
make seed
```

The seed uses the public API instead of writing directly to the database. University and course creation endpoints are available only when `DEBUG=true`, so production does not expose catalog writes through these debug seed endpoints.

`backend/app/tools/seed/seed.py` is an older direct-database seed and should not be used as the main development seed path unless it is reconciled with the current models.
