'use client'

import { useState, useTransition } from 'react'
import {
  approveAiDraft, rejectAiDraft, regenerateAiDraft,
  approveOfferAiDraft, rejectOfferAiDraft, regenerateOfferAiDraft,
  approveDealAiDraft, rejectDealAiDraft, regenerateDealAiDraft,
  approveStoreDraftsBulk, approveOfferDraftsBulk, approveDealDraftsBulk,
  approveArticleAiDraft, rejectArticleAiDraft, approveArticleDraftsBulk,
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

type ComparisonRow = { label: string; values: string[] }

type ArticleAiDraft = {
  title?: string
  excerpt?: string
  contentHtml?: string
  metaTitle?: string
  metaDescription?: string
  coverEmoji?: string
  coverBg?: string
  readTime?: number
  templateId?: string
  faq?: FaqItem[]
  comparisonRows?: ComparisonRow[]
  /** Cảnh báo "mềm" của bộ hậu kiểm + ghi chú bài KHÔNG trả lời được gì. */
  warnings?: string[]
  generatedAt?: string
  model?: string
}

type PendingArticle = {
  _id: string
  title: string
  slug?: string
  category?: string
  storeName?: string
  productCount?: number
  aiDraft?: ArticleAiDraft
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

// Danh sách bên trái dùng chung cho cả 3 tab: ô tích từng dòng + ô "chọn tất cả".
// Ô chọn tất cả ở trạng thái indeterminate khi mới chọn một phần, để phân biệt
// với "chưa chọn gì" — nếu không, tích một mục rồi bấm vào nó sẽ bỏ chọn cả loạt
// mà trên màn hình không có gì báo.
function PickList<T extends { _id: string }>({
  items, selectedId, checkedIds, onSelect, onToggle, onToggleAll, primary, secondary,
}: {
  items: T[]
  selectedId?: string
  checkedIds: Set<string>
  onSelect: (item: T) => void
  onToggle: (id: string) => void
  onToggleAll: () => void
  primary: (item: T) => string
  secondary: (item: T) => string | undefined
}) {
  const allChecked = items.length > 0 && checkedIds.size === items.length
  const someChecked = checkedIds.size > 0 && !allChecked

  return (
    <div className="oa-table-wrap">
      <label
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          borderBottom: '1px solid #e5e7eb', background: '#f9fafb',
          fontSize: 12, fontWeight: 600, color: '#6b7280', cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={allChecked}
          ref={(el) => { if (el) el.indeterminate = someChecked }}
          onChange={onToggleAll}
          style={{ width: 16, height: 16, cursor: 'pointer' }}
        />
        {checkedIds.size > 0 ? `Đã chọn ${checkedIds.size}/${items.length}` : `Chọn tất cả (${items.length})`}
      </label>

      {items.map((item) => (
        <div
          key={item._id}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 14,
            borderBottom: '1px solid #e5e7eb',
            background: item._id === selectedId ? '#f0fdf4' : 'transparent',
          }}
        >
          <input
            type="checkbox"
            checked={checkedIds.has(item._id)}
            onChange={() => onToggle(item._id)}
            style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
          />
          <button
            onClick={() => onSelect(item)}
            className="oa-name-btn"
            style={{
              display: 'block', flex: 1, minWidth: 0, textAlign: 'left',
              padding: '10px 14px 10px 4px', background: 'transparent',
            }}
          >
            {primary(item)}
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{secondary(item)}</div>
          </button>
        </div>
      ))}
    </div>
  )
}

// Gộp kết quả duyệt hàng loạt thành một câu thông báo, có nêu số mục bị bỏ qua.
function bulkToast(noun: string, approved: number, skipped: { label: string; reason: string }[]) {
  const head = `Đã duyệt ${approved} ${noun}`
  if (skipped.length === 0) return head
  return `${head} — bỏ qua ${skipped.length}: ${skipped.map((s) => `${s.label} (${s.reason})`).join(', ')}`
}

function useChecked() {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const toggle = (id: string) =>
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleAll = (ids: string[]) =>
    setCheckedIds((prev) => (prev.size === ids.length ? new Set() : new Set(ids)))
  const clear = () => setCheckedIds(new Set())
  return { checkedIds, toggle, toggleAll, clear }
}

