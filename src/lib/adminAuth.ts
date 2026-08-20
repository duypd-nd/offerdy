/**
 * Lop loi cua dang nhap admin: bam mat khau, ky phien, va bang phan quyen.
 *
 * ⚠️ VI SAO KHONG CAT TAI KHOAN TRONG DATASET `production`: do ngay 2026-08-20,
 * dataset do o che do **public** — goi API khong kem token van tra ve moi tai
 * lieu (107 store, 423 offer, 47 click). De ban bam mat khau o do la phat cho
 * ca internet mot ban sao de mang ve do offline. Tai khoan admin nam trong
 * dataset rieng `admin` (aclMode: private), chi doc duoc khi co token phia may
 * chu — xem `src/sanity/adminClient.ts`.
 *
 * Pepper la lop thu hai, khong phai lop duy nhat: ngay ca khi dataset rieng bi
 * cau hinh nham thanh public, ban bam van vo dung neu khong co `AUTH_PEPPER`.
 *
 * File nay CO Y khong import gi ngoai `node:crypto` — de test chay duoc ma
 * khong can dung Sanity hay Next.
 */
import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto'

// ── Vai ────────────────────────────────────────────────────────────
export const ROLES = ['owner', 'editor', 'viewer'] as const
export type AdminRole = (typeof ROLES)[number]

export const ROLE_LABEL: Record<AdminRole, string> = {
  owner: 'Chủ',
  editor: 'Biên tập',
  viewer: 'Chỉ xem',
}

export const ROLE_DESCRIPTION: Record<AdminRole, string> = {
  owner: 'Toàn quyền, kể cả quản lý người dùng và cấu hình',
  editor: 'Sửa nội dung và vận hành, không đụng cấu hình hay người dùng',
  viewer: 'Chỉ đọc báo cáo, không sửa được gì',
}

export const isRole = (v: unknown): v is AdminRole => ROLES.includes(v as AdminRole)

// ── Bam mat khau ───────────────────────────────────────────────────
//
// scrypt cua node:crypto — khong keo them phu thuoc, va chay duoc o Node runtime
// (Next 16 cho Proxy chay Node, nhung dang nhap dieu gi cung nam trong server
// action nen khong phu thuoc dieu do).
//
// N=2^15 la muc cham vua du (~100ms/lan tren may thuong): du de chan do offline,
// khong du de lam nguoi dung sot ruot. maxmem phai nang tay vi mac dinh 32MB
// khong du cho N=32768.
const SCRYPT_N = 32768
const SCRYPT_r = 8
const SCRYPT_p = 1
const KEY_LEN = 64
const MAXMEM = 128 * SCRYPT_N * SCRYPT_r * 2

/**
 * Tron pepper vao TRUOC khi bam. Dung HMAC chu khong noi chuoi: noi chuoi thi
 * mat khau dai bat thuong co the day pepper ra ngoai gioi han, con HMAC luon cho
 * dau ra co do dai co dinh.
 */
function peppered(password: string, pepper: string): Buffer {
  return createHmac('sha256', pepper).update(password, 'utf8').digest()
}

export function hashPassword(password: string, pepper: string): string {
  if (!pepper) throw new Error('AUTH_PEPPER trống — từ chối băm mật khẩu không có pepper')
  const salt = randomBytes(16)
  const hash = scryptSync(peppered(password, pepper), salt, KEY_LEN, {
    N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p, maxmem: MAXMEM,
  })
  return `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt.toString('base64url')}$${hash.toString('base64url')}`
}

/**
 * ⚠️ So sanh bang `timingSafeEqual`, khong bang `===`. Voi mot he thong mot vai
 * nguoi dung thi ro ri thoi gian la rui ro nho, nhung day la thu khong ton gi de
 * lam dung ngay tu dau va rat de quen mai mai.
 */
export function verifyPassword(password: string, stored: string, pepper: string): boolean {
  if (!pepper || !stored) return false
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [, n, r, p, saltB64, hashB64] = parts
  let expected: Buffer
  try {
    expected = Buffer.from(hashB64, 'base64url')
  } catch { return false }
  try {
    const actual = scryptSync(peppered(password, pepper), Buffer.from(saltB64, 'base64url'), expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: MAXMEM,
    })
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  } catch { return false }
}

// ── Phien dang nhap ────────────────────────────────────────────────
export type SessionPayload = {
  /** _id cua tai lieu adminUser */
  uid: string
  role: AdminRole
  /** Het han, tinh bang giay ke tu epoch */
  exp: number
}

const b64u = (b: Buffer | string) => Buffer.from(b as never).toString('base64url')

