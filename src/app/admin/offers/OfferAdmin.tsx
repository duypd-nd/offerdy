'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateOffer, deleteOffer, bulkDelete, createOffer } from './actions'
import AdminPagination from '../_components/AdminPagination'
import { useAdminUrlState } from '../_components/useAdminUrlState'
import { ADMIN_PAGE_SIZE } from '@/lib/adminPagination'

type AdminOffer = {
  _id: string; title: string; active: boolean; verified: boolean
  order: number; couponCode?: string; link: string; offerText: string
  description?: string; expiresAt?: string; _createdAt: string
  store: { _id: string; name: string; slug?: string }
}
type AdminStore = { _id: string; name: string }
type OfferFilters = { q: string; store: string; status: string; from: string; to: string }

function StoreSearchInput({ stores, value, onChange, allLabel }: {
  stores: AdminStore[]; value: string; onChange: (id: string) => void
  /** When set, adds a "clear filter" option at the top and switches to filter-bar styling. */
  allLabel?: string
}) {
  const selected = stores.find(s => s._id === value)
  const [query, setQuery] = useState(selected?.name ?? '')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = stores.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).slice(0, 10)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className={allLabel ? 'oa-search' : 'oa-input'}
        value={query}
        placeholder={allLabel ?? 'Tìm store...'}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (filtered.length > 0 || allLabel) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.1)', zIndex: 100, maxHeight: 240, overflowY: 'auto' }}>
          {allLabel && (
            <div
              onMouseDown={() => { onChange('all'); setQuery(''); setOpen(false) }}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontWeight: value === 'all' ? 700 : 400, background: value === 'all' ? '#f0fdf4' : 'transparent', color: value === 'all' ? '#16a34a' : '#0f1929', borderBottom: '1px solid #f1f5f9' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f6f8fb')}
              onMouseLeave={e => (e.currentTarget.style.background = value === 'all' ? '#f0fdf4' : 'transparent')}
            >
              {allLabel}
            </div>
          )}
          {filtered.map(s => (
            <div
              key={s._id}
              onMouseDown={() => { onChange(s._id); setQuery(s.name); setOpen(false) }}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontWeight: value === s._id ? 700 : 400, background: value === s._id ? '#f0fdf4' : 'transparent', color: value === s._id ? '#16a34a' : '#0f1929' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f6f8fb')}
              onMouseLeave={e => (e.currentTarget.style.background = value === s._id ? '#f0fdf4' : 'transparent')}
            >
              {s.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OfferAdmin({ offers: initialOffers, stores, page, totalPages, total, filters }: {
  offers: AdminOffer[]; stores: AdminStore[]
  page: number; totalPages: number; total: number; filters: OfferFilters
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

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editingOffer, setEditingOffer] = useState<AdminOffer | null>(null)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () => setSelected(selected.size === offers.length ? new Set() : new Set(offers.map(o => o._id)))

  const handleField = (id: string, field: string, value: unknown) => {
    setOffers(prev => prev.map(o => o._id === id ? { ...o, [field]: value } : o))
  }

  const handleUpdate = () => {
    if (selected.size === 0) { showToast('Chọn ít nhất 1 offer'); return }
    startTransition(async () => {
      for (const id of selected) {
        const o = offers.find(x => x._id === id)
        if (!o) continue
        await updateOffer(id, { active: o.active, verified: o.verified, order: o.order, store: { _type: 'reference', _ref: o.store._id } })
      }
      showToast(`Đã cập nhật ${selected.size} offer`)
      setSelected(new Set())
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Xóa offer này?')) return
    startTransition(async () => {
      const result = await deleteOffer(id)
      showToast(result.ok ? 'Đã xóa' : `Lỗi khi xóa: ${result.error}`)
      if (result.ok) router.refresh()
    })
  }

  const handleBulkDelete = () => {
    if (selected.size === 0) return
    if (!confirm(`Xóa ${selected.size} offer?`)) return
    startTransition(async () => {
      const result = await bulkDelete([...selected])
      setSelected(new Set())
      showToast(result.ok ? `Đã xóa ${selected.size} offer` : `Xóa thất bại ${result.failed.length}/${selected.size} offer (có thể đã có click)`)
      router.refresh()
    })
  }

  return (
    <div className="oa-wrap">
      {toast && <div className="oa-toast">{toast}</div>}

      <div className="oa-header">
        <div>
          <h1 className="oa-title">Quản lý Offer</h1>
          <div className="oa-breadcrumb">Home / Offer</div>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Xem Website
        </a>
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input className="oa-search" placeholder="Tìm kiếm..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          <StoreSearchInput stores={stores} value={filters.store || 'all'} onChange={id => setParams({ store: id === 'all' ? null : id })} allLabel="Tất cả store" />
          <select className="oa-select" value={filters.status || 'all'} onChange={e => setParams({ status: e.target.value === 'all' ? null : e.target.value })}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hiện</option>
            <option value="inactive">Đang ẩn</option>
          </select>
          <input className="oa-select" type="date" title="Từ ngày" value={filters.from} onChange={e => setParams({ from: e.target.value || null })} />
          <input className="oa-select" type="date" title="Đến ngày" value={filters.to} onChange={e => setParams({ to: e.target.value || null })} />
          {(filters.from || filters.to) && (
            <button className="oa-btn" onClick={() => setParams({ from: null, to: null })}>✕ Bỏ lọc ngày</button>
          )}
        </div>
        <div className="oa-actions">
          <button className="oa-btn oa-btn-primary" onClick={handleUpdate} disabled={isPending}>💾 Cập nhật ({selected.size})</button>
          <button className="oa-btn" onClick={() => {
            if (selected.size === 0) return
            startTransition(async () => {
              const res = await fetch('/api/ai/content/generate-offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offerIds: Array.from(selected) }),
              })
              const data = await res.json()
              const ok = Array.isArray(data.results) ? data.results.filter((r: { ok: boolean }) => r.ok).length : 0
              showToast(`Đã tạo draft AI cho ${ok}/${selected.size} offer — xem tại AI Review Queue`)
              setSelected(new Set())
            })
          }} disabled={selected.size === 0 || isPending}>
            🤖 Tạo nội dung AI ({selected.size})
          </button>
          <button className="oa-btn oa-btn-green" onClick={() => setShowModal(true)}>＋ Thêm mới</button>
          <button className="oa-btn oa-btn-red" onClick={handleBulkDelete} disabled={selected.size === 0 || isPending}>🗑 Xóa ({selected.size})</button>
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th className="oa-th-check"><input type="checkbox" checked={selected.size === offers.length && offers.length > 0} onChange={toggleAll} /></th>
              <th className="oa-th-num">#</th>
              <th>Tên Offer</th>
              <th>Duyệt</th>
              <th>Verified</th>
              <th>Store</th>
              <th className="oa-th-stt">STT</th>
              <th>Ngày đăng</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o, i) => (
              <tr key={o._id} className={selected.has(o._id) ? 'oa-row-sel' : ''}>
                <td className="oa-td-check"><input type="checkbox" checked={selected.has(o._id)} onChange={() => toggleSelect(o._id)} /></td>
                <td className="oa-td-num">{(page - 1) * ADMIN_PAGE_SIZE + i + 1}</td>
                <td>
                  <button className="oa-name-btn" onClick={() => setEditingOffer(o)}>{o.title}</button>
                  {o.couponCode && <span className="oa-code">🏷 {o.couponCode}</span>}
                </td>
                <td>
                  <select className="oa-inline-sel" value={o.active ? '1' : '0'} onChange={e => handleField(o._id, 'active', e.target.value === '1')}>
                    <option value="1">Có</option><option value="0">Không</option>
                  </select>
                </td>
                <td>
                  <select className="oa-inline-sel" value={o.verified ? '1' : '0'} onChange={e => handleField(o._id, 'verified', e.target.value === '1')}>
                    <option value="1">Có</option><option value="0">Không</option>
                  </select>
                </td>
                <td style={{ minWidth: 160 }}>
                  <StoreSearchInput stores={stores} value={o.store._id} onChange={id => {
                    const s = stores.find(x => x._id === id)
                    if (s) handleField(o._id, 'store', { _id: s._id, name: s.name })
                  }} />
                </td>
                <td><input className="oa-inline-num" type="number" value={o.order} onChange={e => handleField(o._id, 'order', Number(e.target.value))} /></td>
                <td className="oa-td-date">{new Date(o._createdAt).toLocaleDateString('vi-VN')}</td>
                <td>
                  <div className="oa-row-btns">
                    {o.store.slug && (
                      <a href={`/stores/${o.store.slug}`} target="_blank" rel="noopener noreferrer" className="oa-row-link" title={`Xem store ${o.store.name}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    )}
                    <button className="oa-row-save" title="Lưu" onClick={() => startTransition(async () => { await updateOffer(o._id, { active: o.active, verified: o.verified, order: o.order, store: { _type: 'reference', _ref: o.store._id } }); showToast('Đã lưu') })}>✓</button>
                    <button className="oa-row-del" title="Xóa" onClick={() => handleDelete(o._id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {offers.length === 0 && <tr><td colSpan={9} className="oa-empty">Không tìm thấy offer nào</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">
          {total > 0 ? `${(page - 1) * ADMIN_PAGE_SIZE + 1}–${Math.min(page * ADMIN_PAGE_SIZE, total)} / ${total} offer` : '0 offer'}
        </div>
        <AdminPagination page={page} totalPages={totalPages} />
      </div>

      {showModal && <AddModal stores={stores} onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); showToast('Đã thêm offer mới'); router.refresh() }} />}
      {editingOffer && (
        <EditModal offer={editingOffer} stores={stores} onClose={() => setEditingOffer(null)}
          onSaved={() => { setEditingOffer(null); showToast('Đã lưu'); router.refresh() }}
          onDeleted={() => { setEditingOffer(null); showToast('Đã xóa'); router.refresh() }} />
      )}
    </div>
  )
}

function EditModal({ offer, stores, onClose, onSaved, onDeleted }: {
  offer: AdminOffer; stores: AdminStore[]
  onClose: () => void; onSaved: () => void; onDeleted: () => void
}) {
  const [form, setForm] = useState({
    title: offer.title, offerText: offer.offerText, couponCode: offer.couponCode ?? '',
    description: offer.description ?? '', expiresAt: offer.expiresAt ? offer.expiresAt.slice(0, 16) : '',
    storeId: offer.store._id, order: offer.order, active: offer.active, verified: offer.verified,
  })
  const [isPending, startTransition] = useTransition()
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      await updateOffer(offer._id, {
        title: form.title, offerText: form.offerText,
        couponCode: form.couponCode || undefined, description: form.description || undefined,
        expiresAt: form.expiresAt || undefined,
        store: { _type: 'reference', _ref: form.storeId },
        order: form.order, active: form.active, verified: form.verified,
      })
      onSaved()
    })
  }

  return (
    <div className="oa-modal-bg">
      <div className="oa-modal oa-modal-lg">
        <div className="oa-modal-head">
          <span>Chỉnh sửa Offer</span>
          <button className="oa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="oa-modal-body" onSubmit={handleSubmit}>
          <label className="oa-label">Tên Offer *
            <input className="oa-input" value={form.title} onChange={e => set('title', e.target.value)} required />
          </label>
          <div className="oa-modal-row">
            <label className="oa-label">Nội dung ưu đãi *
              <input className="oa-input" value={form.offerText} onChange={e => set('offerText', e.target.value)} placeholder="VD: 20% Off" required />
            </label>
            <label className="oa-label">Mã giảm giá
              <input className="oa-input" value={form.couponCode} onChange={e => set('couponCode', e.target.value)} placeholder="VD: SAVE20" />
            </label>
          </div>
          <label className="oa-label">Mô tả chi tiết
            <textarea className="oa-input oa-textarea" value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Điều kiện áp dụng..." />
          </label>
          <div className="oa-modal-row">
            <label className="oa-label">Store *
              <StoreSearchInput stores={stores} value={form.storeId} onChange={id => set('storeId', id)} />
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
            <label className="oa-label">STT
              <input className="oa-input" type="number" value={form.order} onChange={e => set('order', Number(e.target.value))} />
            </label>
          </div>
          <div className="oa-modal-footer">
            <button type="button" className="oa-btn oa-btn-red" onClick={() => { if (!confirm('Xóa offer này?')) return; startTransition(async () => { const result = await deleteOffer(offer._id); if (result.ok) onDeleted(); else alert(`Không thể xóa: ${result.error}`) }) }} disabled={isPending}>🗑 Xóa</button>
            <div style={{ flex: 1 }} />
            <button type="button" className="oa-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="oa-btn oa-btn-green" disabled={isPending}>{isPending ? 'Đang lưu...' : '💾 Lưu thay đổi'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddModal({ stores, onClose, onCreated }: { stores: AdminStore[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ title: '', offerText: '', couponCode: '', storeId: stores[0]?._id ?? '', order: 0, active: true, verified: true })
  const [isPending, startTransition] = useTransition()
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.offerText || !form.storeId) return
    startTransition(async () => {
      await createOffer(form)
      onCreated()
    })
  }

  return (
    <div className="oa-modal-bg">
      <div className="oa-modal">
        <div className="oa-modal-head">
          <span>Thêm Offer mới</span>
          <button className="oa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="oa-modal-body" onSubmit={handleSubmit}>
          <label className="oa-label">Tên Offer *
            <input className="oa-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="VD: Giảm 20% toàn bộ sản phẩm" required />
          </label>
          <div className="oa-modal-row">
            <label className="oa-label">Nội dung ưu đãi *
              <input className="oa-input" value={form.offerText} onChange={e => set('offerText', e.target.value)} placeholder="VD: 20% Off" required />
            </label>
            <label className="oa-label">Mã giảm giá
              <input className="oa-input" value={form.couponCode} onChange={e => set('couponCode', e.target.value)} placeholder="VD: SAVE20" />
            </label>
          </div>
          <div className="oa-modal-row">
            <label className="oa-label">STT
              <input className="oa-input" type="number" value={form.order} onChange={e => set('order', Number(e.target.value))} />
            </label>
          </div>
          <label className="oa-label">Store *
            <StoreSearchInput stores={stores} value={form.storeId} onChange={id => set('storeId', id)} />
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
            <button type="button" className="oa-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="oa-btn oa-btn-green" disabled={isPending}>{isPending ? 'Đang lưu...' : 'Thêm mới'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
