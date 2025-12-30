# Ghadam Crawlers

A modular, extensible crawler framework for fetching academic program data from various sources.

## Supported Sources

| Source | Country | Programs | Endpoint |
|--------|---------|----------|----------|
| **DAAD** | Germany | ~2000+ | `www2.daad.de/api/solr` |
| **StudyInNL** | Netherlands | ~1700+ | `studyinnl.org/api/programs` |

## Architecture

```
crawlers/
├── base/                      # Base crawler framework
│   ├── crawler.py             # Abstract base class
│   └── engine.py              # Ingestion engine
├── daad_ingestor/             # DAAD-specific crawler
│   ├── daad_crawler.py        
│   ├── db.py                  
│   └── ...
├── studyinnl_ingestor/        # StudyInNL-specific crawler
│   ├── studyinnl_crawler.py   
│   └── config.py              
├── cli.py                     # Unified CLI
└── README.md
```

## Quick Start

### Using Docker Compose

```bash
# Start database and backend
docker compose up -d backend database

# Run DAAD crawler
docker compose --profile crawlers up daad-crawler

# Run StudyInNL crawler  
docker compose --profile crawlers up studyinnl-crawler

# Run both crawlers
docker compose --profile all-crawlers up

# Dry run (no database writes)
docker compose --profile dry-run up studyinnl-crawler-dry
```

### Using CLI Directly

```bash
# List available sources
crawl sources

# Crawl DAAD (Germany)
crawl daad

# Crawl StudyInNL (Netherlands)
crawl studyinnl

# With options
crawl studyinnl --max-programs 100  # Limit for testing
crawl daad --dry-run                # No DB writes
crawl daad --resume                 # Resume from checkpoint

# Analyze failures
crawl analyze-failures --source studyinnl
crawl analyze-failures --source daad --examples 20

# Verbose logging
crawl -v studyinnl
```

## Data Comparison

### DAAD (Germany)
- Bachelor, Master, PhD programs
- Basic tuition info
- Duration and ECTS
- Teaching language
- Application deadlines

### StudyInNL (Netherlands)
- Bachelor, Master, Short courses
- **Rich tuition data**: statutory, international, institutional rates
- **Language requirements**: IELTS, TOEFL, Cambridge scores
- **Scholarships**: with URLs and descriptions
- **Separate EU/non-EU deadlines**
- Institution logos and photos
- Accreditation info

## Environment Variables

```bash
# Database (required)
POSTGRES_USER=apply_user
POSTGRES_PASSWORD=secret
POSTGRES_DB=apply_db
POSTGRES_HOST=database
POSTGRES_PORT=5432

# Or use a full URL
DATABASE_URL=postgresql://user:pass@host:5432/db

# Common settings
BATCH_SIZE=50
DB_WAIT_TIMEOUT_S=180
STATE_DIR=/state

# DAAD-specific
DAAD_RPS=2.0
DAAD_PAGE_SIZE=100

# StudyInNL-specific  
STUDYINNL_RPS=2.0
STUDYINNL_PAGE_SIZE=50
```

## Adding a New Crawler

### Step 1: Create the Crawler Class

```python
from base import BaseCrawler, CrawlResult, CrawlStatus

class MyNewCrawler(BaseCrawler[dict]):
    source_name = "mynewsource"
    
    async def fetch_items(self):
        """Yield raw items from your source."""
        # Handle pagination, rate limiting, etc.
        for page in range(total_pages):
            response = await self.client.get(url, params={"page": page})
            for item in response.json()["items"]:
                yield item
    
    def transform(self, raw_item: dict) -> CrawlResult:
        """Transform raw data to structured payloads."""
        try:
            return CrawlResult(
                source_id=str(raw_item["id"]),
                status=CrawlStatus.SUCCESS,
                university_payload={
                    "name": raw_item["university"],
                    "country": "YourCountry",
                    "city": raw_item.get("city", "Unknown"),
                },
                course_payload={
                    "name": raw_item["program_name"],
                    "degree_level": "MASTER",
                    "field": raw_item.get("field", "General"),
                    "notes": f"source=mynewsource; id={raw_item['id']}",
                    # ... other fields
                },
            )
        except Exception as e:
            return CrawlResult(
                source_id=str(raw_item.get("id", "unknown")),
                status=CrawlStatus.FAILED,
                error=self.create_error(
                    source_id=str(raw_item.get("id")),
                    error_type="TRANSFORM_ERROR",
                    message=str(e),
                    raw_data=raw_item,
                ),
            )
```

### Step 2: Add to CLI

Add a new command in `cli.py`:

```python
async def run_mynewsource(args, cfg):
    from mynewsource_ingestor import MyNewCrawler
    crawler = MyNewCrawler(...)
    # ... same pattern as other crawlers
```

### Step 3: Add to Docker Compose

```yaml
mynewsource-crawler:
  build: ./crawlers
  command: ["mynewsource"]
  profiles: ["crawlers"]
  # ... environment, volumes, depends_on
```

## Error Handling

Failed items are saved to JSONL files for analysis:

```bash
# View failures
crawl analyze-failures --source studyinnl --examples 10

# Export detailed report
crawl analyze-failures --source daad --output /tmp/daad_errors.json
```

Common error types:

| Error Type | Description |
|------------|-------------|
| `MISSING_REQUIRED_FIELDS` | Required fields missing |
| `MISSING_INSTITUTION` | No institution data |
| `COURSE_BUILD_ERROR` | Error building course payload |
| `UNIVERSITY_BUILD_ERROR` | Error building university payload |
| `TRANSFORM_EXCEPTION` | Unexpected exception |

## Database Schema

Both crawlers write to the same schema:

### universities
- `id`, `name`, `country`, `city` (required)
- `website`, `logo_url`, `university_type` (optional)
- Rankings, coordinates, metadata

### courses
- `id`, `university_id`, `name`, `degree_level`, `field` (required)
- `teaching_language`, `duration_months`, `credits_ects`
- Tuition: `tuition_fee_amount`, `tuition_fee_currency`, `is_tuition_free`
- Deadlines: `deadline_fall`, `deadline_spring`, `deadline_notes`
- `scholarships_available`, `scholarship_details`
- `notes` (includes source tracking: `source=studyinnl; studyinnl_id=123`)

## Deduplication

The crawler uses fuzzy matching to avoid duplicates:

1. **Universities**: Matched by name + country (90% similarity)
2. **Courses**: First by source ID in notes, then by name (92% similarity)

The `_wise_patch` function updates empty fields while preserving existing data.

## Performance

| Source | Programs | Typical Duration | Rate Limit |
|--------|----------|------------------|------------|
| DAAD | ~2000 | ~15-20 min | 2 req/s |
| StudyInNL | ~1700 | ~10-15 min | 2 req/s |

## Troubleshooting

### Tables not found
```
[db] waiting for tables in db=apply_db ... missing: universities courses
```
Solution: Ensure backend has started and migrations have run.

### Rate limiting (429 errors)
```bash
DAAD_RPS=1.0 crawl daad
STUDYINNL_RPS=1.0 crawl studyinnl
```

### Memory issues
```bash
BATCH_SIZE=25 crawl studyinnl
```

### Resume after failure
```bash
crawl daad --resume  # For DAAD with checkpointing
crawl studyinnl --offset 500  # Manual offset for StudyInNL
```
