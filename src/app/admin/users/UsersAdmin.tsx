'use client'

import { useState, useTransition } from 'react'
import { ROLES, ROLE_LABEL, ROLE_DESCRIPTION, type AdminRole } from '@/lib/adminAuth'
import { createUser, setRole, setActive, resetPassword, deleteUser, type ActionResult } from './actions'
import type { AdminUser } from '@/lib/adminSession'

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '—')

export default function UsersAdmin({ users, meId }: { users: AdminUser[]; meId: string }) {
  const [msg, setMsg] = useState<ActionResult | null>(null)
  const [pending, start] = useTransition()
  const [showNew, setShowNew] = useState(users.length === 0)

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => setMsg(await fn()))

  return (
    <div className="adm-page">
      <header className="adm-head">
        <div>
          <h1>Người dùng</h1>
          <p className="adm-sub">{users.length} tài khoản quản trị</p>
        </div>
        <button className="usr-btn-primary" onClick={() => setShowNew(v => !v)}>
          {showNew ? 'Đóng' : '+ Thêm người dùng'}
        </button>
      </header>

      {msg && (
        <p className={msg.ok ? 'usr-ok' : 'usr-err'} role="status" aria-live="polite">
          {msg.ok ? msg.message : msg.error}
        </p>
      )}

      {showNew && (
        <form
          className="usr-new"
          action={fd => run(() => createUser(fd))}
        >
          <div className="usr-new-grid">
            <label>Tên<input name="name" required placeholder="Nguyễn Văn A" /></label>
            <label>Email<input name="email" type="email" required placeholder="a@offerdy.com" /></label>
            <label>Vai
              <select name="role" defaultValue="editor">
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
              </select>
            </label>
            <label>Mật khẩu
              <input name="password" type="password" required minLength={12} placeholder="ít nhất 12 ký tự" />
            </label>
          </div>
          <p className="usr-hint">
            {ROLES.map(r => <span key={r}><b>{ROLE_LABEL[r]}</b>: {ROLE_DESCRIPTION[r]}. </span>)}
          </p>
          <button type="submit" className="usr-btn-primary" disabled={pending}>
            {pending ? 'Đang lưu…' : 'Tạo tài khoản'}
          </button>
        </form>
      )}

      <div className="usr-table-wrap">
        <table className="usr-table">
          <thead>
            <tr>
              <th>Người dùng</th><th>Vai</th><th>Trạng thái</th>
              <th>Đăng nhập gần nhất</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} className={u.active ? '' : 'usr-off'}>
                <td>
                  <b>{u.name}</b>
                  {u._id === meId && <span className="usr-you">bạn</span>}
                  <br /><span className="usr-email">{u.email}</span>
                </td>
                <td>
                  <select
                    value={u.role}
                    disabled={pending}
                    onChange={e => run(() => setRole(u._id, e.target.value as AdminRole))}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                  </select>
                </td>
                <td>{u.active ? <span className="usr-on-pill">Đang bật</span> : <span className="usr-off-pill">Đã tắt</span>}</td>
                <td className="usr-when">{fmt(u.lastLoginAt)}</td>
                <td className="usr-actions">
                  <button disabled={pending} onClick={() => run(() => setActive(u._id, !u.active))}>
                    {u.active ? 'Vô hiệu hoá' : 'Bật lại'}
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => {
                      const pw = prompt(`Mật khẩu mới cho ${u.email} (ít nhất 12 ký tự):`)
                      if (pw) run(() => resetPassword(u._id, pw))
                    }}
                  >Đổi mật khẩu</button>
                  <button
                    className="usr-danger"
                    disabled={pending || u._id === meId}
                    onClick={() => {
                      // Xoa la khong hoan tac duoc va khong co thung rac — hoi
                      // bang chinh email de khong ai bam nham qua loa.
                      const typed = prompt(`Xoá vĩnh viễn ${u.email}?\nGõ lại email để xác nhận:`)
                      if (typed?.trim().toLowerCase() === u.email.toLowerCase()) run(() => deleteUser(u._id))
                      else if (typed !== null) setMsg({ ok: false, error: 'Email gõ lại không khớp — chưa xoá gì.' })
                    }}
                  >Xoá</button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="usr-empty">
                Chưa có tài khoản nào. Tạo tài khoản Chủ đầu tiên bằng lệnh
                {' '}<code>node scripts/create-admin.mjs</code>, hoặc dùng nút thêm ở trên nếu bạn đã đăng nhập được.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
