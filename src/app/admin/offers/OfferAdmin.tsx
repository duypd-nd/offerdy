'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { updateOffer, deleteOffer, bulkDelete, createOffer } from './actions'

type AdminOffer = {
  _id: string; title: string; active: boolean; verified: boolean
  order: number; couponCode?: string; link: string; offerText: string
  description?: string; expiresAt?: string; _createdAt: string
  store: { _id: string; name: string; slug?: string }
}
type AdminStore = { _id: string; name: string }

function StoreSearchInput({ stores, value, onChange }: { stores: AdminStore[]; value: string; onChange: (id: string) => void }) {
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
        className="oa-input"
        value={query}
        placeholder="Tìm store..."
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.1)', zIndex: 100, maxHeight: 220, overflowY: 'auto' }}>
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

export default function OfferAdmin({ initialOffers, stores }: { initialOffers: AdminOffer[]; stores: AdminStore[] }) {
  const [offers, setOffers] = useState(initialOffers)
  const [search, setSearch] = useState('')
  const [storeFilter, setStoreFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editingOffer, setEditingOffer] = useState<AdminOffer | null>(null)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const filtered = offers.filter(o => {
    const matchSearch = o.title.toLowerCase().includes(search.toLowerCase())
    const matchStore = storeFilter === 'all' || o.store._id === storeFilter
    const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? o.active : !o.active)
    const createdDate = o._createdAt.slice(0, 10)
    const matchDateFrom = !dateFrom || createdDate >= dateFrom
    const matchDateTo = !dateTo || createdDate <= dateTo
    return matchSearch && matchStore && matchStatus && matchDateFrom && matchDateTo
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const goToPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)))

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () => setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(o => o._id)))

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
    startTransition(async () => { await deleteOffer(id); setOffers(prev => prev.filter(o => o._id !== id)); showToast('Đã xóa') })
  }

  const handleBulkDelete = () => {
    if (selected.size === 0) return
    if (!confirm(`Xóa ${selected.size} offer?`)) return
    startTransition(async () => {
      await bulkDelete([...selected])
      setOffers(prev => prev.filter(o => !selected.has(o._id)))
      setSelected(new Set())
      showToast(`Đã xóa ${selected.size} offer`)
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
          <input className="oa-search" placeholder="Tìm kiếm..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          <select className="oa-select" value={storeFilter} onChange={e => { setStoreFilter(e.target.value); setPage(1) }}>
            <option value="all">Tất cả store</option>
            {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select className="oa-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hiện</option>
            <option value="inactive">Đang ẩn</option>
          </select>
          <input className="oa-select" type="date" title="Từ ngày" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
          <input className="oa-select" type="date" title="Đến ngày" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} />
          {(dateFrom || dateTo) && (
            <button className="oa-btn" onClick={() => { setDateFrom(''); setDateTo(''); setPage(1) }}>✕ Bỏ lọc ngày</button>
          )}
        </div>
        <div className="oa-actions">
          <button className="oa-btn oa-btn-primary" onClick={handleUpdate} disabled={isPending}>💾 Cập nhật ({selected.size})</button>
          <button className="oa-btn oa-btn-green" onClick={() => setShowModal(true)}>＋ Thêm mới</button>
          <button className="oa-btn oa-btn-red" onClick={handleBulkDelete} disabled={selected.size === 0 || isPending}>🗑 Xóa ({selected.size})</button>
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th className="oa-th-check"><input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll} /></th>
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
            {paginated.map((o, i) => (
              <tr key={o._id} className={selected.has(o._id) ? 'oa-row-sel' : ''}>
                <td className="oa-td-check"><input type="checkbox" checked={selected.has(o._id)} onChange={() => toggleSelect(o._id)} /></td>
                <td className="oa-td-num">{(page - 1) * PAGE_SIZE + i + 1}</td>
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
                <td>
                  <select className="oa-inline-sel oa-store-sel" value={o.store._id} onChange={e => {
                    const s = stores.find(x => x._id === e.target.value)
                    if (s) handleField(o._id, 'store', { _id: s._id, name: s.name })
                  }}>
                    {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
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
            {paginated.length === 0 && <tr><td colSpan={9} className="oa-empty">Không tìm thấy offer nào</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">
          {filtered.length > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} / ${filtered.length} offer` : '0 offer'}
          {filtered.length !== offers.length && ` (tổng ${offers.length})`}
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

      {showModal && <AddModal stores={stores} onClose={() => setShowModal(false)} onCreated={o => { setOffers(prev => [o, ...prev]); setShowModal(false); showToast('Đã thêm offer mới') }} />}
      {editingOffer && (
        <EditModal offer={editingOffer} stores={stores} onClose={() => setEditingOffer(null)}
          onSaved={updated => { setOffers(prev => prev.map(o => o._id === updated._id ? updated : o)); setEditingOffer(null); showToast('Đã lưu') }}
          onDeleted={id => { setOffers(prev => prev.filter(o => o._id !== id)); setEditingOffer(null); showToast('Đã xóa') }} />
      )}
    </div>
  )
}

function EditModal({ offer, stores, onClose, onSaved, onDeleted }: {
  offer: AdminOffer; stores: AdminStore[]
  onClose: () => void; onSaved: (o: AdminOffer) => void; onDeleted: (id: string) => void
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
      const store = stores.find(s => s._id === form.storeId)!
      onSaved({ ...offer, ...form, couponCode: form.couponCode || undefined, description: form.description || undefined, store: { _id: store._id, name: store.name } })
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
            <button type="button" className="oa-btn oa-btn-red" onClick={() => { if (!confirm('Xóa offer này?')) return; startTransition(async () => { await deleteOffer(offer._id); onDeleted(offer._id) }) }} disabled={isPending}>🗑 Xóa</button>
            <div style={{ flex: 1 }} />
            <button type="button" className="oa-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="oa-btn oa-btn-green" disabled={isPending}>{isPending ? 'Đang lưu...' : '💾 Lưu thay đổi'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddModal({ stores, onClose, onCreated }: { stores: AdminStore[]; onClose: () => void; onCreated: (o: AdminOffer) => void }) {
  const [form, setForm] = useState({ title: '', offerText: '', couponCode: '', storeId: stores[0]?._id ?? '', order: 0, active: true, verified: true })
  const [isPending, startTransition] = useTransition()
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.offerText || !form.storeId) return
    startTransition(async () => {
      await createOffer(form)
      const store = stores.find(s => s._id === form.storeId)!
      onCreated({ _id: Date.now().toString(), ...form, link: '', store: { _id: store._id, name: store.name }, _createdAt: new Date().toISOString() })
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