/**
 * Cookie phien la mot chuoi tu ky, KHONG tra Sanity moi request.
 *
 * Vi sao: `proxy.ts` chay truoc MOI request vao /admin. Mot luot doc Sanity o do
 * la ~350ms cong vao tung buoc bam chuot — do la tran vat ly da do ngay
 * 2026-08-02, khong toi uu duoc.
 *
 * ⚠️ Doi lai: **tat mot tai khoan khong cat duoc phien dang mo ngay lap tuc.**
 * Nen han phien de NGAN (8 tieng), va moi trang/hanh dong nhay cam deu goi
 * `requireAdmin()` — ham do doc Sanity that va tu choi tai khoan da bi tat. Tuc
 * la: proxy la cong ga re, trang moi la noi kiem that.
 */
export const SESSION_TTL_SECONDS = 8 * 60 * 60
export const SESSION_COOKIE = 'offerdy_admin'

export function signSession(payload: SessionPayload, secret: string): string {
  if (!secret) throw new Error('AUTH_SECRET trống — từ chối ký phiên')
  const body = b64u(JSON.stringify(payload))
  const sig = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

/** Tra ve `null` cho MOI truong hop khong hop le — chu ky sai, het han, hong dinh dang. */
export function verifySession(token: string | undefined, secret: string, nowSeconds: number): SessionPayload | null {
  if (!token || !secret) return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = createHmac('sha256', secret).update(body).digest('base64url')
  // So sanh an toan ve thoi gian; do dai khac nhau thi timingSafeEqual nem loi
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch { return null }
  if (!parsed || typeof parsed !== 'object') return null
  const { uid, role, exp } = parsed as Record<string, unknown>
  if (typeof uid !== 'string' || !uid) return null
  if (!isRole(role)) return null
  if (typeof exp !== 'number' || exp <= nowSeconds) return null
  return { uid, role, exp }
}

// ── Phan quyen theo duong dan ──────────────────────────────────────
//
// ⚠️ VI SAO CHAN THEO DUONG DAN CHU KHONG SUA 27 FILE ACTION: Server Action cua
// Next **POST ve chinh URL cua trang** dang mo. Nen mot vong chan dat o proxy
// theo duong dan chan duoc ca viec xem trang lan viec goi hanh dong tren trang
// do — khong the lach bang cach goi thang endpoint.

/** Chi chu moi vao duoc. Cau hinh va nguoi dung la hai thu doi doi ca he thong. */
const OWNER_ONLY = ['/admin/users', '/admin/config', '/admin/migrate']

/**
 * Chi-xem chi duoc GET, va chi tren cac trang bao cao. Day la DANH SACH CHO PHEP
 * (allowlist), khong phai danh sach cam: them mot trang admin moi thi mac dinh
 * nguoi chi-xem KHONG vao duoc — huong an toan.
 *
 * ⚠️ PHAI TACH "khop dung" VOI "khop ca nhanh con", va day khong phai chuyen
 * hinh thuc. Ban dau `/admin` nam chung trong mot danh sach khop theo tien to,
 * nen `/admin/offers` cung "bat dau bang /admin/" va **vai chi-xem doc duoc
 * toan bo khu quan tri**. Test bat duoc truoc khi kip chay that.
 *
 * Bai hoc de lap lai o bat ky allowlist nao: mot muc la GOC cua cay duong dan
 * thi phep khop theo tien to bien ca danh sach thanh "cho tat".
 */
const VIEWER_EXACT = ['/admin']
const VIEWER_SUBTREE = [
  '/admin/reports',
  '/admin/search-console',
  '/admin/merchant-health',
  '/admin/seo-audit',
  '/admin/ad-planner',
  '/admin/link-checker',
  '/admin/cron-check',
]

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`)

/**
 * `method` co mat vi vai chi-xem duoc phan biet bang no: cung mot trang, GET thi
 * cho, POST thi chan. Server Action luon la POST.
 */
export function canAccess(role: AdminRole, pathname: string, method: string): boolean {
  const isRead = method === 'GET' || method === 'HEAD'

  if (role === 'owner') return true

  if (role === 'editor') return !OWNER_ONLY.some(p => under(pathname, p))

  // viewer
  if (!isRead) return false
  if (VIEWER_EXACT.includes(pathname)) return true
  return VIEWER_SUBTREE.some(p => under(pathname, p))
}

/** Trang dau tien nen dua nguoi dung toi sau khi dang nhap, tuy vai. */
export function landingPath(role: AdminRole): string {
  return role === 'viewer' ? '/admin/reports' : '/admin'
}
