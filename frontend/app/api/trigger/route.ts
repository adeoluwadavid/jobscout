import { NextResponse } from 'next/server'

export async function POST() {
  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_REPO_OWNER || 'adeoluwadavid'
  const repo = process.env.GITHUB_REPO_NAME || 'jobscout'
  const workflow = 'jobscout.yml'

  if (!token) {
    return NextResponse.json({ error: 'GITHUB_TOKEN not configured.' }, { status: 500 })
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  )

  // GitHub returns 204 No Content on success
  if (res.status === 204) {
    return NextResponse.json({ ok: true })
  }

  const body = await res.json().catch(() => ({}))
  return NextResponse.json(
    { error: (body as { message?: string }).message ?? `GitHub API error ${res.status}` },
    { status: res.status }
  )
}
