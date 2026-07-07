'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateCouponOffer, deleteCouponOffer, createCouponOffer } from './actions'
import AdminPagination from '../_components/AdminPagination'
import { useAdminUrlState } from '../_components/useAdminUrlState'
import { ADMIN_PAGE_SIZE } from '@/lib/adminPagination'

type AdminOffer = {
  _id: string
  title: string
  offerText: string
  couponCode?: string
  link?: string
  description?: string
  expiresAt?: string
  active: boolean
  verified: boolean
  _createdAt: string
  store: { _id: string; name: string; slug?: string }
}

type AdminStore = { _id: string; name: string }
type CouponFilters = { q: string; store: string }

export default function CouponCodesAdmin({ offers: initialOffers, stores, page, totalPages, total, filters }: {
  offers: AdminOffer[]; stores: AdminStore[]
  page: number; totalPages: number; total: number; filters: CouponFilters
}) {
  const router = useRouter()
  const { setParams } = useAdminUrlState()
  const [offers, setOffers] = useState(initialOffers)
  useEffect(() => setOffers(initialOffers), [initialOffers])

  const [searchInput, setSearchInput] = useState(filters.q)
  useEffect(() => setSearchInput(filters.q), [filters.q])
  useEffect(() => {
    if (searchInput === filters.q) return
    const t = setTimeout(() => setParams({ q: searchInput || null }), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const [showModal, setShowModal] = useState(false)
  const [editingOffer, setEditingOffer] = useState<AdminOffer | null>(null)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const handleDelete = (id: string) => {
    if (!confirm('Xóa coupon code này?')) return
    startTransition(async () => {
      const result = await deleteCouponOffer(id)
      showToast(result.ok ? 'Đã xóa' : `Lỗi khi xóa: ${result.error}`)
      if (result.ok) router.refresh()
    })
  }

  const handleToggleActive = (id: string, current: boolean) => {
    startTransition(async () => {
      await updateCouponOffer(id, { active: !current })
      setOffers(prev => prev.map(o => o._id === id ? { ...o, active: !current } : o))
      showToast(current ? 'Đã ẩn' : 'Đã hiện')
    })
  }

  const handleGenerateAi = (id: string) => {
    startTransition(async () => {
      const res = await fetch('/api/ai/content/generate-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerIds: [id] }),
      })
      const data = await res.json()
      const ok = Array.isArray(data.results) && data.results[0]?.ok
      showToast(ok ? 'Đã tạo draft AI — xem tại AI Review Queue' : 'Tạo draft AI thất bại')
    })
  }

  return (
    <div className="oa-wrap">
      {toast && <div className="oa-toast">{toast}</div>}

      <div className="oa-header">
        <div>
          <h1 className="oa-title">Quản lý Coupon Codes</h1>
          <div className="oa-breadcrumb">Home / Coupon Codes</div>
        </div>
        <a href="/coupon-codes" target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Xem trang
        </a>
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input className="oa-search" placeholder="Tìm mã hoặc store..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          <select className="oa-select" value={filters.store || 'all'} onChange={e => setParams({ store: e.target.value === 'all' ? null : e.target.value })}>
            <option value="all">Tất cả store</option>
            {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="oa-actions">
          <button className="oa-btn oa-btn-green" onClick={() => setShowModal(true)}>＋ Thêm mã</button>
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th className="oa-th-num">#</th>
              <th>Mã giảm giá</th>
              <th>Tên offer</th>
              <th>Store</th>
              <th>Hết hạn</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o, i) => (
              <tr key={o._id}>
                <td className="oa-td-num">{(page - 1) * ADMIN_PAGE_SIZE + i + 1}</td>
                <td>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 800, background: 'var(--bg)', border: '1.5px dashed #D1D5E0', borderRadius: 6, padding: '4px 10px', letterSpacing: 2, color: 'var(--navy)' }}>
                    {o.couponCode ?? '—'}
                  </span>
                </td>
                <td>
                  <button className="oa-name-btn" onClick={() => setEditingOffer(o)}>{o.title}</button>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{o.offerText}</div>
                </td>
                <td style={{ fontSize: 13 }}>{o.store.name}</td>
                <td className="oa-td-date">
                  {o.expiresAt
                    ? new Date(o.expiresAt).toLocaleDateString('vi-VN')
                    : <span style={{ color: '#d1d5db' }}>—</span>}
                </td>
                <td>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: o.active ? '#dcfce7' : '#fee2e2', color: o.active ? '#16a34a' : '#dc2626' }}>
                    {o.active ? 'Hiện' : 'Ẩn'}
                  </span>
                </td>
                <td>
                  <div className="oa-row-btns">
                    <button className="oa-row-save" title={o.active ? 'Ẩn' : 'Hiện'} onClick={() => handleToggleActive(o._id, o.active)} disabled={isPending}>
                      {o.active ? '◉' : '○'}
                    </button>
                    <button className="oa-row-save" title="Tạo nội dung AI" onClick={() => handleGenerateAi(o._id)} disabled={isPending}>🤖</button>
                    <button className="oa-row-save" title="Sửa" onClick={() => setEditingOffer(o)}>✎</button>
                    <button className="oa-row-del" title="Xóa" onClick={() => handleDelete(o._id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {offers.length === 0 && (
              <tr><td colSpan={7} className="oa-empty">Không tìm thấy coupon code nào</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">
          {total > 0
            ? `${(page - 1) * ADMIN_PAGE_SIZE + 1}–${Math.min(page * ADMIN_PAGE_SIZE, total)} / ${total} mã`
            : '0 mã'}
        </div>
        <AdminPagination page={page} totalPages={totalPages} />
      </div>

      {showModal && (
        <CouponModal mode="add" stores={stores}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); showToast('Đã thêm coupon'); router.refresh() }} />
      )}
      {editingOffer && (
        <CouponModal mode="edit" initial={editingOffer} stores={stores}
          onClose={() => setEditingOffer(null)}
          onSaved={() => { setEditingOffer(null); showToast('Đã lưu'); router.refresh() }}
          onDeleted={() => { setEditingOffer(null); showToast('Đã xóa'); router.refresh() }} />
      )}
    </div>
  )
}

