import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { readVault, vaultPepper, type StoredUser } from '@/lib/adminVault'
import {
  SESSION_COOKIE, SESSION_TTL_SECONDS,
  signSession, verifySession, isRole,
  type AdminRole, type SessionPayload,
} from '@/lib/adminAuth'

/** Ban dua ra giao dien — KHONG bao gio kem `passwordHash`. */
export type AdminUser = {
  id: string
  email: string
  name: string
  role: AdminRole
  active: boolean
  createdAt: string
  lastLoginAt?: string
}

const strip = (u: StoredUser): AdminUser => {
  // Liet ke tung truong thay vi `delete u.passwordHash`: them mot truong bi mat
  // sau nay se KHONG tu dong ro ri ra giao dien.
  const { id, email, name, role, active, createdAt, lastLoginAt } = u
  return { id, email, name, role, active, createdAt, lastLoginAt }
}

export async function getAdminUser(id: string): Promise<AdminUser | null> {
  const { users } = await readVault()
  const u = users.find(x => x.id === id)
  if (!u || !u.active || !isRole(u.role)) return null
  return strip(u)
}

/** Chi dung khi dang nhap — la cho duy nhat duoc phep cam `passwordHash`. */
export async function findByEmail(email: string): Promise<StoredUser | null> {
  const { users } = await readVault()
  const target = email.trim().toLowerCase()
  return users.find(u => u.email.toLowerCase() === target) ?? null
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const { users } = await readVault()
  return users
    .map(strip)
    .sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email))
}

export { vaultPepper }

// ── Cookie phien ───────────────────────────────────────────────────
export async function startSession(user: { id: string; role: AdminRole }) {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const token = signSession({ uid: user.id, role: user.role, exp }, process.env.AUTH_SECRET ?? '')
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // `secure` tat o localhost: trinh duyet khong gui cookie secure qua http,
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
 * Ham nay doc kho that, nen tai khoan bi vo hieu hoa bi tu choi ngay o lan tai
 * trang ke tiep chu khong phai doi het 8 tieng.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const s = await readSession()
  if (!s) redirect('/admin/login')
  const user = await getAdminUser(s.uid)
  // ⚠️ KHONG goi `endSession()` o day. Ham nay chay trong luc render TRANG, ma
  // Next chi cho sua cookie trong Server Action hoac Route Handler — goi o day
  // lam ca trang do 500. Da mac dung loi do 2026-08-20.
  //
  // Trang dang nhap KIEM LAI VOI KHO truoc khi tu dong dua nguoi dung vao trong;
  // khong the thi cookie con chu ky hop le nhung tai khoan da bi xoa se tao mot
  // **vong lap chuyen huong vo tan** giua /admin va /admin/login.
  if (!user) redirect('/admin/login?reason=revoked')
  // Vai co the da doi sau khi phien duoc ky — luon tin ban trong kho
  return user
}

export async function requireOwner(): Promise<AdminUser> {
  const user = await requireAdmin()
  if (user.role !== 'owner') redirect('/admin?reason=forbidden')
  return user
}
