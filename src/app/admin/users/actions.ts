'use server'

import { revalidatePath } from 'next/cache'
import { adminClient } from '@/sanity/adminClient'
import { requireOwner, listAdminUsers, findByEmail } from '@/lib/adminSession'
import { hashPassword, isRole } from '@/lib/adminAuth'

export type ActionResult = { ok: true; message: string } | { ok: false; error: string }

const MIN_PASSWORD = 12

/**
 * ⚠️ MOI HANH DONG O DAY DEU GOI `requireOwner()` LAI TU DAU.
 *
 * Khong dua vao viec proxy.ts da chan `/admin/users` cho vai khac. Hai ly do:
 * mot Server Action co the bi goi tu mot duong dan khac neu sau nay ai do import
 * no sang trang khac, va vai co the vua bi ha ngay giua phien (cookie van con
 * ghi vai cu toi 8 tieng). Doc lai tu Sanity la mot truy van nho; mat quyen
 * kiem soat tai khoan la mat tat ca.
 */

function checkPassword(pw: string): string | null {
  if (pw.length < MIN_PASSWORD) return `Mật khẩu phải từ ${MIN_PASSWORD} ký tự trở lên.`
  return null
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  await requireOwner()

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const name = String(formData.get('name') ?? '').trim()
  const role = String(formData.get('role') ?? '')
  const password = String(formData.get('password') ?? '')

  if (!email || !email.includes('@')) return { ok: false, error: 'Email không hợp lệ.' }
  if (!name) return { ok: false, error: 'Nhập tên người dùng.' }
  if (!isRole(role)) return { ok: false, error: 'Vai không hợp lệ.' }
  const pwErr = checkPassword(password)
  if (pwErr) return { ok: false, error: pwErr }

  const pepper = process.env.AUTH_PEPPER
  if (!pepper) return { ok: false, error: 'Thiếu AUTH_PEPPER — không thể tạo tài khoản.' }

  if (await findByEmail(email)) return { ok: false, error: 'Email này đã có tài khoản.' }

  try {
    await adminClient.create({
      _type: 'adminUser',
      email,
      name,
      role,
      active: true,
      passwordHash: hashPassword(password, pepper),
      createdAt: new Date().toISOString(),
    })
  } catch (err) {
    return { ok: false, error: `Không lưu được: ${String(err).slice(0, 140)}` }
  }
  revalidatePath('/admin/users')
  return { ok: true, message: `Đã tạo tài khoản ${email}.` }
}

export async function setRole(id: string, role: string): Promise<ActionResult> {
  const me = await requireOwner()
  if (!isRole(role)) return { ok: false, error: 'Vai không hợp lệ.' }

  // ⚠️ Khong cho tu ha quyen chinh minh. Chu cuoi cung ha minh xuong "chi xem"
  // la khoa cua tu ben trong: khong con ai vao duoc /admin/users de sua lai.
  if (id === me._id && role !== 'owner') {
    return { ok: false, error: 'Không thể tự hạ quyền của chính mình. Nhờ một Chủ khác làm việc đó.' }
  }
  if (role !== 'owner' && !(await hasAnotherOwner(id))) {
    return { ok: false, error: 'Đây là Chủ duy nhất. Hãy chỉ định một Chủ khác trước.' }
  }

  try {
    await adminClient.patch(id).set({ role }).commit()
  } catch (err) {
    return { ok: false, error: `Không lưu được: ${String(err).slice(0, 140)}` }
  }
  revalidatePath('/admin/users')
  return { ok: true, message: 'Đã đổi vai.' }
}

export async function setActive(id: string, active: boolean): Promise<ActionResult> {
  const me = await requireOwner()

  if (id === me._id && !active) {
    return { ok: false, error: 'Không thể tự vô hiệu hoá tài khoản đang dùng.' }
  }
  if (!active && !(await hasAnotherOwner(id))) {
    return { ok: false, error: 'Đây là Chủ duy nhất. Tắt đi là không còn ai quản trị được.' }
  }

  try {
    await adminClient.patch(id).set({ active }).commit()
  } catch (err) {
    return { ok: false, error: `Không lưu được: ${String(err).slice(0, 140)}` }
  }
  revalidatePath('/admin/users')
  return { ok: true, message: active ? 'Đã bật lại tài khoản.' : 'Đã vô hiệu hoá tài khoản.' }
}

export async function resetPassword(id: string, password: string): Promise<ActionResult> {
  await requireOwner()
  const pwErr = checkPassword(password)
  if (pwErr) return { ok: false, error: pwErr }
  const pepper = process.env.AUTH_PEPPER
  if (!pepper) return { ok: false, error: 'Thiếu AUTH_PEPPER.' }

  try {
    await adminClient.patch(id).set({ passwordHash: hashPassword(password, pepper) }).commit()
  } catch (err) {
    return { ok: false, error: `Không lưu được: ${String(err).slice(0, 140)}` }
  }
  revalidatePath('/admin/users')
  // ⚠️ Doi mat khau KHONG cat phien dang mo cua nguoi do — cookie tu ky con hieu
  // luc toi 8 tieng. Muon cat ngay thi vo hieu hoa tai khoan roi bat lai.
  return { ok: true, message: 'Đã đổi mật khẩu. Phiên đang mở của người đó vẫn chạy tới khi hết hạn (tối đa 8 tiếng) — muốn cắt ngay thì vô hiệu hoá rồi bật lại.' }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const me = await requireOwner()
  if (id === me._id) return { ok: false, error: 'Không thể tự xoá tài khoản đang dùng.' }
  if (!(await hasAnotherOwner(id))) {
    return { ok: false, error: 'Đây là Chủ duy nhất, không xoá được.' }
  }
  try {
    await adminClient.delete(id)
  } catch (err) {
    return { ok: false, error: `Không xoá được: ${String(err).slice(0, 140)}` }
  }
  revalidatePath('/admin/users')
  return { ok: true, message: 'Đã xoá tài khoản.' }
}

/** Con Chu nao KHAC dang bat, ngoai `excludeId` khong? */
async function hasAnotherOwner(excludeId: string): Promise<boolean> {
  const users = await listAdminUsers()
  return users.some(u => u._id !== excludeId && u.role === 'owner' && u.active)
}
