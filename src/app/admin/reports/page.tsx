import { writeClient } from '@/sanity/writeClient'
import Link from 'next/link'
import { getRecentSentryIssues } from '@/lib/sentryApi'
import { getMerchantHealthData } from '@/sanity/queries'
import { computeStoreHealth, HEALTH_LEVEL_COLOR, type HealthLevel } from '@/lib/merchantHealth'

const LEVEL_LABEL: Record<HealthLevel, string> = {
  'Excellent': 'Xuất sắc', 'Very Good': 'Rất tốt', 'Healthy': 'Tốt',
  'Needs Improvement': 'Cần cải thiện', 'Poor': 'Kém', 'Critical': 'Nguy cấp',
}

export const dynamic = 'force-dynamic'

type OfferClickRow = {
  _id: string
  title: string
  clicks: number
  couponCode?: string
  verified?: boolean
  expiresAt?: string
  storeId?: string
  storeName?: string
  storeSlug?: string
}

type StoreClickRow = {
  id: string
  name: string
  slug?: string
  directClicks: number
}

type ClickLogRow = {
  _createdAt: string
  offerId?: string
  storeId?: string
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export default async function ReportsPage() {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

  const [offers, stores, recentClicks, sentryIssues, healthData] = await Promise.all([
    writeClient.fetch<OfferClickRow[]>(
      `*[_type == "offer" && clicks > 0] {
        _id, title, clicks, couponCode, verified, expiresAt,
        "storeId": store._ref, "storeName": store->name, "storeSlug": store->slug.current
      }`
    ),
    writeClient.fetch<StoreClickRow[]>(
      `*[_type == "store"] { "id": _id, name, "slug": slug.current, "directClicks": coalesce(clicks, 0) }`
    ),
    writeClient.fetch<ClickLogRow[]>(
      `*[_type == "click" && _createdAt >= $thirtyDaysAgo] {
        _createdAt, "offerId": offer._ref, "storeId": coalesce(store._ref, offer->store._ref)
      }`,
      { thirtyDaysAgo }
    ),
    getRecentSentryIssues(10),
    getMerchantHealthData(),
  ])

  const healthScores = healthData.map(computeStoreHealth)
  const avgHealth = healthScores.length ? Math.round(healthScores.reduce((sum, h) => sum + h.overall, 0) / healthScores.length) : 0
  const criticalStores = healthData
    .map((s, i) => ({ store: s, health: healthScores[i] }))
    .filter(({ health }) => health.level === 'Critical' || health.level === 'Poor')
    .sort((a, b) => a.health.overall - b.health.overall)
    .slice(0, 5)
  const bestStores = healthData
    .map((s, i) => ({ store: s, health: healthScores[i] }))
    .sort((a, b) => b.health.overall - a.health.overall)
    .slice(0, 5)
  const brokenLinkOffers = healthData.reduce((sum, s) => sum + (s.offerStats.linkChecked - s.offerStats.linkOk), 0)
  const missingContentStores = healthData.filter(s => !s.hasDescription || s.faqCount < 3).length

  const todayCount = recentClicks.filter(c => c._createdAt >= startOfToday).length
  const sevenDayCount = recentClicks.filter(c => c._createdAt >= sevenDaysAgo).length
  const thirtyDayCount = recentClicks.length
  const allTimeCount = offers.reduce((sum, o) => sum + o.clicks, 0) + stores.reduce((sum, s) => sum + s.directClicks, 0)

  const topOffers = [...offers].sort((a, b) => b.clicks - a.clicks).slice(0, 100)

  const storeTotals = new Map<string, { name: string; slug?: string; clicks: number }>()
  for (const s of stores) {
    storeTotals.set(s.id, { name: s.name, slug: s.slug, clicks: s.directClicks })
  }
  for (const o of offers) {
    if (!o.storeId) continue
    const entry = storeTotals.get(o.storeId)
    if (entry) entry.clicks += o.clicks
  }
  const topStores = [...storeTotals.values()]
    .filter(s => s.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 100)

  // ── 7 ngày qua: top offer theo click log ──
  const offerById = new Map(offers.map(o => [o._id, o]))
  const sevenDayOfferCounts = new Map<string, number>()
  for (const c of recentClicks) {
    if (c._createdAt < sevenDaysAgo || !c.offerId) continue
    sevenDayOfferCounts.set(c.offerId, (sevenDayOfferCounts.get(c.offerId) ?? 0) + 1)
  }
  const topOffers7d = [...sevenDayOfferCounts.entries()]
    .map(([offerId, clicks]) => ({ offer: offerById.get(offerId), clicks }))
    .filter((r): r is { offer: OfferClickRow; clicks: number } => !!r.offer)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20)

  // ── 30 ngày qua: top store theo click log ──
  const storeById = new Map(stores.map(s => [s.id, s]))
  const thirtyDayStoreCounts = new Map<string, number>()
  for (const c of recentClicks) {
    if (!c.storeId) continue
    thirtyDayStoreCounts.set(c.storeId, (thirtyDayStoreCounts.get(c.storeId) ?? 0) + 1)
  }
  const topStores30d = [...thirtyDayStoreCounts.entries()]
    .map(([storeId, clicks]) => ({ store: storeById.get(storeId), clicks }))
    .filter((r): r is { store: StoreClickRow; clicks: number } => !!r.store)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20)

  // ── Offer có click nhưng cần chú ý ──
  const needsAttention = offers
    .filter(o => o.verified === false || (o.expiresAt && daysUntil(o.expiresAt) <= 7))
    .sort((a, b) => b.clicks - a.clicks)

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Báo cáo Click</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
          Lượt click vào link affiliate (Get Code / Get Deal / Visit Website)
        </p>
      </div>

      {/* ── Platform Health (Daily Report) ── */}
      {healthData.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 700, color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>📈 Platform Health — {healthData.length} store</span>
              <Link href="/admin/merchant-health" style={{ fontSize: 12, color: '#16a34a', textDecoration: 'underline' }}>Xem chi tiết →</Link>
            </div>
            <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: HEALTH_LEVEL_COLOR[avgHealth >= 80 ? 'Healthy' : avgHealth >= 60 ? 'Poor' : 'Critical'] }}>{avgHealth}</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>Điểm TB</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>{brokenLinkOffers} offer link hỏng</div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{missingContentStores} store thiếu nội dung</div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>⚠️ Cần chú ý nhất</div>
                {criticalStores.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#16a34a' }}>Không có store nào ở mức Poor/Critical</div>
                ) : criticalStores.map(({ store, health }) => (
                  <div key={store.id} style={{ fontSize: 12, color: '#1e293b', marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, color: HEALTH_LEVEL_COLOR[health.level] }}>{health.overall}</span> {store.name}
                    <span style={{ color: '#94a3b8' }}> · {LEVEL_LABEL[health.level]}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 6 }}>✓ Tốt nhất</div>
                {bestStores.map(({ store, health }) => (
                  <div key={store.id} style={{ fontSize: 12, color: '#1e293b', marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, color: HEALTH_LEVEL_COLOR[health.level] }}>{health.overall}</span> {store.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Lỗi production (Sentry) ── */}
      {sentryIssues.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid #fee2e2', background: '#fef2f2',
              fontSize: 13, fontWeight: 700, color: '#dc2626', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>🚨 Lỗi production chưa xử lý ({sentryIssues.length})</span>
              <a href={`https://${process.env.SENTRY_ORG}.sentry.io/issues/`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#dc2626', textDecoration: 'underline' }}>
                Xem tất cả trên Sentry →
              </a>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {sentryIssues.map((issue, i) => (
                  <tr key={issue.id} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : undefined }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: '#1e293b', fontWeight: 500, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <a href={issue.permalink} target="_blank" rel="noopener noreferrer" style={{ color: '#1e293b', textDecoration: 'none' }}>{issue.title}</a>
                      {issue.culprit && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {issue.culprit}</span>}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      Lần cuối: {new Date(issue.lastSeen).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 800, color: '#dc2626', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {issue.count} lần
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Thống kê theo thời gian ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="Hôm nay" value={todayCount} />
        <StatCard label="7 ngày qua" value={sevenDayCount} />
        <StatCard label="30 ngày qua" value={thirtyDayCount} />
        <StatCard label="Tất cả thời gian" value={allTimeCount} highlight />
      </div>

      {/* ── Cần chú ý ── */}
      {needsAttention.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #fef3c7', background: '#fffbeb', fontSize: 13, fontWeight: 700, color: '#92400e' }}>
              ⚠️ Offer có click nhưng cần chú ý ({needsAttention.length})
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {needsAttention.map((o, i) => (
                  <tr key={o._id} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : undefined }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: '#1e293b', fontWeight: 500, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.storeSlug ? (
                        <Link href={`/stores/${o.storeSlug}`} target="_blank" style={{ color: '#1e293b', textDecoration: 'none' }}>{o.title}</Link>
                      ) : o.title}
                      <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {o.storeName}</span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {o.verified === false && <span style={{ color: '#dc2626', fontWeight: 600 }}>Chưa verified</span>}
                      {o.verified === false && o.expiresAt && daysUntil(o.expiresAt) <= 7 && ' · '}
                      {o.expiresAt && daysUntil(o.expiresAt) <= 7 && (
                        <span style={{ color: '#d97706', fontWeight: 600 }}>
                          {daysUntil(o.expiresAt) < 0 ? 'Đã hết hạn' : `Hết hạn sau ${daysUntil(o.expiresAt)} ngày`}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 800, color: '#16a34a', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {o.clicks} click
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <ReportTable
          title="Top Store được click nhiều nhất (tất cả thời gian)"
          emptyText="Chưa có lượt click nào"
          rows={topStores.map(s => ({
            label: s.name,
            href: s.slug ? `/stores/${s.slug}` : undefined,
            clicks: s.clicks,
          }))}
        />
        <ReportTable
          title="Top Offer được click nhiều nhất (tất cả thời gian)"
          emptyText="Chưa có lượt click nào"
          rows={topOffers.map(o => ({
            label: o.title,
            sub: o.storeName,
            href: o.storeSlug ? `/stores/${o.storeSlug}` : undefined,
            clicks: o.clicks,
          }))}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ReportTable
          title="Top Store được click nhiều nhất (30 ngày qua)"
          emptyText="Chưa có lượt click nào trong 30 ngày qua"
          rows={topStores30d.map(({ store, clicks }) => ({
            label: store.name,
            href: store.slug ? `/stores/${store.slug}` : undefined,
            clicks,
          }))}
        />
        <ReportTable
          title="Top Offer được click nhiều nhất (7 ngày qua)"
          emptyText="Chưa có lượt click nào trong 7 ngày qua"
          rows={topOffers7d.map(({ offer, clicks }) => ({
            label: offer.title,
            sub: offer.storeName,
            href: offer.storeSlug ? `/stores/${offer.storeSlug}` : undefined,
            clicks,
          }))}
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? '#f0fdf4' : '#fff',
      border: `1px solid ${highlight ? '#86efac' : '#e5e7eb'}`,
      borderRadius: 12, padding: '14px 16px',
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: highlight ? '#16a34a' : '#0f172a', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
    </div>
  )
}

function ReportTable({ title, rows, emptyText }: {
  title: string
  emptyText: string
  rows: { label: string; sub?: string; href?: string; clicks: number }[]
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 700, color: '#374151' }}>
        {title}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: i > 0 ? '1px solid #f1f5f9' : undefined }}>
              <td style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 28 }}>{i + 1}</td>
              <td style={{ padding: '10px 16px', fontSize: 13, color: '#1e293b', fontWeight: 500, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.href ? (
                  <Link href={r.href} target="_blank" style={{ color: '#1e293b', textDecoration: 'none' }}>{r.label}</Link>
                ) : r.label}
                {r.sub && <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {r.sub}</span>}
              </td>
              <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 800, color: '#16a34a', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {r.clicks}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
