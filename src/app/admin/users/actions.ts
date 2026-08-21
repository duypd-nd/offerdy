'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { requireOwner, vaultPepper, startSession } from '@/lib/adminSession'
import { readVault, writeVault, type StoredUser } from '@/lib/adminVault'
import { hashPassword, isRole, MIN_PASSWORD_LENGTH, sessionVersionOf } from '@/lib/adminAuth'
import { recordAudit } from '@/lib/adminAudit'

export type ActionResult = { ok: true; message: string } | { ok: false; error: string }

/**
 * ⚠️ MOI HANH DONG O DAY DEU GOI `requireOwner()` LAI TU DAU.
 *
 * Khong dua vao viec proxy.ts da chan `/admin/users` cho vai khac: mot Server
 * Action co the bi goi tu duong dan khac neu sau nay ai do import no sang trang
 * khac, va vai co the vua bi ha ngay giua phien (cookie van ghi vai cu toi 8
 * tieng). Doc lai kho la mot luot doc nho; mat quyen kiem soat tai khoan la mat
 * tat ca.
 *
 * ⚠️ MOI HAM DEU DOC KHO ROI GHI LAI CA KHOI, kem `rev` de kiem phien ban. Hai
 * Chu sua cung luc thi nguoi sau nhan loi va duoc bao tai lai — khong am tham
 * xoa mat viec cua nguoi truoc.
 */

const checkPassword = (pw: string) =>
  pw.length < MIN_PASSWORD_LENGTH ? `Mật khẩu phải từ ${MIN_PASSWORD_LENGTH} ký tự trở lên.` : null

/**
 * Cat MOI phien dang mo cua mot tai khoan.
 *
 * Cookie phien la chuoi tu ky, khong tra Sanity moi request (do la lua chon co
 * chu dich: mot luot doc Sanity o proxy la ~350ms cong vao tung buoc bam chuot).
 * Nen "cat phien" khong the la xoa cookie tu xa — phai lam cookie do khong con
 * hop le. Tang so nay len la du: `checkSession()` doi chieu no voi kho o moi
 * lan tai trang, va moi cookie mang so cu chet ngay.
 *
 * ⚠️ Truoc 2026-08-21 khong co co che nay: doi mat khau cua mot nguoi KHONG da
 * ho ra, cookie cu con song toi 8 tieng. Cach duy nhat cat ngay la vo hieu hoa
 * roi bat lai — mot meo chi nam trong mot dong thong bao.
 */
const cutSessions = (u: StoredUser): StoredUser => ({ ...u, sessionVersion: sessionVersionOf(u) + 1 })

/**
 * Kho khong doc duoc thi TU CHOI MOI THAY DOI — ghi de len no la xoa sach.
 *
 * Kieu tra ve co khoa phan biet `ok` chu khong phai hai hinh dang khac nhau:
 * TypeScript tu them `error?: undefined` vao nhanh con lai, nen `'error' in x`
 * KHONG thu hep duoc kieu va `x.error` van la `string | undefined`.
 */
type Loaded =
  | { ok: false; error: string }
  | { ok: true; vault: Awaited<ReturnType<typeof readVault>> }

async function loadVault(): Promise<Loaded> {
  const v = await readVault()
  if (v.unreadable) {
    return { ok: false, error: 'Không đọc được kho tài khoản (thường là sai AUTH_PEPPER). Không thay đổi gì để tránh xoá mất dữ liệu.' }
  }
  return { ok: true, vault: v }
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  await requireOwner()

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const name = String(formData.get('name') ?? '').trim()
  const role = String(formData.get('role') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!email.includes('@')) return { ok: false, error: 'Email không hợp lệ.' }
  if (!name) return { ok: false, error: 'Nhập tên người dùng.' }
  if (!isRole(role)) return { ok: false, error: 'Vai không hợp lệ.' }
  const pwErr = checkPassword(password)
  if (pwErr) return { ok: false, error: pwErr }

  const pepper = vaultPepper()
  if (!pepper) return { ok: false, error: 'Thiếu AUTH_PEPPER — không thể tạo tài khoản.' }

  const loaded = await loadVault()
  if (!loaded.ok) return loaded
  const { users, rev } = loaded.vault

  if (users.some(u => u.email.toLowerCase() === email)) {
    return { ok: false, error: 'Email này đã có tài khoản.' }
  }

  const next: StoredUser[] = [...users, {
    id: randomUUID(), email, name, role, active: true,
    passwordHash: hashPassword(password, pepper),
    createdAt: new Date().toISOString(),
  }]

  const res = await writeVault(next, rev)
  if (!res.ok) return { ok: false, error: res.error }
  await recordAudit({ action: 'user.create', target: email, label: `vai ${role}` })
  revalidatePath('/admin/users')
  return { ok: true, message: `Đã tạo tài khoản ${email}.` }
}

