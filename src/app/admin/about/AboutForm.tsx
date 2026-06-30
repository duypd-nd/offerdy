'use client'

import { useState, useTransition } from 'react'
import { saveAboutPage, type AboutData } from './actions'

const DEFAULTS: Required<AboutData> = {
  h1: 'Verified coupon codes you can actually use',
  heroLead: 'Offerdy is a free deals platform covering 500+ stores worldwide. Every promo code and discount code listed here is tested before it goes live — so you never hit "Invalid code" at checkout.',
  storyQuote: '"I had a full cart, found a discount code online, typed it in — and got an error. The code had expired two weeks earlier. Nobody told me."',
  storyBody: 'That moment is the entire reason Offerdy exists. Most coupon sites aggregate codes from anywhere and publish them without ever checking if they work. We do things differently. Every code you see here has been tested against a real store checkout. If it fails, it doesn\'t go live — full stop.',
  founderName: 'The Offerdy Team',
  foundingYear: '2026',
  stats: [
    { _key: 'stat1', num: '500+', label: 'Stores worldwide' },
    { _key: 'stat2', num: '100%', label: 'Codes verified before publishing' },
    { _key: 'stat3', num: '$0', label: 'Cost to use — forever free' },
  ],
  verifyHeading: 'How every coupon code gets verified',
  verifyLead: "Posting an unverified code is easy. We don't do it. Here's the exact process every deal goes through before it reaches you.",
  steps: [
    { _key: 'step1', title: 'We source the deal directly', desc: 'Codes come from store newsletters, affiliate partners, and official promotions — not scraped from random forums or Reddit threads.' },
    { _key: 'step2', title: 'We test it at a real checkout', desc: "Every code is entered into the actual store checkout before we publish it. If it returns an error or gives less than advertised, it doesn't go live." },
    { _key: 'step3', title: 'We remove expired codes fast', desc: "Active codes are rechecked regularly. When a deal expires, it's removed — not left to quietly fail on shoppers at the worst moment." },
  ],
  coverageHeading: '500+ stores from around the world',
  categories: [
    { _key: 'cat1', title: 'Fashion & Apparel', desc: "Nike, ASOS, Zara, H&M, Levi's, and dozens of independent fashion brands with active discount codes." },
    { _key: 'cat2', title: 'Tech & Electronics', desc: 'Apple, Samsung, Lenovo, Anker, and more — promo codes for gadgets, accessories, and subscriptions.' },
    { _key: 'cat3', title: 'Travel & Hotels', desc: "Booking.com, Agoda, Airbnb, and budget airlines — deals for travelers wherever you're headed." },
    { _key: 'cat4', title: 'Food & Delivery', desc: 'DoorDash, Uber Eats, HelloFresh, and local delivery platforms with regularly updated codes.' },
  ],
  promiseTitle: 'No expired codes. No surprises at checkout.',
  promiseBody: "If a code on Offerdy doesn't work, we want to know immediately. Every deal listed is one we'd use ourselves. Offerdy will always be free for shoppers — we earn a small affiliate commission when you buy, at no extra cost to you, ever.",
  seoTitle: 'About Offerdy — Verified Coupon Codes for 500+ Stores',
  seoDescription: 'Offerdy was built because expired coupon codes are frustrating. Every promo code and discount code on Offerdy is verified before going live — free for shoppers worldwide.',
  showStory: true,
  showStats: true,
  showCoverage: true,
  indexPage: true,
}

function merge<T>(initial: T | undefined, fallback: T): T {
  return (initial !== undefined && initial !== null && (typeof initial !== 'string' || initial !== '')) ? initial : fallback
}

type Stat = { _key: string; num: string; label: string }
type Step = { _key: string; title: string; desc: string }
type Category = { _key: string; title: string; desc: string }

