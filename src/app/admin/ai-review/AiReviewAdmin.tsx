'use client'

import { useState, useTransition } from 'react'
import {
  approveAiDraft, rejectAiDraft, regenerateAiDraft,
  approveOfferAiDraft, rejectOfferAiDraft, regenerateOfferAiDraft,
  approveDealAiDraft, rejectDealAiDraft, regenerateDealAiDraft,
} from './actions'
import { renderAboutHtml, type AboutCard, type AboutContent } from '@/lib/ai/aboutTemplate'

type FaqItem = { question: string; answer: string }
type ProsAndCons = { pros?: string[]; cons?: string[] }

type StoreAiDraft = {
  shortDescription?: string
  about?: AboutContent
  metaTitle?: string
  metaKeywords?: string
  metaDescription?: string
  faq?: FaqItem[]
  prosAndCons?: ProsAndCons
  generatedAt?: string
  model?: string
}

type PendingStore = {
  _id: string
  name: string
  slug?: string
  shortDescription?: string
  aiDraft?: StoreAiDraft
}

type OfferAiDraft = { description?: string; usageTips?: string; eligibilityNotes?: string; generatedAt?: string; model?: string }

type PendingOffer = {
  _id: string
  title: string
  offerText?: string
  storeName?: string
  storeSlug?: string
  aiDraft?: OfferAiDraft
}

type DealAiDraft = {
  summary?: string
  prosAndCons?: ProsAndCons
  faq?: FaqItem[]
  metaTitle?: string
  metaDescription?: string
  generatedAt?: string
  model?: string
}

type PendingDeal = {
  _id: string
  title: string
  store?: string
  slug?: string
  aiDraft?: DealAiDraft
}

function dealDraftForm(draft?: DealAiDraft) {
  return {
    summary: draft?.summary ?? '',
    faqText: (draft?.faq ?? []).map(f => `${f.question}\n${f.answer}`).join('\n\n'),
    pros: (draft?.prosAndCons?.pros ?? []).join('\n'),
    cons: (draft?.prosAndCons?.cons ?? []).join('\n'),
    metaTitle: draft?.metaTitle ?? '',
    metaDescription: draft?.metaDescription ?? '',
  }
}
type DealDraftForm = ReturnType<typeof dealDraftForm>

const EMPTY_CARD: AboutCard = { icon: '', title: '', text: '' }
const CARD_KEYS = ['productRange', 'customerBenefits', 'shoppingExperience', 'whyChoose'] as const
const CARD_LABELS: Record<(typeof CARD_KEYS)[number], string> = {
  productRange: 'Product Range',
  customerBenefits: 'Customer Benefits',
  shoppingExperience: 'Shopping Experience',
  whyChoose: 'Why Choose',
}

function draftForm(draft?: StoreAiDraft) {
  return {
    shortDescription: draft?.shortDescription ?? '',
    tagline: draft?.about?.tagline ?? '',
    introBadgeEmoji: draft?.about?.introBadgeEmoji ?? '',
    introText: draft?.about?.introText ?? '',
    productRange: draft?.about?.productRange ?? EMPTY_CARD,
    customerBenefits: draft?.about?.customerBenefits ?? EMPTY_CARD,
    shoppingExperience: draft?.about?.shoppingExperience ?? EMPTY_CARD,
    whyChoose: draft?.about?.whyChoose ?? EMPTY_CARD,
    metaTitle: draft?.metaTitle ?? '',
    metaKeywords: draft?.metaKeywords ?? '',
    metaDescription: draft?.metaDescription ?? '',
    faqText: (draft?.faq ?? []).map(f => `${f.question}\n${f.answer}`).join('\n\n'),
    pros: (draft?.prosAndCons?.pros ?? []).join('\n'),
    cons: (draft?.prosAndCons?.cons ?? []).join('\n'),
  }
}
type DraftForm = ReturnType<typeof draftForm>

function parseFaqText(text: string): FaqItem[] {
  return text.split(/\n\s*\n/).map(block => {
    const [question, ...rest] = block.split('\n')
    return { question: (question ?? '').trim(), answer: rest.join('\n').trim() }
  }).filter(f => f.question && f.answer)
}

function formToAbout(form: DraftForm): AboutContent {
  return {
    tagline: form.tagline,
    introBadgeEmoji: form.introBadgeEmoji,
    introText: form.introText,
    productRange: form.productRange,
    customerBenefits: form.customerBenefits,
    shoppingExperience: form.shoppingExperience,
    whyChoose: form.whyChoose,
  }
}

