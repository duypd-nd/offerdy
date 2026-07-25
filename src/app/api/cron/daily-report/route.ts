import { generateDailyReport } from '@/lib/ai/generateDailyReport'
import { verifyCronRequest } from '@/lib/cronAuth'

export async function GET(request: Request) {
  const auth = verifyCronRequest(request, 'daily-report')
  if (!auth.ok) return auth.response

  try {
    const report = await generateDailyReport()
    return Response.json({ ok: true, report })
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
