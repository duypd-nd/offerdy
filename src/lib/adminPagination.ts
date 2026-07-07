export const ADMIN_PAGE_SIZE = 20

export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

export function pageRange(page: number, pageSize = ADMIN_PAGE_SIZE) {
  const start = (page - 1) * pageSize
  return { start, end: start + pageSize }
}

export function totalPagesFor(total: number, pageSize = ADMIN_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize))
}

export function paramStr(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  return raw ?? ''
}
