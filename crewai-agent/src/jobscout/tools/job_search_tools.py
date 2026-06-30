import json
import os
from typing import Type

import requests
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

TECH_KEYWORDS = ["java", "python", "node.js", "nodejs", "nestjs", "nest.js", "backend", "back-end", "fastapi","spring boot", "spring"]
REQUEST_TIMEOUT = 15

def _matches_stack(text: str) -> bool:
    lowered = text.lower()
    return any(kw in lowered for kw in TECH_KEYWORDS)

def _truncate(text: str, max_chars: int = 600) -> str:
    return text[:max_chars].rsplit(" ", 1)[0] + "..." if len(text) > max_chars else text

class EmptyInput(BaseModel):
    query: str = Field(default="", description="Optional extra search query. Leave empty for default search.")

# ── 1. REMOTIVE ──────────────────────────────────────────────────────────────

class RemotiveSearchTool(BaseTool):
    name: str = "Remotive Job Search"
    description: str = (
        "Searches Remotive for remote backend engineering jobs (Java, Python, Node.js, NestJS, FastAPI, Spring Boot). "
        "Returns a JSON list of matching job postings worldwide."
    )
    args_schema: Type[BaseModel] = EmptyInput

    def _run(self, query: str = "") -> str:
        jobs = []
        seen_ids = set()
        searches = ["java backend", "python backend", "nodejs backend", "nestjs", "backend engineer", "fastapi backend", "spring boot backend"]

        for term in searches:
            try:
                response = requests.get(
                    "https://remotive.com/api/remote-jobs",
                    params={"category": "software-dev", "search": term, "limit": 10},
                    timeout=REQUEST_TIMEOUT,
                )
                if response.status_code != 200:
                    continue

                for job in response.json().get("jobs", []):
                    job_id = f"remotive-{job['id']}"
                    if job_id in seen_ids:
                        continue
                    title = job.get("title", "")
                    description = job.get("description", "")
                    if not _matches_stack(title + " " + description):
                        continue
                    seen_ids.add(job_id)
                    jobs.append({
                        "id": job_id,
                        "title": title,
                        "company": job.get("company_name", ""),
                        "location": job.get("candidate_required_location", "Worldwide"),
                        "description": _truncate(description),
                        "url": job.get("url", ""),
                        "salary": job.get("salary", ""),
                        "tags": job.get("tags", []),
                        "source": "Remotive",
                        "posted_date": job.get("publication_date", "")[:10],
                    })
            except requests.RequestException:
                continue

        return json.dumps(jobs[:25])

# ── 2. ADZUNA ────────────────────────────────────────────────────────────────

class AdzunaSearchTool(BaseTool):
    name: str = "Adzuna Job Search"
    description: str = (
        "Searches Adzuna across North America, Europe, Africa, and Asia for backend engineering jobs. "
        "Returns a JSON list of matching job postings with salary data where available."
    )
    args_schema: Type[BaseModel] = EmptyInput

    def _run(self, query: str = "") -> str:
        app_id = os.getenv("ADZUNA_APP_ID", "")
        api_key = os.getenv("ADZUNA_API_KEY", "")

        if not app_id or not api_key:
            return json.dumps([])

        # country code → region label
        # Africa: za (South Africa) is Adzuna's confirmed endpoint.
        # ng, ke, eg, gh are attempted — skipped silently if unsupported.
        # Remotive and Jobicy cover worldwide remote roles including Nigeria and Kenya.
        countries = {
            "us": "North America", "ca": "North America",
            "gb": "Europe", "de": "Europe", "fr": "Europe", "nl": "Europe",
            "za": "Africa", "ng": "Africa", "ke": "Africa", "eg": "Africa", "gh": "Africa",
            "sg": "Asia", "in": "Asia",
        }
        searches = ["java backend developer", "python backend developer", "nodejs developer", "nestjs developer"]
        jobs = []
        seen_ids = set()

        for country, region in countries.items():
            for term in searches[:2]:  # limit to avoid rate limits
                try:
                    response = requests.get(
                        f"https://api.adzuna.com/v1/api/jobs/{country}/search/1",
                        params={
                            "app_id": app_id,
                            "app_key": api_key,
                            "what": term,
                            "results_per_page": 5,
                            "content-type": "application/json",
                        },
                        timeout=REQUEST_TIMEOUT,
                    )
                    if response.status_code != 200:
                        continue

                    for job in response.json().get("results", []):
                        job_id = f"adzuna-{job['id']}"
                        if job_id in seen_ids:
                            continue
                        title = job.get("title", "")
                        description = job.get("description", "")
                        if not _matches_stack(title + " " + description):
                            continue
                        seen_ids.add(job_id)
                        salary_min = job.get("salary_min")
                        salary_max = job.get("salary_max")
                        salary_str = ""
                        if salary_min and salary_max:
                            salary_str = f"{salary_min}–{salary_max} {job.get('salary_currency_code', 'USD')}/year"
                        jobs.append({
                            "id": job_id,
                            "title": title,
                            "company": job.get("company", {}).get("display_name", ""),
                            "location": job.get("location", {}).get("display_name", country.upper()),
                            "region": region,
                            "description": _truncate(description),
                            "url": job.get("redirect_url", ""),
                            "salary": salary_str,
                            "tags": [],
                            "source": "Adzuna",
                            "posted_date": job.get("created", "")[:10],
                        })
                except requests.RequestException:
                    continue

        return json.dumps(jobs[:30])

# ── 3. THE MUSE ───────────────────────────────────────────────────────────────

class TheMuseSearchTool(BaseTool):
    name: str = "The Muse Job Search"
    description: str = (
        "Searches The Muse for backend engineering roles. "
        "Returns a JSON list of matching job postings, focused on tech companies."
    )
    args_schema: Type[BaseModel] = EmptyInput

    def _run(self, query: str = "") -> str:
        jobs = []
        seen_ids = set()
        categories = ["Software Engineer", "Engineering Manager", "Data Science"]
        levels = ["Senior Level", "Mid Level"]

        for category in categories:
            for level in levels:
                try:
                    response = requests.get(
                        "https://www.themuse.com/api/public/jobs",
                        params={"category": category, "level": level, "page": 0, "descending": "true"},
                        timeout=REQUEST_TIMEOUT,
                    )
                    if response.status_code != 200:
                        continue

                    for job in response.json().get("results", []):
                        job_id = f"muse-{job['id']}"
                        if job_id in seen_ids:
                            continue
                        title = job.get("name", "")
                        contents = job.get("contents", "")
                        if not _matches_stack(title + " " + contents):
                            continue
                        seen_ids.add(job_id)
                        locations = [loc.get("name", "") for loc in job.get("locations", [])]
                        jobs.append({
                            "id": job_id,
                            "title": title,
                            "company": job.get("company", {}).get("name", ""),
                            "location": ", ".join(locations) if locations else "Remote / Flexible",
                            "description": _truncate(contents),
                            "url": job.get("refs", {}).get("landing_page", ""),
                            "salary": "",
                            "tags": [level],
                            "source": "The Muse",
                            "posted_date": job.get("publication_date", "")[:10],
                        })
                except requests.RequestException:
                    continue

        return json.dumps(jobs[:20])

# ── 4. JOBICY ────────────────────────────────────────────────────────────────

class JobicySearchTool(BaseTool):
    name: str = "Jobicy Job Search"
    description: str = (
        "Searches Jobicy for remote backend engineering jobs (Java, Python, Node.js, NestJS, FastAPI, Spring Boot). "
        "Returns a JSON list of matching remote-first job postings."
    )
    args_schema: Type[BaseModel] = EmptyInput
