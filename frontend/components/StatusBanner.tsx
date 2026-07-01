'use client'

import { useState } from 'react'
import type { JobsData } from '@/lib/types'

interface Props {
  data: JobsData
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'UTC',
    }).format(new Date(iso)) + ' UTC'
  } catch {
    return iso
  }
}

export default function StatusBanner({ data }: Props) {
  const [triggering, setTriggering] = useState(false)
  const [triggerMsg, setTriggerMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleTrigger() {
    setTriggering(true)
    setTriggerMsg(null)
    try {
      const res = await fetch('/api/trigger', { method: 'POST' })
      const body = await res.json()
      setTriggerMsg({
        ok: res.ok,
        text: res.ok ? 'Job run triggered! Check back in ~5 minutes.' : body.error ?? 'Failed to trigger run.',
      })
    } catch {
      setTriggerMsg({ ok: false, text: 'Network error. Could not reach server.' })
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div className="rounded-xl bg-white border border-gray-200 p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-block w-2 h-2 rounded-full ${data.run_status === 'completed' ? 'bg-emerald-500' : 'bg-yellow-400'}`} />
          <span className="text-sm font-medium text-gray-700">
            {data.total_jobs} jobs &middot; {data.new_this_run} new this week
          </span>
        </div>
        <p className="text-xs text-gray-400">Last updated: {formatDate(data.last_updated)}</p>
        {triggerMsg && (
          <p className={`text-xs font-medium ${triggerMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
            {triggerMsg.text}
          </p>
        )}
      </div>
      <button
        onClick={handleTrigger}
        disabled={triggering}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {triggering ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Triggering…
          </>
        ) : (
          '⚡ Run Now'
        )}
      </button>
    </div>
  )
}
