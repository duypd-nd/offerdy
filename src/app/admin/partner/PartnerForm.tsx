'use client'

import { useState, useTransition } from 'react'
import { savePartnerPage, type PartnerData, type Benefit } from './actions'

const DEFAULTS: Required<PartnerData> = {
  h1: 'Partner with Offerdy',
  heroLead: 'We work with brands, retailers, and affiliate networks to bring verified deals to shoppers worldwide. Let\'s grow together.',
  benefitsHeading: 'Why partner with us?',
  benefits: [
    { _key: 'b1', title: 'Engaged deal-seekers', desc: 'Our audience actively searches for coupons and deals — high purchase intent, low bounce rate.' },
    { _key: 'b2', title: 'Verified placements', desc: 'Every deal is tested before going live. Your offers appear alongside trusted, working codes.' },
    { _key: 'b3', title: 'Global reach', desc: 'Offerdy covers 500+ stores internationally. We reach shoppers from dozens of countries.' },
    { _key: 'b4', title: 'Performance-based', desc: 'We work on affiliate commission — you pay only for results, not impressions.' },
  ],
  ctaHeading: 'Ready to get started?',
  ctaBody: 'Reach out with your store name, affiliate network, and what you\'re looking for. We\'ll get back to you within 48 hours.',
  contactEmail: 'partners@offerdy.com',
  seoTitle: 'Partner with Offerdy — Reach Millions of Deal-Seekers',
  seoDescription: 'Partner with Offerdy to feature your deals in front of an engaged audience of shoppers. Affiliate-based, performance-driven.',
  indexPage: true,
}

function f<T>(v: T | undefined, fb: T): T {
  return (v !== undefined && v !== null && (typeof v !== 'string' || v !== '')) ? v : fb
}

export default function PartnerForm({ initial }: { initial: PartnerData }) {
  const d = DEFAULTS
  const [h1, setH1] = useState(f(initial.h1, d.h1))
  const [heroLead, setHeroLead] = useState(f(initial.heroLead, d.heroLead))
  const [benefitsHeading, setBenefitsHeading] = useState(f(initial.benefitsHeading, d.benefitsHeading))
  const [benefits, setBenefits] = useState<Benefit[]>(initial.benefits?.length ? initial.benefits : d.benefits)
  const [ctaHeading, setCtaHeading] = useState(f(initial.ctaHeading, d.ctaHeading))
  const [ctaBody, setCtaBody] = useState(f(initial.ctaBody, d.ctaBody))
  const [contactEmail, setContactEmail] = useState(f(initial.contactEmail, d.contactEmail))
  const [seoTitle, setSeoTitle] = useState(f(initial.seoTitle, d.seoTitle))
  const [seoDesc, setSeoDesc] = useState(f(initial.seoDescription, d.seoDescription))
  const [indexPage, setIndexPage] = useState(initial.indexPage !== false)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await savePartnerPage({ h1, heroLead, benefitsHeading, benefits, ctaHeading, ctaBody, contactEmail, seoTitle, seoDescription: seoDesc, indexPage })
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    })
  }

  const updateBenefit = (i: number, k: keyof Benefit, v: string) => setBenefits(p => p.map((b, idx) => idx === i ? { ...b, [k]: v } : b))
  const removeBenefit = (i: number) => setBenefits(p => p.filter((_, idx) => idx !== i))
  const addBenefit = () => setBenefits(p => [...p, { _key: crypto.randomUUID(), title: '', desc: '' }])

  return (
    <div className="cfg-wrap">
      <div className="cfg-header">
        <a href="/admin" className="cfg-back">← Admin</a>
        <h1 className="cfg-title">Partner with Us</h1>
        <p className="cfg-subtitle">Nội dung tại /partner</p>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Hero</div>
        <label className="cfg-label">Tiêu đề (H1)<input className="cfg-input" value={h1} onChange={e => setH1(e.target.value)} /></label>
        <label className="cfg-label">Đoạn giới thiệu<textarea className="cfg-input" rows={2} value={heroLead} onChange={e => setHeroLead(e.target.value)} style={{ resize: 'vertical' }} /></label>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Lợi ích khi hợp tác</div>
        <label className="cfg-label">Tiêu đề section (H2)<input className="cfg-input" value={benefitsHeading} onChange={e => setBenefitsHeading(e.target.value)} /></label>
        <div className="cfg-array-wrap" style={{ marginTop: 10 }}>
          {benefits.length === 0 && <div className="cfg-array-empty">Chưa có lợi ích nào</div>}
          {benefits.map((b, i) => (
            <div key={b._key} className="cfg-array-item">
              <div className="cfg-array-fields">
                <div className="cfg-array-row">
                  <input className="cfg-input" placeholder="Tiêu đề" value={b.title} onChange={e => updateBenefit(i, 'title', e.target.value)} />
                  <input className="cfg-input" placeholder="Mô tả ngắn" value={b.desc} onChange={e => updateBenefit(i, 'desc', e.target.value)} />
                </div>
              </div>
              <button type="button" className="cfg-array-remove" onClick={() => removeBenefit(i)}>×</button>
            </div>
          ))}
        </div>
        <button type="button" className="cfg-add-btn" onClick={addBenefit}>＋ Thêm lợi ích</button>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">CTA — Liên hệ hợp tác</div>
        <label className="cfg-label">Tiêu đề (H2)<input className="cfg-input" value={ctaHeading} onChange={e => setCtaHeading(e.target.value)} /></label>
        <label className="cfg-label">Nội dung<textarea className="cfg-input" rows={3} value={ctaBody} onChange={e => setCtaBody(e.target.value)} style={{ resize: 'vertical' }} /></label>
        <label className="cfg-label">Email liên hệ hợp tác<input className="cfg-input" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="partners@offerdy.com" /></label>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">SEO</div>
        <label className="cfg-label">SEO Title <span style={{ fontWeight: 400, color: '#A0AABF', fontSize: 11 }}>({seoTitle.length}/70)</span><input className="cfg-input" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} maxLength={70} /></label>
        <label className="cfg-label">Meta Description <span style={{ fontWeight: 400, color: '#A0AABF', fontSize: 11 }}>({seoDesc.length}/170)</span><textarea className="cfg-input" rows={3} value={seoDesc} onChange={e => setSeoDesc(e.target.value)} maxLength={170} style={{ resize: 'vertical' }} /></label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
          <input type="checkbox" checked={indexPage} onChange={e => setIndexPage(e.target.checked)} />
          Cho phép Google lập chỉ mục
        </label>
      </div>

      <div style={{ padding: '16px 0 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="cfg-save-btn" onClick={handleSave} disabled={isPending}>{isPending ? 'Đang lưu...' : '💾 Lưu & Xuất bản'}</button>
        <a href="/partner" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#6B7694', textDecoration: 'none', fontWeight: 500 }}>Xem trang →</a>
        {saved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Đã lưu!</span>}
      </div>
    </div>
  )
}
