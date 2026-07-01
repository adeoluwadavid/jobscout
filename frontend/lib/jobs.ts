import type { Job } from './types'

export function getRegion(location: string): string {
  const loc = location.toLowerCase()
  if (loc.includes('worldwide') || loc.includes('global') || loc.includes('anywhere')) return 'Worldwide'
  if (loc.includes('americas') && (loc.includes('europe') || loc.includes('asia'))) return 'Worldwide'
  if (loc.includes('usa') || loc.includes('us,') || loc === 'us' || loc.includes('canada') || loc.includes('north america')) return 'North America'
  if (loc.includes('europe') || loc.includes('gb') || loc.includes('uk') || loc.includes('germany') || loc.includes('france')) return 'Europe'
  if (loc.includes('apac') || loc.includes('singapore') || loc.includes('india') || loc.includes('asia pacific')) return 'Asia-Pacific'
  if (loc.includes('africa') || loc.includes('nigeria') || loc.includes('kenya') || loc.includes('south africa')) return 'Africa'
  return 'Worldwide'
}

const TARGET_TAGS = new Set(['java', 'python', 'node.js', 'nodejs', 'nestjs', 'fastapi', 'spring', 'react', 'aws', 'docker', 'kubernetes', 'postgresql', 'redis'])

export function getTopTechTags(jobs: Job[]): string[] {
  const counts = new Map<string, number>()
  for (const job of jobs) {
    for (const tag of job.tags) {
      const lower = tag.toLowerCase()
      if (TARGET_TAGS.has(lower)) counts.set(lower, (counts.get(lower) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag)
}
