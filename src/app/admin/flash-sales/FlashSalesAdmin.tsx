'use client'

import { useState, useTransition } from 'react'
import { updateOfferExpiry, toggleOfferActive, deleteOffer, createFlashSaleOffer } from './actions'

type AdminOffer = {
  _id: string
  title: string
  offerText: string
  couponCode?: string
  link?: string
  expiresAt?: string
  active: boolean
  verified: boolean
  _createdAt: string
  store: { _id: string; name: string; slug?: string }
}

type AdminStore = { _id: string; name: string }

function daysLeft(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

function ExpiryBadge({ expiresAt }: { expiresAt?: string }) {
  if (!expiresAt) return <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
  const days = daysLeft(expiresAt)
  if (days < 0) return <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>Expired</span>
  if (days === 0) return <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 12 }}>Today</span>
  if (days <= 3) return <span style={{ color: '#ea580c', fontWeight: 700, fontSize: 12 }}>{days}d left</span>
  return <span style={{ color: '#6b7280', fontSize: 12 }}>{days}d · {new Date(expiresAt).toLocaleDateString('vi-VN')}</span>
}

export default function FlashSalesAdmin({ initialOffers, stores }: { initialOffers: AdminOffer[]; stores: AdminStore[] }) {
  const [offers, setOffers] = useState(initialOffers)
  const [search, setSearch] = useState('')
  const [storeFilter, setStoreFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editingOffer, setEditingOffer] = useState<AdminOffer | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const filtered = offers.filter(o => {
    const matchSearch = o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.store.name.toLowerCase().includes(search.toLowerCase())
    const matchStore = storeFilter === 'all' || o.store._id === storeFilter
    return matchSearch && matchStore
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const goToPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages || 1)))

  const handleToggleActive = (id: string, current: boolean) => {
    startTransition(async () => {
      await toggleOfferActive(id, !current)
      setOffers(prev => prev.map(o => o._id === id ? { ...o, active: !current } : o))
      showToast(current ? 'Đã ẩn' : 'Đã hiện')
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Xóa flash sale này?')) return
    startTransition(async () => {
      await deleteOffer(id)
      setOffers(prev => prev.filter(o => o._id !== id))
      showToast('Đã xóa')
    })
  }

  return (
    <div className="oa-wrap">
      {toast && <div className="oa-toast">{toast}</div>}

      <div className="oa-header">
        <div>
          <h1 className="oa-title">Quản lý Flash Sales</h1>
          <div className="oa-breadcrumb">Home / Flash Sales</div>
        </div>
        <a href="/flash-sales" target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Xem trang
        </a>
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input className="oa-search" placeholder="Tìm deal..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          <select className="oa-select" value={storeFilter} onChange={e => { setStoreFilter(e.target.value); setPage(1) }}>
            <option value="all">Tất cả store</option>
            {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="oa-actions">
          <button className="oa-btn oa-btn-green" onClick={() => setShowModal(true)}>＋ Thêm Flash Sale</button>
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th className="oa-th-num">#</th>
              <th>Tên deal</th>
              <th>Store</th>
              <th>Mã giảm</th>
              <th>Thời hạn</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((o, i) => (
              <tr key={o._id}>
                <td className="oa-td-num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td>
                  <button className="oa-name-btn" onClick={() => setEditingOffer(o)}>{o.title}</button>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{o.offerText}</div>
                </td>
                <td style={{ fontSize: 13 }}>{o.store.name}</td>
                <td>
                  {o.couponCode
                    ? <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, background: 'var(--bg)', border: '1.5px dashed #D1D5E0', borderRadius: 4, padding: '2px 8px' }}>{o.couponCode}</span>
                    : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                </td>
                <td><ExpiryBadge expiresAt={o.expiresAt} /></td>
                <td>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: o.active ? '#dcfce7' : '#fee2e2', color: o.active ? '#16a34a' : '#dc2626' }}>
                    {o.active ? 'Hiện' : 'Ẩn'}
                  </span>
                </td>
                <td>
                  <div className="oa-row-btns">
                    {o.store.slug && (
                      <a href={`/stores/${o.store.slug}`} target="_blank" rel="noopener noreferrer" className="oa-row-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    )}
                    <button className="oa-row-save" title={o.active ? 'Ẩn' : 'Hiện'} onClick={() => handleToggleActive(o._id, o.active)} disabled={isPending}>
                      {o.active ? '◉' : '○'}
                    </button>
                    <button className="oa-row-save" title="Sửa" onClick={() => setEditingOffer(o)}>✎</button>
                    <button className="oa-row-del" title="Xóa" onClick={() => handleDelete(o._id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={7} className="oa-empty">Không tìm thấy flash sale nào</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">
          {filtered.length > 0
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} / ${filtered.length} deal`
            : '0 deal'}
        </div>
        {totalPages > 1 && (
          <div className="oa-pagination">
            <button className="oa-page-btn" onClick={() => goToPage(1)} disabled={page === 1}>«</button>
            <button className="oa-page-btn" onClick={() => goToPage(page - 1)} disabled={page === 1}>← Trước</button>
            <span className="oa-page-info">{page} / {totalPages}</span>
            <button className="oa-page-btn" onClick={() => goToPage(page + 1)} disabled={page === totalPages}>Sau →</button>
            <button className="oa-page-btn" onClick={() => goToPage(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        )}
      </div>

      {showModal && (
        <FlashSaleModal mode="add" stores={stores}
          onClose={() => setShowModal(false)}
          onSaved={o => { setOffers(prev => [o, ...prev]); setShowModal(false); showToast('Đã thêm flash sale') }} />
      )}
      {editingOffer && (
        <FlashSaleModal mode="edit" initial={editingOffer} stores={stores}
          onClose={() => setEditingOffer(null)}
          onSaved={updated => { setOffers(prev => prev.map(o => o._id === updated._id ? updated : o)); setEditingOffer(null); showToast('Đã lưu') }}
          onDeleted={id => { setOffers(prev => prev.filter(o => o._id !== id)); setEditingOffer(null); showToast('Đã xóa') }} />
      )}
    </div>
  )
}

function FlashSaleModal({ mode, initial, stores, onClose, onSaved, onDeleted }: {
  mode: 'add' | 'edit'; initial?: AdminOffer; stores: AdminStore[]
  onClose: () => void; onSaved: (o: AdminOffer) => void; onDeleted?: (id: string) => void
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    offerText: initial?.offerText ?? '',
    couponCode: initial?.couponCode ?? '',
    link: initial?.link ?? '',
    storeId: initial?.store._id ?? stores[0]?._id ?? '',
    expiresAt: initial?.expiresAt ? initial.expiresAt.slice(0, 16) : '',
    active: initial?.active ?? true,
    verified: initial?.verified ?? true,
  })
  const [isPending, startTransition] = useTransition()
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.offerText || !form.storeId || !form.expiresAt) return
    startTransition(async () => {
      const store = stores.find(s => s._id === form.storeId)!
      if (mode === 'add') {
        await createFlashSaleOffer({
          title: form.title, offerText: form.offerText,
          couponCode: form.couponCode || undefined,
          storeId: form.storeId,
          expiresAt: new Date(form.expiresAt).toISOString(),
          link: form.link,
          active: form.active, verified: form.verified,
        })
        onSaved({ _id: Date.now().toString(), ...form, expiresAt: new Date(form.expiresAt).toISOString(), store: { _id: store._id, name: store.name }, _createdAt: new Date().toISOString() })
      } else if (initial) {
        await updateOfferExpiry(initial._id, {
          title: form.title, offerText: form.offerText,
          couponCode: form.couponCode || undefined,
          link: form.link,
          expiresAt: new Date(form.expiresAt).toISOString(),
          active: form.active, verified: form.verified,
          store: { _type: 'reference', _ref: form.storeId },
        })
        onSaved({ ...initial, ...form, expiresAt: new Date(form.expiresAt).toISOString(), store: { _id: store._id, name: store.name } })
      }
    })
  }

  return (
    <div className="oa-modal-bg">
      <div className="oa-modal oa-modal-lg">
        <div className="oa-modal-head">
          <span>{mode === 'add' ? 'Thêm Flash Sale' : 'Chỉnh sửa Flash Sale'}</span>
          <button className="oa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="oa-modal-body" onSubmit={handleSubmit}>
          <label className="oa-label">Tên deal *
            <input className="oa-input" value={form.title} onChange={e => set('title', e.target.value)} required />
          </label>
          <div className="oa-modal-row">
            <label className="oa-label">Nội dung ưu đãi *
              <input className="oa-input" value={form.offerText} onChange={e => set('offerText', e.target.value)} placeholder="VD: 50% Off" required />
            </label>
            <label className="oa-label">Mã giảm giá
              <input className="oa-input" value={form.couponCode} onChange={e => set('couponCode', e.target.value)} placeholder="VD: FLASH50" />
            </label>
          </div>
          <div className="oa-modal-row">
            <label className="oa-label">Store *
              <select className="oa-input" value={form.storeId} onChange={e => set('storeId', e.target.value)} required>
                <option value="">— Chọn store —</option>
                {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </label>
            <label className="oa-label">Hết hạn *
              <input className="oa-input" type="datetime-local" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} required />
            </label>
          </div>
          <label className="oa-label">Link deal *
            <input className="oa-input" type="url" value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://..." required />
          </label>
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
                onClick={() => { if (!confirm('Xóa flash sale này?')) return; startTransition(async () => { await deleteOffer(initial._id); onDeleted(initial._id) }) }}
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
