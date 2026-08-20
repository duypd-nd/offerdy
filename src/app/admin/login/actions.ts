'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { verifyPassword, landingPath } from '@/lib/adminAuth'
import { findByEmail, startSession, endSession, vaultPepper } from '@/lib/adminSession'
import { readVault, writeVault } from '@/lib/adminVault'
import { missingAuthConfig } from '@/lib/adminConfig'

export type LoginState = { error?: string }

/**
 * Chan do mat khau bang cach dem theo dia chi IP, giu trong bo nho tien trinh.
 *
 * ⚠️ NOI RO GIOI HAN: bo nho tien trinh khong dung chung giua cac may chu, va
 * mat khi ham ngu. Voi mot he thong vai nguoi dung thi no van chan duoc kieu do
 * lien tuc — thu ma truoc day KHONG CO GI chan (Basic Auth cu khong dem lan
 * thu, da ghi trong TODO tu 2026-07). Muon chan chac tay thi phai co kho dung
 * chung (Redis/KV), va do la mot mon do khac chua co trong du an.
 */
const attempts = new Map<string, { n: number; until: number }>()
const MAX_ATTEMPTS = 8
const WINDOW_MS = 10 * 60 * 1000

function tooManyAttempts(key: string, now: number): boolean {
  const rec = attempts.get(key)
  if (!rec) return false
  if (now > rec.until) { attempts.delete(key); return false }
  return rec.n >= MAX_ATTEMPTS
}

function noteFailure(key: string, now: number) {
  const rec = attempts.get(key)
  if (!rec || now > rec.until) attempts.set(key, { n: 1, until: now + WINDOW_MS })
  else rec.n += 1
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const missing = missingAuthConfig()
  if (missing.length) {
    // Noi ro THIEU CAI GI. "Chua cau hinh" chung chung cho bon nguyen nhan khac
    // nhau la dung loi da tra hoc phi voi GA4 va Search Console.
    return { error: `Hệ thống chưa cấu hình xong. Còn thiếu: ${missing.join(', ')}` }
  }

  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '')
  if (!email || !password) return { error: 'Nhập cả email và mật khẩu.' }

  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now()
  if (tooManyAttempts(ip, now)) {
    return { error: 'Sai quá nhiều lần. Thử lại sau 10 phút.' }
  }

  const user = await findByEmail(email)
  const pepper = vaultPepper() ?? ''

  // ⚠️ Mot thong bao duy nhat cho MOI truong hop that bai — email khong ton tai,
  // sai mat khau, tai khoan bi tat. Tach ra la tang khong cho ke do mot cong cu
  // kiem tra email nao co that.
  const fail = () => { noteFailure(ip, now); return { error: 'Email hoặc mật khẩu không đúng.' } }

  if (!user || !user.active || !user.passwordHash) return fail()
  if (!verifyPassword(password, user.passwordHash, pepper)) return fail()

  attempts.delete(ip)
  await startSession(user)

  try {
    const { users, rev, unreadable } = await readVault()
    if (!unreadable) {
      await writeVault(
        users.map(u => (u.id === user.id ? { ...u, lastLoginAt: new Date().toISOString() } : u)),
        rev
      )
    }
  } catch {
    // Ghi moc dang nhap that bai khong duoc phep chan viec dang nhap
  }

  // ⚠️ Chi nhan duong dan noi bo. Khong loc thi `?next=https://ke-gia-mao...`
  // bien trang dang nhap cua chinh minh thanh mot buoc chuyen huong dang tin.
  const safeNext = next.startsWith('/admin') && !next.startsWith('//') ? next : landingPath(user.role)
  redirect(safeNext)
}

export async function logout() {
  await endSession()
  redirect('/admin/login')
}
