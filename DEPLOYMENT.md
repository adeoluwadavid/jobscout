# JobScout — Deployment Strategy

## Current Project State

```
jobscout/
├── David_Adewole_Resume.pdf       # Resume used by the agent for job matching
├── crewai-agent/                  # Python backend (CrewAI scaffold, not yet built out)
│   ├── src/jobscout/
│   │   ├── config/agents.yaml     # Placeholder agents (researcher, reporting_analyst)
│   │   ├── config/tasks.yaml      # Placeholder tasks
│   │   ├── crew.py                # Crew wiring — to be replaced
│   │   ├── main.py                # Entry point — to be extended
│   │   └── tools/custom_tool.py  # Placeholder tool — to be replaced
│   ├── knowledge/user_preference.txt  # ⚠️ Contains placeholder data — update with real info
│   ├── .env                       # OPENAI_API_KEY + MODEL=gpt-4
│   └── pyproject.toml             # crewai[tools]==1.14.5a2, Python >=3.10,<3.14
└── frontend/                      # Empty — to be initialised as Next.js
```

The scaffold is the default `crewai create` output. Nothing domain-specific has been built yet.

---

## The Core Deployment Constraint

The CrewAI crew is a **long-running process** (estimated 5–20 minutes per run):
- Agent 1 reads and parses the resume PDF
- Agent 2 queries 4 job APIs
- Agent 3 uses GPT-4 to score each job against the resume
- Agent 4 deduplicates and writes the results

This rules out standard serverless functions (AWS Lambda, Vercel Functions, GCP Cloud Functions), which have hard timeouts of 60 seconds to 15 minutes and are not designed for sustained compute-heavy workloads.

---

## Option A — GitHub Actions + Vercel (Starting Point)

### How it works

```
GitHub Actions (cron: every Monday 8 AM UTC)
    └── Runs the CrewAI crew (Python script)
         └── Calls GPT-4, queries Remotive / Adzuna / The Muse / Jobicy
              └── Writes jobs.json → commits to repo
                                        └── Next.js (Vercel) reads jobs.json
                                             └── Serves job listings to the browser

Manual trigger: POST to GitHub Actions API (workflow_dispatch)
    └── Same flow as above, on demand
```

### Cost

| Component | Service | Monthly Cost |
|---|---|---|
| Frontend | Vercel (Next.js) — Hobby plan | **$0** |
| Weekly crew run | GitHub Actions — 2,000 min/month free (public repo) | **$0** |
| Data store | `jobs.json` committed to repo | **$0** |
| OpenAI GPT-4 | ~1 run/week × ~$0.50–1.50 per run | **~$2–6** |

The only real cost is OpenAI API usage. Everything else is free.

### What replaces FastAPI

There is no persistent backend server in this option. Instead:
- **Next.js API routes** serve as the lightweight API layer
- They read `jobs.json` directly (bundled at build time) or fetch from the raw GitHub URL
- A Next.js API route calls the GitHub Actions API to trigger a manual run

### Why start here

1. **Zero infrastructure to manage.** No servers, no containers, no VPCs, no IAM roles.
2. **Perfect fit for the usage pattern.** The crew runs once a week. There is no reason to keep a server alive 24/7 for a workload that takes 15 minutes per week.
3. **GitHub Actions is built for scheduled scripts.** It handles retries, logs, secrets management, and manual triggers out of the box.
4. **Vercel + Next.js is the fastest path to a working frontend.** The free tier covers personal projects indefinitely.
5. **Lower operational risk while the agent is still being tuned.** You can iterate on the crew logic, watch the Actions logs, and fix issues before adding infrastructure complexity.

### Limitations of Option A

- `jobs.json` is committed to the git repo on every run. This is fine for a personal project but creates a growing commit history. Mitigation: use a separate branch or Vercel KV for storage.
- No real-time API. The frontend reads static data; "manual trigger" dispatches a GitHub Actions run that takes minutes to complete — not instant.
- GitHub Actions free tier is 2,000 minutes/month for private repos (500 min). A 15-minute crew run uses 15 minutes of that budget. Weekly runs = ~60 minutes/month, well within limits.
- Secrets (OpenAI API key, Adzuna API key) live in GitHub Actions secrets — secure but slightly less flexible than a managed secrets store.

### Tech stack for Option A

| Layer | Technology |
|---|---|
| Agent runtime | Python (CrewAI), triggered by GitHub Actions |
| Scheduling | GitHub Actions `schedule` (cron) |
| Manual trigger | GitHub Actions `workflow_dispatch` via API |
| Data store | `jobs.json` in repo (or Vercel KV) |
| Frontend | Next.js on Vercel |
| API layer | Next.js API routes |
| LLM | OpenAI GPT-4 (via `OPENAI_API_KEY` in GH secrets) |

---

## Option B — GCP Cloud Run + Vercel (Upgrade Path)

### How it works

```
Cloud Scheduler (cron: every Monday 8 AM)
    └── Triggers Cloud Run Job
         └── Runs the CrewAI crew (containerised Python)
              └── Writes jobs.json to GCS bucket
                                        └── Backend API (Cloud Run service, scale-to-zero)
                                             └── Reads from GCS, serves REST API
                                                  └── Next.js (Vercel) fetches from API
```

