'use client'

import { useState, useTransition } from 'react'
import { updateDeal, deleteDeal, createDeal, uploadDealImage, uploadDealImageFromUrl, bulkUpdateOrder } from './actions'

const calcDiscount = (orig: string, sale: string) => {
  const o = parseFloat(orig.replace(/[^0-9.]/g, ''))
  const s = parseFloat(sale.replace(/[^0-9.]/g, ''))
  if (!o || !s || s >= o) return 0
  return Math.round((1 - s / o) * 100)
}

const calcAmountSaved = (orig: string, sale: string) => {
  const o = parseFloat(orig.replace(/[^0-9.]/g, ''))
  const s = parseFloat(sale.replace(/[^0-9.]/g, ''))
  if (!o || !s || s >= o) return '$0'
  const currency = orig.match(/^[^0-9]+/)?.[0] ?? '$'
  return `${currency}${Math.round(o - s)}`
}

type AdminDeal = {
  _id: string; title: string; slug: string
  imageUrl?: string; priceSale: string; priceOrig: string
  discount: number; discountByAmount?: boolean; verified: boolean; isExpiring: boolean
  expiresAt?: string; dealUrl?: string; _createdAt: string; _updatedAt?: string; order?: number
}

export default function DealAdmin({ initialDeals }: { initialDeals: AdminDeal[] }) {
  const [deals, setDeals] = useState(initialDeals)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingDeal, setEditingDeal] = useState<AdminDeal | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null)
  const [orderDirty, setOrderDirty] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragSrcIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault()
    if (dragSrcIdx === null || dragSrcIdx === targetIdx) return
    const srcId = paginated[dragSrcIdx]._id
    const targetId = paginated[targetIdx]._id
    const srcDealIdx = deals.findIndex(d => d._id === srcId)
    const targetDealIdx = deals.findIndex(d => d._id === targetId)
    setDeals(prev => {
      const next = [...prev]
      const [removed] = next.splice(srcDealIdx, 1)
      next.splice(targetDealIdx, 0, removed)
      return next
    })
    setOrderDirty(true)
    setDragSrcIdx(null)
  }

  const handleSaveOrder = () => {
    startTransition(async () => {
      await bulkUpdateOrder(deals.map((d, i) => ({ id: d._id, order: i + 1 })))
      setOrderDirty(false)
      showToast('Đã lưu thứ tự')
    })
  }

  const filtered = deals.filter(d => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || (statusFilter === 'verified' ? d.verified : !d.verified)
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const goToPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages || 1)))

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () => setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(d => d._id)))

  const handleDelete = (id: string) => {
    if (!confirm('Xóa deal này?')) return
    startTransition(async () => {
      await deleteDeal(id)
      setDeals(prev => prev.filter(d => d._id !== id))
      showToast('Đã xóa deal')
    })
  }

  return (
    <div className="oa-wrap">
      {toast && <div className="oa-toast">{toast}</div>}

      <div className="oa-header">
        <div>
          <h1 className="oa-title">Quản lý Deal</h1>
          <div className="oa-breadcrumb">Home / Deal</div>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Xem Website
        </a>
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input className="oa-search" placeholder="Tìm deal..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          <select className="oa-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="all">Tất cả</option>
            <option value="verified">Verified</option>
            <option value="unverified">Chưa verify</option>
          </select>
        </div>
        <div className="oa-actions">
          {orderDirty && (
            <button className="oa-btn oa-btn-green" onClick={handleSaveOrder} disabled={isPending}>💾 Lưu thứ tự</button>
          )}
          <button className="oa-btn oa-btn-green" onClick={() => setShowModal(true)}>＋ Thêm mới</button>
          <button className="oa-btn oa-btn-red" onClick={() => {
            if (selected.size === 0) return
            if (!confirm(`Xóa ${selected.size} deal?`)) return
            startTransition(async () => {
              for (const id of selected) await deleteDeal(id)
              setDeals(prev => prev.filter(d => !selected.has(d._id)))
              setSelected(new Set())
              showToast(`Đã xóa ${selected.size} deal`)
            })
          }} disabled={selected.size === 0 || isPending}>🗑 Xóa ({selected.size})</button>
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th style={{ width: 28 }}></th>
              <th className="oa-th-check"><input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll} /></th>
              <th className="oa-th-num">#</th>
              <th>Tên Deal</th>
              <th>Ảnh</th>
              <th>Giá gốc</th>
              <th>Giá sale</th>
              <th>Giảm%</th>
              <th>Verified</th>
              <th>Ngày đăng</th>
              <th>Cập nhật</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((d, i) => (
              <tr
                key={d._id}
                draggable
                onDragStart={e => handleDragStart(e, i)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, i)}
                onDragEnd={() => setDragSrcIdx(null)}
                className={[selected.has(d._id) ? 'oa-row-sel' : '', dragSrcIdx === i ? 'oa-row-dragging' : ''].filter(Boolean).join(' ')}
              >
                <td style={{ cursor: 'grab', color: '#9ca3af', textAlign: 'center', fontSize: 16, userSelect: 'none' }} title="Kéo để sắp xếp">≡</td>
                <td className="oa-td-check"><input type="checkbox" checked={selected.has(d._id)} onChange={() => toggleSelect(d._id)} /></td>
                <td className="oa-td-num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td><button className="oa-name-btn" onClick={() => setEditingDeal(d)}>{d.title}</button></td>
                <td>{d.imageUrl ? <img src={d.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} /> : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                <td style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'line-through' }}>{d.priceOrig}</td>
                <td style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{d.priceSale}</td>
                <td><span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{d.discount}%</span></td>
                <td><span style={{ color: d.verified ? '#16a34a' : '#9ca3af', fontSize: 13 }}>{d.verified ? '✓' : '—'}</span></td>
                <td className="oa-td-date">{new Date(d._createdAt).toLocaleDateString('vi-VN')}</td>
                <td className="oa-td-date">{d._updatedAt ? new Date(d._updatedAt).toLocaleDateString('vi-VN') : '—'}</td>
                <td>
                  <div className="oa-row-btns">
                    <a href={d.dealUrl ?? '/deals'} target="_blank" rel="noopener noreferrer" className="oa-row-link" title={d.dealUrl ? 'Xem deal' : 'Xem trang deals'}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                    <button className="oa-row-save" onClick={() => setEditingDeal(d)} title="Sửa">✎</button>
                    <button className="oa-row-del" onClick={() => handleDelete(d._id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && <tr><td colSpan={12} className="oa-empty">Không tìm thấy deal nào</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">
          {filtered.length > 0 ? `${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE, filtered.length)} / ${filtered.length} deal` : '0 deal'}
          {filtered.length !== deals.length && ` (tổng ${deals.length})`}
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
        <DealModal mode="add" onClose={() => setShowModal(false)}
          onSaved={d => { setDeals(prev => [d, ...prev]); setShowModal(false); showToast('Đã thêm deal mới') }} />
      )}
      {editingDeal && (
        <DealModal mode="edit" initial={editingDeal} onClose={() => setEditingDeal(null)}
          onSaved={updated => { setDeals(prev => prev.map(d => d._id === updated._id ? updated : d)); setEditingDeal(null); showToast('Đã lưu') }}
          onDeleted={id => { setDeals(prev => prev.filter(d => d._id !== id)); setEditingDeal(null); showToast('Đã xóa') }} />
      )}
    </div>
  )
}

