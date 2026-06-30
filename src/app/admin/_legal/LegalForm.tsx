'use client'

import { useState, useTransition } from 'react'
import { saveLegalPage, type LegalData, type LegalSection } from './actions'

type Props = {
  configId: string
  pagePath: string
  adminTitle: string
  adminSubtitle: string
  initial: LegalData
  defaultH1: string
  defaultSeoTitle: string
  defaultSeoDesc: string
  defaultSections?: LegalSection[]
}

function f<T>(val: T | undefined, fallback: T): T {
  return (val !== undefined && val !== null && (typeof val !== 'string' || val !== '')) ? val : fallback
}

export default function LegalForm({ configId, pagePath, adminTitle, adminSubtitle, initial, defaultH1, defaultSeoTitle, defaultSeoDesc, defaultSections = [] }: Props) {
  const today = new Date().toISOString().slice(0, 10)

  const [h1, setH1] = useState(f(initial.h1, defaultH1))
  const [lastUpdated, setLastUpdated] = useState(f(initial.lastUpdated, today))
  const [intro, setIntro] = useState(initial.intro ?? '')
  const [sections, setSections] = useState<LegalSection[]>(initial.sections?.length ? initial.sections : defaultSections)
  const [seoTitle, setSeoTitle] = useState(f(initial.seoTitle, defaultSeoTitle))
  const [seoDesc, setSeoDesc] = useState(f(initial.seoDescription, defaultSeoDesc))
  const [indexPage, setIndexPage] = useState(initial.indexPage !== false)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await saveLegalPage(configId, pagePath, {
        h1, lastUpdated, intro: intro || undefined,
        sections, seoTitle, seoDescription: seoDesc, indexPage,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const updateSection = (i: number, k: keyof LegalSection, v: string) =>
    setSections(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s))
  const removeSection = (i: number) => setSections(prev => prev.filter((_, idx) => idx !== i))
  const addSection = () => setSections(prev => [...prev, { _key: crypto.randomUUID(), heading: '', body: '' }])
  const moveSection = (i: number, dir: -1 | 1) => {
    const next = [...sections]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setSections(next)
  }

  return (
    <div className="cfg-wrap">
      <div className="cfg-header">
        <a href="/admin" className="cfg-back">← Admin</a>
        <h1 className="cfg-title">{adminTitle}</h1>
        <p className="cfg-subtitle">{adminSubtitle}</p>
      </div>

      {/* Basic */}
      <div className="cfg-section">
        <div className="cfg-section-title">Tiêu đề trang</div>
        <div className="cfg-row">
          <label className="cfg-label">
            Tiêu đề (H1) <span style={{ color: '#EF4444' }}>*</span>
            <input className="cfg-input" value={h1} onChange={e => setH1(e.target.value)} />
          </label>
          <label className="cfg-label">
            Ngày cập nhật lần cuối
            <input className="cfg-input" type="date" value={lastUpdated} onChange={e => setLastUpdated(e.target.value)} />
          </label>
        </div>
        <label className="cfg-label">
          Đoạn giới thiệu <span style={{ fontWeight: 400, color: '#A0AABF', fontSize: 11 }}>— tuỳ chọn, hiện ngay dưới tiêu đề</span>
          <textarea className="cfg-input" rows={3} value={intro}
            onChange={e => setIntro(e.target.value)} style={{ resize: 'vertical' }}
            placeholder="Brief introduction to this page..." />
        </label>
      </div>

      {/* Sections */}
      <div className="cfg-section">
        <div className="cfg-section-title">Các mục nội dung</div>
        <div style={{ fontSize: 12, color: '#A0AABF', marginBottom: 14 }}>
          Mỗi mục có tiêu đề H2 và nội dung. Hỗ trợ HTML cơ bản trong phần nội dung: &lt;strong&gt;, &lt;em&gt;, &lt;a href&gt;, &lt;ul&gt;&lt;li&gt;, &lt;br&gt;.
        </div>
        <div className="cfg-array-wrap">
          {sections.length === 0 && <div className="cfg-array-empty">Chưa có mục nào — bấm ＋ để thêm</div>}
          {sections.map((sec, i) => (
            <div key={sec._key} className="cfg-array-item">
              <div className="cfg-array-fields">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#A0AABF', minWidth: 20 }}>H2</span>
                  <input className="cfg-input" placeholder="Tiêu đề mục" value={sec.heading}
                    onChange={e => updateSection(i, 'heading', e.target.value)} style={{ flex: 1 }} />
                  <button type="button" onClick={() => moveSection(i, -1)} disabled={i === 0}
                    style={{ padding: '4px 8px', fontSize: 12, background: 'none', border: '1px solid #E4EAF2', borderRadius: 5, cursor: 'pointer', color: '#A0AABF' }}>↑</button>
                  <button type="button" onClick={() => moveSection(i, 1)} disabled={i === sections.length - 1}
                    style={{ padding: '4px 8px', fontSize: 12, background: 'none', border: '1px solid #E4EAF2', borderRadius: 5, cursor: 'pointer', color: '#A0AABF' }}>↓</button>
                </div>
                <textarea className="cfg-input" rows={5} placeholder="Nội dung (HTML được phép)" value={sec.body}
                  onChange={e => updateSection(i, 'body', e.target.value)} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 13 }} />
              </div>
              <button type="button" className="cfg-array-remove" onClick={() => removeSection(i)}>×</button>
            </div>
          ))}
        </div>
        <button type="button" className="cfg-add-btn" onClick={addSection}>＋ Thêm mục</button>
      </div>

      {/* SEO */}
      <div className="cfg-section">
        <div className="cfg-section-title">SEO</div>
        <label className="cfg-label">
          SEO Title <span style={{ fontWeight: 400, color: '#A0AABF', fontSize: 11 }}>({seoTitle.length}/70)</span>
          <input className="cfg-input" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} maxLength={70} />
        </label>
        <label className="cfg-label">
          Meta Description <span style={{ fontWeight: 400, color: '#A0AABF', fontSize: 11 }}>({seoDesc.length}/170)</span>
          <textarea className="cfg-input" rows={3} value={seoDesc}
            onChange={e => setSeoDesc(e.target.value)} maxLength={170} style={{ resize: 'vertical' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
          <input type="checkbox" checked={indexPage} onChange={e => setIndexPage(e.target.checked)} />
          Cho phép Google lập chỉ mục trang này
        </label>
      </div>

      <div style={{ padding: '16px 0 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="cfg-save-btn" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Đang lưu...' : '💾 Lưu & Xuất bản'}
        </button>
        <a href={pagePath} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 13, color: '#6B7694', textDecoration: 'none', fontWeight: 500 }}>
          Xem trang →
        </a>
        {saved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Đã lưu!</span>}
      </div>
    </div>
  )
}