### Backend API options for Option B

Option B introduces a proper backend API layer. Two viable choices:

#### Choice 1 — Spring Boot (Java)

- Demonstrates Java + Spring Boot skills alongside Python/CrewAI — strong portfolio signal
- Cloud Run is container-agnostic; a Spring Boot Docker image deploys identically to FastAPI
- Spring Boot's built-in dependency injection, validation, and OpenAPI support (Springdoc) make the API layer production-grade with minimal boilerplate
- Choose this if showcasing Java expertise is a priority

```
Cloud Run Job (Python/CrewAI) → GCS
    Spring Boot (Cloud Run, scale-to-zero) reads GCS → REST API
        Next.js (Vercel) fetches from Spring Boot
```

#### Choice 2 — FastAPI (Python)

- Single language across the entire backend (Python for both the crew and the API)
- Minimal context-switch — same virtual environment, same dependencies, same Docker base image
- FastAPI's async support, automatic OpenAPI docs, and Pydantic models align naturally with CrewAI's output structures
- Choose this if simplicity and a unified Python stack matter more than language breadth

```
Cloud Run Job (Python/CrewAI) → GCS
    FastAPI (Cloud Run, scale-to-zero) reads GCS → REST API
        Next.js (Vercel) fetches from FastAPI
```

Both choices expose the same endpoints, store data in GCS, and deploy identically to Cloud Run. The decision is made at migration time — the Next.js frontend and the CrewAI crew are unaffected either way.

### Cost

| Component | Service | Monthly Cost |
|---|---|---|
| Frontend | Vercel (Next.js) — Hobby plan | **$0** |
| Weekly crew run | Cloud Run Jobs (~15 min × 4 runs × 2 vCPU) | **~$0.05–0.15** |
| FastAPI API server | Cloud Run (scale-to-zero, 2M req free) | **~$0** |
| Data store | GCS bucket (`jobs.json`, < 1 MB) | **~$0** |
| OpenAI GPT-4 | ~1 run/week × ~$0.50–1.50 per run | **~$2–6** |

Total infrastructure cost outside of OpenAI: effectively **< $1/month**.

### Why this is better long-term

1. **Proper separation of concerns.** The crew, the API, and the storage are independent services.
2. **Real REST API.** FastAPI exposes proper endpoints with filtering, pagination, and status — not static JSON reads.
3. **Scales cleanly.** If you add more job sources, run the crew more frequently, or add users, you only scale the relevant service.
4. **No git history pollution.** `jobs.json` lives in GCS, not the repo.
5. **Easier to add features** — caching, auth, notifications, multi-user support — without rearchitecting.

### When to migrate

Move from Option A to Option B when any of the following is true:
- You want to run the crew more than once a week (GitHub Actions minutes add up)
- You need the frontend to show real-time run status
- You add a second user or want to expose the API publicly
- You need a proper DB (PostgreSQL via Cloud SQL) instead of a flat JSON file

### Tech stack for Option B

| Layer | Technology |
|---|---|
| Agent runtime | Python (CrewAI), containerised with Docker |
| Scheduling | GCP Cloud Scheduler → Cloud Run Job |
| Manual trigger | FastAPI endpoint `POST /api/runs/trigger` |
| Data store | GCS bucket (`jobs.json`) |
| API server | FastAPI on Cloud Run (scale-to-zero) |
| Frontend | Next.js on Vercel |
| LLM | OpenAI GPT-4 (via GCP Secret Manager) |

---

## Side-by-Side Comparison

| | Option A (Start) | Option B (Upgrade) |
|---|---|---|
| Monthly infra cost | $0 | < $1 |
| Setup complexity | Low | Medium |
| Infrastructure to manage | None | Cloud Run, GCS, Cloud Scheduler |
| API layer | Next.js API routes | FastAPI on Cloud Run |
| Data store | `jobs.json` in repo | GCS bucket |
| Manual trigger | GitHub Actions API | FastAPI endpoint |
| Real-time run status | No (polling only) | Yes |
| Scales beyond personal use | No | Yes |
| Long-term maintainability | Lower | Higher |

---

## Migration Path (A → B)

The CrewAI crew code itself does not change. Migration steps:

1. Containerise the crew with Docker
2. Push the image to GCP Artifact Registry
3. Create a Cloud Run Job pointing at the image
4. Replace the GitHub Actions `workflow_dispatch` trigger with Cloud Scheduler
5. Update the crew's `JobPublisherTool` to write to GCS instead of committing to the repo
6. Add FastAPI with `GET /api/jobs`, `GET /api/status`, `POST /api/runs/trigger`
7. Update the Next.js frontend to fetch from the FastAPI URL instead of reading `jobs.json`

Steps 1–4 are infrastructure. Steps 5–7 are code changes. The agent logic, tools, and matching logic carry over unchanged.

---

## Decision

**We are starting with Option A.**

The agent itself has not been built yet. The correct priority is to get the crew working correctly — parsing the resume, searching the job APIs, matching, and publishing — before spending time on infrastructure. Option A removes all deployment friction so development effort can go entirely into the agent. Once the agent is stable and producing good results, migrating to Option B is a contained, well-scoped task.
