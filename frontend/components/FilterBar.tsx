'use client'

export type Filters = {
  minScore: number
  source: string
  techTag: string
  newOnly: boolean
}

interface Props {
  filters: Filters
  onChange: (f: Filters) => void
  sources: string[]
  techTags: string[]
}

const SCORE_OPTIONS = [
  { label: 'Any score', value: 0 },
  { label: '60%+', value: 60 },
  { label: '70%+', value: 70 },
  { label: '75%+', value: 75 },
  { label: '80%+', value: 80 },
]

export default function FilterBar({ filters, onChange, sources, techTags }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })

  return (
    <div className="flex flex-wrap items-center gap-3 py-3">
      {/* New only toggle */}
      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filters.newOnly}
          onChange={(e) => set({ newOnly: e.target.checked })}
          className="w-4 h-4 rounded border-gray-300 text-blue-600"
        />
        <span className="text-sm font-medium text-gray-700">New only</span>
        {filters.newOnly && (
          <span className="px-1.5 py-0.5 bg-amber-400 text-amber-900 text-xs font-bold rounded">NEW</span>
        )}
      </label>

      {/* Min score */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-gray-500">Score:</span>
        <select
          value={filters.minScore}
          onChange={(e) => set({ minScore: Number(e.target.value) })}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SCORE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Source filter */}
      {sources.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">Source:</span>
          <select
            value={filters.source}
            onChange={(e) => set({ source: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tech tag filter */}
      {techTags.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-500">Tech:</span>
          <select
            value={filters.techTag}
            onChange={(e) => set({ techTag: e.target.value })}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All</option>
            {techTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {/* Reset */}
      {(filters.minScore > 0 || filters.source || filters.techTag || filters.newOnly) && (
        <button
          onClick={() => onChange({ minScore: 0, source: '', techTag: '', newOnly: false })}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
