export type SentryIssue = {
  id: string
  shortId: string
  title: string
  culprit: string | null
  permalink: string
  level: string
  count: string
  userCount: number
  firstSeen: string
  lastSeen: string
}

export async function getRecentSentryIssues(limit = 10): Promise<SentryIssue[]> {
  const token = process.env.SENTRY_AUTH_TOKEN
  const org = process.env.SENTRY_ORG
  const project = process.env.SENTRY_PROJECT
  if (!token || !org || !project) return []

  try {
    const res = await fetch(
      `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=is:unresolved&limit=${limit}&sort=freq`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    )
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}
