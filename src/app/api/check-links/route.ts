type CheckRequest = { offerId: string; url: string }
type CheckResult = { offerId: string; url: string; ok: boolean; status?: number; error?: string }

async function checkUrl(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, error: 'URL không hợp lệ' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: `Protocol không hợp lệ: ${parsed.protocol}` }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal })
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal })
    }
    return { ok: res.status < 400, status: res.status }
  } catch (err) {
    const message = err instanceof Error && err.name === 'AbortError' ? 'Timeout (>8s)' : String(err)
    return { ok: false, error: message }
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items } = body as { items: CheckRequest[] }

    if (!Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Thieu items' }, { status: 400 })
    }
    if (items.length > 30) {
      return Response.json({ error: 'Toi da 30 link moi lan goi' }, { status: 400 })
    }

    const results: CheckResult[] = await Promise.all(
      items.map(async ({ offerId, url }) => ({ offerId, url, ...(await checkUrl(url)) }))
    )

    return Response.json({ results })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
