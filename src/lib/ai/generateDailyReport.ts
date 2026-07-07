import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { writeClient } from '@/sanity/writeClient'
import { getAnthropicClient } from './anthropicClient'
import { getMerchantHealthData, getSeoAuditData, getClickAnalyticsSummary } from '@/sanity/queries'
import { computeStoreHealth } from '@/lib/merchantHealth'
import { getRecentSentryIssues } from '@/lib/sentryApi'
import { auditStores, auditDeals, auditPosts, auditReviews } from '@/lib/seoAudit'

const DailyReportSchema = z.object({
  summary: z.string().describe('2-4 sentences summarizing overall platform health today, in plain language for a non-technical team member'),
  recommendations: z.array(z.string()).min(3).max(5).describe('Prioritized, concrete action items based strictly on the data given — most important first'),
})

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'
export const DAILY_REPORT_ID = 'dailyReport-singleton'

const SYSTEM_PROMPT = `You are an operations analyst for Offerdy, a coupon and deals affiliate website. You write a short daily internal report for the team based on real platform metrics.

You must NEVER invent facts, numbers, or store names not present in the input. Only reference figures and names exactly as given. If a category has zero issues, say so positively — do not manufacture a problem. Recommendations must be concrete and actionable (e.g. "Review and fix broken links for X offers", "Add missing content for stores: A, B, C" using only names given), not generic advice like "keep monitoring performance".

Write in Vietnamese. Tone: concise, professional, like a daily standup summary.`

function buildUserPrompt(data: {
  avgHealthScore: number
  storeCount: number
  criticalStores: { name: string; score: number }[]
  brokenLinkCount: number
  missingContentCount: number
  openErrorCount: number
  topErrors: string[]
  seoIssueCount: number
  seoHighSeverityCount: number
  todayClicks: number
  sevenDayClicks: number
  thirtyDayClicks: number
  topOffers: { title: string; storeName?: string; clicks: number }[]
  needsAttentionCount: number
  zeroClickStoreCount: number
}) {
  return `Platform snapshot for today:
- Total stores: ${data.storeCount}
- Average merchant health score: ${data.avgHealthScore}/100
- Stores at Poor/Critical health level: ${data.criticalStores.length}${data.criticalStores.length ? ' — ' + data.criticalStores.map(s => `${s.name} (${s.score})`).join(', ') : ''}
- Offers with broken affiliate links: ${data.brokenLinkCount}
- Stores missing description/FAQ content: ${data.missingContentCount}
- Unresolved production errors (Sentry): ${data.openErrorCount}${data.topErrors.length ? ' — top: ' + data.topErrors.join('; ') : ''}
- SEO audit issues found: ${data.seoIssueCount} total (${data.seoHighSeverityCount} high severity — missing meta title/description across stores/deals/posts/reviews)
- Affiliate clicks: today ${data.todayClicks}, last 7 days ${data.sevenDayClicks}, last 30 days ${data.thirtyDayClicks}
- Top clicked offers (all-time): ${data.topOffers.length ? data.topOffers.map(o => `${o.title} (${o.storeName ?? 'unknown store'}, ${o.clicks} clicks)`).join('; ') : 'none yet'}
- Offers getting clicks but need attention (unverified or expiring within 7 days): ${data.needsAttentionCount}
- Stores with zero affiliate clicks ever (missed opportunity — may need better placement/content): ${data.zeroClickStoreCount}

Write a short summary and 3-5 prioritized recommendations for the team based only on this data. Include at least one recommendation about click/conversion performance (e.g. protecting top performers, fixing offers that need attention, or investigating zero-click stores) if the data supports it.`
}

export async function generateDailyReport() {
  const healthData = await getMerchantHealthData()
  const scored = healthData.map(s => ({ store: s, health: computeStoreHealth(s) }))
  const avgHealthScore = scored.length ? Math.round(scored.reduce((sum, s) => sum + s.health.overall, 0) / scored.length) : 0
  const criticalStores = scored
    .filter(s => s.health.level === 'Critical' || s.health.level === 'Poor')
    .sort((a, b) => a.health.overall - b.health.overall)
    .slice(0, 5)
    .map(s => ({ name: s.store.name, score: s.health.overall }))
  const brokenLinkCount = healthData.reduce((sum, s) => sum + (s.offerStats.linkChecked - s.offerStats.linkOk), 0)
  const missingContentCount = healthData.filter(s => !s.hasDescription || s.faqCount < 3).length

  const sentryIssues = await getRecentSentryIssues(5)
  const openErrorCount = sentryIssues.length
  const topErrors = sentryIssues.slice(0, 3).map(i => i.title)

  const seoData = await getSeoAuditData()
  const seoIssues = [
    ...auditStores(seoData.stores),
    ...auditDeals(seoData.deals),
    ...auditPosts(seoData.posts),
    ...auditReviews(seoData.reviews),
  ]
  const seoIssueCount = seoIssues.length
  const seoHighSeverityCount = seoIssues.filter(i => i.severity === 'high').length

  const clickAnalytics = await getClickAnalyticsSummary()

  const input = {
    avgHealthScore,
    storeCount: healthData.length,
    criticalStores,
    brokenLinkCount,
    missingContentCount,
    openErrorCount,
    topErrors,
    seoIssueCount,
    seoHighSeverityCount,
    todayClicks: clickAnalytics.todayCount,
    sevenDayClicks: clickAnalytics.sevenDayCount,
    thirtyDayClicks: clickAnalytics.thirtyDayCount,
    topOffers: clickAnalytics.topOffers,
    needsAttentionCount: clickAnalytics.needsAttentionCount,
    zeroClickStoreCount: clickAnalytics.zeroClickStoreCount,
  }

  const response = await getAnthropicClient().messages.parse({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(DailyReportSchema) },
    messages: [{ role: 'user', content: buildUserPrompt(input) }],
  })

  const parsed = response.parsed_output
  if (!parsed) {
    throw new Error(`Daily report generation failed: no parsed output (stop_reason=${response.stop_reason})`)
  }

  await writeClient.createOrReplace({
    _id: DAILY_REPORT_ID,
    _type: 'dailyReport',
    generatedAt: new Date().toISOString(),
    summary: parsed.summary,
    recommendations: parsed.recommendations,
    avgHealthScore,
    criticalStoreCount: criticalStores.length,
    brokenLinkCount,
    missingContentCount,
    openErrorCount,
    seoIssueCount,
    todayClicks: clickAnalytics.todayCount,
    sevenDayClicks: clickAnalytics.sevenDayCount,
    needsAttentionCount: clickAnalytics.needsAttentionCount,
    zeroClickStoreCount: clickAnalytics.zeroClickStoreCount,
    model: MODEL,
  })

  return parsed
}
