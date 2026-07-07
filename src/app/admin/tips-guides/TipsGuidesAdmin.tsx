'use client'

import { useState, useTransition } from 'react'
import { updateTipsGuide, deleteTipsGuide, createTipsGuide, checkTipsGuideSlug } from './actions'
import AdminPagination from '../_components/AdminPagination'
import { useAdminUrlState } from '../_components/useAdminUrlState'
import { useUrlPage } from '../_components/useUrlPage'
import { ADMIN_PAGE_SIZE } from '@/lib/adminPagination'

type AdminPost = {
  _id: string; title: string; slug: string; author?: string
  publishedAt?: string; excerpt?: string; content?: string; _createdAt: string; _updatedAt?: string
}

export default function TipsGuidesAdmin({ initialPosts }: { initialPosts: AdminPost[] }) {
  const [posts, setPosts] = useState(initialPosts)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingPost, setEditingPost] = useState<AdminPost | null>(null)
  const page = useUrlPage()
  const { setParams } = useAdminUrlState()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const filtered = posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
  const totalPages = Math.ceil(filtered.length / ADMIN_PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE)

  const handleDelete = (id: string) => {
    if (!confirm('Xóa bài hướng dẫn này?')) return
    startTransition(async () => {
      await deleteTipsGuide(id)
      setPosts(prev => prev.filter(p => p._id !== id))
      showToast('Đã xóa')
    })
  }

  return (
    <div className="oa-wrap">
      {toast && <div className="oa-toast">{toast}</div>}

      <div className="oa-header">
        <div>
          <h1 className="oa-title">Quản lý Tips & Guides</h1>
          <div className="oa-breadcrumb">Home / Tips &amp; Guides</div>
        </div>
        <a href="/tips-guides" target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Xem trang
        </a>
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input className="oa-search" placeholder="Tìm bài hướng dẫn..." value={search} onChange={e => { setSearch(e.target.value); setParams({}) }} />
        </div>
        <div className="oa-actions">
          <button className="oa-btn oa-btn-green" onClick={() => setShowModal(true)}>＋ Thêm bài hướng dẫn</button>
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th className="oa-th-num">#</th>
              <th>Tiêu đề</th>
              <th>Tác giả</th>
              <th>Ngày đăng</th>
              <th>Cập nhật</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((p, i) => (
              <tr key={p._id}>
                <td className="oa-td-num">{(page - 1) * ADMIN_PAGE_SIZE + i + 1}</td>
                <td>
                  <button className="oa-name-btn" onClick={() => setEditingPost(p)}>{p.title}</button>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.slug}</div>
                </td>
                <td style={{ fontSize: 13 }}>{p.author ?? '—'}</td>
                <td className="oa-td-date">
                  {p.publishedAt
                    ? new Date(p.publishedAt).toLocaleDateString('vi-VN')
                    : <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>Chưa đăng</span>}
                </td>
                <td className="oa-td-date">{p._updatedAt ? new Date(p._updatedAt).toLocaleDateString('vi-VN') : '—'}</td>
                <td>
                  <div className="oa-row-btns">
                    {p.slug && (
                      <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" className="oa-row-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    )}
                    <button className="oa-row-save" title="Sửa" onClick={() => setEditingPost(p)}>✎</button>
                    <button className="oa-row-del" onClick={() => handleDelete(p._id)} disabled={isPending}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && <tr><td colSpan={6} className="oa-empty">Chưa có bài hướng dẫn nào</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">
          {filtered.length > 0 ? `${(page - 1) * ADMIN_PAGE_SIZE + 1}–${Math.min(page * ADMIN_PAGE_SIZE, filtered.length)} / ${filtered.length} bài` : '0 bài'}
        </div>
        <AdminPagination page={page} totalPages={totalPages} />
      </div>

      {showModal && (
        <TipsGuideModal mode="add" onClose={() => setShowModal(false)}
          onSaved={p => { setPosts(prev => [p, ...prev]); setShowModal(false); showToast('Đã thêm bài') }} />
      )}
      {editingPost && (
        <TipsGuideModal mode="edit" initial={editingPost} onClose={() => setEditingPost(null)}
          onSaved={updated => { setPosts(prev => prev.map(p => p._id === updated._id ? updated : p)); setEditingPost(null); showToast('Đã lưu') }}
          onDeleted={id => { setPosts(prev => prev.filter(p => p._id !== id)); setEditingPost(null); showToast('Đã xóa') }} />
      )}
    </div>
  )
}

