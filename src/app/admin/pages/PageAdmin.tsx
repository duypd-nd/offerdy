'use client'

import { useState, useTransition } from 'react'
import { updatePage, deletePage, createPage, uploadPageImage, bulkSetPagePublished, checkPageSlug } from './actions'

type AdminPage = {
  _id: string; title: string; slug: string; excerpt?: string
  content?: string; imageUrl?: string; published?: boolean
  _createdAt: string; _updatedAt?: string
}

export default function PageAdmin({ initialPages }: { initialPages: AdminPage[] }) {
  const [pages, setPages] = useState(initialPages)
  const [search, setSearch] = useState('')
  const [editingPage, setEditingPage] = useState<AdminPage | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = (rows: AdminPage[]) => setSelected(selected.size === rows.length ? new Set() : new Set(rows.map(p => p._id)))

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const filtered = pages.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase()))

  const handleDelete = (id: string) => {
    if (!confirm('Xóa trang này?')) return
    startTransition(async () => {
      await deletePage(id)
      setPages(prev => prev.filter(p => p._id !== id))
      showToast('Đã xóa trang')
    })
  }

  return (
    <div className="oa-wrap">
      {toast && <div className="oa-toast">{toast}</div>}

      <div className="oa-header">
        <div>
          <h1 className="oa-title">Quản lý Trang</h1>
          <div className="oa-breadcrumb">Home / Trang tĩnh</div>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Xem Website
        </a>
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input className="oa-search" placeholder="Tìm trang..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="oa-actions">
          <button className="oa-btn oa-btn-green" onClick={() => {
            if (selected.size === 0) return
            startTransition(async () => {
              await bulkSetPagePublished([...selected], true)
              setPages(prev => prev.map(p => selected.has(p._id) ? { ...p, published: true } : p))
              setSelected(new Set())
              showToast(`Đã hiện ${selected.size} trang`)
            })
          }} disabled={selected.size === 0 || isPending}>✓ Hiện ({selected.size})</button>
          <button className="oa-btn" onClick={() => {
            if (selected.size === 0) return
            startTransition(async () => {
              await bulkSetPagePublished([...selected], false)
              setPages(prev => prev.map(p => selected.has(p._id) ? { ...p, published: false } : p))
              setSelected(new Set())
              showToast(`Đã ẩn ${selected.size} trang`)
            })
          }} disabled={selected.size === 0 || isPending}>✕ Ẩn ({selected.size})</button>
          <button className="oa-btn oa-btn-green" onClick={() => setShowModal(true)}>＋ Thêm trang mới</button>
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th className="oa-th-check"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={() => toggleAll(filtered)} /></th>
              <th className="oa-th-num">#</th>
              <th>Tiêu đề</th>
              <th>Slug</th>
              <th>Ảnh</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p._id} className={selected.has(p._id) ? 'oa-row-sel' : ''}>
                <td className="oa-td-check"><input type="checkbox" checked={selected.has(p._id)} onChange={() => toggleSelect(p._id)} /></td>
                <td className="oa-td-num">{i + 1}</td>
                <td>
                  <button className="oa-name-btn" onClick={() => setEditingPage(p)}>{p.title}</button>
                  {p.excerpt && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, maxWidth: 280, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{p.excerpt}</div>}
                </td>
                <td><span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>/{p.slug}</span></td>
                <td>{p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} /> : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                <td>
                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 99, fontWeight: 600, background: p.published ? '#dcfce7' : '#f1f5f9', color: p.published ? '#16a34a' : '#64748b' }}>
                    {p.published ? 'Hiển thị' : 'Ẩn'}
                  </span>
                </td>
                <td className="oa-td-date">{p._updatedAt ? new Date(p._updatedAt).toLocaleDateString('vi-VN') : '—'}</td>
                <td>
                  <div className="oa-row-btns">
                    {p.slug && (
                      <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" className="oa-row-link" title="Xem trang">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    )}
                    <button className="oa-row-save" onClick={() => setEditingPage(p)} title="Sửa">✎</button>
                    <button className="oa-row-del" onClick={() => handleDelete(p._id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="oa-empty">Chưa có trang nào. Tạo trang đầu tiên!</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">{filtered.length} / {pages.length} trang</div>
      </div>

      {showModal && (
        <PageModal mode="add" onClose={() => setShowModal(false)}
          onSaved={p => { setPages(prev => [p, ...prev]); setShowModal(false); showToast('Đã tạo trang') }} />
      )}
      {editingPage && (
        <PageModal mode="edit" initial={editingPage} onClose={() => setEditingPage(null)}
          onSaved={updated => { setPages(prev => prev.map(p => p._id === updated._id ? updated : p)); setEditingPage(null); showToast('Đã lưu') }}
          onDeleted={id => { setPages(prev => prev.filter(p => p._id !== id)); setEditingPage(null); showToast('Đã xóa') }} />
      )}
    </div>
  )
}

function PageModal({ mode, initial, onClose, onSaved, onDeleted }: {
  mode: 'add' | 'edit'; initial?: AdminPage
  onClose: () => void; onSaved: (p: AdminPage) => void; onDeleted?: (id: string) => void
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    slug: initial?.slug ?? '',
    excerpt: initial?.excerpt ?? '',
    content: initial?.content ?? '',
    published: initial?.published ?? true,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(initial?.imageUrl ?? '')
  const [isPending, startTransition] = useTransition()
  const [slugError, setSlugError] = useState('')
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleTitleChange = (title: string) => {
    const slug = title.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'd')
      .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setForm(f => ({ ...f, title, ...(mode === 'add' ? { slug } : {}) }))
    if (mode === 'add') setSlugError('')
  }

  const handleSlugBlur = async () => {
    if (!form.slug) return
    if (mode === 'edit' && form.slug === initial?.slug) { setSlugError(''); return }
    const exists = await checkPageSlug(form.slug, mode === 'edit' ? initial?._id : undefined)
    setSlugError(exists ? `Slug "${form.slug}" đã tồn tại, vui lòng chọn slug khác` : '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (slugError) return
    startTransition(async () => {
      const skipCheck = mode === 'edit' && form.slug === initial?.slug
      if (!skipCheck) {
        const exists = await checkPageSlug(form.slug, mode === 'edit' ? initial?._id : undefined)
        if (exists) { setSlugError(`Slug "${form.slug}" đã tồn tại, vui lòng chọn slug khác`); return }
      }
      let image: unknown = undefined
      if (imageFile) {
        try {
          const fd = new FormData()
          fd.append('file', imageFile)
          image = await uploadPageImage(fd)
        } catch {}
      }
      const data = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt || undefined,
        content: form.content || undefined,
        published: form.published,
        ...(image ? { image } : {}),
      }
      if (mode === 'add') {
        const doc = await createPage(data)
        onSaved({ _id: doc._id, _createdAt: new Date().toISOString(), ...data, imageUrl: imagePreview || undefined })
      } else if (initial) {
        await updatePage(initial._id, { ...data, slug: { _type: 'slug', current: form.slug } })
        onSaved({ ...initial, ...data, imageUrl: imagePreview || undefined })
      }
    })
  }

  return (
    <div className="oa-modal-bg">
      <div className="oa-modal oa-modal-lg" style={{ maxWidth: 740 }}>
        <div className="oa-modal-head">
          <span>{mode === 'add' ? 'Thêm trang mới' : `Chỉnh sửa: ${initial?.title}`}</span>
          <button className="oa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="oa-modal-body" onSubmit={handleSubmit}>

          <div className="oa-modal-row">
            <label className="oa-label" style={{ flex: 2 }}>
              Tiêu đề *
              <input className="oa-input" value={form.title} onChange={e => handleTitleChange(e.target.value)} required />
            </label>
            <label className="oa-label" style={{ flex: 1 }}>
              Slug *
              <input
                className={`oa-input${slugError ? ' oa-input-error' : ''}`}
                value={form.slug}
                onChange={e => { set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-')); setSlugError('') }}
                onBlur={handleSlugBlur}
                required
                style={{ fontFamily: 'monospace' }}
              />
              {slugError && <span className="oa-field-error">{slugError}</span>}
            </label>
          </div>

          <label className="oa-label">
            Mô tả ngắn (dùng cho SEO / tóm tắt)
            <textarea className="oa-input oa-textarea" rows={2} value={form.excerpt} onChange={e => set('excerpt', e.target.value)} placeholder="Giới thiệu ngắn về trang này..." />
          </label>

          <div className="oa-label">Hình ảnh đại diện
            <input id="pg-img-input" type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)) }
              }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              {imagePreview && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={imagePreview} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', display: 'block' }} />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview('') }}
                    style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              )}
              <button type="button" className="oa-img-btn" onClick={() => document.getElementById('pg-img-input')?.click()}>
                {imagePreview ? '🔄 Đổi ảnh' : '📷 Chọn ảnh từ máy tính'}
              </button>
            </div>
          </div>

          <label className="oa-label">
            Nội dung HTML
            <textarea className="oa-input oa-textarea" rows={14} value={form.content} onChange={e => set('content', e.target.value)}
              placeholder={'<h2>Giới thiệu</h2>\n<p>Nội dung trang...</p>'}
              style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.6 }} />
          </label>

          <label className="oa-label" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.published} onChange={e => set('published', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#16a34a' }} />
            <span>Hiển thị trang này trên website</span>
          </label>

          <div className="oa-modal-footer">
            {mode === 'edit' && onDeleted && (
              <button type="button" className="oa-btn oa-btn-red"
                onClick={() => { if (!initial || !confirm('Xóa trang này?')) return; startTransition(async () => { await deletePage(initial._id); onDeleted(initial._id) }) }}
                disabled={isPending}>🗑 Xóa trang</button>
            )}
            <div style={{ flex: 1 }} />
            {mode === 'edit' && form.slug && (
              <a href={`/${form.slug}`} target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Xem trước
              </a>
            )}
            <button type="button" className="oa-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="oa-btn oa-btn-green" disabled={isPending || !!slugError}>
              {isPending ? 'Đang lưu...' : mode === 'add' ? 'Tạo trang' : '💾 Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
