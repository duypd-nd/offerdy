/**
 * Hoi Google TUNG URL mot: da vao chi muc chua, bo qua lan cuoi khi nao.
 *
 * VI SAO CAN, khi da co `searchConsole.ts`: hai thu khac nhau han. Bao cao
 * searchAnalytics chi ke nhung trang **da tung xuat hien** trong ket qua tim
 * kiem — mot trang Google chua bao gio nghe noi va mot trang da vao chi muc
 * nhung chua khop truy van nao **trong deu la mot khoang trong**. Do duoc ngay
 * 2026-08-09: 42 bai moi khong co dong nao trong searchAnalytics, va chi khi hoi
 * URL Inspection moi biet ly do that su la `URL is unknown to Google` — Google
 * chua he biet chung ton tai. Hai chan doan do dan toi hai viec khac han nhau.
 *
 * ⚠️ **Han ngach 2000 URL/ngay cho ca site.** Khong duoc goi khi render trang:
 * mot lan mo /admin/search-console ma quet 12 URL thi vai chuc lan mo la het.
 * Nguoi van hanh phai BAM NUT, va client goi mot URL mot lan (xem
 * `IndexStatusClient.tsx`) — vua thay tien do, vua khong bao gio dung mot server
 * action dai co the bi giet giua chung.
 *
 * Chua cau hinh thi tra ve `null`, KHONG phai mang rong — giong `ga4.ts` va
 * `searchConsole.ts`: "chua bat do" va "Google chua thay gi" la hai chuyen khac.
 */
import { getGoogleAccessToken, unquote } from '@/lib/googleAuth'
import { GSC_SCOPE } from '@/lib/searchConsole'

/** Ket luan cua Google cho mot URL. `PASS` = da vao chi muc. */
export type IndexVerdict = 'PASS' | 'FAIL' | 'NEUTRAL' | 'PARTIAL' | 'VERDICT_UNSPECIFIED'

export type UrlIndexStatus = {
  url: string
  verdict: IndexVerdict
  /**
   * Cau nguyen van cua Google, vd `Submitted and indexed`,
   * `Discovered - currently not indexed`, `URL is unknown to Google`.
   * Giu nguyen tieng Anh: day la thuat ngu tra cuu duoc, dich ra se khong
   * tim thay tai lieu nao.
   */
  coverageState: string
  /** `null` = Google CHUA BAO GIO bo toi URL nay. */
  lastCrawlTime: string | null
  robotsTxtState: string | null
  pageFetchState: string | null
  /** Google tu chon canonical khac ta khai la mot loi thuc su — phai hien ra. */
  googleCanonical: string | null
  userCanonical: string | null
  /** Sitemap ma Google noi da dan no toi URL nay. */
  sitemaps: string[]
}

export type UrlInspectResult =
  | ({ ok: true } & UrlIndexStatus)
  | { ok: false; url: string; error: string }

/**
 * Google co dang chon canonical KHAC thu ta khai khong.
 *
 * ⚠️ Phai bo dau `/` cuoi truoc khi so, khong thi trang chu bao dong gia mai mai.
 * Do duoc tren chinh site nay (2026-08-10): Google tra `googleCanonical:
 * "https://www.offerdy.com"` con trang khai `userCanonical:
 * "https://www.offerdy.com/"` — hai chuoi khac nhau, cung mot trang, va URL do
 * dang `verdict: PASS`, tuc hoan toan khoe manh. Mot canh bao do choi tren trang
 * khoe nhat site chi lam nguoi van hanh di sua thu khong hong.
 *
 * Cung bai hoc voi duong tinh gia `z-ram-shop → bag-organizers-shop`: mot phep so
 * sanh phai duoc kiem tren du lieu that truoc khi tin ket qua cua no.
 */
export function canonicalConflict(google: string | null, user: string | null): boolean {
  if (!google || !user) return false
  const norm = (u: string) => u.replace(/\/+$/, '')
  return norm(google) !== norm(user)
}

function siteUrl(): string | null {
  return unquote(process.env.GSC_SITE_URL) ?? null
}

/**
 * Mot URL. Loi tra ve trong ket qua chu khong nem ra ngoai: khi quet ca loat,
 * mot URL hong khong duoc phep giet ca lan quet.
 */
export async function inspectUrl(url: string, now: Date): Promise<UrlInspectResult> {
  const site = siteUrl()
  if (!site) return { ok: false, url, error: 'Chưa cấu hình GSC_SITE_URL' }

  const token = await getGoogleAccessToken(GSC_SCOPE, now)
  if (!token) return { ok: false, url, error: 'Không lấy được token Google' }

  try {
    const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inspectionUrl: url, siteUrl: site }),
      cache: 'no-store',
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      const msg = json?.error?.message ?? `HTTP ${res.status}`
      // 429 dang loi rieng: het han ngach khac han voi sai quyen, va cach xu ly
      // (cho sang mai) cung khac han.
      return { ok: false, url, error: res.status === 429 ? `Hết hạn ngạch hôm nay — ${msg}` : msg }
    }

    const r = json?.inspectionResult?.indexStatusResult
    if (!r) return { ok: false, url, error: 'Google trả về kết quả rỗng' }

    return {
      ok: true,
      url,
      verdict: (r.verdict as IndexVerdict) ?? 'VERDICT_UNSPECIFIED',
      coverageState: r.coverageState ?? '',
      lastCrawlTime: r.lastCrawlTime ?? null,
      robotsTxtState: r.robotsTxtState ?? null,
      pageFetchState: r.pageFetchState ?? null,
      googleCanonical: r.googleCanonical ?? null,
      userCanonical: r.userCanonical ?? null,
      sitemaps: Array.isArray(r.sitemap) ? r.sitemap : [],
    }
  } catch (err) {
    return { ok: false, url, error: err instanceof Error ? err.message : 'Lỗi không rõ' }
  }
}

export type SitemapStatus = {
  path: string
  /** Lan ta nop len Search Console. */
  lastSubmitted: string | null
  /** Lan Google that su TAI ve. `null` = chua bao gio — sitemap vo dung. */
  lastDownloaded: string | null
  errors: number
  warnings: number
  submittedUrls: number
}

/**
 * `sitemaps.list` — mot request, re, nen goi thang khi render trang.
 *
 * ⚠️ `lastDownloaded` moi la con so co nghia, khong phai `lastSubmitted`. Nop
 * mot lan roi de do la du; cai can biet la Google co con quay lai doc khong.
 */
export async function getSitemapStatus(now: Date): Promise<SitemapStatus[] | null> {
  const site = siteUrl()
  if (!site) return null
  const token = await getGoogleAccessToken(GSC_SCOPE, now)
  if (!token) return null

  try {
    const res = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    )
    if (!res.ok) return null
    const json = await res.json()
    const list = Array.isArray(json?.sitemap) ? json.sitemap : []
    return list.map((s: Record<string, unknown>) => ({
      path: String(s.path ?? ''),
      lastSubmitted: (s.lastSubmitted as string) ?? null,
      lastDownloaded: (s.lastDownloaded as string) ?? null,
      errors: Number(s.errors ?? 0),
      warnings: Number(s.warnings ?? 0),
      submittedUrls: Array.isArray(s.contents)
        ? (s.contents as { submitted?: string }[]).reduce((n, c) => n + Number(c.submitted ?? 0), 0)
        : 0,
    }))
  } catch {
    return null
  }
}
