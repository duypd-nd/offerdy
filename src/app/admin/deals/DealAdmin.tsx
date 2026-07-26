'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { updateDeal, deleteDeal, createDeal, uploadDealImage, uploadDealImageFromUrl, bulkUpdateOrder, toggleDealPin, fetchDealFromUrl } from './actions'
import AdminPagination from '../_components/AdminPagination'
import { useAdminUrlState } from '../_components/useAdminUrlState'
import { useUrlPage } from '../_components/useUrlPage'
import { ADMIN_PAGE_SIZE } from '@/lib/adminPagination'
import { isoToAdminInput, adminInputToIso, ADMIN_TIMEZONE_LABEL } from '@/lib/adminDateTime'
import { matchStoreByUrl, applyStoreRefToDealUrl, type StoreHostRow } from '@/lib/dealStoreMatch'

function ReviewSearchInput({ reviews, value, onChange }: {
  reviews: ReviewOption[]; value: string; onChange: (id: string) => void
}) {
  const selected = reviews.find(r => r._id === value)
  const [query, setQuery] = useState(selected?.title ?? '')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = reviews.filter(r => r.title.toLowerCase().includes(query.toLowerCase())).slice(0, 10)

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
        placeholder="Tìm review..."
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e4eaf2', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.1)', zIndex: 100, maxHeight: 240, overflowY: 'auto' }}>
          <div
            onMouseDown={() => { onChange(''); setQuery(''); setOpen(false) }}
            style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontWeight: value === '' ? 700 : 400, background: value === '' ? '#f0fdf4' : 'transparent', color: value === '' ? '#16a34a' : '#0f1929', borderBottom: '1px solid #f1f5f9' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f6f8fb')}
            onMouseLeave={e => (e.currentTarget.style.background = value === '' ? '#f0fdf4' : 'transparent')}
          >
            — Không có —
          </div>
          {filtered.map(r => (
            <div
              key={r._id}
              onMouseDown={() => { onChange(r._id); setQuery(r.title); setOpen(false) }}
              style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 13, fontWeight: value === r._id ? 700 : 400, background: value === r._id ? '#f0fdf4' : 'transparent', color: value === r._id ? '#16a34a' : '#0f1929' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f6f8fb')}
              onMouseLeave={e => (e.currentTarget.style.background = value === r._id ? '#f0fdf4' : 'transparent')}
            >
              {r.title}
            </div>
          ))}
          {filtered.length === 0 && <div style={{ padding: '9px 14px', fontSize: 13, color: '#9ca3af' }}>Không tìm thấy review nào</div>}
        </div>
      )}
    </div>
  )
}

// Ten mien production (hardcode giong moi noi khac trong repo — NEXT_PUBLIC_SITE_URL
// co tren Vercel nhung khong duoc code nao doc, xem PROJECT_CONTEXT). Dang `www.`
// la dang chinh: offerdy.com tran 308 sang no.
const SHORT_LINK_BASE = 'https://www.offerdy.com'

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
  _id: string; code?: number; pinnedAt?: string
  shortLinkClicks?: number; dealClicks?: number
  title: string; slug: string
  imageUrl?: string; priceSale: string; priceOrig: string
  discount: number; discountByAmount?: boolean; verified: boolean; isExpiring: boolean
  expiresAt?: string; dealUrl?: string; _createdAt: string; _updatedAt?: string; order?: number
  relatedReview?: { _id: string; title: string }
  category?: { _id: string; name: string; emoji?: string }
}

type ReviewOption = { _id: string; title: string }
type CategoryOption = { _id: string; name: string; emoji?: string }