function CouponModal({ mode, initial, stores, onClose, onSaved, onDeleted }: {
  mode: 'add' | 'edit'; initial?: AdminOffer; stores: AdminStore[]
  onClose: () => void; onSaved: () => void; onDeleted?: () => void
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    offerText: initial?.offerText ?? '',
    couponCode: initial?.couponCode ?? '',
    link: initial?.link ?? '',
    description: initial?.description ?? '',
    storeId: initial?.store._id ?? stores[0]?._id ?? '',
    expiresAt: initial?.expiresAt ? initial.expiresAt.slice(0, 16) : '',
    active: initial?.active ?? true,
    verified: initial?.verified ?? true,
  })
  const [isPending, startTransition] = useTransition()
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.offerText || !form.couponCode || !form.storeId) return
    startTransition(async () => {
      const payload = {
        title: form.title, offerText: form.offerText, couponCode: form.couponCode,
        link: form.link, description: form.description || undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        active: form.active, verified: form.verified,
      }
      if (mode === 'add') {
        await createCouponOffer({ ...payload, storeId: form.storeId })
      } else if (initial) {
        await updateCouponOffer(initial._id, { ...payload, store: { _type: 'reference', _ref: form.storeId } })
      }
      onSaved()
    })
  }

  return (
    <div className="oa-modal-bg">
      <div className="oa-modal oa-modal-lg">
        <div className="oa-modal-head">
          <span>{mode === 'add' ? 'Thêm Coupon Code' : 'Chỉnh sửa Coupon Code'}</span>
          <button className="oa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="oa-modal-body" onSubmit={handleSubmit}>
          <div className="oa-modal-row">
            <label className="oa-label">Mã giảm giá *
              <input className="oa-input" style={{ fontFamily: 'monospace', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}
                value={form.couponCode} onChange={e => set('couponCode', e.target.value.toUpperCase())} placeholder="VD: SAVE20" required />
            </label>
            <label className="oa-label">Store *
              <select className="oa-input" value={form.storeId} onChange={e => set('storeId', e.target.value)} required>
                <option value="">— Chọn store —</option>
                {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </label>
          </div>
          <label className="oa-label">Tên offer *
            <input className="oa-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="VD: Giảm 20% toàn bộ sản phẩm" required />
          </label>
          <label className="oa-label">Nội dung ưu đãi *
            <input className="oa-input" value={form.offerText} onChange={e => set('offerText', e.target.value)} placeholder="VD: 20% Off sitewide" required />
          </label>
          <label className="oa-label">Mô tả
            <textarea className="oa-input oa-textarea" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Điều kiện áp dụng..." />
          </label>
          <div className="oa-modal-row">
            <label className="oa-label">Link *
              <input className="oa-input" type="url" value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://..." required />
            </label>
            <label className="oa-label">Hết hạn
              <input className="oa-input" type="datetime-local" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} />
            </label>
          </div>
          <div className="oa-modal-row">
            <label className="oa-label">Duyệt
              <select className="oa-input" value={form.active ? '1' : '0'} onChange={e => set('active', e.target.value === '1')}>
                <option value="1">Có</option><option value="0">Không</option>
              </select>
            </label>
            <label className="oa-label">Verified
              <select className="oa-input" value={form.verified ? '1' : '0'} onChange={e => set('verified', e.target.value === '1')}>
                <option value="1">Có</option><option value="0">Không</option>
              </select>
            </label>
          </div>
          <div className="oa-modal-footer">
            {mode === 'edit' && onDeleted && initial && (
              <button type="button" className="oa-btn oa-btn-red"
                onClick={() => { if (!confirm('Xóa coupon này?')) return; startTransition(async () => { const result = await deleteCouponOffer(initial._id); if (result.ok) onDeleted(); else alert(`Không thể xóa: ${result.error}`) }) }}
                disabled={isPending}>🗑 Xóa</button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="oa-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="oa-btn oa-btn-green" disabled={isPending}>
              {isPending ? 'Đang lưu...' : mode === 'add' ? 'Thêm mới' : '💾 Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
