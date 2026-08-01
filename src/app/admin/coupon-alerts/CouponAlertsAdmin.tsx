'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { deleteCouponAlert } from './actions'
import { formatAdminDateTime } from '@/lib/adminDateTime'

type Alert = {
  _id: string
  email: string
  storeName?: string
  storeSlug?: string
  createdAt?: string
  notifiedAt?: string
}

export default function CouponAlertsAdmin({ initialAlerts }: { initialAlerts: Alert[] }) {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const handleDelete = (a: Alert) => {
    if (!confirm(`Xóa đăng ký của ${a.email}?`)) return
    startTransition(async () => {
      const result = await deleteCouponAlert(a._id)
      if (result.ok) {
        setAlerts(prev => prev.filter(x => x._id !== a._id))
        showToast(`Đã xóa ${a.email}`)
      } else {
        showToast(`Lỗi khi xóa: ${result.error}`)
      }
    })
  }

  const q = search.trim().toLowerCase()
  const filtered = alerts.filter(a =>
    !q || a.email.toLowerCase().includes(q) || (a.storeName ?? '').toLowerCase().includes(q)
  )

  // Mot email co the dang ky nhieu store, nen dem rieng so nguoi that.
  const uniqueEmails = new Set(alerts.map(a => a.email)).size

  const copyAll = () => {
    const list = [...new Set(filtered.map(a => a.email))].join('\n')
    navigator.clipboard.writeText(list)
      .then(() => showToast(`Đã copy ${new Set(filtered.map(a => a.email)).size} email`))
      .catch(() => showToast('Trình duyệt chặn copy — bôi đen thủ công vậy'))
  }

  return (
    <div className="oa-wrap">
      {toast && <div className="oa-toast">{toast}</div>}
      <div className="oa-header">
        <div>
          <h1 className="oa-title">Đăng ký nhận mã</h1>
          <div className="oa-breadcrumb">Home / Đăng ký nhận mã ({alerts.length} lượt · {uniqueEmails} email)</div>
        </div>
      </div>

      {/* Noi that trang thai: thu email thi da chay, gui mail thi chua. Khong ghi ro
          o day thi vai thang nua se tuong he thong da tu bao cho nguoi dang ky. */}
      <div
        style={{
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8,
          padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e', lineHeight: 1.6,
        }}
      >
        <strong>Chưa có bước gửi mail tự động.</strong> Trang store thu email và lưu vào đây, nhưng
        dự án chưa có nhà cung cấp email nào nên chưa ai được thông báo. Nút trên trang store cũng
        không hứa sẽ gửi. Muốn gửi thật thì cần thêm Resend (hoặc tương đương) và xác thực tên miền.
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input
            className="oa-search"
            placeholder="Tìm email hoặc store..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {filtered.length > 0 && (
            <button className="oa-btn" onClick={copyAll}>📋 Copy email đang hiện</button>
          )}
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th className="oa-th-num">#</th>
              <th>Email</th>
              <th>Store</th>
              <th>Đăng ký lúc</th>
              <th>Đã báo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={a._id}>
                <td className="oa-td-num">{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{a.email}</td>
                <td style={{ fontSize: 13 }}>
                  {a.storeSlug
                    ? <Link href={`/admin/stores?q=${encodeURIComponent(a.storeSlug)}`} style={{ color: '#16A34A' }}>{a.storeName}</Link>
                    : <span style={{ color: '#9ca3af' }}>{a.storeName ?? '—'} (store đã xóa)</span>}
                </td>
                <td style={{ fontSize: 12, color: '#6b7280' }}>
                  {a.createdAt ? formatAdminDateTime(a.createdAt) : '—'}
                </td>
                <td style={{ fontSize: 12, color: a.notifiedAt ? '#16A34A' : '#9ca3af' }}>
                  {a.notifiedAt ? formatAdminDateTime(a.notifiedAt) : 'chưa'}
                </td>
                <td>
                  <button
                    className="oa-row-del"
                    title={`Xóa đăng ký của ${a.email}`}
                    onClick={() => handleDelete(a)}
                    disabled={isPending}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="oa-empty">
                  {alerts.length === 0 ? 'Chưa có ai đăng ký.' : 'Không tìm thấy đăng ký nào khớp.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
