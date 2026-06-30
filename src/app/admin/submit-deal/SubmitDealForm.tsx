'use client'

import { useState, useTransition } from 'react'
import { saveSubmitDealPage, type SubmitDealData } from './actions'

type Step = { _key: string; title: string; desc: string }

const DEFAULTS: Required<SubmitDealData> = {
  h1: 'Submit a Deal',
  heroLead: 'Found a coupon code or deal we\'re missing? Submit it here. We\'ll verify it before it goes live.',
  formHeading: 'Submit your deal',
  formDesc: 'Fill in the details below. We verify every submission before publishing.',
  formAction: '',
  steps: [
    { _key: 'st1', title: 'Fill in the form', desc: 'Tell us the store, the coupon code or deal, and the discount amount.' },
    { _key: 'st2', title: 'We verify it', desc: 'Our team tests the code at the actual checkout within 24 hours.' },
    { _key: 'st3', title: 'Goes live', desc: 'If it works, we publish it and credit your submission.' },
  ],
  guidelines: [
    'Only submit codes you have personally tested.',
    'Include the expiry date if you know it.',
    'No referral codes or MLM links.',
    'Deals must be applicable to real purchases — no fake discounts.',
  ],
  seoTitle: 'Submit a Deal — Help Us Find the Best Coupons | Offerdy',
  seoDescription: 'Know a coupon code or deal we\'re missing? Submit it to Offerdy. We verify every submission before it goes live.',
  indexPage: true,
}

function f<T>(v: T | undefined, fallback: T): T {
  return (v !== undefined && v !== null && (typeof v !== 'string' || v !== '')) ? v : fallback
}

export default function SubmitDealForm({ initial }: { initial: SubmitDealData }) {
  const d = DEFAULTS
  const [h1, setH1] = useState(f(initial.h1, d.h1))
  const [heroLead, setHeroLead] = useState(f(initial.heroLead, d.heroLead))
  const [formHeading, setFormHeading] = useState(f(initial.formHeading, d.formHeading))
  const [formDesc, setFormDesc] = useState(f(initial.formDesc, d.formDesc))
  const [formAction, setFormAction] = useState(initial.formAction ?? '')
  const [steps, setSteps] = useState<Step[]>(initial.steps?.length ? initial.steps : d.steps)
  const [guidelines, setGuidelines] = useState<string[]>(initial.guidelines?.length ? initial.guidelines : d.guidelines)
  const [seoTitle, setSeoTitle] = useState(f(initial.seoTitle, d.seoTitle))
  const [seoDesc, setSeoDesc] = useState(f(initial.seoDescription, d.seoDescription))
  const [indexPage, setIndexPage] = useState(initial.indexPage !== false)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await saveSubmitDealPage({ h1, heroLead, formHeading, formDesc, formAction: formAction || undefined, steps, guidelines, seoTitle, seoDescription: seoDesc, indexPage })
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    })
  }

  const updateStep = (i: number, k: keyof Step, v: string) => setSteps(p => p.map((s, idx) => idx === i ? { ...s, [k]: v } : s))
  const updateGuideline = (i: number, v: string) => setGuidelines(p => p.map((g, idx) => idx === i ? v : g))
  const removeGuideline = (i: number) => setGuidelines(p => p.filter((_, idx) => idx !== i))
  const addGuideline = () => setGuidelines(p => [...p, ''])

  return (
    <div className="cfg-wrap">
      <div className="cfg-header">
        <a href="/admin" className="cfg-back">← Admin</a>
        <h1 className="cfg-title">Submit a Deal</h1>
        <p className="cfg-subtitle">Nội dung tại /submit-deal</p>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Hero</div>
        <label className="cfg-label">Tiêu đề (H1)<input className="cfg-input" value={h1} onChange={e => setH1(e.target.value)} /></label>
        <label className="cfg-label">Đoạn giới thiệu<textarea className="cfg-input" rows={2} value={heroLead} onChange={e => setHeroLead(e.target.value)} style={{ resize: 'vertical' }} /></label>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Form nhận deal</div>
        <label className="cfg-label">Tiêu đề form<input className="cfg-input" value={formHeading} onChange={e => setFormHeading(e.target.value)} /></label>
        <label className="cfg-label">Mô tả ngắn<input className="cfg-input" value={formDesc} onChange={e => setFormDesc(e.target.value)} /></label>
        <label className="cfg-label">
          Formspree URL <span style={{ fontWeight: 400, color: '#A0AABF', fontSize: 11 }}>— để trống thì dùng mailto</span>
          <input className="cfg-input" value={formAction} onChange={e => setFormAction(e.target.value)} placeholder="https://formspree.io/f/xxxxxxxx" />
        </label>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">3 bước xử lý</div>
        <div className="cfg-array-wrap">
          {steps.map((s, i) => (
            <div key={s._key} className="cfg-array-item">
              <div className="cfg-array-fields">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#F0FDF4', border: '1.5px solid #BBF7D0', color: '#16A34A', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <input className="cfg-input" placeholder="Tiêu đề bước" value={s.title} onChange={e => updateStep(i, 'title', e.target.value)} />
                </div>
                <input className="cfg-input" placeholder="Mô tả" value={s.desc} onChange={e => updateStep(i, 'desc', e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Quy định khi submit</div>
        <div className="cfg-array-wrap">
          {guidelines.length === 0 && <div className="cfg-array-empty">Chưa có quy định nào</div>}
          {guidelines.map((g, i) => (
            <div key={i} className="cfg-array-item">
              <div className="cfg-array-fields">
                <input className="cfg-input" value={g} onChange={e => updateGuideline(i, e.target.value)} placeholder="Quy định..." />
              </div>
              <button type="button" className="cfg-array-remove" onClick={() => removeGuideline(i)}>×</button>
            </div>
          ))}
        </div>
        <button type="button" className="cfg-add-btn" onClick={addGuideline}>＋ Thêm quy định</button>
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
        <a href="/submit-deal" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#6B7694', textDecoration: 'none', fontWeight: 500 }}>Xem trang →</a>
        {saved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Đã lưu!</span>}
      </div>
    </div>
  )
}
