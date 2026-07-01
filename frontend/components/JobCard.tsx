'use client'

import { useState } from 'react'
import type { Job } from '@/lib/types'
import { getRegion } from '@/lib/jobs'

interface Props {
  job: Job
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-100 text-emerald-800' :
    score >= 70 ? 'bg-blue-100 text-blue-800' :
    score >= 60 ? 'bg-yellow-100 text-yellow-800' :
    'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      {score}% match
    </span>
  )
}

function SourceBadge({ source }: { source: string }) {
  const colors: Record<string, string> = {
    Remotive: 'bg-purple-50 text-purple-700',
    Jobicy: 'bg-indigo-50 text-indigo-700',
    'The Muse': 'bg-pink-50 text-pink-700',
    Adzuna: 'bg-orange-50 text-orange-700',
  }
  const cls = colors[source] ?? 'bg-gray-50 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {source}
    </span>
  )
}

export default function JobCard({ job }: Props) {
  const [showReasons, setShowReasons] = useState(false)
  const region = getRegion(job.location)

  const displayTags = job.tags
    .filter((t) => t.length < 30)
    .slice(0, 6)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {job.is_new && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-400 text-amber-900">
                NEW
              </span>
            )}
            <SourceBadge source={job.source} />
          </div>
          <h3 className="text-base font-semibold text-gray-900 leading-snug">
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
              {job.title}
            </a>
          </h3>
          <p className="text-sm text-gray-600 mt-0.5">
            {job.company} &middot; <span className="text-gray-500">{region}</span>
          </p>
        </div>
        <ScoreBadge score={job.match_score} />
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        {job.salary && job.salary !== 'Not disclosed' && (
          <span className="font-medium text-gray-700">{job.salary}</span>
        )}
        <span>{job.location}</span>
        {job.posted_date && <span>Posted {job.posted_date}</span>}
      </div>

      {/* Tech tags */}
      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {displayTags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      {job.description && (
        <p className="mt-3 text-sm text-gray-500 line-clamp-2">{job.description}</p>
      )}

      {/* Match reasons toggle */}
      {job.match_reasons?.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowReasons((v) => !v)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {showReasons ? 'Hide match reasons ▲' : 'Why this job? ▼'}
          </button>
          {showReasons && (
            <ul className="mt-2 space-y-1">
              {job.match_reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                  <span className="text-emerald-500 mt-0.5">✓</span>
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        {job.should_apply ? (
          <span className="text-xs font-medium text-emerald-600">Recommended to apply</span>
        ) : (
          <span className="text-xs text-gray-400">Low priority</span>
        )}
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
        >
          Apply →
        </a>
      </div>
    </div>
  )
}
