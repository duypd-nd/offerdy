'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateStore, deleteStore, createStore, uploadStoreImageFromUrl, checkStoreSlug, getStoreDescription } from './actions'
import AdminPagination from '../_components/AdminPagination'
import { useAdminUrlState } from '../_components/useAdminUrlState'
import { ADMIN_PAGE_SIZE } from '@/lib/adminPagination'

type AdminCategory = { value: string; label: string; emoji?: string }

const FALLBACK_CATEGORIES: AdminCategory[] = [
  { label: 'Tech & Gadgets', value: 'tech', emoji: '💻' },
  { label: 'Fashion', value: 'fashion', emoji: '👗' },
  { label: 'Beauty', value: 'beauty', emoji: '💄' },
  { label: 'Home & Garden', value: 'home', emoji: '🏠' },
  { label: 'Sports', value: 'sports', emoji: '🏋️' },
  { label: 'Food & Health', value: 'food', emoji: '🥗' },
  { label: 'Travel', value: 'travel', emoji: '✈️' },
  { label: 'AI Tools', value: 'ai', emoji: '🤖' },
  { label: 'Kids & Baby', value: 'kids', emoji: '👶' },
]

type AdminStore = {
  _id: string; name: string; slug: string; published: boolean
  category?: string; website?: string; affiliateLink?: string
  maxOffer?: number; abbr?: string; shortDescription?: string
  description?: string; imageUrl?: string; _createdAt: string
}

type StoreFilters = { q: string; category: string; status: string; from: string; to: string }

