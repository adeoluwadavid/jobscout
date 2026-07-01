export interface Job {
  id: string
  title: string
  company: string
  location: string
  description: string
  url: string
  salary: string
  tags: string[]
  source: string
  posted_date: string
  match_score: number
  match_reasons: string[]
  should_apply: boolean
  is_new: boolean
  found_date: string
}

export interface JobsData {
  last_updated: string
  run_status: string
  total_jobs: number
  new_this_run: number
  jobs: Job[]
}
