'use client'

import { useState, useTransition } from 'react'
import { saveConfigDoc } from '../actions'

type Step = { title: string; description: string }
type Faq = { question: string; answer: string }

export default function ContentConfigForm({ initial }: { initial: Record<string, unknown> }) {
  const [dealsPerPage, setDealsPerPage] = useState(Number(initial.dealsPerPage ?? 8))
  const [reviewsPerPage, setReviewsPerPage] = useState(Number(initial.reviewsPerPage ?? 8))
  const [postsPerPage, setPostsPerPage] = useState(Number(initial.postsPerPage ?? 9))
  const [showExpiringBand, setShowExpiringBand] = useState(initial.showExpiringBand !== false)
  const [showVerifiedBadge, setShowVerifiedBadge] = useState(initial.showVerifiedBadge !== false)
  const [showCategoryGrid, setShowCategoryGrid] = useState(initial.showCategoryGrid !== false)
  const [dealsGridColumns, setDealsGridColumns] = useState(Number(initial.dealsGridColumns ?? 4))
  const [reviewsGridColumns, setReviewsGridColumns] = useState(Number(initial.reviewsGridColumns ?? 4))
  const [blogGridColumns, setBlogGridColumns] = useState(Number(initial.blogGridColumns ?? 3))
  const [announcementBar, setAnnouncementBar] = useState(String(initial.announcementBar ?? ''))
  const [announcementBarUrl, setAnnouncementBarUrl] = useState(String(initial.announcementBarUrl ?? ''))
  const [defaultOfferDescription, setDefaultOfferDescription] = useState(String(initial.defaultOfferDescription ?? ''))
  const [howToSteps, setHowToSteps] = useState<Step[]>((initial.howToSteps as Step[]) ?? [])
  const [defaultFaqs, setDefaultFaqs] = useState<Faq[]>((initial.defaultFaqs as Faq[]) ?? [])
  const [articleDisclaimer, setArticleDisclaimer] = useState(String(initial.articleDisclaimer ?? ''))
  const [articleReviewedBy, setArticleReviewedBy] = useState(String(initial.articleReviewedBy ?? ''))
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await saveConfigDoc('configContent', {
        dealsPerPage, reviewsPerPage, postsPerPage, showExpiringBand, showVerifiedBadge, showCategoryGrid,
        dealsGridColumns, reviewsGridColumns, blogGridColumns, announcementBar: announcementBar || null,
        announcementBarUrl: announcementBarUrl || null,
        defaultOfferDescription: defaultOfferDescription || null,
        howToSteps: howToSteps.map(s => ({ _type: 'step', _key: crypto.randomUUID(), ...s })),
        defaultFaqs: defaultFaqs.map(f => ({ _type: 'faq', _key: crypto.randomUUID(), ...f })),
        articleDisclaimer: articleDisclaimer || null,
        articleReviewedBy: articleReviewedBy || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const updateStep = (i: number, k: keyof Step, v: string) =>
    setHowToSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s))
  const removeStep = (i: number) => setHowToSteps(prev => prev.filter((_, idx) => idx !== i))
  const addStep = () => setHowToSteps(prev => [...prev, { title: '', description: '' }])

  const updateFaq = (i: number, k: keyof Faq, v: string) =>
    setDefaultFaqs(prev => prev.map((f, idx) => idx === i ? { ...f, [k]: v } : f))
  const removeFaq = (i: number) => setDefaultFaqs(prev => prev.filter((_, idx) => idx !== i))
  const addFaq = () => setDefaultFaqs(prev => [...prev, { question: '', answer: '' }])

  return (
    <div className="cfg-wrap">
      <div className="cfg-header cfg-header-row">
        <div>
          <a href="/admin/config" className="cfg-back">← Cấu hình</a>
          <h1 className="cfg-title">Cấu hình nội dung</h1>
          <p className="cfg-subtitle">Quản lý nội dung hiển thị mặc định trên toàn site</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {saved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Đã lưu!</span>}
          <button className="cfg-save-btn" onClick={handleSave} disabled={isPending}>
            {isPending ? 'Đang lưu...' : '💾 Lưu cấu hình'}
          </button>
        </div>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Số lượng hiển thị</div>
        <div className="cfg-row">
          <label className="cfg-label">Deals / trang
            <input className="cfg-input" type="number" min={4} max={24} value={dealsPerPage} onChange={e => setDealsPerPage(Number(e.target.value))} />
          </label>
          <label className="cfg-label">Reviews / trang
            <input className="cfg-input" type="number" min={4} max={24} value={reviewsPerPage} onChange={e => setReviewsPerPage(Number(e.target.value))} />
          </label>
          <label className="cfg-label">Blog posts / trang
            <input className="cfg-input" type="number" min={3} max={24} value={postsPerPage} onChange={e => setPostsPerPage(Number(e.target.value))} />
          </label>
          <label className="cfg-label">Cột lưới deals
            <select className="cfg-input cfg-select" value={dealsGridColumns} onChange={e => setDealsGridColumns(Number(e.target.value))}>
              <option value={3}>3 cột</option>
              <option value={4}>4 cột</option>
              <option value={5}>5 cột</option>
              <option value={6}>6 cột</option>
            </select>
          </label>
          <label className="cfg-label">Cột lưới reviews (trang chủ)
            <select className="cfg-input cfg-select" value={reviewsGridColumns} onChange={e => setReviewsGridColumns(Number(e.target.value))}>
              <option value={2}>2 cột</option>
              <option value={3}>3 cột</option>
              <option value={4}>4 cột</option>
              <option value={5}>5 cột</option>
            </select>
          </label>
          <label className="cfg-label">Cột lưới blog (trang /blog)
            <select className="cfg-input cfg-select" value={blogGridColumns} onChange={e => setBlogGridColumns(Number(e.target.value))}>
              <option value={2}>2 cột</option>
              <option value={3}>3 cột</option>
              <option value={4}>4 cột</option>
            </select>
          </label>
        </div>
        <label className="cfg-check-row">
          <input type="checkbox" checked={showExpiringBand} onChange={e => setShowExpiringBand(e.target.checked)} />
          <div><div className="cfg-check-label">Hiển thị dải "Expiring Soon"</div></div>
        </label>
        <label className="cfg-check-row">
          <input type="checkbox" checked={showVerifiedBadge} onChange={e => setShowVerifiedBadge(e.target.checked)} />
          <div><div className="cfg-check-label">Hiển thị badge Verified trên mỗi deal</div></div>
        </label>
        <label className="cfg-check-row">
          <input type="checkbox" checked={showCategoryGrid} onChange={e => setShowCategoryGrid(e.target.checked)} />
          <div><div className="cfg-check-label">Hiển thị khối "Browse by Category" trên trang chủ</div></div>
        </label>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Thông báo banner</div>
        <label className="cfg-label">Nội dung thông báo
          <span className="cfg-desc">Để trống để ẩn banner. Hiển thị phía trên header.</span>
          <input className="cfg-input" value={announcementBar} onChange={e => setAnnouncementBar(e.target.value)} placeholder="🎉 Prime Day sắp đến — Theo dõi để nhận alert!" />
        </label>
        <label className="cfg-label">Link khi click vào banner
          <input className="cfg-input" value={announcementBarUrl} onChange={e => setAnnouncementBarUrl(e.target.value)} placeholder="https://..." />
        </label>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Mô tả offer mặc định</div>
        <label className="cfg-label">Mỗi dòng = 1 mô tả riêng. Dùng {'{store}'} để chèn tên cửa hàng.
          <textarea className="cfg-input cfg-textarea" rows={5} value={defaultOfferDescription} onChange={e => setDefaultOfferDescription(e.target.value)} placeholder={'Mua sắm tại {store} với ưu đãi độc quyền\nTiết kiệm hơn khi mua tại {store}'} />
        </label>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Hướng dẫn 3 bước (áp dụng toàn site)</div>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Dùng {'{store}'} để tự chèn tên cửa hàng.</p>
        <div className="cfg-array-wrap">
          {howToSteps.length === 0 && <div className="cfg-array-empty">Chưa có bước nào — nhấn Thêm để tạo</div>}
          {howToSteps.map((step, i) => (
            <div key={i} className="cfg-array-item">
              <div className="cfg-array-fields">
                <input className="cfg-input" placeholder={`Bước ${i+1}: Tiêu đề`} value={step.title} onChange={e => updateStep(i, 'title', e.target.value)} />
                <textarea className="cfg-input cfg-textarea" rows={2} placeholder="Mô tả..." value={step.description} onChange={e => updateStep(i, 'description', e.target.value)} />
              </div>
              <button type="button" className="cfg-array-remove" onClick={() => removeStep(i)}>×</button>
            </div>
          ))}
        </div>
        <button type="button" className="cfg-add-btn" onClick={addStep}>＋ Thêm bước</button>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">FAQ mặc định (áp dụng toàn site)</div>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Dùng {'{store}'} để chèn tên cửa hàng.</p>
        <div className="cfg-array-wrap">
          {defaultFaqs.length === 0 && <div className="cfg-array-empty">Chưa có câu hỏi nào — nhấn Thêm để tạo</div>}
          {defaultFaqs.map((faq, i) => (
            <div key={i} className="cfg-array-item">
              <div className="cfg-array-fields">
                <input className="cfg-input" placeholder="Câu hỏi..." value={faq.question} onChange={e => updateFaq(i, 'question', e.target.value)} />
                <textarea className="cfg-input cfg-textarea" rows={2} placeholder="Trả lời..." value={faq.answer} onChange={e => updateFaq(i, 'answer', e.target.value)} />
              </div>
              <button type="button" className="cfg-array-remove" onClick={() => removeFaq(i)}>×</button>
            </div>
          ))}
        </div>
        <button type="button" className="cfg-add-btn" onClick={addFaq}>＋ Thêm câu hỏi</button>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Chân trang bài viết (Review &amp; Store)</div>
        <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>Hiển thị ở cuối mỗi bài review và trang store. Để trống để ẩn.</p>
        <label className="cfg-label">Câu disclaimer affiliate
          <span className="cfg-desc">Dùng {'{store}'} để chèn tên cửa hàng, {'{site}'} để chèn tên website.</span>
          <textarea
            className="cfg-input cfg-textarea"
            rows={4}
            value={articleDisclaimer}
            onChange={e => setArticleDisclaimer(e.target.value)}
            placeholder="This page contains affiliate links. {site} may earn a commission when you click through and complete a qualifying purchase at no extra cost to you."
          />
        </label>
        <label className="cfg-label">Tên team biên tập
          <span className="cfg-desc">Hiện ở dòng &quot;Reviewed by the ...&quot;</span>
          <input
            className="cfg-input"
            value={articleReviewedBy}
            onChange={e => setArticleReviewedBy(e.target.value)}
            placeholder="Offerdy Editorial Team"
          />
        </label>
      </div>

      <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="cfg-save-btn" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Đang lưu...' : '💾 Lưu cấu hình'}
        </button>
        {saved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Đã lưu!</span>}
      </div>
    </div>
  )
}
