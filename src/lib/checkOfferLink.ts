/**
 * Ket qua kiem tra mot link ra merchant.
 *
 * `indeterminate` la khac biet quan trong nhat o day: KHONG TRA LOI KIP khac han
 * DA CHET. Truoc day timeout duoc ghi thang thanh `linkStatus: 'broken'`, va da
 * gay hau qua that (do 2026-07-26):
 *
 *   https://cycleaddons.com/            -> 200 trong 559ms
 *   https://cycleaddons.com/?ref=offerdy -> 200 trong 8861ms  <- vuot timeout 8s
 *
 * Shop song hoan toan; chi rieng URL co ma ref cham hon vi GoAffPro chen mot
 * chang ghi nhan. Vay ma 3 offer cua Cycleaddons (store co nhieu click nhat site)
 * bi dan nhan hong: Merchant Health tru diem oan, bao cao bao sai, va nang nhat
 * la van an toan trong resolveOfferUrl se TAT deep-link cua chinh store do.
 *
 * Quy tac tu day: chi ket luan `broken` khi co HTTP status >= 400 thuc su.
 *
 * ⚠️ 2026-08-20 — CUNG LUAT DO AP CHO URL RONG / KHONG PARSE DUOC.
 *
 * Truoc day hai truong hop nay tra `ok: false` ma KHONG kem `indeterminate`,
 * nen moi noi goi deu dong dau `linkStatus: 'broken'`. Do duoc hau qua that:
 * 2 offer dang bat cua Cloud Cushion Slides mang nhan 'broken' trong khi `link`
 * va `productUrl` deu `null` — chung khong co link nao de ma hong. Va nhan do
 * **vinh vien khong tu lanh**, vi `CANDIDATES_QUERY` cua cron doi phai co URL
 * nen khong bao gio quet lai chung.
 *
 * Hau qua o giao dien: bang dieu khien admin bao do "Offer link hong: 2 — mat
 * click that su", trong khi so dung la **0** va nguoi dung khong he bi anh
 * huong (`resolveOfferUrl` lui ve link shop co ma ref, van chay tot).
 *
 * "Khong co gi de kiem" khac han "da kiem va thay chet" — dung y het khac biet
 * giua timeout va 404 o tren. Nen ca hai truong hop nay nay tra
 * `indeterminate: true`: noi goi van thay loi de hien cho nguoi dung, nhung
 * khong duoc ghi de len `linkStatus`.
 */
export type LinkCheckResult = {
  ok: boolean
  status?: number
  error?: string
  /**
   * True = khong ket luan duoc. Dung ghi de linkStatus.
   * Gom: timeout, loi mang, VA "khong co gi de kiem" (URL rong / khong parse
   * duoc / sai protocol).
   */
  indeterminate?: boolean
  /** URL cuoi cung sau khi di het chuoi chuyen huong. Dung cho `landedOnRoot`. */
  finalUrl?: string
}

/**
 * "Chet mem": trang san pham da bi go, va shop lang le day ve TRANG GOC roi tra
 * 200. Khach bam "mua mon nay" den noi thay trang chu, va **khong co gi bao loi**.
 *
 * Do that 2026-08-20 tren 181 deep-link dang bat: 0 cai tra >= 400, nhung 2 cai
 * ket thuc o trang goc cua shop
 * (`clawsienails.com/products/ondine-short-almond-press-on-nails` va
 * `newurtopia.de/products/urtopia-bundle-carbon-1-pro-carbon-fusion`).
 * Luat "chi ket luan broken khi status >= 400" khong the thay chung.
 *
 * Hau qua that: `resolveOfferUrl` co san van an toan — thay `linkStatus ===
 * 'broken'` thi lui ve link shop — nhung no **khong bao gio kich hoat** dung cho
 * truong hop no duoc sinh ra de xu ly.
 *
 * ⚠️ VONG CHAN CO TINH HEP, va day la phan quan trong nhat cua ham nay:
 *   - Chi tinh khi URL ban dau CO duong dan that. Kiem chinh trang goc cua shop
 *     ma bao "bi day ve trang goc" la vo nghia.
 *   - Chi tinh khi dich la duong dan RONG. Nhieu shop day san pham het hang sang
 *     trang DANH MUC — do van la dich hop ly, khach thay hang tuong tu. Gop ca
 *     hai vao la gan nhan hong cho shop dang chay tot, dung thiet hai da xay ra
 *     voi Cycleaddons 26/07.
 *   - Chi ap cho `productUrl`, KHONG ap cho link shop — noi goi tu quyet, xem
 *     `isProduct` trong cron. Link shop von tro ve trang goc la binh thuong.
 */
export function landedOnRoot(originalUrl: string, finalUrl?: string): boolean {
  if (!finalUrl) return false
  let from: URL, to: URL
  try {
    from = new URL(originalUrl)
    to = new URL(finalUrl)
  } catch {
    return false
  }
  const path = (u: URL) => u.pathname.replace(/\/+$/, '')
  // URL ban dau phai tro toi mot trang cu the, khong phai chinh trang goc
  if (path(from) === '') return false
  return path(to) === ''
}