function CardEditor({ label, card, onChange }: { label: string; card: AboutCard; onChange: (card: AboutCard) => void }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <input
          className="oa-input" style={{ width: 44, textAlign: 'center', padding: '6px 4px' }}
          value={card.icon} onChange={e => onChange({ ...card, icon: e.target.value })}
        />
        <input
          className="oa-input" style={{ flex: 1, fontWeight: 600 }}
          value={card.title} onChange={e => onChange({ ...card, title: e.target.value })}
          placeholder={label}
        />
      </div>
      <textarea
        className="oa-input oa-textarea" rows={3}
        value={card.text} onChange={e => onChange({ ...card, text: e.target.value })}
      />
    </div>
  )
}

function StoreReviewPanel({ initialStores }: { initialStores: PendingStore[] }) {
  const [stores, setStores] = useState(initialStores)
  const [selectedId, setSelectedId] = useState(initialStores[0]?._id)
  const [showPreview, setShowPreview] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const selected = stores.find(s => s._id === selectedId)
  const [form, setForm] = useState(() => draftForm(selected?.aiDraft))
  const set = <K extends keyof DraftForm>(key: K, value: DraftForm[K]) => setForm(f => ({ ...f, [key]: value }))

  const selectStore = (s: PendingStore) => {
    setSelectedId(s._id)
    setForm(draftForm(s.aiDraft))
    setShowPreview(false)
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }
  const removeFromList = (id: string) => {
    setStores(prev => {
      const rest = prev.filter(s => s._id !== id)
      if (selectedId === id) selectStore(rest[0] ?? ({} as PendingStore))
      return rest
    })
  }

  const handleApprove = () => {
    if (!selected) return
    startTransition(async () => {
      await approveAiDraft(selected._id, selected.slug, selected.name, {
        shortDescription: form.shortDescription,
        about: formToAbout(form),
        metaTitle: form.metaTitle,
        metaKeywords: form.metaKeywords,
        metaDescription: form.metaDescription,
        faq: parseFaqText(form.faqText),
        prosAndCons: {
          pros: form.pros.split('\n').map(s => s.trim()).filter(Boolean),
          cons: form.cons.split('\n').map(s => s.trim()).filter(Boolean),
        },
      })
      showToast(`Đã duyệt nội dung cho ${selected.name}`)
      removeFromList(selected._id)
    })
  }

  const handleReject = () => {
    if (!selected) return
    startTransition(async () => {
      await rejectAiDraft(selected._id)
      showToast(`Đã từ chối draft của ${selected.name}`)
      removeFromList(selected._id)
    })
  }

  const handleRegenerate = () => {
    if (!selected) return
    startTransition(async () => {
      const result = await regenerateAiDraft(selected._id)
      showToast(result.ok
        ? `Đang tạo lại nội dung cho ${selected.name}... reload trang để xem draft mới`
        : `Lỗi khi tạo lại nội dung cho ${selected.name}: ${result.error}`)
    })
  }

  if (stores.length === 0) {
    return <div className="oa-empty" style={{ padding: 40 }}>Không có store nào đang chờ duyệt.</div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
      {toast && <div className="oa-toast">{toast}</div>}
      <div className="oa-table-wrap">
        {stores.map(s => (
          <button
            key={s._id}
            onClick={() => selectStore(s)}
            className="oa-name-btn"
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
              background: s._id === selectedId ? '#f0fdf4' : 'transparent',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            {s.name}
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.slug}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="oa-table-wrap" style={{ padding: 20, maxWidth: 720 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>{selected.name}</h2>
            <button type="button" className="oa-btn" onClick={() => setShowPreview(v => !v)}>
              {showPreview ? 'Ẩn xem trước' : '👁 Xem trước'}
            </button>
          </div>
          {selected.aiDraft?.generatedAt && (
            <div style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 16px' }}>
              Tạo lúc {new Date(selected.aiDraft.generatedAt).toLocaleString('vi-VN')} — model {selected.aiDraft.model}
            </div>
          )}

          {showPreview ? (
            <iframe
              title="Xem trước About Store"
              style={{ width: '100%', height: 640, border: '1px solid #e5e7eb', borderRadius: 10 }}
              srcDoc={renderAboutHtml(selected.name, formToAbout(form))}
            />
          ) : (
            <>
              <label className="oa-label">Short description
                <input className="oa-input" value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 4fr', gap: 12, marginTop: 12 }}>
                <label className="oa-label">Badge
                  <input className="oa-input" style={{ textAlign: 'center' }} value={form.introBadgeEmoji} onChange={e => set('introBadgeEmoji', e.target.value)} />
                </label>
                <label className="oa-label">Tagline (About {selected.name})
                  <input className="oa-input" value={form.tagline} onChange={e => set('tagline', e.target.value)} />
                </label>
              </div>
              <label className="oa-label" style={{ marginTop: 8 }}>Đoạn giới thiệu
                <textarea className="oa-input oa-textarea" rows={2} value={form.introText} onChange={e => set('introText', e.target.value)} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, marginBottom: 16 }}>
                {CARD_KEYS.map(key => (
                  <CardEditor key={key} label={CARD_LABELS[key]} card={form[key]} onChange={card => set(key, card)} />
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <label className="oa-label">Meta Title
                  <input className="oa-input" value={form.metaTitle} onChange={e => set('metaTitle', e.target.value)} />
                </label>
                <label className="oa-label">Meta Keywords
                  <input className="oa-input" value={form.metaKeywords} onChange={e => set('metaKeywords', e.target.value)} />
                </label>
                <label className="oa-label">Meta Description
                  <input className="oa-input" value={form.metaDescription} onChange={e => set('metaDescription', e.target.value)} />
                </label>
              </div>

              <label className="oa-label">FAQ (mỗi cặp câu hỏi/trả lời cách nhau 1 dòng trống — dòng đầu là câu hỏi, phần còn lại là trả lời)
                <textarea className="oa-input oa-textarea" rows={6} value={form.faqText} onChange={e => set('faqText', e.target.value)} />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, marginBottom: 20 }}>
                <label className="oa-label">Ưu điểm (mỗi dòng 1 ý)
                  <textarea className="oa-input oa-textarea" rows={3} value={form.pros} onChange={e => set('pros', e.target.value)} />
                </label>
                <label className="oa-label">Nhược điểm (mỗi dòng 1 ý)
                  <textarea className="oa-input oa-textarea" rows={3} value={form.cons} onChange={e => set('cons', e.target.value)} />
                </label>
              </div>
            </>
          )}

          <div className="oa-modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
            <button className="oa-btn" onClick={handleRegenerate} disabled={isPending}>↻ Tạo lại</button>
            <div style={{ flex: 1 }} />
            <button className="oa-btn oa-btn-red" onClick={handleReject} disabled={isPending}>✕ Từ chối</button>
            <button className="oa-btn oa-btn-green" onClick={handleApprove} disabled={isPending}>{isPending ? 'Đang lưu...' : '✓ Duyệt & Xuất bản'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function OfferReviewPanel({ initialOffers }: { initialOffers: PendingOffer[] }) {
  const [offers, setOffers] = useState(initialOffers)
  const [selectedId, setSelectedId] = useState(initialOffers[0]?._id)
  const [description, setDescription] = useState(initialOffers[0]?.aiDraft?.description ?? '')
  const [usageTips, setUsageTips] = useState(initialOffers[0]?.aiDraft?.usageTips ?? '')
  const [eligibilityNotes, setEligibilityNotes] = useState(initialOffers[0]?.aiDraft?.eligibilityNotes ?? '')
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const selected = offers.find(o => o._id === selectedId)

  const selectOffer = (o: PendingOffer) => {
    setSelectedId(o._id)
    setDescription(o.aiDraft?.description ?? '')
    setUsageTips(o.aiDraft?.usageTips ?? '')
    setEligibilityNotes(o.aiDraft?.eligibilityNotes ?? '')
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }
  const removeFromList = (id: string) => {
    setOffers(prev => {
      const rest = prev.filter(o => o._id !== id)
      if (selectedId === id) selectOffer(rest[0] ?? ({} as PendingOffer))
      return rest
    })
  }

  const handleApprove = () => {
    if (!selected) return
    startTransition(async () => {
      await approveOfferAiDraft(selected._id, selected.storeSlug, { description, usageTips, eligibilityNotes })
      showToast(`Đã duyệt nội dung cho ${selected.title}`)
      removeFromList(selected._id)
    })
  }

  const handleReject = () => {
    if (!selected) return
    startTransition(async () => {
      await rejectOfferAiDraft(selected._id)
      showToast(`Đã từ chối draft của ${selected.title}`)
      removeFromList(selected._id)
    })
  }

  const handleRegenerate = () => {
    if (!selected) return
    startTransition(async () => {
      const result = await regenerateOfferAiDraft(selected._id)
      showToast(result.ok
        ? `Đang tạo lại nội dung cho ${selected.title}... reload trang để xem draft mới`
        : `Lỗi khi tạo lại nội dung cho ${selected.title}: ${result.error}`)
    })
  }

  if (offers.length === 0) {
    return <div className="oa-empty" style={{ padding: 40 }}>Không có offer nào đang chờ duyệt.</div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
      {toast && <div className="oa-toast">{toast}</div>}
      <div className="oa-table-wrap">
        {offers.map(o => (
          <button
            key={o._id}
            onClick={() => selectOffer(o)}
            className="oa-name-btn"
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
              background: o._id === selectedId ? '#f0fdf4' : 'transparent',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            {o.title}
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{o.storeName}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="oa-table-wrap" style={{ padding: 20, maxWidth: 560 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{selected.title}</h2>
          <div style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 16px' }}>
            {selected.storeName}
            {selected.aiDraft?.generatedAt && ` — tạo lúc ${new Date(selected.aiDraft.generatedAt).toLocaleString('vi-VN')} — model ${selected.aiDraft.model}`}
          </div>

          <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Offer: {selected.offerText}</div>
          <label className="oa-label">Mô tả chi tiết
            <textarea className="oa-input oa-textarea" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </label>
          <label className="oa-label">Cách dùng (usage tips)
            <input className="oa-input" value={usageTips} onChange={e => setUsageTips(e.target.value)} />
          </label>
          <label className="oa-label">Điều kiện áp dụng (eligibility)
            <input className="oa-input" value={eligibilityNotes} onChange={e => setEligibilityNotes(e.target.value)} />
          </label>

          <div className="oa-modal-footer" style={{ borderTop: 'none', paddingTop: 0, marginTop: 16 }}>
            <button className="oa-btn" onClick={handleRegenerate} disabled={isPending}>↻ Tạo lại</button>
            <div style={{ flex: 1 }} />
            <button className="oa-btn oa-btn-red" onClick={handleReject} disabled={isPending}>✕ Từ chối</button>
            <button className="oa-btn oa-btn-green" onClick={handleApprove} disabled={isPending}>{isPending ? 'Đang lưu...' : '✓ Duyệt & Xuất bản'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

function DealReviewPanel({ initialDeals }: { initialDeals: PendingDeal[] }) {
  const [deals, setDeals] = useState(initialDeals)
  const [selectedId, setSelectedId] = useState(initialDeals[0]?._id)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const selected = deals.find(d => d._id === selectedId)
  const [form, setForm] = useState(() => dealDraftForm(selected?.aiDraft))
  const set = <K extends keyof DealDraftForm>(key: K, value: DealDraftForm[K]) => setForm(f => ({ ...f, [key]: value }))

  const selectDeal = (d: PendingDeal) => {
    setSelectedId(d._id)
    setForm(dealDraftForm(d.aiDraft))
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }
  const removeFromList = (id: string) => {
    setDeals(prev => {
      const rest = prev.filter(d => d._id !== id)
      if (selectedId === id) selectDeal(rest[0] ?? ({} as PendingDeal))
      return rest
    })
  }

  const handleApprove = () => {
    if (!selected) return
    startTransition(async () => {
      await approveDealAiDraft(selected._id, selected.slug, {
        summary: form.summary,
        prosAndCons: {
          pros: form.pros.split('\n').map(s => s.trim()).filter(Boolean),
          cons: form.cons.split('\n').map(s => s.trim()).filter(Boolean),
        },
        faq: parseFaqText(form.faqText),
        metaTitle: form.metaTitle,
        metaDescription: form.metaDescription,
      })
      showToast(`Đã duyệt nội dung cho ${selected.title}`)
      removeFromList(selected._id)
    })
  }

  const handleReject = () => {
    if (!selected) return
    startTransition(async () => {
      await rejectDealAiDraft(selected._id)
      showToast(`Đã từ chối draft của ${selected.title}`)
      removeFromList(selected._id)
    })
  }

  const handleRegenerate = () => {
    if (!selected) return
    startTransition(async () => {
      const result = await regenerateDealAiDraft(selected._id)
      showToast(result.ok
        ? `Đang tạo lại nội dung cho ${selected.title}... reload trang để xem draft mới`
        : `Lỗi khi tạo lại nội dung cho ${selected.title}: ${result.error}`)
    })
  }

  if (deals.length === 0) {
    return <div className="oa-empty" style={{ padding: 40 }}>Không có deal nào đang chờ duyệt.</div>
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
      {toast && <div className="oa-toast">{toast}</div>}
      <div className="oa-table-wrap">
        {deals.map(d => (
          <button
            key={d._id}
            onClick={() => selectDeal(d)}
            className="oa-name-btn"
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
              background: d._id === selectedId ? '#f0fdf4' : 'transparent',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            {d.title}
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{d.store}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="oa-table-wrap" style={{ padding: 20, maxWidth: 720 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{selected.title}</h2>
          {selected.aiDraft?.generatedAt && (
            <div style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 16px' }}>
              Tạo lúc {new Date(selected.aiDraft.generatedAt).toLocaleString('vi-VN')} — model {selected.aiDraft.model}
            </div>
          )}

          <label className="oa-label">Tóm tắt (vì sao đáng mua)
            <textarea className="oa-input oa-textarea" rows={3} value={form.summary} onChange={e => set('summary', e.target.value)} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, marginBottom: 12 }}>
            <label className="oa-label">Meta Title
              <input className="oa-input" value={form.metaTitle} onChange={e => set('metaTitle', e.target.value)} />
            </label>
            <label className="oa-label">Meta Description
              <input className="oa-input" value={form.metaDescription} onChange={e => set('metaDescription', e.target.value)} />
            </label>
          </div>

          <label className="oa-label">FAQ (mỗi cặp câu hỏi/trả lời cách nhau 1 dòng trống — dòng đầu là câu hỏi, phần còn lại là trả lời)
            <textarea className="oa-input oa-textarea" rows={5} value={form.faqText} onChange={e => set('faqText', e.target.value)} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, marginBottom: 20 }}>
            <label className="oa-label">Ưu điểm (mỗi dòng 1 ý)
              <textarea className="oa-input oa-textarea" rows={3} value={form.pros} onChange={e => set('pros', e.target.value)} />
            </label>
            <label className="oa-label">Nhược điểm (mỗi dòng 1 ý)
              <textarea className="oa-input oa-textarea" rows={3} value={form.cons} onChange={e => set('cons', e.target.value)} />
            </label>
          </div>

          <div className="oa-modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
            <button className="oa-btn" onClick={handleRegenerate} disabled={isPending}>↻ Tạo lại</button>
            <div style={{ flex: 1 }} />
            <button className="oa-btn oa-btn-red" onClick={handleReject} disabled={isPending}>✕ Từ chối</button>
            <button className="oa-btn oa-btn-green" onClick={handleApprove} disabled={isPending}>{isPending ? 'Đang lưu...' : '✓ Duyệt & Xuất bản'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AiReviewAdmin({ initialStores, initialOffers, initialDeals }: {
  initialStores: PendingStore[]; initialOffers: PendingOffer[]; initialDeals: PendingDeal[]
}) {
  const [tab, setTab] = useState<'stores' | 'offers' | 'deals'>(
    initialStores.length > 0 ? 'stores' : initialOffers.length > 0 ? 'offers' : 'deals'
  )

  return (
    <div className="oa-wrap">
      <div className="oa-header">
        <div>
          <h1 className="oa-title">AI Review Queue</h1>
          <div className="oa-breadcrumb">Home / AI Review Queue</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button className="oa-btn" style={tab === 'stores' ? { borderColor: '#16A34A', color: '#16A34A' } : undefined} onClick={() => setTab('stores')}>
          Stores ({initialStores.length})
        </button>
        <button className="oa-btn" style={tab === 'offers' ? { borderColor: '#16A34A', color: '#16A34A' } : undefined} onClick={() => setTab('offers')}>
          Offers ({initialOffers.length})
        </button>
        <button className="oa-btn" style={tab === 'deals' ? { borderColor: '#16A34A', color: '#16A34A' } : undefined} onClick={() => setTab('deals')}>
          Deals ({initialDeals.length})
        </button>
      </div>

      {tab === 'stores'
        ? <StoreReviewPanel initialStores={initialStores} />
        : tab === 'offers'
        ? <OfferReviewPanel initialOffers={initialOffers} />
        : <DealReviewPanel initialDeals={initialDeals} />}
    </div>
  )
}
