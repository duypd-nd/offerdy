'use client'

import { useState, useTransition } from 'react'
import { saveContactPage, type ContactData, type FaqItem } from './actions'

const DEFAULTS: Required<ContactData> = {
  h1: 'Get in touch',
  heroLead: 'Have a question about a deal, want to suggest a store, or just want to say hello? We read every message.',
  email: 'hello@offerdy.com',
  responseTime: 'We typically reply within 24 hours.',
  phone: '',
  address: '',
  formHeading: 'Send us a message',
  formDesc: 'Fill in the form below and we\'ll get back to you as soon as possible.',
  formAction: '',
  showFaq: true,
  faqHeading: 'Frequently asked questions',
  faqItems: [
    { _key: 'f1', question: 'A coupon code on Offerdy didn\'t work — what should I do?', answer: 'Let us know by emailing us with the store name and code. We\'ll verify it and remove it if it\'s expired.' },
    { _key: 'f2', question: 'How do I suggest a store to add?', answer: 'Send us the store name and URL. If it\'s a good fit, we\'ll add it and start tracking deals.' },
    { _key: 'f3', question: 'Can I partner with Offerdy?', answer: 'Yes — if you\'re a brand or affiliate network looking to list deals on Offerdy, reach out via email.' },
  ],
  seoTitle: 'Contact Offerdy — We\'d Love to Hear from You',
  seoDescription: 'Get in touch with the Offerdy team. Report a broken coupon code, suggest a store, or ask about partnerships.',
  indexPage: true,
}

function f<T>(val: T | undefined, fallback: T): T {
  return (val !== undefined && val !== null && (typeof val !== 'string' || val !== '')) ? val : fallback
}

