import { writeClient } from '@/sanity/writeClient'
import Link from 'next/link'
import { getRecentSentryIssues } from '@/lib/sentryApi'
import { getMerchantHealthData, getLatestDailyReport } from '@/sanity/queries'
import { computeStoreHealth, HEALTH_LEVEL_COLOR, HEALTH_LEVEL_LABEL as LEVEL_LABEL } from '@/lib/merchantHealth'
import { SOURCE_LABEL, type ShortLinkSource } from '@/lib/shortLinkSource'
import RegenerateButton from './RegenerateButton'

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

type ShortLinkClickRow = {
  _createdAt: string
  code?: number
  source?: ShortLinkSource
  campaign?: string
  dealTitle?: string
  dealSlug?: string
}

type DealShortLinkRow = {
  code?: number
  title: string
  slug?: string
  shortLinkClicks: number
  dealClicks: number
}

// Click affiliate CO gan nguon (cookie do /d/ hoac /g/ dat) — de tinh chuyen doi
// theo tung nguon. Click khong co `source` la khach vao truc tiep bang duong khac
// (Google, go URL), khong thuoc phep tinh nay.
type AttributedClickRow = {
  _createdAt: string
  source: ShortLinkSource
  campaign?: string
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export default async function ReportsPage() {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

  const [offers, stores, recentClicks, allTimeClicks, shortLinkClicks, dealsWithShortLink, attributedClicks, sentryIssues, healthData, dailyReport] = await Promise.all([
    writeClient.fetch<OfferClickRow[]>(
      `*[_type == "offer" && clicks > 0] {
        _id, title, clicks, couponCode, verified, expiresAt,
        "storeId": store._ref, "storeName": store->name, "storeSlug": store->slug.current
      }`
    ),
    writeClient.fetch<StoreClickRow[]>(
      `*[_type == "store"] { "id": _id, name, "slug": slug.current, "directClicks": coalesce(clicks, 0) }`
    ),
    // `kind != "shortlink"`: log mo short link /d/<ma> KHONG phai click affiliate.
    // Gop chung se phong so lieu doanh thu (mo short link chi la vao xem san pham).
    // Click affiliate cu khong co field `kind`, va trong GROQ `null != "shortlink"`
    // la true, nen dieu kien nay giu nguyen toan bo du lieu lich su.
    writeClient.fetch<ClickLogRow[]>(
      `*[_type == "click" && _createdAt >= $thirtyDaysAgo && kind != "shortlink"] {
        _createdAt, "offerId": offer._ref, "storeId": coalesce(store._ref, offer->store._ref)
      }`,
      { thirtyDaysAgo }
    ),
    writeClient.fetch<number>(`count(*[_type == "click" && kind != "shortlink"])`),
    writeClient.fetch<ShortLinkClickRow[]>(
      `*[_type == "click" && kind == "shortlink" && _createdAt >= $thirtyDaysAgo] | order(_createdAt desc) {
        _createdAt, code, source, campaign,
        "dealTitle": deal->title, "dealSlug": deal->slug.current
      }`,
      { thirtyDaysAgo }
    ),
    writeClient.fetch<DealShortLinkRow[]>(
      `*[_type == "deal" && (shortLinkClicks > 0 || dealClicks > 0)] | order(coalesce(shortLinkClicks, 0) desc) {
        code, title, "slug": slug.current,
        "shortLinkClicks": coalesce(shortLinkClicks, 0), "dealClicks": coalesce(dealClicks, 0)
      }`
    ),
    writeClient.fetch<AttributedClickRow[]>(
      `*[_type == "click" && kind != "shortlink" && defined(source) && _createdAt >= $thirtyDaysAgo] {
        _createdAt, source, campaign
      }`,
      { thirtyDaysAgo }
    ),
    getRecentSentryIssues(10),
    getMerchantHealthData(),
    getLatestDailyReport(),
  ])

  // Bao cao AI qua han. 48h chu khong phai 24h: cron chay 1 lan/ngay va Vercel
  // kich hoat trong khoang gio chu khong dung phut, nen 24h se bao dong gia moi
  // khi cron chay tre vai tieng.
  // Dung lai `now` da co o dau ham thay vi Date.now() — trang nay force-dynamic nen
  // no van la thoi diem cua request, va ESLint chan goi ham khong thuan trong render.
  const reportAgeMs = dailyReport?.generatedAt
    ? now.getTime() - new Date(dailyReport.generatedAt).getTime()
    : Infinity
  const reportAgeDays = Math.floor(reportAgeMs / 86400000)
  const reportStale = reportAgeMs > 48 * 3600 * 1000

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
  // "Tat ca thoi gian" phai dem tu CUNG MOT NGUON voi 3 cot kia (click log), khong
  // phai cong bo dem tren offer/store.
  //
  // Bo dem song cung document: xoa mot store la xoa luon so click cua no, trong khi
  // ban ghi `click` van con (reference _weak). Sau dot don ~609 store cu, tong bo
  // dem tut xuong 5 trong khi log 30 ngay van la 21 — bang so lieu tu mau thuan
  // voi chinh no ("tat ca thoi gian" nho hon "30 ngay"). Log la nguon dung cho cau
  // hoi "site nhan bao nhieu click", bo dem chi dung cho "offer/store NAY bao nhieu
  // click" (cac bang xep hang ben duoi).
  const allTimeCount = allTimeClicks

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

  // ── Short link /d/<ma> ──
  // Bo dem tren deal la tong moi thoi gian; log `click` chi giu 30 ngay gan nhat
  // (query o tren) nen cac moc theo thoi gian tinh tu log, con tong tinh tu bo dem.
  const shortLinkToday = shortLinkClicks.filter(c => c._createdAt >= startOfToday).length
  const shortLink7d = shortLinkClicks.filter(c => c._createdAt >= sevenDaysAgo).length
  const shortLink30d = shortLinkClicks.length
  const shortLinkAllTime = dealsWithShortLink.reduce((sum, d) => sum + d.shortLinkClicks, 0)

  const sourceCounts = new Map<ShortLinkSource, number>()
  for (const c of shortLinkClicks) {
    const s = c.source ?? 'other'
    sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1)
  }
  const topSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1])

  const campaignCounts = new Map<string, number>()
  for (const c of shortLinkClicks) {
    if (!c.campaign) continue
    campaignCounts.set(c.campaign, (campaignCounts.get(c.campaign) ?? 0) + 1)
  }
  const topCampaigns = [...campaignCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)

  const topShortLinks = dealsWithShortLink.slice(0, 20)
  const dealMerchantAllTime = dealsWithShortLink.reduce((sum, d) => sum + d.dealClicks, 0)

  // ── Chuyen doi theo nguon (30 ngay) ──
  // Cot XEM = mo short link, cot BAM = click affiliate cua khach den tu nguon do
  // (doc tu cookie gan nguon). Ty le = BAM / XEM: tra loi "Instagram hay TikTok ra
  // don", khong chi "cai nao nhieu luot xem".
  const clicksBySource = new Map<ShortLinkSource, number>()
  for (const c of attributedClicks) {
    clicksBySource.set(c.source, (clicksBySource.get(c.source) ?? 0) + 1)
  }
  const conversionRows = [...new Set([...sourceCounts.keys(), ...clicksBySource.keys()])]
    .map(source => {
      const views = sourceCounts.get(source) ?? 0
      const clicks = clicksBySource.get(source) ?? 0
      return { source, views, clicks, rate: views > 0 ? clicks / views : null }
    })
    // Sap theo so click truoc: nguon RA CLICK dang quan tam hon nguon nhieu luot xem
    .sort((a, b) => b.clicks - a.clicks || b.views - a.views)

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

      {/* ── AI Daily Report — tom tat + de xuat hanh dong, sinh tu dong moi ngay ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          background: reportStale ? '#fffbeb' : '#f0fdf4',
          border: `1px solid ${reportStale ? '#fcd34d' : '#86efac'}`,
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: `1px solid ${reportStale ? '#fde68a' : '#bbf7d0'}`,
            fontSize: 13, fontWeight: 700, color: reportStale ? '#92400e' : '#166534',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          }}>
            <span>{reportStale ? '⚠️' : '🤖'} AI Daily Report</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {dailyReport?.generatedAt && (
                <span style={{ fontSize: 11, fontWeight: 500, color: reportStale ? '#b45309' : '#4d7c5f' }}>
                  Cập nhật {new Date(dailyReport.generatedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <RegenerateButton stale={reportStale} />
            </span>
          </div>

          {/* Bao cao qua han: canh bao TRUOC khi doc noi dung. Bao cao AI viet bang
              giong xac quyet, doc ma khong biet no cu se hanh dong tren so lieu
              cua mot dataset khong con ton tai (da tung: bao cao noi 637 store
              trong khi site chi con 28). */}
          {reportStale && (
            <div style={{ padding: '12px 16px', background: '#fef3c7', borderBottom: '1px solid #fde68a', fontSize: 12.5, color: '#92400e', lineHeight: 1.7 }}>
              <strong>Báo cáo này đã {reportAgeDays} ngày tuổi</strong> — số liệu bên dưới là của thời điểm đó, không phải hôm nay.
              Cron <code>/api/cron/daily-report</code> đáng lẽ chạy mỗi ngày lúc 08:00 (giờ VN); nếu ngày càng cũ thì cron đang không chạy —
              kiểm tra <strong>Vercel → Settings → Cron Jobs</strong> và biến <code>CRON_SECRET</code> ở môi trường Production.
              Bấm <strong>Tạo lại ngay</strong> để có báo cáo đúng hiện tại.
            </div>
          )}

          {!dailyReport?.summary ? (
            <div style={{ padding: 16, fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
              Chưa có báo cáo nào. Bấm <strong>Tạo lại ngay</strong> để sinh báo cáo đầu tiên.
            </div>
          ) : (
            <div style={{ padding: 16 }}>
              <p style={{ fontSize: 14, color: '#14532d', lineHeight: 1.6, margin: '0 0 12px' }}>{dailyReport.summary}</p>
              {dailyReport.recommendations && dailyReport.recommendations.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {dailyReport.recommendations.map((r, i) => (
                    <li key={i} style={{ fontSize: 13, color: '#166534', lineHeight: 1.7 }}>{r}</li>
                  ))}
                </ul>
              )}
              {typeof dailyReport.seoIssueCount === 'number' && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${reportStale ? '#fde68a' : '#bbf7d0'}`, fontSize: 12 }}>
                  <Link href="/admin/seo-audit" style={{ color: reportStale ? '#92400e' : '#166534', fontWeight: 600 }}>
                    🔎 {dailyReport.seoIssueCount} vấn đề SEO Audit — Xem chi tiết →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Thống kê theo thời gian (số liệu chính của báo cáo) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
        <StatCard label="Hôm nay" value={todayCount} />
        <StatCard label="7 ngày qua" value={sevenDayCount} />
        <StatCard label="30 ngày qua" value={thirtyDayCount} />
        <StatCard label="Tất cả thời gian" value={allTimeCount} highlight />
      </div>

      {/* ── Short link /d/<mã> — đo bài đăng mạng xã hội, KHÔNG phải click affiliate ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 700, color: '#374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🔗 Short link <code style={{ background: '#f6f8fb', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>/d/&lt;mã&gt;</code> — lượt mở từ bài đăng</span>
            <Link href="/links" style={{ fontSize: 12, color: '#16a34a', textDecoration: 'underline' }}>Xem /links →</Link>
          </div>

          <div style={{ padding: 16 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.7, marginBottom: 14 }}>
              Đếm riêng, <strong>không cộng vào số click affiliate ở trên</strong> — mở short link chỉ là vào xem sản phẩm, chưa phải bấm sang merchant.
              Bot và trình đọc link-preview (Facebook, WhatsApp, Slack…) đã bị lọc.
              Thêm <code style={{ background: '#f6f8fb', padding: '1px 4px', borderRadius: 3 }}>?s=tên-bài</code> vào cuối link để tách số liệu từng bài đăng.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: shortLinkAllTime > 0 ? 18 : 0 }}>
              <StatCard label="Hôm nay" value={shortLinkToday} />
              <StatCard label="7 ngày qua" value={shortLink7d} />
              <StatCard label="30 ngày qua" value={shortLink30d} />
              <StatCard label="Tất cả thời gian" value={shortLinkAllTime} highlight />
              <StatCard label="Bấm sang merchant" value={dealMerchantAllTime} />
            </div>

            {shortLinkAllTime === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8', paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
                Chưa có lượt mở nào. Dán <code style={{ background: '#f6f8fb', padding: '1px 5px', borderRadius: 4 }}>offerdy.com/d/1000</code> vào caption
                hoặc comment bài đăng — mã của từng sản phẩm xem ở <Link href="/admin/deals" style={{ color: '#16a34a', fontWeight: 600 }}>Quản lý Deal</Link>.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: topCampaigns.length ? '1fr 220px 200px' : '1fr 240px', gap: 20, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
                    <span>Sản phẩm được mở nhiều nhất (tất cả thời gian)</span>
                    <span style={{ color: '#94a3b8', fontWeight: 600 }}>xem ▸ bấm merchant</span>
                  </div>
                  {topShortLinks.map(d => (
                    <div key={d.title} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, marginBottom: 5 }}>
                      <strong style={{ color: '#16a34a', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {d.code ? `#${d.code}` : '—'}
                      </strong>
                      <span style={{ color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {d.slug ? <a href={`/deals/${d.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1e293b', textDecoration: 'none' }}>{d.title}</a> : d.title}
                      </span>
                      <strong style={{ color: '#0f172a', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {d.shortLinkClicks}
                        <span style={{ color: '#cbd5e1', fontWeight: 400 }}>▸</span>
                        <span style={{ color: d.dealClicks > 0 ? '#16a34a' : '#cbd5e1' }}>{d.dealClicks}</span>
                      </strong>
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Nguồn (30 ngày)</div>
                  {topSources.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>Chưa có lượt mở nào trong 30 ngày</div>
                  ) : topSources.map(([source, count]) => (
                    <div key={source} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, marginBottom: 5 }}>
                      <span style={{ color: '#1e293b' }}>{SOURCE_LABEL[source] ?? source}</span>
                      <strong style={{ color: '#0f172a' }}>{count}</strong>
                    </div>
                  ))}
                </div>

                {topCampaigns.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Bài đăng <code style={{ fontWeight: 600 }}>?s=</code> (30 ngày)</div>
                    {topCampaigns.map(([campaign, count]) => (
                      <div key={campaign} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, marginBottom: 5 }}>
                        <span style={{ color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign}</span>
                        <strong style={{ color: '#0f172a', flexShrink: 0 }}>{count}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Chuyển đổi theo nguồn — nguồn nào RA CLICK, không chỉ ra lượt xem ── */}
      {conversionRows.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontSize: 13, fontWeight: 700, color: '#374151' }}>
              📊 Chuyển đổi theo nguồn (30 ngày)
            </div>
            <div style={{ padding: '12px 16px 4px', fontSize: 12, color: '#94a3b8', lineHeight: 1.7 }}>
              <strong>Xem</strong> = mở short link. <strong>Bấm merchant</strong> = click affiliate của khách đến từ nguồn đó
              (gán qua cookie first-party, cửa sổ 7 ngày). Tỷ lệ trả lời &ldquo;Instagram hay TikTok ra đơn&rdquo; — chứ không chỉ cái nào nhiều lượt xem.
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.04em' }}>Nguồn</th>
                  <th style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '.04em' }}>Xem</th>
                  <th style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '.04em' }}>Bấm merchant</th>
                  <th style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '.04em' }}>Tỷ lệ</th>
                </tr>
              </thead>
              <tbody>
                {conversionRows.map(r => (
                  <tr key={r.source} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '9px 16px', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{SOURCE_LABEL[r.source] ?? r.source}</td>
                    <td style={{ padding: '9px 16px', fontSize: 13, color: '#6b7280', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.views}</td>
                    <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: 700, color: r.clicks > 0 ? '#16a34a' : '#cbd5e1', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.clicks}</td>
                    <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: 700, color: '#0f172a', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {/* Khong co luot xem nhung co click = khach vao /g/ truc tiep
                          (bo qua trang deal) — ty le se vo nghia, hien "—" thay vi
                          mot con so tram phan tram gia. */}
                      {r.rate === null ? '—' : `${Math.round(r.rate * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Lỗi production (Sentry) — ưu tiên cao nhất, cần xử lý ngay ── */}
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
