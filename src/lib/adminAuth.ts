/**
 * Lop loi cua dang nhap admin: bam mat khau, ky phien, va bang phan quyen.
 *
 * ⚠️ TAI KHOAN NAM TRONG DATASET CONG KHAI, NHUNG DA MA HOA CA KHOI.
 *
 * Do ngay 2026-08-20: dataset `production` o che do **public** — goi API khong
 * kem token van tra ve moi tai lieu (107 store, 423 offer, 47 click). Dataset
 * **rieng tu** la tinh nang tra phi, goi hien tai khong co (Sanity bao thang:
 * "Private datasets are not available on your current plan").
 *
 * Nen ca danh sach tai khoan nam trong MOT tai lieu, ma hoa AES-256-GCM bang
 * khoa dan xuat tu `AUTH_PEPPER` — xem `src/lib/adminVault.ts` va
 * `src/lib/adminCrypto.ts`. Nguoi la tai duoc tai lieu do nhung chi thay chuoi
 * rac: khong email, khong vai, khong ban bam.
 *
 * Pepper van giu nguyen vai tro cua no o day: bam mat khau la lop trong cung,
 * doc lap voi viec khoi du lieu co duoc ma hoa hay khong.
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

/**
 * Do dai mat khau toi thieu — MOT cho duy nhat.
 *
 * Truoc do con so nay duoc go tay o SAU cho (kiem tra phia may chu, thuoc tinh
 * `minLength` cua o nhap, chu goi y trong o, chu trong hop thoai doi mat khau,
 * va hai cho trong `scripts/create-admin.mjs`). Sau cho go tay la sau cho de
 * lech nhau: doi mot cho thi o nhap cho qua ma may chu tu choi, va nguoi dung
 * khong hieu vi sao.
 *
 * ⚠️ `scripts/create-admin.mjs` la file .mjs nen KHONG import duoc hang nay —
 * no giu ban sao rieng, co chu thich tro nguoc ve day. Doi o day thi doi ca o do.
 */
export const MIN_PASSWORD_LENGTH = 10

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
  /**
   * So phien ban phien luc ky. Doi mat khau / doi vai / vo hieu hoa deu tang so
   * nay trong kho, va cookie mang so cu bi tu choi ngay o lan tai trang ke tiep.
   *
   * ⚠️ Cookie ky TRUOC 2026-08-21 khong co truong nay. Doc thieu thanh 0 chu
   * khong phai tu choi — neu khong, ban deploy dau tien da het moi nguoi ra
   * ngoai ma khong ai hieu vi sao.
   */
  sv: number
}

/** Doc `sessionVersion` cua mot tai khoan; thieu la 0. Mot cho duy nhat. */
export const sessionVersionOf = (u: { sessionVersion?: number }): number =>
  typeof u.sessionVersion === 'number' ? u.sessionVersion : 0

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
  const { uid, role, exp, sv } = parsed as Record<string, unknown>
  if (typeof uid !== 'string' || !uid) return null
  if (!isRole(role)) return null
  if (typeof exp !== 'number' || exp <= nowSeconds) return null
  // ⚠️ Thieu `sv` -> 0, khong phai tu choi. Chu ky van duoc kiem day du o tren,
  // nen day khong phai mot ke ho: no chi la cach doc cookie ky truoc khi co
  // truong nay. Doi chieu voi kho la viec cua `adminSession.ts`.
  return { uid, role, exp, sv: typeof sv === 'number' ? sv : 0 }
}

// ── Phan quyen theo duong dan ──────────────────────────────────────
//
// ⚠️ VI SAO CHAN THEO DUONG DAN CHU KHONG SUA 27 FILE ACTION: Server Action cua
// Next **POST ve chinh URL cua trang** dang mo. Nen mot vong chan dat o proxy
// theo duong dan chan duoc ca viec xem trang lan viec goi hanh dong tren trang
// do — khong the lach bang cach goi thang endpoint.

/** Chi chu moi vao duoc. Cau hinh va nguoi dung la hai thu doi doi ca he thong. */
// `/admin/audit` la ho so ve viec lam cua tung nguoi — Bien tap doc duoc ho so
// cua nhau la mot thu khac han voi "ai cung thay minh lam gi".
const OWNER_ONLY = ['/admin/users', '/admin/config', '/admin/migrate', '/admin/audit']

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
/**
 * ⚠️ Dang xuat phai mo cho MOI vai va moi phuong thuc.
 *
 * Do that 2026-08-21: vai chi-xem bi chan moi POST (dung theo thiet ke), ma nut
 * Dang xuat cung la mot POST — nen ho **dang nhap duoc nhung khong the dang
 * xuat**, bam vao chi ra trang loi. Dang xuat khong bao gio duoc phep phu thuoc
 * vao quyen han: no la duong THOAT, khong phai mot hanh dong quan tri.
 */
const ALWAYS_ALLOWED = ['/admin/logout']

export function canAccess(role: AdminRole, pathname: string, method: string): boolean {
  const isRead = method === 'GET' || method === 'HEAD'

  if (ALWAYS_ALLOWED.includes(pathname)) return true

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
