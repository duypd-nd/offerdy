// Ma san pham (#1000, #1001...) — dinh danh ngan de nhac trong caption
// Instagram/TikTok, tim tren /links, va dan short link /d/1000.
//
// Vi sao bat dau tu 1000 chu khong phai 1: ma luon 4 chu so nen doc/go lai khong
// nham lan, va khong bi doc thanh so thu tu cot "#" trong bang /admin/deals (cot
// do la vi tri hien thi, doi theo sort/loc/phan trang — KHONG phai ma san pham).
export const DEAL_CODE_START = 1000

/** 1000 -> "#1000". Deal chua co ma -> null (de callsite an phan hien thi). */
export function formatDealCode(code?: number | null): string | null {
  return typeof code === 'number' && Number.isFinite(code) ? `#${code}` : null
}

/**
 * Doc o tim kiem / URL: "1000", "#1000", " #1000 " -> 1000.
 * Bat ky thu gi khac (co chu, co dau cach giua) -> null.
 * Gioi han 9 chu so de chuoi so dai bat thuong khong thanh Number khong an toan.
 */
export function parseDealCode(input: string): number | null {
  const m = input.trim().match(/^#?\s*(\d{1,9})$/)
  if (!m) return null
  const n = Number(m[1])
  return n > 0 ? n : null
}
