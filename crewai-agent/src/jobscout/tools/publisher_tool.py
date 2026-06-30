import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Type

from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class PublisherInput(BaseModel):
    jobs_json: str = Field(
        ...,
        description=(
            "A JSON string containing the list of ranked and scored job objects to publish. "
            "Each job must have at minimum: id, title, company, location, url, source, "
            "match_score, match_reasons, should_apply."
        )
    )


class JobPublisherTool(BaseTool):
    name: str = "Job Publisher Tool"
    description: str = (
        "Saves the ranked and scored job list to jobs.json. "
        "Automatically deduplicates against the previous run and marks new jobs with is_new=true. "
        "Call this once with the complete list of matched jobs."
    )
    args_schema: Type[BaseModel] = PublisherInput

    def _run(self, jobs_json: str) -> str:
        output_path = Path(os.getenv("JOBS_OUTPUT_PATH", ""))

        if not output_path or not str(output_path).strip():
            return "Error: JOBS_OUTPUT_PATH environment variable is not set."

        # parse incoming jobs
        try:
            incoming_jobs: list[dict] = json.loads(jobs_json)
        except json.JSONDecodeError as e:
            return f"Error: Could not parse jobs_json — {e}"

        if not isinstance(incoming_jobs, list):
            return "Error: jobs_json must be a JSON array."

        # load previous run to get known IDs for dedup + is_new flagging
        previous_ids: set[str] = set()
        if output_path.exists():
            try:
                with output_path.open() as f:
                    previous_data = json.load(f)
                previous_ids = {job["id"] for job in previous_data.get("jobs", []) if "id" in job}
            except (json.JSONDecodeError, KeyError):
                previous_ids = set()

        # deduplicate incoming jobs by id, stamp found_date and is_new
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        seen: set[str] = set()
        cleaned: list[dict] = []

        for job in incoming_jobs:
            job_id = job.get("id", "")
            if not job_id or job_id in seen:
                continue
            seen.add(job_id)
            job["is_new"] = job_id not in previous_ids
            job.setdefault("found_date", today)
            cleaned.append(job)

        # sort by match_score descending
        cleaned.sort(key=lambda j: j.get("match_score", 0), reverse=True)

        output_data = {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "run_status": "completed",
            "total_jobs": len(cleaned),
            "new_this_run": sum(1 for j in cleaned if j.get("is_new")),
            "jobs": cleaned,
        }

        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w") as f:
            json.dump(output_data, f, indent=2)

        return (
            f"Published {len(cleaned)} jobs to {output_path}. "
            f"{output_data['new_this_run']} are new this week. "
            f"Top match: {cleaned[0]['title']} at {cleaned[0]['company']} "
            f"(score: {cleaned[0].get('match_score', 'N/A')})."
            if cleaned else f"Published 0 jobs to {output_path}."
        )