export async function setRole(id: string, role: string): Promise<ActionResult> {
  const me = await requireOwner()
  if (!isRole(role)) return { ok: false, error: 'Vai không hợp lệ.' }

  const loaded = await loadVault()
  if (!loaded.ok) return loaded
  const { users, rev } = loaded.vault

  // ⚠️ Khong cho tu ha quyen chinh minh, va khong cho ha Chu CUOI CUNG. Ca hai
  // deu la khoa cua tu ben trong: khong con ai vao duoc /admin/users de sua lai.
  if (id === me.id && role !== 'owner') {
    return { ok: false, error: 'Không thể tự hạ quyền của chính mình. Nhờ một Chủ khác làm việc đó.' }
  }
  if (role !== 'owner' && !hasAnotherOwner(users, id)) {
    return { ok: false, error: 'Đây là Chủ duy nhất. Hãy chỉ định một Chủ khác trước.' }
  }

  // ⚠️ Doi vai phai CAT PHIEN. Cookie mang vai cu, va `proxy.ts` phan quyen dua
  // vao vai trong cookie — nen mot nguoi vua bi ha xuong Chi xem van di lai
  // duoc trong khu Bien tap cho toi khi cookie het han. Ha quyen ma khong cat
  // phien thi viec ha quyen chi co hieu luc tren giay.
  const next = users.map(u => (u.id === id ? cutSessions({ ...u, role }) : u))
  if (next.length === users.length && !users.some(u => u.id === id)) {
    return { ok: false, error: 'Không tìm thấy tài khoản.' }
  }
  const res = await writeVault(next, rev)
  if (!res.ok) return { ok: false, error: res.error }
  await recordAudit({ action: 'user.role', target: emailOf(users, id), label: `thành ${role}` })
  revalidatePath('/admin/users')
  return { ok: true, message: 'Đã đổi vai. Người đó bị đăng xuất ngay, phải đăng nhập lại.' }
}

export async function setActive(id: string, active: boolean): Promise<ActionResult> {
  const me = await requireOwner()
  const loaded = await loadVault()
  if (!loaded.ok) return loaded
  const { users, rev } = loaded.vault

  if (id === me.id && !active) return { ok: false, error: 'Không thể tự vô hiệu hoá tài khoản đang dùng.' }
  if (!active && !hasAnotherOwner(users, id)) {
    return { ok: false, error: 'Đây là Chủ duy nhất. Tắt đi là không còn ai quản trị được.' }
  }

  // ⚠️ Cat phien ca khi VO HIEU HOA lan khi BAT LAI.
  //
  // Vo hieu hoa: `getAdminUser()` da tu choi tai khoan tat, nen phien chet ngay
  // ma khong can so phien ban. Nhung neu khong tang so, cookie cu VAN CON hop
  // le va se song lai nguyen ven vao dung luc bat tai khoan tro lai — ke ho do
  // im lang va rat kho nhin thay.
  const res = await writeVault(users.map(u => (u.id === id ? cutSessions({ ...u, active }) : u)), rev)
  if (!res.ok) return { ok: false, error: res.error }
  await recordAudit({ action: active ? 'user.enable' : 'user.disable', target: emailOf(users, id) })
  revalidatePath('/admin/users')
  return { ok: true, message: active ? 'Đã bật lại tài khoản. Người đó phải đăng nhập lại.' : 'Đã vô hiệu hoá tài khoản.' }
}

export async function resetPassword(id: string, password: string): Promise<ActionResult> {
  const me = await requireOwner()
  const pwErr = checkPassword(password)
  if (pwErr) return { ok: false, error: pwErr }
  const pepper = vaultPepper()
  if (!pepper) return { ok: false, error: 'Thiếu AUTH_PEPPER.' }

  const loaded = await loadVault()
  if (!loaded.ok) return loaded
  const { users, rev } = loaded.vault
  const target = users.find(u => u.id === id)
  if (!target) return { ok: false, error: 'Không tìm thấy tài khoản.' }

  // Doi mat khau la ly do chinh de co co che nay: neu mat khau bi lo, doi mat
  // khau ma khong da phien dang mo ra thi ke dang dung mat khau cu VAN o trong.
  const updated = cutSessions({ ...target, passwordHash: hashPassword(password, pepper) })
  const res = await writeVault(users.map(u => (u.id === id ? updated : u)), rev)
  if (!res.ok) return { ok: false, error: res.error }

  // ⚠️ Doi mat khau CUA CHINH MINH thi cap lai cookie ngay, dung de tu da minh
  // ra. Lam duoc o day vi Server Action duoc phep sua cookie (trong luc render
  // trang thi khong — xem chu thich trong requireAdmin).
  if (id === me.id) await startSession(updated)

  // ⚠️ KHONG ghi mat khau, ke ca do dai. Nhat ky ghi rang viec do da xay ra,
  // khong ghi noi dung cua no.
  await recordAudit({ action: 'user.password', target: target.email, label: id === me.id ? 'của chính mình' : undefined })
  revalidatePath('/admin/users')
  return {
    ok: true,
    message: id === me.id
      ? 'Đã đổi mật khẩu của bạn. Các thiết bị khác đang đăng nhập bằng tài khoản này bị đăng xuất.'
      : 'Đã đổi mật khẩu. Người đó bị đăng xuất ngay trên mọi thiết bị.',
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const me = await requireOwner()
  const loaded = await loadVault()
  if (!loaded.ok) return loaded
  const { users, rev } = loaded.vault

  if (id === me.id) return { ok: false, error: 'Không thể tự xoá tài khoản đang dùng.' }
  if (!hasAnotherOwner(users, id)) return { ok: false, error: 'Đây là Chủ duy nhất, không xoá được.' }

  const next = users.filter(u => u.id !== id)
  if (next.length === users.length) return { ok: false, error: 'Không tìm thấy tài khoản.' }

  const res = await writeVault(next, rev)
  if (!res.ok) return { ok: false, error: res.error }
  await recordAudit({ action: 'user.delete', target: emailOf(users, id) })
  revalidatePath('/admin/users')
  return { ok: true, message: 'Đã xoá tài khoản.' }
}

/** Con Chu nao KHAC dang bat, ngoai `excludeId` khong? */
const hasAnotherOwner = (users: StoredUser[], excludeId: string) =>
  users.some(u => u.id !== excludeId && u.role === 'owner' && u.active)

/** Email de ghi vao nhat ky — de doc hon id, va van dung khi tai khoan da bi xoa. */
const emailOf = (users: StoredUser[], id: string) => users.find(u => u.id === id)?.email ?? id
