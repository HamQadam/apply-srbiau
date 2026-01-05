build:
	 docker compose -f deploy/compose.yml down -v && docker compose -f deploy/compose.yml up -d --build 
seed:
	cd backend;uv run seed  --base-url https://apply-api.ham-ghadam.ir   --contributors 10   --universities 8   --courses-per-uni 4   --langs-per-applicant 2   --acts-per-applicant 3   --docs-per-applicant 2   --apps-per-applicant 4   --do-purchases   --purchase-count 8
log:
	 docker compose -f deploy/compose.yml logs -f 
psql:
	docker exec -it apply-db psql -U apply_user apply_db
run:
	 docker compose -f deploy/compose.yml up -d
crawl-daad:
	 docker compose -f deploy/compose.yml run --build --rm daad-crawler
crawl-nl:
	 docker compose -f deploy/compose.yml run --build --rm studyinnl-crawler
up-front:
	 docker compose -f deploy/compose.yml up frontend -d --build && docker compose -f deploy/compose.yml logs -f frontend
up-back:
	 docker compose -f deploy/compose.yml up api -d --build && docker compose -f deploy/compose.yml logs -f api 
postprocess-deadlines:
	 docker compose -f deploy/compose.yml run --build --rm deadline-refiner

exec:
	 docker compose -f deploy/compose.yml exec $(container) sh

# Show logs for a specific container
# Usage: make logs container=api
logs:
	 docker compose -f deploy/compose.yml logs -f $(container)
