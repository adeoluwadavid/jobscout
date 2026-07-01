'use client'

import { useState, useMemo } from 'react'
import type { Job } from '@/lib/types'
import { getTopTechTags } from '@/lib/jobs'
import JobCard from './JobCard'
import FilterBar, { type Filters } from './FilterBar'

interface Props {
  jobs: Job[]
}

export default function JobList({ jobs }: Props) {
  const [filters, setFilters] = useState<Filters>({
    minScore: 0,
    source: '',
    techTag: '',
    newOnly: false,
  })

  const sources = useMemo(
    () => [...new Set(jobs.map((j) => j.source))].sort(),
    [jobs]
  )

  const techTags = useMemo(() => getTopTechTags(jobs), [jobs])

  const visible = useMemo(() => {
    return jobs.filter((job) => {
      if (filters.newOnly && !job.is_new) return false
      if (filters.minScore > 0 && job.match_score < filters.minScore) return false
      if (filters.source && job.source !== filters.source) return false
      if (filters.techTag) {
        const hasTech = job.tags.some((t) => t.toLowerCase() === filters.techTag.toLowerCase())
        if (!hasTech) return false
      }
      return true
    })
  }, [jobs, filters])

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={setFilters}
        sources={sources}
        techTags={techTags}
      />

      {visible.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <p className="text-lg">No jobs match your filters.</p>
          <button
            onClick={() => setFilters({ minScore: 0, source: '', techTag: '', newOnly: false })}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
          {visible.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-400 text-right">
        Showing {visible.length} of {jobs.length} jobs
      </p>
    </div>
  )
}