export default function ContactForm({ initial }: { initial: ContactData }) {
  const d = DEFAULTS

  const [h1, setH1] = useState(f(initial.h1, d.h1))
  const [heroLead, setHeroLead] = useState(f(initial.heroLead, d.heroLead))
  const [email, setEmail] = useState(f(initial.email, d.email))
  const [responseTime, setResponseTime] = useState(f(initial.responseTime, d.responseTime))
  const [phone, setPhone] = useState(initial.phone ?? '')
  const [address, setAddress] = useState(initial.address ?? '')
  const [formHeading, setFormHeading] = useState(f(initial.formHeading, d.formHeading))
  const [formDesc, setFormDesc] = useState(f(initial.formDesc, d.formDesc))
  const [formAction, setFormAction] = useState(initial.formAction ?? '')
  const [showFaq, setShowFaq] = useState(initial.showFaq !== false)
  const [faqHeading, setFaqHeading] = useState(f(initial.faqHeading, d.faqHeading))
  const [faqItems, setFaqItems] = useState<FaqItem[]>(initial.faqItems?.length ? initial.faqItems : d.faqItems)
  const [seoTitle, setSeoTitle] = useState(f(initial.seoTitle, d.seoTitle))
  const [seoDesc, setSeoDesc] = useState(f(initial.seoDescription, d.seoDescription))
  const [indexPage, setIndexPage] = useState(initial.indexPage !== false)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await saveContactPage({
        h1, heroLead, email, responseTime,
        phone: phone || undefined,
        address: address || undefined,
        formHeading, formDesc,
        formAction: formAction || undefined,
        showFaq, faqHeading, faqItems,
        seoTitle, seoDescription: seoDesc, indexPage,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const updateFaq = (i: number, k: keyof FaqItem, v: string) =>
    setFaqItems(prev => prev.map((f, idx) => idx === i ? { ...f, [k]: v } : f))
  const removeFaq = (i: number) => setFaqItems(prev => prev.filter((_, idx) => idx !== i))
  const addFaq = () => setFaqItems(prev => [...prev, { _key: crypto.randomUUID(), question: '', answer: '' }])

  return (
    <div className="cfg-wrap">
      <div className="cfg-header">
        <a href="/admin" className="cfg-back">← Admin</a>
        <h1 className="cfg-title">Trang Contact</h1>
        <p className="cfg-subtitle">Nội dung hiển thị tại /contact</p>
      </div>

      {/* ── Hero ── */}
      <div className="cfg-section">
        <div className="cfg-section-title">Hero — Phần đầu trang</div>
        <label className="cfg-label">
          Tiêu đề chính (H1)
          <input className="cfg-input" value={h1} onChange={e => setH1(e.target.value)}
            placeholder="Get in touch" />
        </label>
        <label className="cfg-label">
          Đoạn giới thiệu
          <textarea className="cfg-input" rows={3} value={heroLead}
            onChange={e => setHeroLead(e.target.value)} style={{ resize: 'vertical' }} />
        </label>
      </div>

      {/* ── Contact info ── */}
      <div className="cfg-section">
        <div className="cfg-section-title">Thông tin liên hệ</div>
        <div className="cfg-row">
          <label className="cfg-label">
            Email <span style={{ color: '#EF4444' }}>*</span>
            <input className="cfg-input" type="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="hello@offerdy.com" />
          </label>
          <label className="cfg-label">
            Thời gian phản hồi
            <input className="cfg-input" value={responseTime}
              onChange={e => setResponseTime(e.target.value)}
              placeholder="We typically reply within 24 hours." />
          </label>
        </div>
        <div className="cfg-row">
          <label className="cfg-label">
            Số điện thoại <span style={{ fontWeight: 400, color: '#A0AABF', fontSize: 11 }}>— tuỳ chọn</span>
            <input className="cfg-input" value={phone}
              onChange={e => setPhone(e.target.value)} placeholder="+1 (xxx) xxx-xxxx" />
          </label>
          <label className="cfg-label">
            Địa chỉ <span style={{ fontWeight: 400, color: '#A0AABF', fontSize: 11 }}>— tuỳ chọn</span>
            <input className="cfg-input" value={address}
              onChange={e => setAddress(e.target.value)} placeholder="City, Country" />
          </label>
        </div>
      </div>

      {/* ── Contact form ── */}
      <div className="cfg-section">
        <div className="cfg-section-title">Form liên hệ</div>
        <label className="cfg-label">
          Tiêu đề form
          <input className="cfg-input" value={formHeading} onChange={e => setFormHeading(e.target.value)} />
        </label>
        <label className="cfg-label">
          Mô tả ngắn dưới tiêu đề
          <input className="cfg-input" value={formDesc} onChange={e => setFormDesc(e.target.value)} />
        </label>
        <label className="cfg-label">
          Formspree URL <span style={{ fontWeight: 400, color: '#A0AABF', fontSize: 11 }}>— để trống thì dùng mailto</span>
          <input className="cfg-input" value={formAction}
            onChange={e => setFormAction(e.target.value)}
            placeholder="https://formspree.io/f/xxxxxxxx" />
        </label>
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#78350F' }}>
          <strong>Formspree miễn phí:</strong> Đăng ký tại formspree.io, tạo form, lấy URL dán vào ô trên. Form sẽ gửi email về hộp thư của bạn.
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="cfg-section">
        <div className="cfg-section-title">
          FAQ — Câu hỏi thường gặp
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 12, fontWeight: 400, fontSize: 12, color: 'var(--oa-muted,#6B7694)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showFaq} onChange={e => setShowFaq(e.target.checked)} />
            Hiện trên trang
          </label>
        </div>
        <label className="cfg-label">
          Tiêu đề section (H2)
          <input className="cfg-input" value={faqHeading} onChange={e => setFaqHeading(e.target.value)} />
        </label>
        <div className="cfg-array-wrap" style={{ marginTop: 8 }}>
          {faqItems.length === 0 && <div className="cfg-array-empty">Chưa có câu hỏi nào</div>}
          {faqItems.map((item, i) => (
            <div key={item._key} className="cfg-array-item">
              <div className="cfg-array-fields">
                <input className="cfg-input" placeholder="Câu hỏi" value={item.question}
                  onChange={e => updateFaq(i, 'question', e.target.value)}
                  style={{ marginBottom: 8 }} />
                <textarea className="cfg-input" rows={2} placeholder="Câu trả lời" value={item.answer}
                  onChange={e => updateFaq(i, 'answer', e.target.value)}
                  style={{ resize: 'vertical' }} />
              </div>
              <button type="button" className="cfg-array-remove" onClick={() => removeFaq(i)}>×</button>
            </div>
          ))}
        </div>
        <button type="button" className="cfg-add-btn" onClick={addFaq}>＋ Thêm câu hỏi</button>
      </div>

      {/* ── SEO ── */}
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

      {/* ── Save ── */}
      <div style={{ padding: '16px 0 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="cfg-save-btn" onClick={handleSave} disabled={isPending}>
          {isPending ? 'Đang lưu...' : '💾 Lưu & Xuất bản'}
        </button>
        <a href="/contact" target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 13, color: '#6B7694', textDecoration: 'none', fontWeight: 500 }}>
          Xem trang Contact →
        </a>
        {saved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Đã lưu!</span>}
      </div>
    </div>
  )
}
