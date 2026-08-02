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
import { createSign } from 'node:crypto'

export type Ga4Traffic = {
  today: number
  last7d: number
  last30d: number
  /** Trang duoc xem nhieu nhat trong 30 ngay */
  topPages: { path: string; views: number }[]
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly'

/**
 * Bo dau nhay bao quanh neu co.
 *
 * `.env.local` di qua bo phan tich dotenv cua Next — no BOC dau nhay giup. Bang
 * bien moi truong cua Vercel thi khong: gia tri duoc luu nguyen van. Nen cung
 * mot chuoi `"-----BEGIN..."` dan vao hai noi cho ra hai ket qua khac nhau —
 * chay ngon o may minh, hong tren production, va thong bao loi (OpenSSL
 * "unsupported") khong he nhac gi den dau nhay.
 */
function unquote(value?: string): string | undefined {
  const v = value?.trim()
  if (!v) return undefined
  return v.length >= 2 && ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'"))
    ? v.slice(1, -1)
    : v
}

function config() {
  const propertyId = unquote(process.env.GA4_PROPERTY_ID)
  const clientEmail = unquote(process.env.GA4_CLIENT_EMAIL)
  // Bien moi truong khong giu duoc xuong dong that: khoa rieng dan vao Vercel
  // luon o dang mot dong voi `\n` viet lieu. Khong doi lai thi OpenSSL bao
  // "unsupported" va loi trong nhu la sai khoa.
  const privateKey = unquote(process.env.GA4_PRIVATE_KEY)?.replace(/\\n/g, '\n').trim()
  if (!propertyId || !clientEmail || !privateKey) return null
  return { propertyId, clientEmail, privateKey }
}

export function isGa4Configured(): boolean {
  return config() !== null
}

const b64url = (input: string | Buffer) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

async function getAccessToken(now: Date): Promise<string | null> {
  const c = config()
  if (!c) return null

  const iat = Math.floor(now.getTime() / 1000)
  const claim = {
    iss: c.clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600,
  }
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify(claim))}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(c.privateKey)
  const assertion = `${unsigned}.${b64url(signature)}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  return typeof data.access_token === 'string' ? data.access_token : null
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
    const token = await getAccessToken(now)
    if (!token) return null

    const [totals, pages] = await Promise.all([
      // Nhieu `dateRanges` trong mot request: GA4 tu them chieu `dateRange` va
      // tra ve mot dong cho moi khoang, ten la date_range_0/1/2 theo thu tu duoi.
      runReport(token, c.propertyId, {
        dateRanges: [
          { startDate: 'today', endDate: 'today' },
          { startDate: '6daysAgo', endDate: 'today' },
          { startDate: '29daysAgo', endDate: 'today' },
        ],
        metrics: [{ name: 'screenPageViews' }],
      }),
      runReport(token, c.propertyId, {
        dateRanges: [{ startDate: '29daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
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