function DealModal({ mode, initial, onClose, onSaved, onDeleted }: {
  mode: 'add' | 'edit'; initial?: AdminDeal
  onClose: () => void; onSaved: (d: AdminDeal) => void; onDeleted?: (id: string) => void
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    priceSale: initial?.priceSale ?? '',
    priceOrig: initial?.priceOrig ?? '',
    discount: initial?.discount ?? 0,
    discountByAmount: initial?.discountByAmount ?? false,
    verified: initial?.verified ?? true,
    isExpiring: initial?.isExpiring ?? false,
    expiresAt: initial?.expiresAt ? initial.expiresAt.slice(0, 16) : '',
    dealUrl: initial?.dealUrl ?? '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(initial?.imageUrl ?? '')
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [imageError, setImageError] = useState('')
  const [isPending, startTransition] = useTransition()
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setImageError('')
    startTransition(async () => {
      let image: unknown = undefined
      if (imageFile) {
        try {
          const fd = new FormData()
          fd.append('file', imageFile)
          image = await uploadDealImage(fd)
        } catch {}
      } else if (imageUrlInput) {
        try {
          image = await uploadDealImageFromUrl(imageUrlInput)
        } catch (err) {
          setImageError(err instanceof Error ? err.message : 'Không tải được ảnh từ URL')
          return
        }
      }
      const data = {
        title: form.title,
        priceSale: form.priceSale,
        priceOrig: form.priceOrig,
        discount: form.discount,
        discountByAmount: form.discountByAmount,
        verified: form.verified,
        isExpiring: form.isExpiring,
        expiresAt: form.expiresAt || undefined,
        dealUrl: form.dealUrl || undefined,
        ...(image ? { image } : {}),
      }
      if (mode === 'add') {
        const doc = await createDeal(data)
        onSaved({ _id: doc._id, slug: (doc.slug as { current: string })?.current ?? '', _createdAt: new Date().toISOString(), ...data, imageUrl: imagePreview || undefined })
      } else if (initial) {
        await updateDeal(initial._id, data)
        onSaved({ ...initial, ...data, imageUrl: imagePreview || undefined })
      }
    })
  }

  const handleDelete = () => {
    if (!initial || !onDeleted || !confirm('Xóa deal này?')) return
    startTransition(async () => { await deleteDeal(initial._id); onDeleted(initial._id) })
  }

  return (
    <div className="oa-modal-bg">
      <div className="oa-modal oa-modal-lg">
        <div className="oa-modal-head">
          <span>{mode === 'add' ? 'Thêm Deal mới' : 'Chỉnh sửa Deal'}</span>
          <button className="oa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="oa-modal-body" onSubmit={handleSubmit}>
          <label className="oa-label">Tên Deal *
            <input className="oa-input" value={form.title} onChange={e => set('title', e.target.value)} required />
          </label>

          <div className="oa-modal-row">
            <label className="oa-label">Giá gốc *
              <input className="oa-input" value={form.priceOrig} onChange={e => { set('priceOrig', e.target.value); set('discount', calcDiscount(e.target.value, form.priceSale)) }} placeholder="$249" required />
            </label>
            <label className="oa-label">Giá sale *
              <input className="oa-input" value={form.priceSale} onChange={e => { set('priceSale', e.target.value); set('discount', calcDiscount(form.priceOrig, e.target.value)) }} placeholder="$189" required />
            </label>
            <label className="oa-label">{form.discountByAmount ? 'Giảm $ (tự tính)' : 'Giảm% (tự tính)'}
              <input
                className="oa-input"
                value={form.discountByAmount ? calcAmountSaved(form.priceOrig, form.priceSale) : form.discount}
                readOnly
                style={{ background: '#f3f4f6', cursor: 'default', fontWeight: 700, color: '#dc2626' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: '#6b7280', marginTop: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.discountByAmount} onChange={e => set('discountByAmount', e.target.checked)} />
                Hiện theo số tiền (VD: $100 OFF)
              </label>
            </label>
          </div>

          <div className="oa-label">Hình ảnh sản phẩm
            <input id="deal-img-input" type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) { setImageFile(file); setImageUrlInput(''); setImagePreview(URL.createObjectURL(file)) }
              }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              {imagePreview && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={imagePreview} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', display: 'block' }} onError={() => setImagePreview('')} />
                  <button type="button" onClick={() => { setImageFile(null); setImageUrlInput(''); setImagePreview('') }}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              )}
              <button type="button" className="oa-img-btn" onClick={() => document.getElementById('deal-img-input')?.click()}>
                {imagePreview ? '🔄 Đổi ảnh' : '📷 Chọn ảnh từ máy tính'}
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#9ca3af', flexShrink: 0 }}>hoặc dán link ảnh:</span>
              <input
                className="oa-input"
                style={{ flex: 1 }}
                value={imageUrlInput}
                onChange={e => {
                  setImageUrlInput(e.target.value)
                  setImageFile(null)
                  setImagePreview(e.target.value)
                  setImageError('')
                }}
                placeholder="https://example.com/anh.jpg"
              />
            </div>
            {imageError && <span className="oa-field-error">{imageError}</span>}
          </div>

          <div className="oa-modal-row">
            <label className="oa-label">Hết hạn
              <input className="oa-input" type="datetime-local" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} />
            </label>
          </div>

          <label className="oa-label">Deal URL
            <input className="oa-input" value={form.dealUrl} onChange={e => set('dealUrl', e.target.value)} placeholder="https://..." />
          </label>

          <div className="oa-modal-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.verified} onChange={e => set('verified', e.target.checked)} /> Verified
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isExpiring} onChange={e => set('isExpiring', e.target.checked)} /> Expiring Soon
            </label>
          </div>

          <div className="oa-modal-footer">
            {mode === 'edit' && onDeleted && (
              <button type="button" className="oa-btn oa-btn-red" onClick={handleDelete} disabled={isPending}>🗑 Xóa</button>
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