export default function StoreAdmin({ stores: initialStores, categories: propCategories, page, totalPages, total, filters }: {
  stores: AdminStore[]; categories?: AdminCategory[]
  page: number; totalPages: number; total: number; filters: StoreFilters
}) {
  const CATEGORIES = propCategories?.length ? propCategories : FALLBACK_CATEGORIES
  const router = useRouter()
  const { setParams } = useAdminUrlState()
  const [stores, setStores] = useState(initialStores)
  useEffect(() => setStores(initialStores), [initialStores])

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
  const [editingStore, setEditingStore] = useState<AdminStore | null>(null)
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const openEdit = async (s: AdminStore) => {
    setLoadingEditId(s._id)
    try {
      const description = await getStoreDescription(s._id)
      setEditingStore({ ...s, description })
    } finally {
      setLoadingEditId(null)
    }
  }

  const toggleSelect = (id: string) => setSelected(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })
  const toggleAll = () => setSelected(selected.size === stores.length ? new Set() : new Set(stores.map(s => s._id)))

  const handleField = (id: string, field: string, value: unknown) =>
    setStores(prev => prev.map(s => s._id === id ? { ...s, [field]: value } : s))

  const handleBulkPublish = (published: boolean) => {
    if (selected.size === 0) return
    startTransition(async () => {
      for (const id of selected) await updateStore(id, { published })
      setStores(prev => prev.map(s => selected.has(s._id) ? { ...s, published } : s))
      showToast(`Đã ${published ? 'duyệt' : 'ẩn'} ${selected.size} store`)
      setSelected(new Set())
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Xóa store này? Tất cả offer liên quan sẽ bị xóa theo.')) return
    startTransition(async () => {
      const result = await deleteStore(id)
      showToast(result.ok
        ? `Đã xóa store${result.deletedOfferCount ? ` và ${result.deletedOfferCount} offer liên quan` : ''}`
        : `Lỗi khi xóa: ${result.error}`)
      if (result.ok) router.refresh()
    })
  }

  const catLabel = (val?: string) => CATEGORIES.find(c => c.value === val)?.label ?? val ?? '—'

  return (
    <div className="oa-wrap">
      {toast && <div className="oa-toast">{toast}</div>}

      <div className="oa-header">
        <div>
          <h1 className="oa-title">Quản lý Store</h1>
          <div className="oa-breadcrumb">Home / Store</div>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="oa-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Xem Website
        </a>
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input className="oa-search" placeholder="Tìm tên, slug..." value={searchInput} onChange={e => setSearchInput(e.target.value)} />
          <select className="oa-select" value={filters.category || 'all'} onChange={e => setParams({ category: e.target.value === 'all' ? null : e.target.value })}>
            <option value="all">Tất cả danh mục</option>
            {CATEGORIES.map((c: AdminCategory) => <option key={c.value} value={c.value}>{c.emoji ? `${c.emoji} ${c.label}` : c.label}</option>)}
          </select>
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
          <button className="oa-btn oa-btn-primary" onClick={() => handleBulkPublish(true)} disabled={selected.size === 0 || isPending}>
            ✓ Duyệt ({selected.size})
          </button>
          <button className="oa-btn" onClick={() => {
            if (selected.size === 0) return
            startTransition(async () => {
              const res = await fetch('/api/ai/content/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeIds: Array.from(selected) }),
              })
              const data = await res.json()
              const ok = Array.isArray(data.results) ? data.results.filter((r: { ok: boolean }) => r.ok).length : 0
              showToast(`Đã tạo draft AI cho ${ok}/${selected.size} store — xem tại AI Review Queue`)
              setSelected(new Set())
            })
          }} disabled={selected.size === 0 || isPending}>
            🤖 Tạo nội dung AI ({selected.size})
          </button>
          <button className="oa-btn oa-btn-green" onClick={() => setShowModal(true)}>
            ＋ Thêm mới
          </button>
          <button className="oa-btn oa-btn-red" onClick={() => {
            if (selected.size === 0) return
            if (!confirm(`Xóa ${selected.size} store? Tất cả offer liên quan sẽ bị xóa theo.`)) return
            startTransition(async () => {
              const results = await Promise.all([...selected].map(id => deleteStore(id)))
              const failedCount = results.filter(r => !r.ok).length
              const totalOffersDeleted = results.reduce((sum, r) => sum + (r.deletedOfferCount ?? 0), 0)
              setSelected(new Set())
              showToast(failedCount === 0
                ? `Đã xóa ${selected.size} store${totalOffersDeleted ? ` và ${totalOffersDeleted} offer liên quan` : ''}`
                : `Xóa thất bại ${failedCount}/${selected.size} store`)
              router.refresh()
            })
          }} disabled={selected.size === 0 || isPending}>
            🗑 Xóa ({selected.size})
          </button>
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th className="oa-th-check"><input type="checkbox" checked={selected.size === stores.length && stores.length > 0} onChange={toggleAll} /></th>
              <th className="oa-th-num">#</th>
              <th>Tên Store</th>
              <th>Danh mục</th>
              <th>Website</th>
              <th>Max%</th>
              <th>Duyệt</th>
              <th>Ngày thêm</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {stores.map((s, i) => (
              <tr key={s._id} className={selected.has(s._id) ? 'oa-row-sel' : ''}>
                <td className="oa-td-check"><input type="checkbox" checked={selected.has(s._id)} onChange={() => toggleSelect(s._id)} /></td>
                <td className="oa-td-num">{(page - 1) * ADMIN_PAGE_SIZE + i + 1}</td>
                <td>
                  <button className="oa-name-btn" onClick={() => openEdit(s)} disabled={loadingEditId === s._id}>
                    {loadingEditId === s._id ? 'Đang tải...' : s.name}
                  </button>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.slug}</div>
                </td>
                <td style={{ fontSize: 13 }}>{catLabel(s.category)}</td>
                <td style={{ fontSize: 12, color: '#6b7280', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.website ? <a href={s.website} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>{s.website.replace(/^https?:\/\//, '')}</a> : '—'}
                </td>
                <td>
                  <input className="oa-inline-num" type="number" min={1} max={100}
                    value={s.maxOffer ?? ''} placeholder="—"
                    onChange={e => handleField(s._id, 'maxOffer', e.target.value ? Number(e.target.value) : undefined)} />
                </td>
                <td>
                  <select className="oa-inline-sel" value={s.published !== false ? '1' : '0'} onChange={e => handleField(s._id, 'published', e.target.value === '1')}>
                    <option value="1">Có</option>
                    <option value="0">Không</option>
                  </select>
                </td>
                <td className="oa-td-date">{new Date(s._createdAt).toLocaleDateString('vi-VN')}</td>
                <td>
                  <div className="oa-row-btns">
                    {s.slug && (
                      <a href={`/stores/${s.slug}`} target="_blank" rel="noopener noreferrer" className="oa-row-link" title="Xem trang store">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                    )}
                    <button className="oa-row-save" title="Lưu" onClick={() => {
                      startTransition(async () => {
                        await updateStore(s._id, { published: s.published, maxOffer: s.maxOffer })
                        showToast('Đã lưu')
                      })
                    }}>✓</button>
                    <button className="oa-row-del" title="Xóa" onClick={() => handleDelete(s._id)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
            {stores.length === 0 && (
              <tr><td colSpan={9} className="oa-empty">Không tìm thấy store nào</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">
          {total > 0
            ? `${(page - 1) * ADMIN_PAGE_SIZE + 1}–${Math.min(page * ADMIN_PAGE_SIZE, total)} / ${total} store`
            : '0 store'}
        </div>
        <AdminPagination page={page} totalPages={totalPages} />
      </div>

      {showModal && (
        <AddStoreModal
          categories={CATEGORIES}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); showToast('Đã thêm store mới'); router.refresh() }}
        />
      )}

      {editingStore && (
        <EditStoreModal
          store={editingStore}
          categories={CATEGORIES}
          onClose={() => setEditingStore(null)}
          onSaved={() => {
            setEditingStore(null)
            showToast('Đã lưu thay đổi')
            router.refresh()
          }}
          onDeleted={() => {
            setEditingStore(null)
            showToast('Đã xóa store')
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function EditStoreModal({ store, categories, onClose, onSaved, onDeleted }: {
  store: AdminStore
  categories: AdminCategory[]
  onClose: () => void
  onSaved: () => void
  onDeleted: () => void
}) {
  const [form, setForm] = useState({
    name: store.name,
    slug: store.slug ?? '',
    website: store.website ?? '',
    affiliateLink: store.affiliateLink ?? '',
    category: store.category ?? '',
    maxOffer: store.maxOffer ?? '',
    abbr: store.abbr ?? '',
    shortDescription: store.shortDescription ?? '',
    description: store.description ?? '',
    published: store.published !== false,
  })
  const [logoUrl, setLogoUrl] = useState(store.imageUrl ?? '')
  const [isPending, startTransition] = useTransition()
  const [slugError, setSlugError] = useState('')
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleSlugBlur = async () => {
    if (!form.slug || form.slug === store.slug) { setSlugError(''); return }
    const exists = await checkStoreSlug(form.slug, store._id)
    setSlugError(exists ? `Slug "${form.slug}" đã tồn tại, vui lòng chọn slug khác` : '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (slugError) return
    startTransition(async () => {
      if (form.slug !== store.slug) {
        const exists = await checkStoreSlug(form.slug, store._id)
        if (exists) { setSlugError(`Slug "${form.slug}" đã tồn tại, vui lòng chọn slug khác`); return }
      }
      let imagePatch: Record<string, unknown> = {}
      if (logoUrl && logoUrl !== store.imageUrl) {
        try {
          const imgRef = await uploadStoreImageFromUrl(logoUrl)
          if (imgRef) imagePatch = { image: imgRef }
        } catch { /* giữ ảnh cũ nếu lỗi */ }
      }
      const patch: Record<string, unknown> = {
        name: form.name,
        slug: { _type: 'slug', current: form.slug },
        website: form.website || undefined,
        affiliateLink: form.affiliateLink || undefined,
        category: form.category || undefined,
        maxOffer: form.maxOffer !== '' ? Number(form.maxOffer) : undefined,
        abbr: form.abbr || undefined,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        published: form.published,
        ...imagePatch,
      }
      await updateStore(store._id, patch)
      onSaved()
    })
  }

  const handleDelete = () => {
    if (!confirm('Xóa store này? Tất cả offer liên quan sẽ bị xóa theo.')) return
    startTransition(async () => {
      const result = await deleteStore(store._id)
      if (result.ok) onDeleted()
      else alert(`Không thể xóa: ${result.error}`)
    })
  }

  return (
    <div className="oa-modal-bg">
      <div className="oa-modal oa-modal-lg">
        <div className="oa-modal-head">
          <span>Chỉnh sửa Store</span>
          <button className="oa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="oa-modal-body" onSubmit={handleSubmit}>
          <div className="oa-modal-row">
            <label className="oa-label">Tên Store *
              <input className="oa-input" value={form.name} onChange={e => set('name', e.target.value)} required />
            </label>
            <label className="oa-label">Slug (URL) *
              <input
                className={`oa-input${slugError ? ' oa-input-error' : ''}`}
                value={form.slug}
                onChange={e => { set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-')); setSlugError('') }}
                onBlur={handleSlugBlur}
                required
              />
              {slugError && <span className="oa-field-error">{slugError}</span>}
            </label>
          </div>
          <div className="oa-modal-row">
            <label className="oa-label">Website URL
              <input className="oa-input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://example.com" />
            </label>
            <label className="oa-label">Affiliate Link
              <input className="oa-input" value={form.affiliateLink} onChange={e => set('affiliateLink', e.target.value)} placeholder="https://..." />
            </label>
          </div>
          <div className="oa-modal-row">
            <label className="oa-label">Danh mục
              <select className="oa-input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c: AdminCategory) => <option key={c.value} value={c.value}>{c.emoji ? `${c.emoji} ${c.label}` : c.label}</option>)}
              </select>
            </label>
            <label className="oa-label">Max Offer (%)
              <input className="oa-input" type="number" min={1} max={100} value={form.maxOffer} onChange={e => set('maxOffer', e.target.value)} placeholder="VD: 70" />
            </label>
            <label className="oa-label">Viết tắt
              <input className="oa-input" value={form.abbr} onChange={e => set('abbr', e.target.value.slice(0, 3))} maxLength={3} placeholder="VD: Am" />
            </label>
          </div>
          <label className="oa-label">Mô tả ngắn (tagline)
            <input className="oa-input" value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} placeholder="1 câu ngắn gọn về store" />
          </label>
          <label className="oa-label">About Store (HTML)
            <textarea className="oa-input oa-textarea" rows={5} value={form.description} onChange={e => set('description', e.target.value)} placeholder={'<p>Mô tả về store...</p>\n<b>Bold</b>, <i>italic</i>, <br> đều được hỗ trợ'} />
          </label>
          <div className="oa-label">Logo / Ảnh đại diện
            <div className="oa-img-upload">
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="oa-img-preview" onError={e => (e.currentTarget.style.display = 'none')} />
                : <div className="oa-img-placeholder">{form.abbr || form.name.slice(0, 2).toUpperCase()}</div>
              }
              <input
                className="oa-input"
                style={{ flex: 1 }}
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Dán URL ảnh — khi lưu sẽ tự tải lên Sanity CDN</span>
          </div>
          <label className="oa-label">Duyệt — Hiện trên website
            <select className="oa-input" value={form.published ? '1' : '0'} onChange={e => set('published', e.target.value === '1')}>
              <option value="1">Có — Đang hiện</option>
              <option value="0">Không — Ẩn đi</option>
            </select>
          </label>
          <div className="oa-modal-footer">
            <button type="button" className="oa-btn oa-btn-red" onClick={handleDelete} disabled={isPending}>🗑 Xóa</button>
            <div style={{ flex: 1 }} />
            <button type="button" className="oa-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="oa-btn oa-btn-green" disabled={isPending || !!slugError}>{isPending ? 'Đang lưu...' : '💾 Lưu thay đổi'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddStoreModal({ categories, onClose, onCreated }: {
  categories: AdminCategory[]
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({ name: '', slug: '', website: '', affiliateLink: '', category: '', maxOffer: '', abbr: '', shortDescription: '', description: '', published: true })
  const [logoUrl, setLogoUrl] = useState('')
  const [isPending, startTransition] = useTransition()
  const [slugError, setSlugError] = useState('')
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    setForm(f => ({ ...f, name, slug }))
    setSlugError('')
  }

  const handleSlugBlur = async () => {
    if (!form.slug) return
    const exists = await checkStoreSlug(form.slug)
    setSlugError(exists ? `Slug "${form.slug}" đã tồn tại, vui lòng chọn slug khác` : '')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.slug || slugError) return
    startTransition(async () => {
      const exists = await checkStoreSlug(form.slug)
      if (exists) { setSlugError(`Slug "${form.slug}" đã tồn tại, vui lòng chọn slug khác`); return }
      let imageRef: { _type: string; asset: { _type: string; _ref: string } } | undefined
      if (logoUrl) {
        try {
          const result = await uploadStoreImageFromUrl(logoUrl)
          if (result) imageRef = result
        } catch { /* bỏ qua nếu URL lỗi */ }
      }
      const doc = await createStore({
        name: form.name,
        slug: form.slug,
        website: form.website || undefined,
        affiliateLink: form.affiliateLink || undefined,
        category: form.category || undefined,
        maxOffer: form.maxOffer !== '' ? Number(form.maxOffer) : undefined,
        abbr: form.abbr || undefined,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        published: form.published,
      })
      if (imageRef) await updateStore(doc._id, { image: imageRef })
      onCreated()
    })
  }

  return (
    <div className="oa-modal-bg">
      <div className="oa-modal oa-modal-lg">
        <div className="oa-modal-head">
          <span>Thêm Store mới</span>
          <button className="oa-modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="oa-modal-body" onSubmit={handleSubmit}>
          <div className="oa-modal-row">
            <label className="oa-label">Tên Store *
              <input className="oa-input" value={form.name} onChange={e => handleNameChange(e.target.value)} required />
            </label>
            <label className="oa-label">Slug (URL) *
              <input
                className={`oa-input${slugError ? ' oa-input-error' : ''}`}
                value={form.slug}
                onChange={e => { set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-')); setSlugError('') }}
                onBlur={handleSlugBlur}
                required
              />
              {slugError && <span className="oa-field-error">{slugError}</span>}
            </label>
          </div>
          <div className="oa-modal-row">
            <label className="oa-label">Website URL
              <input className="oa-input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://example.com" />
            </label>
            <label className="oa-label">Affiliate Link
              <input className="oa-input" value={form.affiliateLink} onChange={e => set('affiliateLink', e.target.value)} placeholder="https://..." />
            </label>
          </div>
          <div className="oa-modal-row">
            <label className="oa-label">Danh mục
              <select className="oa-input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c: AdminCategory) => <option key={c.value} value={c.value}>{c.emoji ? `${c.emoji} ${c.label}` : c.label}</option>)}
              </select>
            </label>
            <label className="oa-label">Max Offer (%)
              <input className="oa-input" type="number" min={1} max={100} value={form.maxOffer} onChange={e => set('maxOffer', e.target.value)} placeholder="VD: 70" />
            </label>
          </div>
          <label className="oa-label">Mô tả ngắn
            <input className="oa-input" value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} placeholder="1 câu ngắn gọn về store" />
          </label>
          <label className="oa-label">About Store (HTML)
            <textarea className="oa-input oa-textarea" rows={5} value={form.description} onChange={e => set('description', e.target.value)} placeholder={'<p>Mô tả về store...</p>\n<b>Bold</b>, <i>italic</i>, <br> đều được hỗ trợ'} />
          </label>
          <div className="oa-label">Logo / Ảnh đại diện
            <div className="oa-img-upload">
              {logoUrl
                ? <img src={logoUrl} alt="Logo" className="oa-img-preview" onError={e => (e.currentTarget.style.display = 'none')} />
                : <div className="oa-img-placeholder">{form.name ? form.name.slice(0, 2).toUpperCase() : '?'}</div>
              }
              <input
                className="oa-input"
                style={{ flex: 1 }}
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Dán URL ảnh — khi lưu sẽ tự tải lên Sanity CDN</span>
          </div>
          <label className="oa-label">Duyệt — Hiện trên website
            <select className="oa-input" value={form.published ? '1' : '0'} onChange={e => set('published', e.target.value === '1')}>
              <option value="1">Có — Đang hiện</option>
              <option value="0">Không — Ẩn đi</option>
            </select>
          </label>
          <div className="oa-modal-footer">
            <button type="button" className="oa-btn" onClick={onClose}>Hủy</button>
            <button type="submit" className="oa-btn oa-btn-green" disabled={isPending || !!slugError}>{isPending ? 'Đang thêm...' : 'Thêm mới'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
