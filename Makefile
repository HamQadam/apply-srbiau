COMPOSE=docker compose -f deploy/compose.yml --env-file .env
LOCAL_BASE_URL?=http://localhost
SEED_ENV=DEBUG=true DEBUG_OTP=true

build:
	$(COMPOSE) up -d --build

rebuild-clean:
	$(COMPOSE) down -v
	$(COMPOSE) up -d --build

seed:
	$(SEED_ENV) $(COMPOSE) up -d --build --wait api nginx
	$(COMPOSE) restart nginx
	cd backend; uv run seed --base-url $(LOCAL_BASE_URL) --contributors 100 --universities 80 --courses-per-uni 40 --langs-per-applicant 3 --acts-per-applicant 5 --docs-per-applicant 2 --apps-per-applicant 6 --do-purchases --purchase-count 8

seed-small:
	$(SEED_ENV) $(COMPOSE) up -d --build --wait api nginx
	$(COMPOSE) restart nginx
	cd backend; uv run seed --base-url $(LOCAL_BASE_URL) --contributors 2 --universities 3 --courses-per-uni 2 --langs-per-applicant 1 --acts-per-applicant 1 --docs-per-applicant 1 --apps-per-applicant 2
log:
	$(COMPOSE) logs -f
psql:
	docker exec -it apply-db psql -U apply_user apply_db
run:
	 $(COMPOSE) up -d
crawl-daad:
	 $(COMPOSE) run --build --rm daad-crawler
crawl-nl:
	 $(COMPOSE) run --build --rm studyinnl-crawler
crawl-sweden:
	 $(COMPOSE) run --build --rm swedenua-crawler
up-front:
	 $(COMPOSE) up frontend -d --build && $(COMPOSE) logs -f frontend
up-back:
	$(COMPOSE) up api -d --build && $(COMPOSE) logs -f api
postprocess-deadlines:
	 $(COMPOSE) run --build --rm deadline-refiner

# Stage 2: lexical parse (pending → courses/universities, or needs_llm)
postprocess-parse:
	 $(COMPOSE) run --build --rm parse-raw

# Stage 3: LLM enrichment (needs_llm → done)
postprocess-llm:
	 $(COMPOSE) run --build --rm llm-enrich

# Run the full postprocess pipeline in order: parse → LLM → deadlines
postprocess-all:
	 $(COMPOSE) run --build --rm parse-raw
	 $(COMPOSE) run --build --rm llm-enrich
	 $(COMPOSE) run --build --rm deadline-refiner

exec:
	 $(COMPOSE) exec $(container) sh

# Show logs for a specific container
# Usage: make logs container=api
logs:
	 $(COMPOSE) logs -f $(container)
