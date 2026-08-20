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
    return { ok: res.status < 400, status: res.status }
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
