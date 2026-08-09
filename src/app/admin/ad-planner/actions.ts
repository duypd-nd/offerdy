'use server'

import { updateStore } from '../stores/actions'

/**
 * Chi bon truong kinh te affiliate — KHONG nhan patch tuy y.
 *
 * `updateStore` nhan `Record<string, unknown>` va set thang vao document. Mo ca
 * cua do ra cho mot bang tinh toan la khong can thiet: trang nay chi sua bon o,
 * nen chi cho phep bon khoa. Loc o phia server chu khong phai o client — client
 * la thu nguoi ta sua duoc.
 */
const ALLOWED = ['commissionRate', 'avgOrderValue', 'cookieWindowDays', 'allowsPaidTraffic'] as const

export async function saveStoreEconomics(
  id: string,
  patch: Record<string, unknown>
): Promise<{ ok: boolean; error?: string }> {
  const clean: Record<string, unknown> = {}
  for (const key of ALLOWED) if (key in patch) clean[key] = patch[key]
  if (Object.keys(clean).length === 0) return { ok: false, error: 'Không có trường hợp lệ' }

  try {
    // `updateStore` da xu ly cai bay null/undefined cua server action payload:
    // o trong phai thanh `unset` chu khong phai set null. Xem chu thich o do.
    await updateStore(id, clean)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
