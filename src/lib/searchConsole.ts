/**
 * Doc Google Search Console — phia GOOGLE cua site, thu ma GA4 khong noi duoc.
 *
 * VI SAO CAN: do duoc ngay 2026-08-03, trong 30 ngay site nhan **12 phien tu
 * tim kiem tu nhien**. Voi mot site coupon/affiliate thi tim kiem tu nhien CHINH
 * LA mo hinh kinh doanh. GA4 chi noi "12 nguoi da den"; no khong noi duoc trang
 * nao da vao chi muc, xuat hien voi tu khoa gi, hay hien bao nhieu lan ma khong
 * ai bam. Khong co nhung so do thi moi viec viet them noi dung deu la doan mo.
 *
 * Dung CHUNG service account voi GA4 (xem `src/lib/googleAuth.ts`) — nguoi van
 * hanh khong phai khai them khoa nao tren Vercel, chi them mot bien `GSC_SITE_URL`.
 *
 * Chua cau hinh thi tra ve `null`, KHONG phai so 0 — giong het ga4.ts: "chua bat
 * do" va "khong ai tim thay site" la hai chuyen khac han nhau.
 */
import { getGoogleAccessToken, unquote } from '@/lib/googleAuth'

export const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'

export type GscRow = {
  key: string
  clicks: number
  impressions: number
  /** 0..1 */
  ctr: number
  /** vi tri trung binh tren trang ket qua; nho hon la tot hon */
  position: number
}

export type SearchConsoleData = {
  totals: { clicks: number; impressions: number; ctr: number; position: number }
  /** Tu khoa ra nhieu click nhat */
  topQueries: GscRow[]
  /** Trang nhan nhieu click nhat */
  topPages: GscRow[]
  /**
   * Tu khoa dang o vi tri 11-20 — tuc trang 2 cua Google. Day la nhom RE NHAT de
   * cai thien: da co lien quan, chi thieu mot chut de len trang 1, khac han voi
   * viec tao mot trang moi tu con so khong.
   */
  almostPageOne: GscRow[]
  /**
   * Hien nhieu ma khong ai bam. Gan nhu luon la loi tieu de / mo ta, khong phai
   * loi noi dung — sua re va nhanh nhat trong SEO.
   */
  impressionsNoClicks: GscRow[]
  /** So trang KHAC NHAU tung xuat hien tren Google trong ky */
  pagesSeen: number
}

function siteUrl(): string | null {
  return unquote(process.env.GSC_SITE_URL) ?? null
}

export function isSearchConsoleConfigured(): boolean {
  return !!siteUrl() && !!process.env.GA4_CLIENT_EMAIL && !!process.env.GA4_PRIVATE_KEY
}

/**
 * `sites.list` — cac property ma service account nay doc duoc.
 * Dung khi chan doan: 403 khong phan biet duoc "chua cap quyen" voi "sai
 * GSC_SITE_URL", con danh sach nay thi tra loi ngay.
 */
export async function listSearchConsoleSites(now: Date): Promise<string[] | null> {
  const token = await getGoogleAccessToken(GSC_SCOPE, now)
  if (!token) return null
  try {
    const res = await fetch('https://searchconsole.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.siteEntry ?? []).map((s: { siteUrl: string }) => s.siteUrl)
  } catch { return null }
}

type ApiRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }

const toRow = (r: ApiRow): GscRow => ({
  key: r.keys?.[0] ?? '',
  clicks: r.clicks ?? 0,
  impressions: r.impressions ?? 0,
  ctr: r.ctr ?? 0,
  position: r.position ?? 0,
})

/**
 * `startDate`/`endDate` theo ngay, KHONG theo gio: Search Console cham 2-3 ngay
 * so voi thoi gian thuc. Xin du lieu "hom nay" luon tra ve rong, va o giao dien
 * no se trong y het nhu "khong ai tim thay site" — nen ky do luon ket thuc o
 * 3 ngay truoc, va nhan hien thi phai noi ro dieu do.
 */
const LAG_DAYS = 3
const WINDOW_DAYS = 28

function dateRange(now: Date) {
  const end = new Date(now.getTime() - LAG_DAYS * 86400000)
  const start = new Date(end.getTime() - WINDOW_DAYS * 86400000)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: iso(start), endDate: iso(end) }
}

export async function getSearchConsoleData(now: Date): Promise<SearchConsoleData | null> {
  const site = siteUrl()
  if (!site) return null

  const token = await getGoogleAccessToken(GSC_SCOPE, now)
  if (!token) return null

  const { startDate, endDate } = dateRange(now)
  const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`

  async function query(dimensions: string[], rowLimit: number): Promise<ApiRow[] | null> {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, endDate, dimensions, rowLimit }),
        // Search Console chi cap nhat mot lan moi ngay — cache 1 gio la thua tuoi,
        // va API nay co han ngach theo ngay tren tung site.
        next: { revalidate: 3600 },
      })
      if (!res.ok) return null
      return (await res.json()).rows ?? []
    } catch { return null }
  }

  // `dimensions: []` cho ra MOT dong tong. Khong tu cong lai tu top queries:
  // danh sach do bi cat theo rowLimit, va tong cua mot phan khong phai la tong.
  const [totalRows, queryRows, pageRows] = await Promise.all([
    query([], 1),
    query(['query'], 500),
    query(['page'], 500),
  ])
  if (totalRows === null || queryRows === null || pageRows === null) return null

  const t = totalRows[0] ?? {}
  const queries = queryRows.map(toRow)
  const pages = pageRows.map(toRow)

  return {
    totals: {
      clicks: t.clicks ?? 0,
      impressions: t.impressions ?? 0,
      ctr: t.ctr ?? 0,
      position: t.position ?? 0,
    },
    topQueries: [...queries].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 25),
    topPages: [...pages].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 25),
    almostPageOne: queries
      .filter(q => q.position > 10 && q.position <= 20)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20),
    // Nguong 5 luot hien: duoi do thi mot lan khong bam la ngau nhien, khong phai
    // dau hieu tieu de kem — bao ca nhung dong do chi lam loang danh sach.
    impressionsNoClicks: queries
      .filter(q => q.clicks === 0 && q.impressions >= 5)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 20),
    pagesSeen: pages.length,
  }
}
