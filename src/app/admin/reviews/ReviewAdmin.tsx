'use client'

import { useState, useTransition } from 'react'
import {
  updateReview, deleteReview, createReview, uploadReviewImage, checkReviewSlug,
  scrapeProductLink, generateReviewDraft,
} from './actions'
import type { ScrapedProduct } from '@/lib/ai/scrapeProductPage'
import AdminPagination from '../_components/AdminPagination'
import { useAdminUrlState } from '../_components/useAdminUrlState'
import { useUrlPage } from '../_components/useUrlPage'
import { ADMIN_PAGE_SIZE } from '@/lib/adminPagination'

type FaqItem = { question: string; answer: string }
type ProsAndCons = { pros: string[]; cons: string[] }

type AdminReview = {
  _id: string; title: string; slug: string; tag: string; author?: string
  publishedAt?: string; excerpt?: string; content?: string; imageUrl?: string; _createdAt: string
  stars?: number; imgBg?: string; productUrl?: string; affiliateUrl?: string
  faq?: FaqItem[]; prosAndCons?: ProsAndCons; metaTitle?: string; metaDescription?: string
}

function parseFaqText(text: string): FaqItem[] {
  return text.split(/\n\s*\n/).map(block => {
    const [question, ...rest] = block.split('\n')
    return { question: (question ?? '').trim(), answer: rest.join('\n').trim() }
  }).filter(f => f.question && f.answer)
}

function faqToText(faq?: FaqItem[]): string {
  return (faq ?? []).map(f => `${f.question}\n${f.answer}`).join('\n\n')
}

function linesToList(text: string): string[] {
  return text.split('\n').map(s => s.trim()).filter(Boolean)
}

function listToLines(list?: string[]): string {
  return (list ?? []).join('\n')
}

const GRADIENT_PRESETS: { label: string; value: string }[] = [
  { label: 'Xanh dương', value: 'linear-gradient(135deg,#EFF6FF,#BFDBFE)' },
  { label: 'Hồng', value: 'linear-gradient(135deg,#FDF2F8,#FBCFE8)' },
  { label: 'Xanh lá', value: 'linear-gradient(135deg,#F0FDF4,#BBF7D0)' },
  { label: 'Tím', value: 'linear-gradient(135deg,#FAF5FF,#E9D5FF)' },
  { label: 'Cam', value: 'linear-gradient(135deg,#FFF7ED,#FED7AA)' },
]