function TipsGuideModal({ mode, initial, onClose, onSaved, onDeleted }: {
  mode: 'add' | 'edit'; initial?: AdminPost
  onClose: () => void; onSaved: (p: AdminPost) => void; onDeleted?: (id: string) => void
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '', slug: initial?.slug ?? '',
    author: initial?.author ?? '', publishedAt: initial?.publishedAt ?? '',
    excerpt: initial?.excerpt ?? '', content: initial?.content ?? '',
  })
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
    const exists = await checkTipsGuideSlug(form.slug, mode === 'edit' ? initial?._id : undefined)
    setSlugError(exists ? `Slug "${form.slug}" đã tồn tại` : '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (slugError) return
    startTransition(async () => {
      const skipCheck = mode === 'edit' && form.slug === initial?.slug
      if (!skipCheck) {
        const exists = await checkTipsGuideSlug(form.slug, mode === 'edit' ? initial?._id : undefined)
        if (exists) { setSlugError(`Slug "${form.slug}" đã tồn tại`); return }
      }
      const data = {
        title: form.title, slug: form.slug,
        author: form.author || undefined, publishedAt: form.publishedAt || undefined,
        excerpt: form.excerpt || undefined, content: form.content || undefined,
      }
      if (mode === 'add') {
        const doc = await createTipsGuide(data)
        onSaved({ _id: doc._id, _createdAt: new Date().toISOString(), ...data })
      } else if (initial) {
        await updateTipsGuide(initial._id, { ...data, slug: { _type: 'slug', current: form.slug } })
        onSaved({ ...initial, ...data })
      }
    })
  }

  return (
    <div className="oa-modal-bg">
      <div className="oa-modal oa-modal-lg">
        <div className="oa-modal-head">
          <span>{mode === 'add' ? 'Thêm Tips & Guides' : 'Chỉnh sửa Tips & Guides'}</span>
          <button className="oa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="oa-modal-body" onSubmit={handleSubmit}>
          <label className="oa-label">Tiêu đề *
            <input className="oa-input" value={form.title} onChange={e => handleTitleChange(e.target.value)} required />
          </label>
          <label className="oa-label">Slug *
            <input className={`oa-input${slugError ? ' oa-input-error' : ''}`}
              value={form.slug}
              onChange={e => { set('slug', e.target.value.toLowerCase()); setSlugError('') }}
              onBlur={handleSlugBlur} required />
            {slugError && <span className="oa-field-error">{slugError}</span>}
          </label>
          <label className="oa-label">Excerpt
            <textarea className="oa-input oa-textarea" rows={3} value={form.excerpt} onChange={e => set('excerpt', e.target.value)} />
          </label>
          <div className="oa-modal-row">
            <label className="oa-label">Tác giả
              <input className="oa-input" value={form.author} onChange={e => set('author', e.target.value)} />
            </label>
            <label className="oa-label">Ngày đăng
              <input className="oa-input" type="date" value={form.publishedAt} onChange={e => set('publishedAt', e.target.value)} />
            </label>
          </div>
          <label className="oa-label">Nội dung HTML
            <textarea className="oa-input oa-textarea" rows={8} value={form.content} onChange={e => set('content', e.target.value)}
              placeholder="<p>Nội dung hướng dẫn...</p>" style={{ fontFamily: 'monospace', fontSize: 13 }} />
          </label>
          <div className="oa-modal-footer">
            {mode === 'edit' && onDeleted && initial && (
              <button type="button" className="oa-btn oa-btn-red"
                onClick={() => { if (!confirm('Xóa?')) return; startTransition(async () => { await deleteTipsGuide(initial._id); onDeleted(initial._id) }) }}
                disabled={isPending}>🗑 Xóa</button>
            )}
            <div style={{ flex: 1 }} />
            {mode === 'edit' && form.slug && (
              <a href={`/blog/${form.slug}`} target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Xem trước
              </a>
            )}
            <button type="button" className="oa-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="oa-btn oa-btn-green" disabled={isPending || !!slugError}>
              {isPending ? 'Đang lưu...' : mode === 'add' ? 'Thêm mới' : '💾 Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
