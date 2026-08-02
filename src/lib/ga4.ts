/**
 * Doc luot xem trang tu Google Analytics 4 (Data API v1beta).
 *
 * VI SAO DOC GA4 CHU KHONG TU DEM: GTM da gan san tren moi trang cua site
 * (src/app/layout.tsx), tuc so luot xem DA duoc thu thap roi. Tu dem them mot
 * bo dem thu hai vao Sanity se cho ra hai con so khac nhau cho cung mot cau hoi
 * — dung cai bay ma trang bao cao tung dinh voi "bo dem tren offer" va "log
 * click" (xem PROJECT_CONTEXT muc "Click totals: log vs counters").
 *
 * VI SAO CAN CON SO NAY: bao cao click hien chi co TU SO (bao nhieu luot bam
 * affiliate) ma khong co MAU SO (bao nhieu nguoi da vao site). Khong co no thi
 * "33 click" khong the dich ra tot hay te.
 *
 * Xac thuc bang service account, ky JWT truc tiep bang node:crypto — khong keo
 * them `@google-analytics/data` (goi do rat nang) chi de goi hai endpoint REST.
 *
 * Chua cau hinh thi tra ve `null`, KHONG phai so 0: "chua bat do" va "khong ai
 * vao site" la hai chuyen khac han nhau, va hien 0 se bien cai thu nhat thanh
 * cai thu hai.
 */
import { getGoogleAccessToken, unquote } from '@/lib/googleAuth'

export type Ga4Traffic = {
  today: number
  last7d: number
  last30d: number
  /** Trang duoc xem nhieu nhat trong 30 ngay */
  topPages: { path: string; views: number }[]
}

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

// Danh tinh Google (email + khoa rieng) nam o `src/lib/googleAuth.ts`, dung chung
// voi Search Console. Rieng `GA4_PROPERTY_ID` thi chi GA4 can.
function config() {
  const propertyId = unquote(process.env.GA4_PROPERTY_ID)
  const hasIdentity = !!process.env.GA4_CLIENT_EMAIL && !!process.env.GA4_PRIVATE_KEY
  if (!propertyId || !hasIdentity) return null
  return { propertyId }
}

export function isGa4Configured(): boolean {
  return config() !== null
}

/**
 * Bo `/admin/*` va `/studio/*` khoi moi phep dem — do la nguoi van hanh, khong
 * phai khach. `notExpression` de dung mot lan cho ca hai truy van.
 */
const EXCLUDE_INTERNAL = {
  notExpression: {
    orGroup: {
      expressions: [
        { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/admin' } } },
        { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/studio' } } },
      ],
    },
  },
}

type ReportRow = {
  dimensionValues?: { value: string }[]
  metricValues?: { value: string }[]
}

async function runReport(token: string, propertyId: string, body: unknown): Promise<ReportRow[]> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // GA4 khong cap nhat theo giay va man admin nay hay duoc tai lai. 5 phut
      // du tuoi de ra quyet dinh, ma khong bien moi lan bam F5 thanh hai luot
      // goi ra ngoai (GA4 co han ngach theo token va theo property).
      next: { revalidate: 300 },
    }
  )
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data.rows) ? data.rows : []
}

/**
 * Khong bao gio nem: day la mot o phu tren trang bao cao, mot su co ben Google
 * khong duoc phep lam trang trang ca bao cao click.
 */
export async function getGa4Traffic(now: Date): Promise<Ga4Traffic | null> {
  const c = config()
  if (!c) return null

  try {
    const token = await getGoogleAccessToken(SCOPE, now)
    if (!token) return null

    const [totals, pages] = await Promise.all([
      // ── Loai lưu lượng NOI BO ────────────────────────────────
      // Lan dau doc duoc so lieu that, 6 trong 10 trang duoc xem nhieu nhat la
      // `/admin/*` (stores 125, offers 94, merchant-health 67…). Do la nguoi van
      // hanh bam quanh khu quan tri, khong phai khach. De nguyen thi mau so bi
      // thoi phong va ty le "bam affiliate / luot xem" thap gia — dung cai ma con
      // so nay sinh ra de tra loi.
      //
      // Loc o phia GA4 chu khong tru bot sau khi nhan ve: `topPages` chi lay 10
      // dong dau, nen tru sau se van con trang admin chiem cho cua trang that.
      // `/studio` cung vay — do la Sanity Studio, cung khong phai khach.
      // Nhieu `dateRanges` trong mot request: GA4 tu them chieu `dateRange` va
      // tra ve mot dong cho moi khoang, ten la date_range_0/1/2 theo thu tu duoi.
      runReport(token, c.propertyId, {
        dateRanges: [
          { startDate: 'today', endDate: 'today' },
          { startDate: '6daysAgo', endDate: 'today' },
          { startDate: '29daysAgo', endDate: 'today' },
        ],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: EXCLUDE_INTERNAL,
      }),
      runReport(token, c.propertyId, {
        dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
        dimensionFilter: EXCLUDE_INTERNAL,
      }),
    ])

    // Doc theo TEN khoang chu khong theo vi tri dong: GA4 khong bao dam thu tu
    // dong, va doc nham vi tri se cho ra "hom nay nhieu hon 30 ngay".
    const byRange = new Map<string, number>()
    for (const row of totals) {
      const name = row.dimensionValues?.[0]?.value
      const value = Number(row.metricValues?.[0]?.value ?? 0)
      if (name) byRange.set(name, Number.isFinite(value) ? value : 0)
    }

    return {
      today: byRange.get('date_range_0') ?? 0,
      last7d: byRange.get('date_range_1') ?? 0,
      last30d: byRange.get('date_range_2') ?? 0,
      topPages: pages
        .map(row => ({
          path: row.dimensionValues?.[0]?.value ?? '',
          views: Number(row.metricValues?.[0]?.value ?? 0),
        }))
        .filter(p => p.path && Number.isFinite(p.views)),
    }
  } catch {
    return null
  }
}
