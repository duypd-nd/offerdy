/**
 * Chuyen doi thoi gian giua Sanity (ISO UTC) va o nhap `datetime-local` trong admin,
 * neo co dinh vao GIO VIET NAM.
 *
 * Bug da co truoc do o ca 4 man admin (coupon-codes, deals, flash-sales, offers):
 * doc thi `expiresAt.slice(0, 16)` — lay thang gio UTC do vao o nhap;
 * ghi thi `new Date(form.expiresAt).toISOString()` — chuoi datetime-local khong co
 * mui gio nen JS hieu theo gio TRINH DUYET.
 * Hai chieu lech nhau dung bang offset cua may: admin dat 21:00 (VN), luu thanh
 * 14:00Z (dung), nhung mo lai thi o nhap hien 14:00 — bam Luu mot lan nua la thanh
 * 07:00Z. Moi vong sua-luu tru di 7 tieng, va countdown ngoai trang sai theo ma
 * khong co dau hieu gi.
 *
 * Vi sao neo vao gio VN chu khong dung gio trinh duyet: nguoi van hanh o Viet Nam
 * va nghi bang gio Viet Nam. Neo co dinh thi mot gia tri nhap tu may khac, hay khi
 * di cong tac, van hien va luu y het nhau — khong bao gio "tu nhien lech".
 * Nhan "(giờ VN)" tren o nhap la phan khong the thieu cua cach lam nay.
 *
 * Sanity van luu ISO UTC nhu cu. Chi lop hien thi/nhap lieu doi.
 */
export const ADMIN_TIMEZONE = 'Asia/Ho_Chi_Minh'
export const ADMIN_TIMEZONE_LABEL = 'giờ VN'

/** Chenh lech (phut) giua `timeZone` va UTC tai dung thoi diem `date`. */
function offsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date)
  const p: Record<string, string> = {}
  for (const { type, value } of parts) p[type] = value
  // hour12:false co the tra ve "24" cho nua dem o mot so runtime -> %24
  const asUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second)
  )
  return (asUtc - date.getTime()) / 60000
}

/**
 * ISO UTC tu Sanity -> chuoi `YYYY-MM-DDTHH:mm` theo gio VN, do thang vao
 * `<input type="datetime-local">`.
 */
export function isoToAdminInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ADMIN_TIMEZONE, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(d)
  const p: Record<string, string> = {}
  for (const { type, value } of parts) p[type] = value
  const hh = String(Number(p.hour) % 24).padStart(2, '0')
  return `${p.year}-${p.month}-${p.day}T${hh}:${p.minute}`
}

/**
 * Chuoi `YYYY-MM-DDTHH:mm` nguoi dung go (hieu la gio VN) -> ISO UTC de luu Sanity.
 * Chuoi rong tra ve undefined de callsite luu `undefined` thay vi mot ngay sai.
 */
export function adminInputToIso(local?: string | null): string | undefined {
  if (!local) return undefined
  // Bat buoc kiem dinh dang truoc khi parse: trinh phan tich ngay cua V8 rat de
  // dai va nuot ca chuoi vo nghia — `new Date("rac:00Z")` tra ve nam 2000 chu
  // khong phai Invalid Date, tuc mot o nhap hong se lang le thanh mot ngay sai
  // thay vi bi tu choi.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return undefined
  // Doc tam nhu the day la gio UTC, roi tru di offset that tai thoi diem do.
  const naive = new Date(`${local}:00Z`).getTime()
  if (Number.isNaN(naive)) return undefined
  const off = offsetMinutes(new Date(naive), ADMIN_TIMEZONE)
  return new Date(naive - off * 60000).toISOString()
}

/** ISO UTC -> chuoi doc duoc theo gio VN, dung khi HIEN THI trong admin. */
export function formatAdminDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('vi-VN', {
    timeZone: ADMIN_TIMEZONE,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}
