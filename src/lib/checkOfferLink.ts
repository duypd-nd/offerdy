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
 */
export type LinkCheckResult = {
  ok: boolean
  status?: number
  error?: string
  /** True = khong ket luan duoc (timeout/loi mang). Dung ghi de linkStatus. */
  indeterminate?: boolean
}

// 15s chu khong phai 8s: link affiliate di qua mot chang chuyen huong cua mang
// affiliate nen cham hon han link thuong. 8s bat dung vao vung nhieu shop that.
const TIMEOUT_MS = 15_000

export async function checkUrl(url: string): Promise<LinkCheckResult> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, error: 'URL không hợp lệ' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: `Protocol không hợp lệ: ${parsed.protocol}` }
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
