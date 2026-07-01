import fs from 'node:fs'
import path from 'node:path'
import type { JobsData } from './types'

export async function loadJobs(): Promise<JobsData> {
  // In development, read from local file system
  if (process.env.NODE_ENV === 'development') {
    try {
      const filePath = path.resolve(process.cwd(), '..', 'data', 'jobs.json')
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(content)
    } catch {
      // fall through to fetch
    }
  }

  // Production: fetch from GitHub raw or configured URL
  const url =
    process.env.JOBS_DATA_URL ||
    'https://raw.githubusercontent.com/adeoluwadavid/jobscout/main/data/jobs.json'

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error(`Failed to load jobs: ${res.status}`)
  return res.json()
}
