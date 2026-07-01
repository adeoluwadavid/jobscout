import { loadJobs } from '@/lib/load-jobs'
import StatusBanner from '@/components/StatusBanner'
import JobList from '@/components/JobList'

export default async function Home() {
  const data = await loadJobs()

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">JobScout</h1>
            <p className="text-xs text-gray-500">AI-matched backend engineering roles · Updated weekly</p>
          </div>
          <span className="text-xs text-gray-400">Java · Node.js · Python</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <StatusBanner data={data} />
        <JobList jobs={data.jobs} />
      </div>
    </main>
  )
}
