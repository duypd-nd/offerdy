import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminClient } from '@/sanity/adminClient'
import {
  SESSION_COOKIE, SESSION_TTL_SECONDS,
  signSession, verifySession, isRole,
  type AdminRole, type SessionPayload,
} from '@/lib/adminAuth'

export type AdminUser = {
  _id: string
  email: string
  name: string
  role: AdminRole
  active: boolean
  lastLoginAt?: string
  createdAt?: string
}

const USER_FIELDS = `_id, email, name, role, "active": coalesce(active, true), lastLoginAt, createdAt`

/**
 * Doc tai khoan tu dataset rieng. Tra `null` khi khong tim thay HOAC da bi tat —
 * noi goi khong duoc phep phan biet hai truong hop do voi nhau.
 */
export async function getAdminUser(id: string): Promise<AdminUser | null> {
  try {
    const u = await adminClient.fetch<AdminUser | null>(
      `*[_type == "adminUser" && _id == $id][0]{ ${USER_FIELDS} }`, { id }
    )
    if (!u || !u.active || !isRole(u.role)) return null
    return u
  } catch { return null }
}

export async function findByEmail(email: string) {
  try {
    return await adminClient.fetch<(AdminUser & { passwordHash?: string }) | null>(
      `*[_type == "adminUser" && lower(email) == $email][0]{ ${USER_FIELDS}, passwordHash }`,
      { email: email.trim().toLowerCase() }
    )
  } catch { return null }
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  try {
    return await adminClient.fetch<AdminUser[]>(
      `*[_type == "adminUser"] | order(role asc, email asc) { ${USER_FIELDS} }`
    )
  } catch { return [] }
}

// ── Cookie phien ───────────────────────────────────────────────────
export async function startSession(user: AdminUser) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const token = signSession({ uid: user._id, role: user.role, exp }, process.env.AUTH_SECRET ?? '')
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // `secure` tat o localhost vi trinh duyet khong gui cookie secure qua http —
    // bat cung o dev nghia la khong dang nhap duoc khi phat trien.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function endSession() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

export async function readSession(): Promise<SessionPayload | null> {
  const jar = await cookies()
  return verifySession(jar.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET ?? '', Math.floor(Date.now() / 1000))
}

/**
 * Kiem tra THAT SU — dung o trang va server action, khong dung o proxy.
 *
 * ⚠️ Vi sao can ca hai lop: cookie phien la chuoi tu ky, khong tra Sanity, nen
 * `proxy.ts` chan duoc rat nhanh nhung **khong biet mot tai khoan vua bi tat**.
 * Ham nay doc Sanity that, nen mot tai khoan bi vo hieu hoa se bi tu choi ngay
 * o lan tai trang ke tiep chu khong phai doi het 8 tieng.
 *
 * Doc thoi gian: cac trang admin von da goi Sanity vai lan, them mot truy van
 * nho khong doi gi; con proxy thi chay truoc MOI request nen phai re.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const s = await readSession()
  if (!s) redirect('/admin/login')
  const user = await getAdminUser(s.uid)
  // ⚠️ KHONG goi `endSession()` o day. Ham nay chay trong lúc render TRANG, ma
  // Next chi cho sua cookie trong Server Action hoac Route Handler — goi o day
  // lam ca trang do 500. Da mac dung loi do 2026-08-20.
  //
  // Cookie cu duoc don o trang dang nhap (qua hanh dong `logout`), va no khong
  // gay hai: `getAdminUser` da tu choi roi. Quan trong hon, trang dang nhap
  // KIEM LAI VOI SANITY truoc khi tu dong dua nguoi dung vao trong — neu khong
  // thi cookie con chu ky hop le nhung tai khoan da bi xoa se tao mot **vong
  // lap chuyen huong vo tan** giua /admin va /admin/login.
  if (!user) redirect('/admin/login?reason=revoked')
  // Vai co the da doi sau khi phien duoc ky — luon tin ban trong Sanity
  return user
}

export async function requireOwner(): Promise<AdminUser> {
  const user = await requireAdmin()
  if (user.role !== 'owner') redirect('/admin?reason=forbidden')
  return user
}