export default function AboutForm({ initial }: { initial: AboutData }) {
  const d = DEFAULTS

  const [h1, setH1] = useState(merge(initial.h1, d.h1))
  const [heroLead, setHeroLead] = useState(merge(initial.heroLead, d.heroLead))
  const [storyQuote, setStoryQuote] = useState(merge(initial.storyQuote, d.storyQuote))
  const [storyBody, setStoryBody] = useState(merge(initial.storyBody, d.storyBody))
  const [founderName, setFounderName] = useState(merge(initial.founderName, d.founderName))
  const [foundingYear, setFoundingYear] = useState(merge(initial.foundingYear, d.foundingYear))
  const [stats, setStats] = useState<Stat[]>(initial.stats?.length ? initial.stats : d.stats)
  const [verifyHeading, setVerifyHeading] = useState(merge(initial.verifyHeading, d.verifyHeading))
  const [verifyLead, setVerifyLead] = useState(merge(initial.verifyLead, d.verifyLead))
  const [steps, setSteps] = useState<Step[]>(initial.steps?.length ? initial.steps : d.steps)
  const [coverageHeading, setCoverageHeading] = useState(merge(initial.coverageHeading, d.coverageHeading))
  const [categories, setCategories] = useState<Category[]>(initial.categories?.length ? initial.categories : d.categories)
  const [promiseTitle, setPromiseTitle] = useState(merge(initial.promiseTitle, d.promiseTitle))
  const [promiseBody, setPromiseBody] = useState(merge(initial.promiseBody, d.promiseBody))
  const [seoTitle, setSeoTitle] = useState(merge(initial.seoTitle, d.seoTitle))
  const [seoDesc, setSeoDesc] = useState(merge(initial.seoDescription, d.seoDescription))
  const [showStory, setShowStory] = useState(initial.showStory !== false)
  const [showStats, setShowStats] = useState(initial.showStats !== false)
  const [showCoverage, setShowCoverage] = useState(initial.showCoverage !== false)
  const [indexPage, setIndexPage] = useState(initial.indexPage !== false)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await saveAboutPage({
        h1, heroLead, storyQuote, storyBody, founderName, foundingYear,
        stats, verifyHeading, verifyLead, steps,
        coverageHeading, categories,
        promiseTitle, promiseBody,
        seoTitle, seoDescription: seoDesc,
        showStory, showStats, showCoverage, indexPage,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const updateStat = (i: number, k: keyof Stat, v: string) =>
    setStats(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s))

  const updateStep = (i: number, k: keyof Step, v: string) =>
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [k]: v } : s))

  const updateCat = (i: number, k: keyof Category, v: string) =>
    setCategories(prev => prev.map((c, idx) => idx === i ? { ...c, [k]: v } : c))

  return (
    <div className="cfg-wrap">
      <div className="cfg-header">
        <a href="/admin" className="cfg-back">← Admin</a>
        <h1 className="cfg-title">Trang About Us</h1>
        <p className="cfg-subtitle">Nội dung hiển thị tại /about</p>
      </div>

      {/* ── Hero ── */}
      <div className="cfg-section">
        <div className="cfg-section-title">Hero — Phần đầu trang</div>
        <label className="cfg-label">
          Tiêu đề chính (H1)
          <input className="cfg-input" value={h1} onChange={e => setH1(e.target.value)}
            placeholder="Verified coupon codes you can actually use" />
        </label>
        <label className="cfg-label">
          Đoạn giới thiệu
          <textarea className="cfg-input" rows={3} value={heroLead}
            onChange={e => setHeroLead(e.target.value)} style={{ resize: 'vertical' }} />
        </label>
      </div>

      {/* ── Story ── */}
      <div className="cfg-section">
        <div className="cfg-section-title">
          Story Card
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 12, fontWeight: 400, fontSize: 12, color: 'var(--oa-muted, #6B7694)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showStory} onChange={e => setShowStory(e.target.checked)} />
            Hiện trên trang
          </label>
        </div>
        <label className="cfg-label">
          Trích dẫn (blockquote)
          <textarea className="cfg-input" rows={3} value={storyQuote}
            onChange={e => setStoryQuote(e.target.value)} style={{ resize: 'vertical' }} />
        </label>
        <label className="cfg-label">
          Nội dung câu chuyện
          <textarea className="cfg-input" rows={4} value={storyBody}
            onChange={e => setStoryBody(e.target.value)} style={{ resize: 'vertical' }} />
        </label>
        <div className="cfg-row">
          <label className="cfg-label">
            Tên nhóm / Founder
            <input className="cfg-input" value={founderName} onChange={e => setFounderName(e.target.value)} />
          </label>
          <label className="cfg-label">
            Năm thành lập
            <input className="cfg-input" value={foundingYear} onChange={e => setFoundingYear(e.target.value)} maxLength={4} />
          </label>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="cfg-section">
        <div className="cfg-section-title">
          Thống kê — 3 con số nổi bật
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 12, fontWeight: 400, fontSize: 12, color: 'var(--oa-muted, #6B7694)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showStats} onChange={e => setShowStats(e.target.checked)} />
            Hiện trên trang
          </label>
        </div>
        <div className="cfg-array-wrap">
          {stats.map((s, i) => (
            <div key={s._key} className="cfg-array-item">
              <div className="cfg-array-fields">
                <div className="cfg-array-row">
                  <input className="cfg-input" placeholder="Số (VD: 500+)" value={s.num}
                    onChange={e => updateStat(i, 'num', e.target.value)} style={{ maxWidth: 110 }} />
                  <input className="cfg-input" placeholder="Nhãn" value={s.label}
                    onChange={e => updateStat(i, 'label', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Verify steps ── */}
      <div className="cfg-section">
        <div className="cfg-section-title">Quy trình xác minh</div>
        <div className="cfg-row">
          <label className="cfg-label" style={{ flex: 1 }}>
            Tiêu đề section (H2)
            <input className="cfg-input" value={verifyHeading} onChange={e => setVerifyHeading(e.target.value)} />
          </label>
        </div>
        <label className="cfg-label">
          Mô tả ngắn
          <input className="cfg-input" value={verifyLead} onChange={e => setVerifyLead(e.target.value)} />
        </label>
        <div className="cfg-array-wrap" style={{ marginTop: 8 }}>
          {steps.map((s, i) => (
            <div key={s._key} className="cfg-array-item">
              <div className="cfg-array-fields">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#F0FDF4', border: '1.5px solid #BBF7D0',
                    color: '#16A34A', fontSize: 11, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>{i + 1}</span>
                  <input className="cfg-input" placeholder="Tiêu đề bước (H3)" value={s.title}
                    onChange={e => updateStep(i, 'title', e.target.value)} />
                </div>
                <textarea className="cfg-input" rows={2} placeholder="Mô tả" value={s.desc}
                  onChange={e => updateStep(i, 'desc', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Coverage ── */}
      <div className="cfg-section">
        <div className="cfg-section-title">
          Danh mục Store — 4 thẻ
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 12, fontWeight: 400, fontSize: 12, color: 'var(--oa-muted, #6B7694)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showCoverage} onChange={e => setShowCoverage(e.target.checked)} />
            Hiện trên trang
          </label>
        </div>
        <label className="cfg-label">
          Tiêu đề section (H2)
          <input className="cfg-input" value={coverageHeading} onChange={e => setCoverageHeading(e.target.value)} />
        </label>
        <div className="cfg-array-wrap" style={{ marginTop: 8 }}>
          {categories.map((c, i) => (
            <div key={c._key} className="cfg-array-item">
              <div className="cfg-array-fields">
                <div className="cfg-array-row">
                  <input className="cfg-input" placeholder="Tiêu đề danh mục" value={c.title}
                    onChange={e => updateCat(i, 'title', e.target.value)} />
                  <input className="cfg-input" placeholder="Mô tả ngắn" value={c.desc}
                    onChange={e => updateCat(i, 'desc', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Promise ── */}
      <div className="cfg-section">
        <div className="cfg-section-title">Our Promise — Banner xanh cuối trang</div>
        <label className="cfg-label">
          Tiêu đề promise
          <input className="cfg-input" value={promiseTitle} onChange={e => setPromiseTitle(e.target.value)} />
        </label>
        <label className="cfg-label">
          Nội dung
          <textarea className="cfg-input" rows={3} value={promiseBody}
            onChange={e => setPromiseBody(e.target.value)} style={{ resize: 'vertical' }} />
        </label>
      </div>

      {/* ── SEO ── */}
      <div className="cfg-section">
        <div className="cfg-section-title">SEO</div>
        <label className="cfg-label">
          SEO Title <span style={{ fontWeight: 400, color: '#A0AABF', fontSize: 11 }}>— 50–60 ký tự lý tưởng ({seoTitle.length}/70)</span>
          <input className="cfg-input" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} maxLength={70} />
        </label>
        <label className="cfg-label">
          Meta Description <span style={{ fontWeight: 400, color: '#A0AABF', fontSize: 11 }}>— tối đa 160 ký tự ({seoDesc.length}/170)</span>
          <textarea className="cfg-input" rows={3} value={seoDesc}
            onChange={e => setSeoDesc(e.target.value)} maxLength={170} style={{ resize: 'vertical' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 4 }}>
          <input type="checkbox" checked={indexPage} onChange={e => setIndexPage(e.target.checked)} />
          Cho phép Google lập chỉ mục trang này
        </label>
      </div>

      {/* ── Save ── */}
      <div style={{ padding: '16px 0 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="cfg-save-btn" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Đang lưu...' : '💾 Lưu & Xuất bản'}
        </button>
        <a href="/about" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 13, color: '#6B7694', textDecoration: 'none', fontWeight: 500 }}>
          Xem trang About →
        </a>
        {saved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Đã lưu!</span>}
      </div>
    </div>
  )
}
