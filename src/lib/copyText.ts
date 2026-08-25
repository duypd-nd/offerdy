/**
 * Chep mot chuoi vao clipboard — mot duong duy nhat cho moi nut Copy.
 *
 * Vi sao can mot cho rieng: `navigator.clipboard.writeText` HONG THAT voi khach
 * that, khong phai chuyen ly thuyet.
 *
 *   - Trinh duyet trong app (Instagram / TikTok webview) — dung kenh traffic
 *     duy nhat cua trang nay — thuong tu choi clipboard API.
 *   - Safari chi cho phep khi thao tac duoc tinh la "cu chi nguoi dung"; mot
 *     `await` chen vao truoc do la mat quyen.
 *   - Ngoai HTTPS/localhost thi `navigator.clipboard` khong ton tai.
 *
 * Do 2026-08-25 tren Sentry: 5/11 nut Copy goi `.then()` ma KHONG co `.catch()`.
 * Hong thi khach bam xong **khong thay gi ca** — khong bao da chep, cung khong
 * bao that bai — con Sentry thi nhan mot loi khong ai xu ly. Chinh no la issue
 * `NotAllowedError: Document is not focused` (4 lan tren /coupon-codes).
 *
 * Thu tu: clipboard API -> `execCommand('copy')` (cu, nhung con chay trong
 * webview) -> tra `false` de noi goi tu hoi nguoi dung.
 *
 * ⚠️ KHONG bao gio nem loi. Noi goi chi can doc `true`/`false`.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // roi xuong ban du phong ben duoi
  }

  try {
    if (typeof document === 'undefined') return false
    const ta = document.createElement('textarea')
    ta.value = text
    // `readOnly` de ban phim ao tren dien thoai khong bat len; `fixed` + `opacity`
    // de trang khong bi nhay khi phan tu duoc chon.
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