export default function ReviewAdmin({ initialReviews }: { initialReviews: AdminReview[] }) {
  const [reviews, setReviews] = useState(initialReviews)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('all')
  const [editingReview, setEditingReview] = useState<AdminReview | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const page = useUrlPage()
  const { setParams } = useAdminUrlState()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const filtered = reviews.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase())
    const matchTag = tagFilter === 'all' || r.tag === tagFilter
    return matchSearch && matchTag
  })

  const totalPages = Math.ceil(filtered.length / ADMIN_PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE)

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
          <input className="oa-search" placeholder="Tìm review..." value={search} onChange={e => { setSearch(e.target.value); setParams({}) }} />
          <select className="oa-select" value={tagFilter} onChange={e => { setTagFilter(e.target.value); setParams({}) }}>
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
                <td className="oa-td-num">{(page-1)*ADMIN_PAGE_SIZE+i+1}</td>
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
          {filtered.length > 0 ? `${(page-1)*ADMIN_PAGE_SIZE+1}–${Math.min(page*ADMIN_PAGE_SIZE, filtered.length)} / ${filtered.length} review` : '0 review'}
          {filtered.length !== reviews.length && ` (tổng ${reviews.length})`}
        </div>
        <AdminPagination page={page} totalPages={totalPages} />
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
    stars: initial?.stars ? String(initial.stars) : '',
    imgBg: initial?.imgBg ?? '',
    metaTitle: initial?.metaTitle ?? '', metaDescription: initial?.metaDescription ?? '',
    productUrl: initial?.productUrl ?? '', affiliateUrl: initial?.affiliateUrl ?? '',
    faqText: faqToText(initial?.faq),
    prosText: listToLines(initial?.prosAndCons?.pros), consText: listToLines(initial?.prosAndCons?.cons),
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(initial?.imageUrl ?? '')
  const [imageError, setImageError] = useState('')
  const [preUploadedImage, setPreUploadedImage] = useState<unknown>(null)
  const [isPending, startTransition] = useTransition()
  const [slugError, setSlugError] = useState('')
  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const [showSeo, setShowSeo] = useState(false)

  // Link Affiliate mac dinh = Link san pham cho den khi admin tu go sua rieng
  const [affiliateTouched, setAffiliateTouched] = useState(!!initial?.affiliateUrl)
  const handleProductUrlChange = (url: string) => {
    setForm(f => ({ ...f, productUrl: url, affiliateUrl: affiliateTouched ? f.affiliateUrl : url }))
  }
  const handleAffiliateUrlChange = (url: string) => {
    set('affiliateUrl', url)
    setAffiliateTouched(true)
  }

  // ── AI Review Writer (dung duoc ca mode add lan edit — de backfill anh/noi dung cho bai da co) ──
  const [aiOpen, setAiOpen] = useState(false)
  const [aiProductUrl, setAiProductUrl] = useState(initial?.productUrl ?? '')
  const [aiAffiliateUrl, setAiAffiliateUrl] = useState(initial?.affiliateUrl ?? '')
  const [aiAffiliateTouched, setAiAffiliateTouched] = useState(!!initial?.affiliateUrl)
  const [aiStage, setAiStage] = useState<'idle' | 'scraping' | 'scraped' | 'generating'>('idle')
  const [aiError, setAiError] = useState('')
  const [scraped, setScraped] = useState<ScrapedProduct | null>(null)
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set())

  // Link Affiliate mac dinh = Link san pham cho den khi admin tu go sua rieng
  // (giong cach slug tu sinh tu title cho den khi admin sua slug tay)
  const handleAiProductUrlChange = (url: string) => {
    setAiProductUrl(url)
    if (!aiAffiliateTouched) setAiAffiliateUrl(url)
  }
  const handleAiAffiliateUrlChange = (url: string) => {
    setAiAffiliateUrl(url)
    setAiAffiliateTouched(true)
  }

  const handleScrape = () => {
    if (!aiProductUrl) return
    setAiError('')
    setAiStage('scraping')
    startTransition(async () => {
      const res = await scrapeProductLink(aiProductUrl)
      if ('error' in res) {
        setAiError(res.error)
        setAiStage('idle')
        return
      }
      setScraped(res)
      setSelectedImages(new Set(res.images.map((_, i) => i)))
      setAiStage('scraped')
    })
  }

  const handleGenerateAi = () => {
    if (!scraped) return
    setAiError('')
    setAiStage('generating')
    startTransition(async () => {
      const selectedImageUrls = scraped.images.filter((_, i) => selectedImages.has(i))
      const result = await generateReviewDraft({
        productUrl: aiProductUrl,
        affiliateUrl: aiAffiliateUrl || undefined,
        scraped,
        selectedImageUrls,
      })
      if ('error' in result) {
        setAiError(result.error)
        setAiStage('scraped')
        return
      }
      // Mode edit: giu nguyen slug/URL bai da co, khong de AI doi link bai dang ton tai
      const slug = mode === 'add'
        ? result.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        : form.slug
      setForm(f => ({
        ...f,
        title: result.title, slug, excerpt: result.excerpt, content: result.content,
        stars: String(result.stars), imgBg: result.imgBg,
        metaTitle: result.metaTitle, metaDescription: result.metaDescription,
        faqText: faqToText(result.faq),
        prosText: listToLines(result.prosAndCons.pros), consText: listToLines(result.prosAndCons.cons),
        productUrl: aiProductUrl, affiliateUrl: aiAffiliateUrl,
      }))
      setAffiliateTouched(true)
      if (result.image) {
        setPreUploadedImage(result.image)
        setImagePreview(result.imageUrl ?? '')
        setImageFile(null)
      }
      setAiStage('scraped')
      setAiOpen(false)
    })
  }

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
      let image: unknown = preUploadedImage ?? undefined
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
      const faq = parseFaqText(form.faqText)
      const pros = linesToList(form.prosText)
      const cons = linesToList(form.consText)
      const prosAndCons = (pros.length || cons.length) ? { pros, cons } : null
      // null (khong phai undefined) de bao "xoa field nay" - undefined khong "song sot" qua Server Action
      const data = {
        title: form.title, slug: form.slug, tag: form.tag,
        author: form.author || null,
        publishedAt: form.publishedAt,
        excerpt: form.excerpt || null,
        content: form.content || null,
        ...(image ? { image } : {}),
        externalImageUrl: (!image && form.externalImageUrl) ? form.externalImageUrl : null,
        stars: form.stars ? Number(form.stars) : null,
        imgBg: form.imgBg || null,
        productUrl: form.productUrl || null,
        affiliateUrl: form.affiliateUrl || null,
        faq: faq.length ? faq : null,
        prosAndCons,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
      }
      const localData = {
        title: data.title, slug: data.slug, tag: data.tag,
        author: data.author ?? undefined,
        publishedAt: data.publishedAt,
        excerpt: data.excerpt ?? undefined,
        content: data.content ?? undefined,
        stars: data.stars ?? undefined,
        imgBg: data.imgBg ?? undefined,
        productUrl: data.productUrl ?? undefined,
        affiliateUrl: data.affiliateUrl ?? undefined,
        faq: data.faq ?? undefined,
        prosAndCons: data.prosAndCons ?? undefined,
        metaTitle: data.metaTitle ?? undefined,
        metaDescription: data.metaDescription ?? undefined,
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
          <div style={{ border: '1.5px dashed var(--green-100, #DCFCE7)', background: 'var(--green-50, #F0FDF4)', borderRadius: 10, padding: 14, marginBottom: 4 }}>
            <button type="button" onClick={() => setAiOpen(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14, fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
              ✨ {mode === 'add' ? 'Tạo bài bằng AI từ link sản phẩm' : 'Viết lại bằng AI từ link sản phẩm'} {aiOpen ? '▲' : '▼'}
            </button>
              {aiOpen && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label className="oa-label">Link sản phẩm (để AI đọc dữ liệu) *
                    <input className="oa-input" type="url" placeholder="https://shop.com/san-pham-abc"
                      value={aiProductUrl} onChange={e => handleAiProductUrlChange(e.target.value)} />
                  </label>
                  <label className="oa-label">Link Affiliate (chèn vào bài — mặc định = link sản phẩm, sửa lại nếu có link tracking riêng)
                    <input className="oa-input" type="url" placeholder="https://affiliate-network.com/track?..."
                      value={aiAffiliateUrl} onChange={e => handleAiAffiliateUrlChange(e.target.value)} />
                  </label>
                  <div>
                    <button type="button" className="oa-btn" onClick={handleScrape}
                      disabled={!aiProductUrl || aiStage === 'scraping' || aiStage === 'generating'}>
                      {aiStage === 'scraping' ? 'Đang lấy dữ liệu...' : '🔍 Lấy thông tin sản phẩm'}
                    </button>
                  </div>
                  {aiError && <span className="oa-field-error">{aiError} — bạn vẫn có thể điền tay bên dưới.</span>}
                  {scraped && (
                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{scraped.title}</div>
                      {scraped.description && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{scraped.description.slice(0, 180)}</div>}
                      {scraped.price && <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700, marginTop: 4 }}>{scraped.price} {scraped.currency ?? ''}</div>}
                      {scraped.images.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                          {scraped.images.map((url, i) => (
                            <label key={url} style={{ position: 'relative', cursor: 'pointer' }}>
                              <img src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: selectedImages.has(i) ? '2px solid #16a34a' : '1px solid #e5e7eb', opacity: selectedImages.has(i) ? 1 : 0.4 }} />
                              <input type="checkbox" checked={selectedImages.has(i)} style={{ position: 'absolute', top: 4, left: 4 }}
                                onChange={() => setSelectedImages(prev => {
                                  const s = new Set(prev)
                                  s.has(i) ? s.delete(i) : s.add(i)
                                  return s
                                })} />
                            </label>
                          ))}
                        </div>
                      )}
                      <div style={{ marginTop: 12 }}>
                        <button type="button" className="oa-btn oa-btn-green" onClick={handleGenerateAi} disabled={aiStage === 'generating'}>
                          {aiStage === 'generating' ? 'AI đang viết bài...' : '✍️ Viết bài bằng AI'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
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

          <div className="oa-modal-row">
            <label className="oa-label">Số sao (1-5)
              <input className="oa-input" type="number" min={1} max={5} value={form.stars} onChange={e => set('stars', e.target.value)} />
            </label>
            <label className="oa-label" style={{ flex: 2 }}>Tông màu nền (gradient)
              <input className="oa-input" value={form.imgBg} onChange={e => set('imgBg', e.target.value)} placeholder="linear-gradient(135deg,#EEF2FF,#C7D2FE)" />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {GRADIENT_PRESETS.map(p => (
                  <button key={p.value} type="button" title={p.label} onClick={() => set('imgBg', p.value)}
                    style={{ width: 22, height: 22, borderRadius: 6, background: p.value, border: form.imgBg === p.value ? '2px solid #16a34a' : '1px solid #e5e7eb', cursor: 'pointer' }} />
                ))}
              </div>
            </label>
          </div>

          <div className="oa-modal-row">
            <label className="oa-label">Link sản phẩm<input className="oa-input" type="url" value={form.productUrl} onChange={e => handleProductUrlChange(e.target.value)} /></label>
            <label className="oa-label">Link Affiliate (mặc định = link sản phẩm)<input className="oa-input" type="url" value={form.affiliateUrl} onChange={e => handleAffiliateUrlChange(e.target.value)} /></label>
          </div>

          <div className="oa-modal-row">
            <label className="oa-label">Pros (mỗi dòng 1 ý)
              <textarea className="oa-input oa-textarea" rows={4} value={form.prosText} onChange={e => set('prosText', e.target.value)}
                placeholder={'Ưu điểm 1\nƯu điểm 2'} style={{ fontSize: 13 }} />
            </label>
            <label className="oa-label">Cons (mỗi dòng 1 ý)
              <textarea className="oa-input oa-textarea" rows={4} value={form.consText} onChange={e => set('consText', e.target.value)}
                placeholder={'Nhược điểm 1\nNhược điểm 2'} style={{ fontSize: 13 }} />
            </label>
          </div>

          <label className="oa-label">FAQ (mỗi câu hỏi/trả lời cách nhau 1 dòng trống)
            <textarea className="oa-input oa-textarea" rows={6} value={form.faqText} onChange={e => set('faqText', e.target.value)}
              placeholder={'Câu hỏi 1?\nTrả lời 1\n\nCâu hỏi 2?\nTrả lời 2'} style={{ fontSize: 13 }} />
          </label>

          <div>
            <button type="button" onClick={() => setShowSeo(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 700, color: '#6b7280' }}>
              SEO nâng cao {showSeo ? '▲' : '▼'}
            </button>
            {showSeo && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label className="oa-label">Meta Title<input className="oa-input" value={form.metaTitle} onChange={e => set('metaTitle', e.target.value)} /></label>
                <label className="oa-label">Meta Description<textarea className="oa-input oa-textarea" rows={2} value={form.metaDescription} onChange={e => set('metaDescription', e.target.value)} /></label>
              </div>
            )}
          </div>

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
