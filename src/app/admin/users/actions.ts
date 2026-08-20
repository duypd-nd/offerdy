'use server'

import { revalidatePath } from 'next/cache'
import { randomUUID } from 'node:crypto'
import { requireOwner, vaultPepper } from '@/lib/adminSession'
import { readVault, writeVault, type StoredUser } from '@/lib/adminVault'
import { hashPassword, isRole, MIN_PASSWORD_LENGTH } from '@/lib/adminAuth'

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

  const next = users.map(u => (u.id === id ? { ...u, role } : u))
  if (next.length === users.length && !users.some(u => u.id === id)) {
    return { ok: false, error: 'Không tìm thấy tài khoản.' }
  }
  const res = await writeVault(next, rev)
  if (!res.ok) return { ok: false, error: res.error }
  revalidatePath('/admin/users')
  return { ok: true, message: 'Đã đổi vai.' }
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

  const res = await writeVault(users.map(u => (u.id === id ? { ...u, active } : u)), rev)
  if (!res.ok) return { ok: false, error: res.error }
  revalidatePath('/admin/users')
  return { ok: true, message: active ? 'Đã bật lại tài khoản.' : 'Đã vô hiệu hoá tài khoản.' }
}

export async function resetPassword(id: string, password: string): Promise<ActionResult> {
  await requireOwner()
  const pwErr = checkPassword(password)
  if (pwErr) return { ok: false, error: pwErr }
  const pepper = vaultPepper()
  if (!pepper) return { ok: false, error: 'Thiếu AUTH_PEPPER.' }

  const loaded = await loadVault()
  if (!loaded.ok) return loaded
  const { users, rev } = loaded.vault
  if (!users.some(u => u.id === id)) return { ok: false, error: 'Không tìm thấy tài khoản.' }

  const res = await writeVault(
    users.map(u => (u.id === id ? { ...u, passwordHash: hashPassword(password, pepper) } : u)),
    rev
  )
  if (!res.ok) return { ok: false, error: res.error }
  revalidatePath('/admin/users')
  // ⚠️ Doi mat khau KHONG cat phien dang mo cua nguoi do — cookie tu ky con hieu
  // luc toi 8 tieng. Muon cat ngay thi vo hieu hoa roi bat lai.
  return { ok: true, message: 'Đã đổi mật khẩu. Phiên đang mở của người đó vẫn chạy tới khi hết hạn (tối đa 8 tiếng) — muốn cắt ngay thì vô hiệu hoá rồi bật lại.' }
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
  revalidatePath('/admin/users')
  return { ok: true, message: 'Đã xoá tài khoản.' }
}

/** Con Chu nao KHAC dang bat, ngoai `excludeId` khong? */
const hasAnotherOwner = (users: StoredUser[], excludeId: string) =>
  users.some(u => u.id !== excludeId && u.role === 'owner' && u.active)
