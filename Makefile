build:
	cd deploy; docker compose down -v && docker compose up -d --build 

seed:
	cd backend;uv run seed  --base-url https://apply-api.ham-ghadam.ir   --contributors 10   --universities 8   --courses-per-uni 4   --langs-per-applicant 2   --acts-per-applicant 3   --docs-per-applicant 2   --apps-per-applicant 4   --do-purchases   --purchase-count 8

log:
	cd deploy; docker compose logs -f

psql:
	docker exec -it apply-db psql -U apply_user apply_db
