'use client'

import { useState, useTransition } from 'react'
import { saveConfigDoc } from '../actions'

export default function SEOConfigForm({ initial }: { initial: Record<string, unknown> }) {
  const [titleTemplate, setTitleTemplate] = useState(String(initial.titleTemplate ?? ''))
  const [defaultTitle, setDefaultTitle] = useState(String(initial.defaultTitle ?? ''))
  const [defaultDescription, setDefaultDescription] = useState(String(initial.defaultDescription ?? ''))
  const [canonicalUrl, setCanonicalUrl] = useState(String(initial.canonicalUrl ?? ''))
  const [googleSiteVerification, setGoogleSiteVerification] = useState(String(initial.googleSiteVerification ?? ''))
  const [twitterCard, setTwitterCard] = useState(String(initial.twitterCard ?? 'summary_large_image'))
  const [keywords, setKeywords] = useState<string[]>((initial.keywords as string[]) ?? [])
  const [kwInput, setKwInput] = useState('')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const addKeyword = () => {
    const kw = kwInput.trim()
    if (kw && !keywords.includes(kw)) setKeywords(prev => [...prev, kw])
    setKwInput('')
  }

  const handleSave = () => {
    startTransition(async () => {
      await saveConfigDoc('configSEO', {
        titleTemplate: titleTemplate || null,
        defaultTitle: defaultTitle || null,
        defaultDescription: defaultDescription || null,
        canonicalUrl: canonicalUrl || null,
        googleSiteVerification: googleSiteVerification || null,
        twitterCard: twitterCard || null,
        keywords: keywords.length > 0 ? keywords : null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="cfg-wrap">
      <div className="cfg-header">
        <a href="/admin/config" className="cfg-back">← Cấu hình</a>
        <h1 className="cfg-title">Cấu hình SEO</h1>
        <p className="cfg-subtitle">Meta tags, Open Graph, và cài đặt tìm kiếm</p>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Tiêu đề trang</div>
        <label className="cfg-label">Template tiêu đề
          <span className="cfg-desc">Dùng %s để đặt tên trang. VD: %s | Offerdy</span>
          <input className="cfg-input" value={titleTemplate} onChange={e => setTitleTemplate(e.target.value)} placeholder="%s | Offerdy — Real Deals. Verified." />
        </label>
        <label className="cfg-label">Tiêu đề mặc định (trang chủ)
          <input className="cfg-input" value={defaultTitle} onChange={e => setDefaultTitle(e.target.value)} placeholder="Offerdy — Real Deals. Verified." />
        </label>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Meta & Open Graph</div>
        <label className="cfg-label">Meta description mặc định
          <span className="cfg-desc">~155 ký tự. Hiển thị trên Google khi không có description riêng.</span>
          <textarea className="cfg-input cfg-textarea" rows={3} value={defaultDescription} onChange={e => setDefaultDescription(e.target.value)} />
        </label>
        <label className="cfg-label">Canonical URL
          <span className="cfg-desc">Domain chính. VD: https://offerdy.com</span>
          <input className="cfg-input" value={canonicalUrl} onChange={e => setCanonicalUrl(e.target.value)} placeholder="https://offerdy.com" />
        </label>
        <label className="cfg-label">Twitter Card
          <select className="cfg-input cfg-select" value={twitterCard} onChange={e => setTwitterCard(e.target.value)}>
            <option value="summary">Summary</option>
            <option value="summary_large_image">Summary Large Image</option>
          </select>
        </label>
        <div className="cfg-image-note">Ảnh Open Graph mặc định — upload qua <strong>Sanity Studio</strong>.</div>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Từ khóa chung</div>
        <div className="cfg-tag-wrap">
          {keywords.map(kw => (
            <span key={kw} className="cfg-tag">
              {kw}
              <button type="button" className="cfg-tag-remove" onClick={() => setKeywords(prev => prev.filter(k => k !== kw))}>×</button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="cfg-input" value={kwInput} onChange={e => setKwInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addKeyword())} placeholder="Nhập từ khóa rồi nhấn Enter..." />
          <button type="button" className="cfg-save-btn" style={{ flexShrink: 0, padding: '0 16px' }} onClick={addKeyword}>Thêm</button>
        </div>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Xác minh website</div>
        <label className="cfg-label">Google Site Verification
          <span className="cfg-desc">Mã xác minh từ Google Search Console</span>
          <input className="cfg-input" value={googleSiteVerification} onChange={e => setGoogleSiteVerification(e.target.value)} placeholder="abc123..." />
        </label>
      </div>

      <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="cfg-save-btn" onClick={handleSave} disabled={isPending}>{isPending ? 'Đang lưu...' : '💾 Lưu cấu hình'}</button>
        {saved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Đã lưu!</span>}
      </div>
    </div>
  )
}
