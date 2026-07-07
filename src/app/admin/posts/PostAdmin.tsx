'use client'

import { useState, useTransition } from 'react'
import { updatePost, deletePost, createPost, uploadPostImage, bulkSetPublished, checkPostSlug } from './actions'
import AdminPagination from '../_components/AdminPagination'
import { useAdminUrlState } from '../_components/useAdminUrlState'
import { useUrlPage } from '../_components/useUrlPage'
import { ADMIN_PAGE_SIZE } from '@/lib/adminPagination'

const POST_CATS = ['Tips & Guides', 'Store Guide', 'Deals Roundup', 'News']

type AdminPost = {
  _id: string; title: string; slug: string; category?: string; author?: string
  publishedAt?: string; excerpt?: string; content?: string; imageUrl?: string; _createdAt: string; _updatedAt?: string
}

export default function PostAdmin({ initialPosts }: { initialPosts: AdminPost[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [editingPost, setEditingPost] = useState<AdminPost | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const page = useUrlPage()
  const { setParams } = useAdminUrlState()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const filtered = posts.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'all' || p.category === catFilter
    return matchSearch && matchCat
  })

  const totalPages = Math.ceil(filtered.length / ADMIN_PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE)

  const toggleSelect = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const toggleAll = () => setSelected(selected.size === paginated.length ? new Set() : new Set(paginated.map(p => p._id)))

  const handleDelete = (id: string) => {
    if (!confirm('Xóa bài viết này?')) return
    startTransition(async () => {
      await deletePost(id)
      setPosts(prev => prev.filter(p => p._id !== id))
      showToast('Đã xóa bài viết')
    })
  }

  return (
    <div className="oa-wrap">
      {toast && <div className="oa-toast">{toast}</div>}

      <div className="oa-header">
        <div>
          <h1 className="oa-title">Quản lý Blog Post</h1>
          <div className="oa-breadcrumb">Home / Blog Post</div>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Xem Website
        </a>
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input className="oa-search" placeholder="Tìm bài viết..." value={search} onChange={e => { setSearch(e.target.value); setParams({}) }} />
          <select className="oa-select" value={catFilter} onChange={e => { setCatFilter(e.target.value); setParams({}) }}>
            <option value="all">Tất cả danh mục</option>
            {POST_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="oa-actions">
          <button className="oa-btn oa-btn-green" onClick={() => setShowModal(true)}>＋ Thêm mới</button>
          <button className="oa-btn oa-btn-green" onClick={() => {
            if (selected.size === 0) return
            const today = new Date().toISOString().split('T')[0]
            startTransition(async () => {
              await bulkSetPublished([...selected], today)
              setPosts(prev => prev.map(p => selected.has(p._id) ? { ...p, publishedAt: today } : p))
              setSelected(new Set())
              showToast(`Đã xuất bản ${selected.size} bài`)
            })
          }} disabled={selected.size === 0 || isPending}>✓ Xuất bản ({selected.size})</button>
          <button className="oa-btn" onClick={() => {
            if (selected.size === 0) return
            startTransition(async () => {
              await bulkSetPublished([...selected], null)
              setPosts(prev => prev.map(p => selected.has(p._id) ? { ...p, publishedAt: undefined } : p))
              setSelected(new Set())
              showToast(`Đã ẩn ${selected.size} bài`)
            })
          }} disabled={selected.size === 0 || isPending}>✕ Ẩn ({selected.size})</button>
          <button className="oa-btn oa-btn-red" onClick={() => {
            if (selected.size === 0) return
            if (!confirm(`Xóa ${selected.size} bài?`)) return
            startTransition(async () => {
              for (const id of selected) await deletePost(id)
              setPosts(prev => prev.filter(p => !selected.has(p._id)))
              setSelected(new Set())
              showToast(`Đã xóa ${selected.size} bài`)
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
              <th>Danh mục</th>
              <th>Tác giả</th>
              <th>Ảnh</th>
              <th>Ngày đăng</th>
              <th>Cập nhật</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((p, i) => (
              <tr key={p._id} className={selected.has(p._id) ? 'oa-row-sel' : ''}>
                <td className="oa-td-check"><input type="checkbox" checked={selected.has(p._id)} onChange={() => toggleSelect(p._id)} /></td>
                <td className="oa-td-num">{(page-1)*ADMIN_PAGE_SIZE+i+1}</td>
                <td>
                  <button className="oa-name-btn" onClick={() => setEditingPost(p)}>{p.title}</button>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.slug}</div>
                </td>
                <td style={{ fontSize: 12 }}>{p.category ?? '—'}</td>
                <td style={{ fontSize: 13 }}>{p.author ?? '—'}</td>
                <td>{p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} /> : <span style={{ color: '#d1d5db' }}>—</span>}</td>
                <td className="oa-td-date">{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('vi-VN') : <span style={{color:'#f59e0b',fontSize:11,fontWeight:600}}>Chưa đăng</span>}</td>
                <td className="oa-td-date">{p._updatedAt ? new Date(p._updatedAt).toLocaleDateString('vi-VN') : '—'}</td>
                <td>
                  <div className="oa-row-btns">
                    {p.slug && (
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" className="oa-row-link" title="Xem bài viết">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    )}
                    <button className="oa-row-save" onClick={() => setEditingPost(p)} title="Sửa">✎</button>
                    <button className="oa-row-del" onClick={() => handleDelete(p._id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && <tr><td colSpan={9} className="oa-empty">Không tìm thấy bài viết nào</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">
          {filtered.length > 0 ? `${(page-1)*ADMIN_PAGE_SIZE+1}–${Math.min(page*ADMIN_PAGE_SIZE, filtered.length)} / ${filtered.length} bài` : '0 bài'}
          {filtered.length !== posts.length && ` (tổng ${posts.length})`}
        </div>
        <AdminPagination page={page} totalPages={totalPages} />
      </div>

      {showModal && (
        <PostModal mode="add" onClose={() => setShowModal(false)}
          onSaved={p => { setPosts(prev => [p, ...prev]); setShowModal(false); showToast('Đã thêm bài viết') }} />
      )}
      {editingPost && (
        <PostModal mode="edit" initial={editingPost} onClose={() => setEditingPost(null)}
          onSaved={updated => { setPosts(prev => prev.map(p => p._id === updated._id ? updated : p)); setEditingPost(null); showToast('Đã lưu') }}
          onDeleted={id => { setPosts(prev => prev.filter(p => p._id !== id)); setEditingPost(null); showToast('Đã xóa') }} />
      )}
    </div>
  )
}

function PostModal({ mode, initial, onClose, onSaved, onDeleted }: {
  mode: 'add' | 'edit'; initial?: AdminPost
  onClose: () => void; onSaved: (p: AdminPost) => void; onDeleted?: (id: string) => void
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '', slug: initial?.slug ?? '', category: initial?.category ?? '',
    author: initial?.author ?? '', publishedAt: initial?.publishedAt ?? '',
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
    const exists = await checkPostSlug(form.slug, mode === 'edit' ? initial?._id : undefined)
    setSlugError(exists ? `Slug "${form.slug}" đã tồn tại, vui lòng chọn slug khác` : '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (slugError) return
    setImageError('')
    startTransition(async () => {
      const skipCheck = mode === 'edit' && form.slug === initial?.slug
      if (!skipCheck) {
        const exists = await checkPostSlug(form.slug, mode === 'edit' ? initial?._id : undefined)
        if (exists) { setSlugError(`Slug "${form.slug}" đã tồn tại, vui lòng chọn slug khác`); return }
      }
      let image: unknown = undefined
      if (imageFile) {
        try {
          const fd = new FormData()
          fd.append('file', imageFile)
          image = await uploadPostImage(fd)
        } catch (err) {
          setImageError(err instanceof Error ? err.message : 'Không tải được ảnh, vui lòng thử ảnh khác hoặc file nhỏ hơn')
          return
        }
      }
      // Dung null (khong phai undefined) de bao "xoa field nay" - gia tri undefined
      // bi Next.js loai bo truoc khi toi server action, khong bao gio den duoc updatePost.
      const data = {
        title: form.title, slug: form.slug,
        category: form.category || null,
        author: form.author || null,
        publishedAt: form.publishedAt || null,
        excerpt: form.excerpt || null,
        content: form.content || null,
        ...(image ? { image } : {}),
        externalImageUrl: (!image && form.externalImageUrl) ? form.externalImageUrl : null,
      }
      // AdminPost (state hien thi) dung undefined cho field trong, khong phai null (chi null la de gui len server)
      const localData = {
        title: data.title, slug: data.slug,
        category: data.category ?? undefined,
        author: data.author ?? undefined,
        publishedAt: data.publishedAt ?? undefined,
        excerpt: data.excerpt ?? undefined,
        content: data.content ?? undefined,
      }
      if (mode === 'add') {
        const doc = await createPost(data)
        onSaved({ _id: doc._id, _createdAt: new Date().toISOString(), ...localData, imageUrl: imagePreview || undefined })
      } else if (initial) {
        await updatePost(initial._id, { ...data, slug: { _type: 'slug', current: form.slug } })
        onSaved({ ...initial, ...localData, imageUrl: imagePreview || undefined })
      }
    })
  }

  return (
    <div className="oa-modal-bg">
      <div className="oa-modal oa-modal-lg">
        <div className="oa-modal-head">
          <span>{mode === 'add' ? 'Thêm Blog Post' : 'Chỉnh sửa Blog Post'}</span>
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
            <label className="oa-label">Danh mục
              <select className="oa-input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">— Chọn —</option>
                {POST_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="oa-label">Tác giả<input className="oa-input" value={form.author} onChange={e => set('author', e.target.value)} /></label>
            <label className="oa-label">Ngày đăng<input className="oa-input" type="date" value={form.publishedAt} onChange={e => set('publishedAt', e.target.value)} /></label>
          </div>
          <div className="oa-label">Hình ảnh đại diện
            <input id="post-img-input" type="file" accept="image/*" style={{ display: 'none' }}
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
              <button type="button" className="oa-img-btn" onClick={() => document.getElementById('post-img-input')?.click()}>
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
            <textarea className="oa-input oa-textarea" rows={8} value={form.content} onChange={e => set('content', e.target.value)} placeholder="<p>Nội dung bài viết...</p>" style={{ fontFamily: 'monospace', fontSize: 13 }} />
          </label>
          <div className="oa-modal-footer">
            {mode === 'edit' && onDeleted && (
              <button type="button" className="oa-btn oa-btn-red" onClick={() => { if (!initial || !confirm('Xóa?')) return; startTransition(async () => { await deletePost(initial._id); onDeleted(initial._id) }) }} disabled={isPending}>🗑 Xóa</button>
            )}
            <div style={{ flex: 1 }} />
            {mode === 'edit' && form.slug && (
              <a href={`/blog/${form.slug}`} target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
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