export default function DealAdmin({ initialDeals, allReviews = [], allCategories = [], storeHosts = [] }: {
  initialDeals: AdminDeal[]; allReviews?: ReviewOption[]; allCategories?: CategoryOption[]
  storeHosts?: StoreHostRow[]
}) {
  const [deals, setDeals] = useState(initialDeals)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingDeal, setEditingDeal] = useState<AdminDeal | null>(null)
  const [showModal, setShowModal] = useState(false)
  const page = useUrlPage()
  const { setParams } = useAdminUrlState()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null)
  const [orderDirty, setOrderDirty] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const handleTogglePin = (d: AdminDeal) => {
    const next = d.pinnedAt ? undefined : new Date().toISOString()
    startTransition(async () => {
      await toggleDealPin(d._id, !d.pinnedAt)
      setDeals(prev => prev.map(x => x._id === d._id ? { ...x, pinnedAt: next } : x))
      showToast(next ? 'Đã ghim lên đầu /links' : 'Đã bỏ ghim')
    })
  }

  const copyShortLink = (code: number) => {
    const url = `${SHORT_LINK_BASE}/d/${code}`
    navigator.clipboard.writeText(url)
      .then(() => showToast(`Đã copy ${url}`))
      // clipboard API can HTTPS hoac localhost; bao that thay vi im lang
      .catch(() => showToast('Không copy được — hãy copy tay: ' + url))
  }

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
    // Tim theo ten HOAC ma (go "1005" / "#1005"), de doi chieu voi so trong caption
    const q = search.trim().toLowerCase()
    const matchSearch = !q
      || d.title.toLowerCase().includes(q)
      || (d.code != null && `#${d.code}`.includes(q.startsWith('#') ? q : `#${q}`))
    const matchStatus = statusFilter === 'all' || (statusFilter === 'verified' ? d.verified : !d.verified)
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / ADMIN_PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE)

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
          <input className="oa-search" placeholder="Tìm deal..." value={search} onChange={e => { setSearch(e.target.value); setParams({}) }} />
          <select className="oa-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setParams({}) }}>
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
          <button
            className="oa-btn"
            // Nut bi chan khi chua chon deal nao. Truoc day khong co gi giai thich
            // dieu do: bam vao thi khong co phan hoi nao ca, trong y het nhu tinh
            // nang bi hong.
            title={selected.size === 0 ? 'Tích chọn ít nhất 1 deal ở cột đầu tiên trước' : 'Sinh draft nội dung AI cho các deal đã chọn'}
            onClick={() => {
            if (selected.size === 0) {
              showToast('Hãy tích chọn deal ở cột đầu tiên trước, rồi bấm lại')
              return
            }
            const count = selected.size
            startTransition(async () => {
              // Truoc day khong he kiem tra loi: request that bai van hien thong bao
              // "Da tao draft AI cho 0/1 deal" — doc nhu thanh cong, va nguyen nhan
              // that bi che hoan toan. Day la dung lop bug "nuot loi im lang" ma du
              // an da gap o cac nut xoa admin.
              try {
                const res = await fetch('/api/ai/content/generate-deal', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ dealIds: Array.from(selected) }),
                })
                const data = await res.json().catch(() => ({}))
                if (!res.ok) {
                  showToast(`Lỗi ${res.status}: ${data.error ?? 'không tạo được draft AI'}`)
                  return
                }
                const results: { ok: boolean; error?: string }[] = Array.isArray(data.results) ? data.results : []
                const ok = results.filter(r => r.ok).length
                if (ok === 0) {
                  const reason = results.find(r => !r.ok)?.error ?? 'API không trả về kết quả nào'
                  showToast(`Không tạo được draft nào — ${reason}`)
                  return
                }
                const failed = results.length - ok
                showToast(
                  `Đã tạo draft AI cho ${ok}/${count} deal — duyệt tại /admin/ai-review` +
                  (failed ? ` · ${failed} deal lỗi` : '')
                )
                setSelected(new Set())
              } catch (err) {
                showToast(`Lỗi gọi API: ${err instanceof Error ? err.message : String(err)}`)
              }
            })
          }} disabled={isPending}>
            🤖 Tạo nội dung AI ({selected.size})
          </button>
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
              <th className="oa-th-num" title="Ghim lên đầu trang /links">★</th>
              <th className="oa-th-num" title="Mã sản phẩm — dùng trong caption Instagram/TikTok và short link /d/&lt;mã&gt;">Mã</th>
              <th>Tên Deal</th>
              <th>Ảnh</th>
              <th>Giá gốc</th>
              <th>Giá sale</th>
              <th>Giảm%</th>
              <th>Verified</th>
              <th title="Deal có khớp store nào để gắn mã tiếp thị không">Tiếp thị</th>
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
                <td className="oa-td-num">{(page - 1) * ADMIN_PAGE_SIZE + i + 1}</td>
                <td className="oa-td-num">
                  <button
                    onClick={() => handleTogglePin(d)}
                    disabled={isPending}
                    title={d.pinnedAt ? `Đang ghim (${new Date(d.pinnedAt).toLocaleString('vi-VN')}) — bấm để bỏ ghim` : 'Ghim lên đầu /links'}
                    style={{ background: 'none', padding: 0, fontSize: 15, lineHeight: 1, color: d.pinnedAt ? '#f59e0b' : '#d1d5db' }}
                  >
                    {d.pinnedAt ? '★' : '☆'}
                  </button>
                </td>
                <td className="oa-td-num" style={{ whiteSpace: 'nowrap' }}>
                  {d.code ? (
                    // Bam de copy san link day du — soan caption thi can chuoi dan
                    // duoc ngay, khong phai tu go lai "offerdy.com/d/1005".
                    <button
                      onClick={() => copyShortLink(d.code!)}
                      title={`Copy ${SHORT_LINK_BASE}/d/${d.code}`}
                      style={{ background: 'none', padding: 0, fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums', fontSize: 'inherit' }}
                    >
                      #{d.code}
                    </button>
                  ) : <span style={{ color: '#d1d5db' }}>—</span>}
                  {(!!d.shortLinkClicks || !!d.dealClicks) && (
                    <span
                      title={`${d.shortLinkClicks ?? 0} lượt mở short link → ${d.dealClicks ?? 0} lượt bấm sang merchant (bot đã lọc)`}
                      style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: '#6b7694', whiteSpace: 'nowrap' }}
                    >
                      {d.shortLinkClicks ?? 0}▸{d.dealClicks ?? 0}
                    </span>
                  )}
                </td>
                <td><button className="oa-name-btn" onClick={() => setEditingDeal(d)}>{d.title}</button></td>
                <td>{d.imageUrl ? <img src={d.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} /> : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                <td style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'line-through' }}>{d.priceOrig}</td>
                <td style={{ fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{d.priceSale}</td>
                <td><span style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{d.discount}%</span></td>
                <td><span style={{ color: d.verified ? '#16a34a' : '#9ca3af', fontSize: 13 }}>{d.verified ? '✓' : '—'}</span></td>
                {/* Trang thai tiep thi. Canh bao trong modal chi hien luc DANG GO —
                    voi deal da luu thi khong con dau hieu nao. Cot nay de thay ca
                    danh sach mot luot thay vi mo tung deal. */}
                <td style={{ whiteSpace: 'nowrap' }}>{(() => {
                  if (!d.dealUrl) return <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                  const store = matchStoreByUrl(d.dealUrl, storeHosts)
                  if (!store) {
                    return (
                      <span title="Domain không khớp store nào — click sẽ không ra hoa hồng"
                        style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 7px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        ⚠ không khớp
                      </span>
                    )
                  }
                  return (
                    <span title={`Khớp ${store.name}${store.couponCode ? ` · mã ${store.couponCode} sẽ hiện trên deal` : ' · shop chưa có mã coupon'}`}
                      style={{ background: '#f0fdf4', color: '#166534', padding: '2px 7px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                      ✓ {store.name}{store.couponCode ? ' 🏷' : ''}
                    </span>
                  )
                })()}</td>
                <td className="oa-td-date">{new Date(d._createdAt).toLocaleDateString('vi-VN')}</td>
                <td className="oa-td-date">{d._updatedAt ? new Date(d._updatedAt).toLocaleDateString('vi-VN') : '—'}</td>
                <td>
                  <div className="oa-row-btns">
                    <a href={d.dealUrl ?? '/deals'} target="_blank" rel="noopener noreferrer" className="oa-row-link" title={d.dealUrl ? 'Xem deal' : 'Xem trang deals'}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                    {/* Them deal roi dang bai la mot chuoi lam lien nhau; truoc day
                        phai sang /admin/social-kit roi tim lai ma. */}
                    {d.code && (
                      <a href={`/admin/social-kit?code=${d.code}`} className="oa-row-link" title={`Soạn bài đăng cho #${d.code}`}>
                        📣
                      </a>
                    )}
                    <button className="oa-row-save" onClick={() => setEditingDeal(d)} title="Sửa">✎</button>
                    <button className="oa-row-del" onClick={() => handleDelete(d._id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && <tr><td colSpan={15} className="oa-empty">Không tìm thấy deal nào</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">
          {filtered.length > 0 ? `${(page-1)*ADMIN_PAGE_SIZE+1}–${Math.min(page*ADMIN_PAGE_SIZE, filtered.length)} / ${filtered.length} deal` : '0 deal'}
          {filtered.length !== deals.length && ` (tổng ${deals.length})`}
        </div>
        <AdminPagination page={page} totalPages={totalPages} />
      </div>

      {showModal && (
        <DealModal mode="add" allReviews={allReviews} allCategories={allCategories} storeHosts={storeHosts} onClose={() => setShowModal(false)}
          onSaved={d => { setDeals(prev => [d, ...prev]); setShowModal(false); showToast('Đã thêm deal mới') }} />
      )}
      {editingDeal && (
        <DealModal mode="edit" initial={editingDeal} allReviews={allReviews} allCategories={allCategories} storeHosts={storeHosts} onClose={() => setEditingDeal(null)}
          onSaved={updated => { setDeals(prev => prev.map(d => d._id === updated._id ? updated : d)); setEditingDeal(null); showToast('Đã lưu') }}
          onDeleted={id => { setDeals(prev => prev.filter(d => d._id !== id)); setEditingDeal(null); showToast('Đã xóa') }} />
      )}
    </div>
  )
}

function DealModal({ mode, initial, allReviews = [], allCategories = [], storeHosts = [], onClose, onSaved, onDeleted }: {
  mode: 'add' | 'edit'; initial?: AdminDeal; allReviews?: ReviewOption[]; allCategories?: CategoryOption[]
  storeHosts?: StoreHostRow[]
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
    expiresAt: isoToAdminInput(initial?.expiresAt),
    dealUrl: initial?.dealUrl ?? '',
    relatedReviewId: initial?.relatedReview?._id ?? '',
    categoryId: initial?.category?._id ?? '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(initial?.imageUrl ?? '')
  const [fetching, setFetching] = useState(false)
  const [fetchNote, setFetchNote] = useState('')
  const [fetchedImages, setFetchedImages] = useState<string[]>([])
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
        } catch (err) {
          setImageError(err instanceof Error ? err.message : 'Không tải được ảnh, vui lòng thử ảnh khác hoặc file nhỏ hơn')
          return
        }
      } else if (imageUrlInput) {
        try {
          image = await uploadDealImageFromUrl(imageUrlInput)
        } catch (err) {
          setImageError(err instanceof Error ? err.message : 'Không tải được ảnh từ URL')
          return
        }
      }
      const relatedReviewRef = form.relatedReviewId ? { _type: 'reference' as const, _ref: form.relatedReviewId } : undefined
      const categoryRef = form.categoryId ? { _type: 'reference' as const, _ref: form.categoryId } : undefined
      const data = {
        title: form.title,
        priceSale: form.priceSale,
        priceOrig: form.priceOrig,
        discount: form.discount,
        discountByAmount: form.discountByAmount,
        verified: form.verified,
        isExpiring: form.isExpiring,
        expiresAt: adminInputToIso(form.expiresAt),
        dealUrl: form.dealUrl || undefined,
        ...(image ? { image } : {}),
        ...(relatedReviewRef ? { relatedReview: relatedReviewRef } : {}),
        ...(categoryRef ? { category: categoryRef } : {}),
      }
      const relatedReviewForState = form.relatedReviewId
        ? { _id: form.relatedReviewId, title: allReviews.find(r => r._id === form.relatedReviewId)?.title ?? '' }
        : undefined
      const categoryForState = form.categoryId
        ? (() => {
            const c = allCategories.find(c => c._id === form.categoryId)
            return { _id: form.categoryId, name: c?.name ?? '', emoji: c?.emoji }
          })()
        : undefined
      if (mode === 'add') {
        const doc = await createDeal(data)
        onSaved({ _id: doc._id, slug: (doc.slug as { current: string })?.current ?? '', _createdAt: new Date().toISOString(), ...data, imageUrl: imagePreview || undefined, relatedReview: relatedReviewForState, category: categoryForState })
      } else if (initial) {
        // Bo trong select -> phai unset han field tren Sanity, khong thi ref cu con lai
        const unset = [
          ...(relatedReviewRef ? [] : ['relatedReview']),
          ...(categoryRef ? [] : ['category']),
        ]
        await updateDeal(initial._id, data, unset.length ? unset : undefined)
        onSaved({ ...initial, ...data, imageUrl: imagePreview || undefined, relatedReview: relatedReviewForState, category: categoryForState })
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
            <label className="oa-label">Hết hạn <span style={{ fontWeight: 400, color: '#9CA3AF' }}>({ADMIN_TIMEZONE_LABEL})</span>
              <input className="oa-input" type="datetime-local" value={form.expiresAt} onChange={e => set('expiresAt', e.target.value)} />
            </label>
          </div>

          <label className="oa-label">Deal URL
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="oa-input" value={form.dealUrl} onChange={e => set('dealUrl', e.target.value)} placeholder="https://... (dán link trần, không cần ?ref=)" style={{ flex: 1 }} />
              <button
                type="button"
                className="oa-btn"
                disabled={!form.dealUrl.trim() || fetching}
                title="Đọc trang sản phẩm và điền tên, giá, ảnh vào các ô còn trống"
                onClick={async () => {
                  setFetching(true)
                  setFetchNote('')
                  const r = await fetchDealFromUrl(form.dealUrl)
                  setFetching(false)
                  if (!r.ok) { setFetchNote(`⚠️ ${r.error}`); return }
                  // CHI dien o dang TRONG — khong bao gio ghi de thu nguoi dung da go.
                  const filled: string[] = []
                  const skipped: string[] = []
                  setForm(prev => {
                    const next = { ...prev }
                    if (r.title) {
                      if (!prev.title.trim()) { next.title = r.title; filled.push('tên') }
                      else skipped.push('tên')
                    }
                    if (r.priceSale) {
                      if (!prev.priceSale.trim()) { next.priceSale = r.priceSale; filled.push('giá bán') }
                      else skipped.push('giá bán')
                    }
                    return next
                  })
                  setFetchedImages(r.images ?? [])
                  if (r.imageUrl && !imagePreview) { setImageUrlInput(r.imageUrl); setImagePreview(r.imageUrl); filled.push('ảnh') }
                  else if (r.imageUrl) skipped.push('ảnh')

                  setFetchNote(
                    (filled.length ? `✓ Đã điền: ${filled.join(', ')}.` : '✓ Đọc được trang nhưng không có ô nào trống để điền.') +
                    (skipped.length ? ` Giữ nguyên (bạn đã nhập): ${skipped.join(', ')}.` : '') +
                    (r.priceSale ? '' : ' Trang này không công bố giá — nhập tay.') +
                    ' Giá gốc phải tự nhập, shop hầu như không công bố.'
                  )
                }}
              >
                {fetching ? 'Đang đọc…' : '⤓ Lấy từ link'}
              </button>
            </div>
          </label>
          {fetchNote && (
            <div style={{ margin: '-6px 0 12px', padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af' }}>
              {fetchNote}
            </div>
          )}
          {/* Deal chi dung MOT anh, nen cho chon trong thu vien san pham thay vi mac
              dinh lay tam dau. Bo doc gio lay ca thu vien va da bo trung theo dinh
              danh anh — truoc day 3 "anh" co the la cung mot tam qua 3 URL khac. */}
          {fetchedImages.length > 1 && (
            <div style={{ margin: '-6px 0 14px' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                Chọn ảnh cho deal ({fetchedImages.length} ảnh khác nhau đọc được):
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {fetchedImages.map(url => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => { setImageUrlInput(url); setImagePreview(url) }}
                    title="Dùng ảnh này"
                    style={{
                      padding: 0, border: imagePreview === url ? '2.5px solid #16a34a' : '1.5px solid #e5e7eb',
                      borderRadius: 8, background: '#fff', cursor: 'pointer', lineHeight: 0,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 6, display: 'block' }} />
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Cho biet NGAY luc go rang link nay se duoc gan ma ref cua shop nao.
              Ma khong duoc luu vao dealUrl (giu link sach de doi ma o store la moi
              deal cua shop do dung theo), nen neu khong hien gi o day thi nguoi
              van hanh khong co cach nao biet viec gan ref co xay ra hay khong. */}
          {form.dealUrl.trim() && (() => {
            const matched = matchStoreByUrl(form.dealUrl, storeHosts)
            const withRef = applyStoreRefToDealUrl(form.dealUrl, storeHosts)
            const changed = withRef !== form.dealUrl.trim() && withRef !== form.dealUrl
            if (matched && changed) {
              return (
                <div style={{ margin: '-6px 0 12px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#166534', wordBreak: 'break-all' }}>
                  ✓ Khớp shop <b>{matched.name}</b> — link ra ngoài sẽ tự thành:<br />
                  <code>{withRef}</code>
                </div>
              )
            }
            if (matched) {
              return (
                <div style={{ margin: '-6px 0 12px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, fontSize: 12, color: '#166534' }}>
                  ✓ Khớp shop <b>{matched.name}</b> — link đã có sẵn tham số tiếp thị, giữ nguyên.
                </div>
              )
            }
            return (
              <div style={{ margin: '-6px 0 12px', padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                ⚠️ Domain này không khớp store nào trong hệ thống — <b>không gắn được mã tiếp thị</b>, click sẽ không ra hoa hồng. Kiểm tra lại link, hoặc thêm store cho shop này trước.
              </div>
            )
          })()}

          <label className="oa-label">Danh mục
            <select className="oa-input" value={form.categoryId} onChange={e => set('categoryId', e.target.value)}>
              <option value="">— Chưa phân loại —</option>
              {allCategories.map(c => (
                <option key={c._id} value={c._id}>{c.emoji ? `${c.emoji} ` : ''}{c.name}</option>
              ))}
            </select>
            <span style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              Dùng để lọc trên trang /deals. Để trống thì deal vẫn hiện ở tab &ldquo;All&rdquo;, chỉ không lọc riêng được.
            </span>
          </label>

          <label className="oa-label">Review liên quan (nếu có)
            <ReviewSearchInput reviews={allReviews} value={form.relatedReviewId} onChange={id => set('relatedReviewId', id)} />
            <span style={{ display: 'block', fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              Chỉ chọn nếu bài review thực sự nói về đúng sản phẩm này — trang deal sẽ hiện link sang bài review đó.
            </span>
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
