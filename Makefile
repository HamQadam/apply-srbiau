build:
	cd deploy; docker compose down -v && docker compose up -d --build 
seed:
	cd backend;uv run seed  --base-url https://apply-api.ham-ghadam.ir   --contributors 10   --universities 8   --courses-per-uni 4   --langs-per-applicant 2   --acts-per-applicant 3   --docs-per-applicant 2   --apps-per-applicant 4   --do-purchases   --purchase-count 8
log:
	cd deploy; docker compose logs -f 
psql:
	docker exec -it apply-db psql -U apply_user apply_db
run:
	cd deploy; docker compose up -d
crawl-daad:
	cd deploy; docker compose run --build --rm daad-crawler
crawl-nl:
	cd deploy; docker compose run --build --rm studyinnl-crawler
up-front:
	cd deploy; docker compose up frontend -d --build
up-back:
	cd deploy; docker compose up api -d --build && docker compose logs -f api 
postprocess-deadlines:
	cd deploy; docker compose run --build --rm deadline-refiner