/**
 * Dieu kien GROQ cho "offer co link va link do that su hong".
 *
 * Dat o day vi day la module so huu y nghia cua `linkStatus`. Truoc do dieu kien
 * nay duoc viet lai bang tay o BA cho — huy hieu tren thanh ben, bo loc cua
 * /admin/offers, va co canh bao tren tung dong — nen chung co the lech nhau ma
 * khong ai biet, va nguoi dung se bam vao con so 3 roi thay danh sach 5 dong.
 *
 * Nua sau la thu chan bao dong gia: no loai cac offer khong co link nao. Chung
 * khong the "hong" theo bat ky nghia nao, va nhan 'broken' tren chung la rac tu
 * truoc khi `checkUrl` biet tra `indeterminate` cho URL rong (xem khoi chu thich
 * dau file).
 *
 * ⚠️ PHAI CO CA `defined(...)` LAN `!= ""` — mot minh cai nao cung khong du, va
 * ban dau viet thieu that:
 *   - Chi `coalesce(...) != ""`: trong GROQ, **`null != ""` cho TRUE**, nen offer
 *     co ca hai truong deu null van lot qua. Do that tren du lieu production:
 *     dieu kien thieu `defined()` van dem ra 2 — y het khi khong co chan nao.
 *   - Chi `defined(...)`: chuoi rong `""` van lot.
 * Doi chung sau khi sua, do tren du lieu that 2026-08-20: broken-ma-khong-co-url
 * ra **0**, va offer co link that van giu duoc **415/417**.
 */
export const BROKEN_LINK_GROQ =
  'linkStatus == "broken" && defined(coalesce(productUrl, link)) && coalesce(productUrl, link) != ""'

/**
 * ⚠️ 2026-08-28 — MA CHAN TRUY CAP KHONG PHAI MA "TRANG DA CHET".
 *
 * `401`, `403`, `429` noi ve QUYEN CUA NGUOI GOI, khong noi trang co ton tai hay
 * khong. Mot bo chong bot tra 403 cho `fetch()` trong khi khach that mo bang
 * trinh duyet van vao binh thuong — va luat cu ("status >= 400 la broken") doc
 * thang cai do thanh "link hong".
 *
 * Do that 2026-08-28 tren 8 offer mang nhan `broken`:
 *
 *   Apollo Moda (5 offer)  301 -> www. roi **403 Cloudflare** "Attention Required"
 *   WoWGadgets99 (2 offer) **200**, trang san pham that, 248KB, dung title
 *   Urtopia EU (1 offer)   301 -> newurtopia.de/ (trang goc) = chet mem THAT
 *
 * Tuc 7/8 la bao dong gia, va bao cao AI moi sang van dem chung vao "5 lien ket
 * hong" de nguoi van hanh di sua. Cung dung ho voi Cycleaddons 26/07: mot phep
 * do khong ket luan duoc bi ghi thanh mot ket luan.
 *
 * Vong chan nay CO TINH RONG hon vong `landedOnRoot` ngay tren: no khong doi dau
 * hieu Cloudflare (`cf-ray`), vi Cloudflare dung truoc **ca nhung site tra 403
 * that**, nen dau hieu do khong phan biet duoc gi. Thu phan biet duoc la chinh
 * ma trang thai: 403 = "khong cho ban vao", khong phai 404 = "khong co o day".
 */
const MA_CHAN_TRUY_CAP = new Set([401, 403, 429])

// 15s chu khong phai 8s: link affiliate di qua mot chang chuyen huong cua mang
// affiliate nen cham hon han link thuong. 8s bat dung vao vung nhieu shop that.
const TIMEOUT_MS = 15_000

export async function checkUrl(url: string): Promise<LinkCheckResult> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, indeterminate: true, error: 'URL không hợp lệ' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, indeterminate: true, error: `Protocol không hợp lệ: ${parsed.protocol}` }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal })
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal })
    }
    if (MA_CHAN_TRUY_CAP.has(res.status)) {
      // Ghi kem "Cloudflare" khi thay dau vet, chi de nguoi doc log hieu ngay —
      // KHONG dung no lam dieu kien, xem chu thich o `MA_CHAN_TRUY_CAP`.
      const dauVet = res.headers.get('cf-ray') ? ' (Cloudflare)' : ''
      return {
        ok: false,
        indeterminate: true,
        status: res.status,
        finalUrl: res.url,
        error: `Bị chặn truy cập: HTTP ${res.status}${dauVet} — không kết luận được link sống hay chết`,
      }
    }
    // `res.url` la URL cuoi sau khi di het chuoi chuyen huong (redirect:
    // 'follow'). Noi goi can no de nhan ra "chet mem" — xem `landedOnRoot`.
    return { ok: res.status < 400, status: res.status, finalUrl: res.url }
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    return {
      ok: false,
      indeterminate: true,
      error: isTimeout ? `Timeout (>${TIMEOUT_MS / 1000}s)` : String(err),
    }
  } finally {
    clearTimeout(timeout)
  }
}
