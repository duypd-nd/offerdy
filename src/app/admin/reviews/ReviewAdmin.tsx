'use client'

import { useState, useTransition } from 'react'
import { updateReview, deleteReview, createReview, uploadReviewImage, checkReviewSlug } from './actions'

type AdminReview = {
  _id: string; title: string; slug: string; tag: string; author?: string
  publishedAt?: string; excerpt?: string; content?: string; imageUrl?: string; _createdAt: string
}

export default function ReviewAdmin({ initialReviews }: { initialReviews: AdminReview[] }) {
  const [reviews, setReviews] = useState(initialReviews)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [editingReview, setEditingReview] = useState<AdminReview | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const filtered = reviews.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase())
    const matchTag = tagFilter === 'all' || r.tag === tagFilter
    return matchSearch && matchTag
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const goToPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages || 1)))

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () => setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(r => r._id)))

  const handleDelete = (id: string) => {
    if (!confirm('Xóa review này?')) return
    startTransition(async () => {
      await deleteReview(id)
      setReviews(prev => prev.filter(r => r._id !== id))
      showToast('Đã xóa review')
    })
  }

  return (
    <div className="oa-wrap">
      {toast && <div className="oa-toast">{toast}</div>}

      <div className="oa-header">
        <div>
          <h1 className="oa-title">Quản lý Review</h1>
          <div className="oa-breadcrumb">Home / Review</div>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Xem Website
        </a>
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input className="oa-search" placeholder="Tìm review..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          <select className="oa-select" value={tagFilter} onChange={e => { setTagFilter(e.target.value); setPage(1) }}>
            <option value="all">Tất cả loại</option>
            <option value="Review">Review</option>
            <option value="Comparison">Comparison</option>
          </select>
        </div>
        <div className="oa-actions">
          <button className="oa-btn oa-btn-green" onClick={() => setShowModal(true)}>＋ Thêm mới</button>
          <button className="oa-btn oa-btn-red" onClick={() => {
            if (selected.size === 0) return
            if (!confirm(`Xóa ${selected.size} review?`)) return
            startTransition(async () => {
              for (const id of selected) await deleteReview(id)
              setReviews(prev => prev.filter(r => !selected.has(r._id)))
              setSelected(new Set())
              showToast(`Đã xóa ${selected.size} review`)
            })
          }} disabled={selected.size === 0 || isPending}>🗑 Xóa ({selected.size})</button>
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th className="oa-th-check"><input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll} /></th>
              <th className="oa-th-num">#</th>
              <th>Tiêu đề</th>
              <th>Loại</th>
              <th>Ảnh</th>
              <th>Ngày đăng</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, i) => (
              <tr key={r._id} className={selected.has(r._id) ? 'oa-row-sel' : ''}>
                <td className="oa-td-check"><input type="checkbox" checked={selected.has(r._id)} onChange={() => toggleSelect(r._id)} /></td>
                <td className="oa-td-num">{(page-1)*PAGE_SIZE+i+1}</td>
                <td>
                  <button className="oa-name-btn" onClick={() => setEditingReview(r)}>{r.title}</button>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.slug}</div>
                </td>
                <td><span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, background: r.tag === 'Review' ? '#eff6ff' : '#fdf4ff', color: r.tag === 'Review' ? '#2563eb' : '#9333ea' }}>{r.tag}</span></td>
                <td>{r.imageUrl ? <img src={r.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} /> : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                <td className="oa-td-date">{r.publishedAt ? new Date(r.publishedAt).toLocaleDateString('vi-VN') : '—'}</td>
                <td>
                  <div className="oa-row-btns">
                    {r.slug && (
                      <a href={`/reviews/${r.slug}`} target="_blank" rel="noopener noreferrer" className="oa-row-link" title="Xem review">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    )}
                    <button className="oa-row-save" onClick={() => setEditingReview(r)} title="Sửa">✎</button>
                    <button className="oa-row-del" onClick={() => handleDelete(r._id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && <tr><td colSpan={7} className="oa-empty">Không tìm thấy review nào</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">
          {filtered.length > 0 ? `${(page-1)*PAGE_SIZE+1}–${Math.min(page*PAGE_SIZE, filtered.length)} / ${filtered.length} review` : '0 review'}
          {filtered.length !== reviews.length && ` (tổng ${reviews.length})`}
        </div>
        {totalPages > 1 && (
          <div className="oa-pagination">
            <button className="oa-page-btn" onClick={() => goToPage(1)} disabled={page===1}>«</button>
            <button className="oa-page-btn" onClick={() => goToPage(page-1)} disabled={page===1}>← Trước</button>
            <span className="oa-page-info">{page} / {totalPages}</span>
            <button className="oa-page-btn" onClick={() => goToPage(page+1)} disabled={page===totalPages}>Sau →</button>
            <button className="oa-page-btn" onClick={() => goToPage(totalPages)} disabled={page===totalPages}>»</button>
          </div>
        )}
      </div>

      {showModal && (
        <ReviewModal mode="add" onClose={() => setShowModal(false)}
          onSaved={r => { setReviews(prev => [r, ...prev]); setShowModal(false); showToast('Đã thêm review') }} />
      )}
      {editingReview && (
        <ReviewModal mode="edit" initial={editingReview} onClose={() => setEditingReview(null)}
          onSaved={updated => { setReviews(prev => prev.map(r => r._id === updated._id ? updated : r)); setEditingReview(null); showToast('Đã lưu') }}
          onDeleted={id => { setReviews(prev => prev.filter(r => r._id !== id)); setEditingReview(null); showToast('Đã xóa') }} />
      )}
    </div>
  )
}

function ReviewModal({ mode, initial, onClose, onSaved, onDeleted }: {
  mode: 'add' | 'edit'; initial?: AdminReview
  onClose: () => void; onSaved: (r: AdminReview) => void; onDeleted?: (id: string) => void
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '', slug: initial?.slug ?? '', tag: initial?.tag ?? 'Review',
    author: initial?.author ?? '',
    publishedAt: initial?.publishedAt ?? new Date().toISOString().split('T')[0],
    excerpt: initial?.excerpt ?? '', content: initial?.content ?? '',
    externalImageUrl: '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(initial?.imageUrl ?? '')
  const [imageError, setImageError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [slugError, setSlugError] = useState('')
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleTitleChange = (title: string) => {
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setForm(f => ({ ...f, title, ...(mode === 'add' ? { slug } : {}) }))
    if (mode === 'add') setSlugError('')
  }

  const handleSlugBlur = async () => {
    if (!form.slug) return
    if (mode === 'edit' && form.slug === initial?.slug) { setSlugError(''); return }
    const exists = await checkReviewSlug(form.slug, mode === 'edit' ? initial?._id : undefined)
    setSlugError(exists ? `Slug "${form.slug}" đã tồn tại, vui lòng chọn slug khác` : '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (slugError) return
    setImageError('')
    startTransition(async () => {
      const skipCheck = mode === 'edit' && form.slug === initial?.slug
      if (!skipCheck) {
        const exists = await checkReviewSlug(form.slug, mode === 'edit' ? initial?._id : undefined)
        if (exists) { setSlugError(`Slug "${form.slug}" đã tồn tại, vui lòng chọn slug khác`); return }
      }
      let image: unknown = undefined
      if (imageFile) {
        try {
          const fd = new FormData()
          fd.append('file', imageFile)
          image = await uploadReviewImage(fd)
        } catch (err) {
          setImageError(err instanceof Error ? err.message : 'Không tải được ảnh, vui lòng thử ảnh khác hoặc file nhỏ hơn')
          return
        }
      }
      // null (khong phai undefined) de bao "xoa field nay" - undefined khong "song sot" qua Server Action
      const data = {
        title: form.title, slug: form.slug, tag: form.tag,
        author: form.author || null,
        publishedAt: form.publishedAt,
        excerpt: form.excerpt || null,
        content: form.content || null,
        ...(image ? { image } : {}),
        externalImageUrl: (!image && form.externalImageUrl) ? form.externalImageUrl : null,
      }
      const localData = {
        title: data.title, slug: data.slug, tag: data.tag,
        author: data.author ?? undefined,
        publishedAt: data.publishedAt,
        excerpt: data.excerpt ?? undefined,
        content: data.content ?? undefined,
      }
      const resolvedImageUrl = imagePreview || form.externalImageUrl || undefined
      if (mode === 'add') {
        const doc = await createReview(data)
        onSaved({ _id: doc._id, _createdAt: new Date().toISOString(), ...localData, imageUrl: resolvedImageUrl })
      } else if (initial) {
        await updateReview(initial._id, { ...data, slug: { _type: 'slug', current: form.slug } })
        onSaved({ ...initial, ...localData, imageUrl: resolvedImageUrl })
      }
    })
  }

  return (
    <div className="oa-modal-bg">
      <div className="oa-modal oa-modal-lg">
        <div className="oa-modal-head">
          <span>{mode === 'add' ? 'Thêm Review' : 'Chỉnh sửa Review'}</span>
          <button className="oa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="oa-modal-body" onSubmit={handleSubmit}>
          <label className="oa-label">Tiêu đề *<input className="oa-input" value={form.title} onChange={e => handleTitleChange(e.target.value)} required /></label>
          <label className="oa-label">
            Slug *
            <input
              className={`oa-input${slugError ? ' oa-input-error' : ''}`}
              value={form.slug}
              onChange={e => { set('slug', e.target.value.toLowerCase()); setSlugError('') }}
              onBlur={handleSlugBlur}
              required
            />
            {slugError && <span className="oa-field-error">{slugError}</span>}
          </label>
          <label className="oa-label">Excerpt<textarea className="oa-input oa-textarea" rows={3} value={form.excerpt} onChange={e => set('excerpt', e.target.value)} /></label>
          <div className="oa-modal-row">
            <label className="oa-label">Loại *
              <select className="oa-input" value={form.tag} onChange={e => set('tag', e.target.value)} required>
                <option value="Review">Review</option>
                <option value="Comparison">Comparison</option>
              </select>
            </label>
            <label className="oa-label">Ngày đăng *<input className="oa-input" type="date" value={form.publishedAt} onChange={e => set('publishedAt', e.target.value)} required /></label>
            <label className="oa-label">Tác giả<input className="oa-input" value={form.author} onChange={e => set('author', e.target.value)} /></label>
          </div>
          <div className="oa-label">Hình ảnh đại diện
            <input id="rv-img-input" type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); set('externalImageUrl', '') }
              }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              {imagePreview && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={imagePreview} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', display: 'block' }} />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); set('externalImageUrl', '') }}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              )}
              <button type="button" className="oa-img-btn" onClick={() => document.getElementById('rv-img-input')?.click()}>
                {imagePreview ? '🔄 Đổi ảnh' : '📷 Chọn ảnh từ máy tính'}
              </button>
            </div>
            {imageError && <span className="oa-field-error">{imageError}</span>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>Hoặc dán link ảnh:</span>
              <input
                className="oa-input"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={form.externalImageUrl}
                onChange={e => {
                  set('externalImageUrl', e.target.value)
                  if (e.target.value) { setImageFile(null); setImagePreview(e.target.value) }
                  else setImagePreview('')
                }}
                style={{ flex: 1, fontSize: 13 }}
              />
            </div>
          </div>
          <label className="oa-label">Nội dung HTML
            <textarea className="oa-input oa-textarea" rows={8} value={form.content} onChange={e => set('content', e.target.value)} placeholder="<p>Nội dung review...</p>" style={{ fontFamily: 'monospace', fontSize: 13 }} />
          </label>
          <div className="oa-modal-footer">
            {mode === 'edit' && onDeleted && (
              <button type="button" className="oa-btn oa-btn-red" onClick={() => { if (!initial || !confirm('Xóa?')) return; startTransition(async () => { await deleteReview(initial._id); onDeleted(initial._id) }) }} disabled={isPending}>🗑 Xóa</button>
            )}
            <div style={{ flex: 1 }} />
            {mode === 'edit' && form.slug && (
              <a href={`/reviews/${form.slug}`} target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Xem trước
              </a>
            )}
            <button type="button" className="oa-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="oa-btn oa-btn-green" disabled={isPending || !!slugError}>{isPending ? 'Đang lưu...' : mode === 'add' ? 'Thêm mới' : '💾 Lưu'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