function StoreReviewPanel({ initialStores, onCountChange }: { initialStores: PendingStore[]; onCountChange: (n: number) => void }) {
  const [stores, setStores] = useState(initialStores)
  const [selectedId, setSelectedId] = useState(initialStores[0]?._id)
  const { checkedIds, toggle, toggleAll, clear } = useChecked()
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

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }
  const removeMany = (ids: Set<string>) => {
    const rest = stores.filter(s => !ids.has(s._id))
    setStores(rest)
    onCountChange(rest.length)
    clear()
    if (selectedId && ids.has(selectedId)) selectStore(rest[0] ?? ({} as PendingStore))
  }
  const removeFromList = (id: string) => removeMany(new Set([id]))

  // Nội dung đang mở trong form được duyệt bằng action đơn lẻ để giữ nguyên phần
  // sửa tay; các mục tích còn lại lấy thẳng aiDraft đã lưu trong một transaction.
  const approveOpenWithEdits = () => selected && approveAiDraft(selected._id, selected.slug, selected.name, {
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

  const handleApprove = () => {
    if (checkedIds.size === 0) {
      if (!selected) return
      startTransition(async () => {
        await approveOpenWithEdits()
        showToast(`Đã duyệt nội dung cho ${selected.name}`)
        removeFromList(selected._id)
      })
      return
    }

    const ids = new Set(checkedIds)
    startTransition(async () => {
      let approved = 0
      if (selected && ids.has(selected._id)) {
        await approveOpenWithEdits()
        approved++
      }
      const rest = [...ids].filter(id => id !== selected?._id)
      const result = await approveStoreDraftsBulk(rest)
      showToast(bulkToast('store', approved + result.approved, result.skipped))
      removeMany(ids)
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
      <PickList
        items={stores}
        selectedId={selectedId}
        checkedIds={checkedIds}
        onSelect={selectStore}
        onToggle={toggle}
        onToggleAll={() => toggleAll(stores.map(s => s._id))}
        primary={s => s.name}
        secondary={s => s.slug}
      />

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
            <button className="oa-btn oa-btn-green" onClick={handleApprove} disabled={isPending}>
              {isPending ? 'Đang lưu...' : checkedIds.size > 0 ? `✓ Duyệt ${checkedIds.size} mục đã chọn` : '✓ Duyệt & Xuất bản'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function OfferReviewPanel({ initialOffers, onCountChange }: { initialOffers: PendingOffer[]; onCountChange: (n: number) => void }) {
  const [offers, setOffers] = useState(initialOffers)
  const [selectedId, setSelectedId] = useState(initialOffers[0]?._id)
  const { checkedIds, toggle, toggleAll, clear } = useChecked()
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

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }
  const removeMany = (ids: Set<string>) => {
    const rest = offers.filter(o => !ids.has(o._id))
    setOffers(rest)
    onCountChange(rest.length)
    clear()
    if (selectedId && ids.has(selectedId)) selectOffer(rest[0] ?? ({} as PendingOffer))
  }
  const removeFromList = (id: string) => removeMany(new Set([id]))

  const handleApprove = () => {
    if (checkedIds.size === 0) {
      if (!selected) return
      startTransition(async () => {
        await approveOfferAiDraft(selected._id, selected.storeSlug, { description, usageTips, eligibilityNotes })
        showToast(`Đã duyệt nội dung cho ${selected.title}`)
        removeFromList(selected._id)
      })
      return
    }

    const ids = new Set(checkedIds)
    startTransition(async () => {
      let approved = 0
      if (selected && ids.has(selected._id)) {
        await approveOfferAiDraft(selected._id, selected.storeSlug, { description, usageTips, eligibilityNotes })
        approved++
      }
      const rest = [...ids].filter(id => id !== selected?._id)
      const result = await approveOfferDraftsBulk(rest)
      showToast(bulkToast('offer', approved + result.approved, result.skipped))
      removeMany(ids)
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
      <PickList
        items={offers}
        selectedId={selectedId}
        checkedIds={checkedIds}
        onSelect={selectOffer}
        onToggle={toggle}
        onToggleAll={() => toggleAll(offers.map(o => o._id))}
        primary={o => o.title}
        secondary={o => o.storeName}
      />

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
            <button className="oa-btn oa-btn-green" onClick={handleApprove} disabled={isPending}>
              {isPending ? 'Đang lưu...' : checkedIds.size > 0 ? `✓ Duyệt ${checkedIds.size} mục đã chọn` : '✓ Duyệt & Xuất bản'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function DealReviewPanel({ initialDeals, onCountChange }: { initialDeals: PendingDeal[]; onCountChange: (n: number) => void }) {
  const [deals, setDeals] = useState(initialDeals)
  const [selectedId, setSelectedId] = useState(initialDeals[0]?._id)
  const { checkedIds, toggle, toggleAll, clear } = useChecked()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')

  const selected = deals.find(d => d._id === selectedId)
  const [form, setForm] = useState(() => dealDraftForm(selected?.aiDraft))
  const set = <K extends keyof DealDraftForm>(key: K, value: DealDraftForm[K]) => setForm(f => ({ ...f, [key]: value }))

  const selectDeal = (d: PendingDeal) => {
    setSelectedId(d._id)
    setForm(dealDraftForm(d.aiDraft))
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000) }
  const removeMany = (ids: Set<string>) => {
    const rest = deals.filter(d => !ids.has(d._id))
    setDeals(rest)
    onCountChange(rest.length)
    clear()
    if (selectedId && ids.has(selectedId)) selectDeal(rest[0] ?? ({} as PendingDeal))
  }
  const removeFromList = (id: string) => removeMany(new Set([id]))

  const approveOpenWithEdits = () => selected && approveDealAiDraft(selected._id, selected.slug, {
    summary: form.summary,
    prosAndCons: {
      pros: form.pros.split('\n').map(s => s.trim()).filter(Boolean),
      cons: form.cons.split('\n').map(s => s.trim()).filter(Boolean),
    },
    faq: parseFaqText(form.faqText),
    metaTitle: form.metaTitle,
    metaDescription: form.metaDescription,
  })

  const handleApprove = () => {
    if (checkedIds.size === 0) {
      if (!selected) return
      startTransition(async () => {
        await approveOpenWithEdits()
        showToast(`Đã duyệt nội dung cho ${selected.title}`)
        removeFromList(selected._id)
      })
      return
    }

    const ids = new Set(checkedIds)
    startTransition(async () => {
      let approved = 0
      if (selected && ids.has(selected._id)) {
        await approveOpenWithEdits()
        approved++
      }
      const rest = [...ids].filter(id => id !== selected?._id)
      const result = await approveDealDraftsBulk(rest)
      showToast(bulkToast('deal', approved + result.approved, result.skipped))
      removeMany(ids)
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
      <PickList
        items={deals}
        selectedId={selectedId}
        checkedIds={checkedIds}
        onSelect={selectDeal}
        onToggle={toggle}
        onToggleAll={() => toggleAll(deals.map(d => d._id))}
        primary={d => d.title}
        secondary={d => d.store}
      />

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
            <button className="oa-btn oa-btn-green" onClick={handleApprove} disabled={isPending}>
              {isPending ? 'Đang lưu...' : checkedIds.size > 0 ? `✓ Duyệt ${checkedIds.size} mục đã chọn` : '✓ Duyệt & Xuất bản'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function articleDraftForm(draft?: ArticleAiDraft) {
  return {
    title: draft?.title ?? '',
    excerpt: draft?.excerpt ?? '',
    contentHtml: draft?.contentHtml ?? '',
    metaTitle: draft?.metaTitle ?? '',
    metaDescription: draft?.metaDescription ?? '',
    faqText: (draft?.faq ?? []).map(f => `${f.question}\n${f.answer}`).join('\n\n'),
  }
}
type ArticleDraftForm = ReturnType<typeof articleDraftForm>

function ArticleReviewPanel({ initialArticles, onCountChange }: {
  initialArticles: PendingArticle[]; onCountChange: (n: number) => void
}) {
  const [articles, setArticles] = useState(initialArticles)
  const [selectedId, setSelectedId] = useState(initialArticles[0]?._id)
  const { checkedIds, toggle, toggleAll, clear } = useChecked()
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState('')
  const [confirmReject, setConfirmReject] = useState(false)

  const selected = articles.find(a => a._id === selectedId)
  const [form, setForm] = useState(() => articleDraftForm(selected?.aiDraft))
  const set = <K extends keyof ArticleDraftForm>(key: K, value: ArticleDraftForm[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  const selectArticle = (a: PendingArticle) => {
    setSelectedId(a._id)
    setForm(articleDraftForm(a.aiDraft))
    setConfirmReject(false)
  }

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 5000) }
  const removeMany = (ids: Set<string>) => {
    const rest = articles.filter(a => !ids.has(a._id))
    setArticles(rest)
    onCountChange(rest.length)
    clear()
    if (selectedId && ids.has(selectedId)) selectArticle(rest[0] ?? ({} as PendingArticle))
  }

  const approveOpenWithEdits = () => selected && approveArticleAiDraft(selected._id, selected.slug, {
    title: form.title,
    excerpt: form.excerpt,
    contentHtml: form.contentHtml,
    metaTitle: form.metaTitle,
    metaDescription: form.metaDescription,
    coverEmoji: selected.aiDraft?.coverEmoji,
    coverBg: selected.aiDraft?.coverBg,
    readTime: selected.aiDraft?.readTime,
    faq: parseFaqText(form.faqText),
    // Bảng so sánh không sửa được ở đây: nó là dữ liệu có cấu trúc và số ô phải
    // khớp số sản phẩm. Sửa bằng ô chữ là cách nhanh nhất để lệch cột.
    comparisonRows: selected.aiDraft?.comparisonRows,
  })

  const handleApprove = () => {
    if (checkedIds.size === 0) {
      if (!selected) return
      startTransition(async () => {
        const r = await approveOpenWithEdits()
        if (r && !r.ok) { showToast(r.error ?? 'Không duyệt được'); return }
        showToast(`Đã đăng "${form.title || selected.title}" — /blog/${selected.slug}`)
        removeMany(new Set([selected._id]))
      })
      return
    }
    const ids = new Set(checkedIds)
    startTransition(async () => {
      let approved = 0
      if (selected && ids.has(selected._id)) {
        const r = await approveOpenWithEdits()
        if (r?.ok) approved++
      }
      const rest = [...ids].filter(id => id !== selected?._id)
      const result = await approveArticleDraftsBulk(rest)
      showToast(bulkToast('bài viết', approved + result.approved, result.skipped))
      removeMany(ids)
    })
  }

  // ⚠️ Từ chối ở tab này XOÁ HẲN bài, khác ba tab kia. Nên phải hỏi lại một nhịp —
  // ba tab kia bấm nhầm thì chỉ mất bản nháp, ở đây bấm nhầm là mất cả document.
  const handleReject = () => {
    if (!selected) return
    if (!confirmReject) { setConfirmReject(true); return }
    startTransition(async () => {
      await rejectArticleAiDraft(selected._id)
      showToast(`Đã xoá hẳn bản nháp "${selected.title}"`)
      removeMany(new Set([selected._id]))
    })
  }

  if (articles.length === 0) {
    return (
      <div className="oa-empty" style={{ padding: 40 }}>
        Không có bài viết nào đang chờ duyệt. Sinh bài mới ở <b>Ý tưởng bài viết</b>.
      </div>
    )
  }

  const draft = selected?.aiDraft

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, alignItems: 'start' }}>
      {toast && <div className="oa-toast">{toast}</div>}
      <PickList
        items={articles}
        selectedId={selectedId}
        checkedIds={checkedIds}
        onSelect={selectArticle}
        onToggle={toggle}
        onToggleAll={() => toggleAll(articles.map(a => a._id))}
        primary={a => a.aiDraft?.title || a.title}
        secondary={a => [a.storeName, a.productCount ? `${a.productCount} sản phẩm` : null].filter(Boolean).join(' · ')}
      />

      {selected && (
        <div className="oa-table-wrap" style={{ padding: 20, maxWidth: 820 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{selected.title}</h2>
          <div style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 14px' }}>
            {selected.storeName} · {selected.category} · {draft?.templateId}
            {draft?.generatedAt && <> · tạo lúc {new Date(draft.generatedAt).toLocaleString('vi-VN')} — model {draft.model}</>}
          </div>

          {/* Cảnh báo mềm của bộ hậu kiểm là lý do tồn tại của bước duyệt tay —
              đặt trên cùng, trước cả nội dung. */}
          {draft?.warnings && draft.warnings.length > 0 && (
            <div style={{ margin: '0 0 16px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309' }}>
                {draft.warnings.length} điều máy không tự quyết được
              </div>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12, color: '#92400e', lineHeight: 1.7 }}>
                {draft.warnings.map(w => <li key={w}>{w}</li>)}
              </ul>
            </div>
          )}

          <label className="oa-label">Tiêu đề
            <input className="oa-input" value={form.title} onChange={e => set('title', e.target.value)} />
          </label>

          <label className="oa-label" style={{ marginTop: 12 }}>Tóm tắt
            <textarea className="oa-input oa-textarea" rows={2} value={form.excerpt} onChange={e => set('excerpt', e.target.value)} />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
            <label className="oa-label">Meta Title ({[...form.metaTitle].length}/50)
              <input className="oa-input" value={form.metaTitle} onChange={e => set('metaTitle', e.target.value)} />
            </label>
            <label className="oa-label">Meta Description
              <input className="oa-input" value={form.metaDescription} onChange={e => set('metaDescription', e.target.value)} />
            </label>
          </div>

          {draft?.comparisonRows && draft.comparisonRows.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>
                Bảng so sánh ({draft.comparisonRows.length} hàng) — sửa trong Sanity Studio nếu cần
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    {draft.comparisonRows.map(r => (
                      <tr key={r.label} style={{ borderTop: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '6px 10px', textAlign: 'left', color: '#374151', whiteSpace: 'nowrap' }}>{r.label}</th>
                        {r.values.map((v, i) => (
                          <td key={i} style={{ padding: '6px 10px', color: '#4b5563' }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <label className="oa-label" style={{ marginTop: 14 }}>
            Thân bài (HTML — thẻ [IMAGE:n] [CTA:n] [PRODUCT:n] [TABLE] [PRICE:n] [COUPON] được thay lúc gọi trang)
            <textarea
              className="oa-input oa-textarea"
              rows={14}
              style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}
              value={form.contentHtml}
              onChange={e => set('contentHtml', e.target.value)}
            />
          </label>

          <label className="oa-label" style={{ marginTop: 12 }}>FAQ (mỗi cặp cách nhau 1 dòng trống — dòng đầu là câu hỏi)
            <textarea className="oa-input oa-textarea" rows={6} value={form.faqText} onChange={e => set('faqText', e.target.value)} />
          </label>

          <div className="oa-modal-footer" style={{ borderTop: 'none', paddingTop: 16 }}>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              Duyệt là đăng ngay — ngày đăng đặt về hôm nay.
            </span>
            <div style={{ flex: 1 }} />
            <button className="oa-btn oa-btn-red" onClick={handleReject} disabled={isPending}>
              {confirmReject ? '✕ Chắc chắn xoá hẳn?' : '✕ Từ chối'}
            </button>
            <button className="oa-btn oa-btn-green" onClick={handleApprove} disabled={isPending}>
              {isPending ? 'Đang lưu...' : checkedIds.size > 0 ? `✓ Duyệt ${checkedIds.size} bài đã chọn` : '✓ Duyệt & Đăng'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AiReviewAdmin({ initialStores, initialOffers, initialDeals, initialArticles }: {
  initialStores: PendingStore[]; initialOffers: PendingOffer[]; initialDeals: PendingDeal[]
  initialArticles: PendingArticle[]
}) {
  const [tab, setTab] = useState<'stores' | 'offers' | 'deals' | 'articles'>(
    initialStores.length > 0 ? 'stores'
      : initialOffers.length > 0 ? 'offers'
        : initialDeals.length > 0 ? 'deals'
          : initialArticles.length > 0 ? 'articles' : 'stores'
  )
  // Số trên tab do panel báo lên sau mỗi lần duyệt — nếu vẫn đọc initial*.length
  // thì duyệt sạch 40 store xong tab vẫn hiện "Stores (40)".
  const [counts, setCounts] = useState({
    stores: initialStores.length, offers: initialOffers.length, deals: initialDeals.length,
    articles: initialArticles.length,
  })

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
          Stores ({counts.stores})
        </button>
        <button className="oa-btn" style={tab === 'offers' ? { borderColor: '#16A34A', color: '#16A34A' } : undefined} onClick={() => setTab('offers')}>
          Offers ({counts.offers})
        </button>
        <button className="oa-btn" style={tab === 'deals' ? { borderColor: '#16A34A', color: '#16A34A' } : undefined} onClick={() => setTab('deals')}>
          Deals ({counts.deals})
        </button>
        <button className="oa-btn" style={tab === 'articles' ? { borderColor: '#16A34A', color: '#16A34A' } : undefined} onClick={() => setTab('articles')}>
          Bài viết ({counts.articles})
        </button>
      </div>

      {/* Cả ba panel luôn mounted, chỉ ẩn/hiện bằng CSS. Nếu render có điều kiện,
          chuyển tab rồi quay lại sẽ dựng lại panel từ props ban đầu và những mục
          vừa duyệt hiện về như chưa duyệt. */}
      <div style={{ display: tab === 'stores' ? 'block' : 'none' }}>
        <StoreReviewPanel initialStores={initialStores} onCountChange={n => setCounts(c => ({ ...c, stores: n }))} />
      </div>
      <div style={{ display: tab === 'offers' ? 'block' : 'none' }}>
        <OfferReviewPanel initialOffers={initialOffers} onCountChange={n => setCounts(c => ({ ...c, offers: n }))} />
      </div>
      <div style={{ display: tab === 'deals' ? 'block' : 'none' }}>
        <DealReviewPanel initialDeals={initialDeals} onCountChange={n => setCounts(c => ({ ...c, deals: n }))} />
      </div>
      <div style={{ display: tab === 'articles' ? 'block' : 'none' }}>
        <ArticleReviewPanel initialArticles={initialArticles} onCountChange={n => setCounts(c => ({ ...c, articles: n }))} />
      </div>
    </div>
  )
}
