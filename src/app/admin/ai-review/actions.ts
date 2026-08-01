'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'
import { generateStoreContent } from '@/lib/ai/generateStoreContent'
import { generateOfferContent } from '@/lib/ai/generateOfferContent'
import { generateDealContent } from '@/lib/ai/generateDealContent'
import { renderAboutHtml, type AboutContent } from '@/lib/ai/aboutTemplate'

function revalidateStore(slug?: string) {
  revalidatePath('/admin/ai-review')
  revalidatePath('/admin/stores')
  if (slug) revalidatePath('/stores/[slug]', 'page')
  revalidatePath('/stores')
}

function revalidateOffer(storeSlug?: string) {
  revalidatePath('/admin/ai-review')
  revalidatePath('/admin/offers')
  revalidatePath('/admin/coupon-codes')
  revalidatePath('/coupon-codes')
  if (storeSlug) revalidatePath('/stores/[slug]', 'page')
}

export async function approveAiDraft(storeId: string, slug: string | undefined, storeName: string, draft: {
  shortDescription: string
  about: AboutContent
  metaTitle: string
  metaKeywords: string
  metaDescription: string
  faq: { question: string; answer: string }[]
  prosAndCons: { pros: string[]; cons: string[] }
}) {
  await writeClient.patch(storeId).set({
    shortDescription: draft.shortDescription,
    description: renderAboutHtml(storeName, draft.about),
    metaTitle: draft.metaTitle,
    metaKeywords: draft.metaKeywords,
    metaDescription: draft.metaDescription,
    faq: draft.faq,
    prosAndCons: draft.prosAndCons,
    aiReviewStatus: 'approved',
  }).unset(['aiDraft']).commit()
  revalidateStore(slug)
}

// ── Duyệt hàng loạt ─────────────────────────────────────────────
// Mỗi hàm gom toàn bộ patch vào MỘT transaction Sanity: 40 mục vẫn chỉ tốn
// 1 request API thay vì 40. Nội dung lấy thẳng từ aiDraft đã lưu — bản đang
// mở trong form được duyệt riêng bằng action đơn lẻ để không mất phần sửa tay.
export type BulkApproveResult = {
  approved: number
  skipped: { id: string; label: string; reason: string }[]
}

// Chia lô để một transaction không phình quá lớn khi chọn cả 150 offer. 50 mục
// vẫn chỉ là 1 request, nên duyệt trọn hàng đợi tốn 3 request thay vì 150.
const BULK_CHUNK = 50

async function commitBulk(
  docs: { _id: string; label: string; fields: Record<string, unknown> | null }[]
): Promise<BulkApproveResult> {
  const skipped: BulkApproveResult['skipped'] = []
  const usable = docs.filter((doc) => {
    if (doc.fields) return true
    skipped.push({ id: doc._id, label: doc.label, reason: 'không còn draft để duyệt' })
    return false
  })

  let approved = 0
  for (let i = 0; i < usable.length; i += BULK_CHUNK) {
    let tx = writeClient.transaction()
    const chunk = usable.slice(i, i + BULK_CHUNK)
    for (const doc of chunk) {
      tx = tx.patch(doc._id, (p) =>
        p.set({ ...doc.fields, aiReviewStatus: 'approved' }).unset(['aiDraft'])
      )
    }
    // Một transaction là all-or-nothing: lô nào lỗi thì lô đó không ghi gì cả,
    // các lô đã xong vẫn giữ nguyên. Báo đúng số đã ghi thay vì nuốt lỗi.
    try {
      await tx.commit()
      approved += chunk.length
    } catch (err) {
      for (const doc of chunk) {
        skipped.push({ id: doc._id, label: doc.label, reason: `lỗi khi ghi: ${String(err)}` })
      }
    }
  }

  return { approved, skipped }
}

export async function approveStoreDraftsBulk(ids: string[]): Promise<BulkApproveResult> {
  if (ids.length === 0) return { approved: 0, skipped: [] }
  const stores = await writeClient.fetch<{ _id: string; name: string; aiDraft?: {
    shortDescription?: string; about?: AboutContent; metaTitle?: string; metaKeywords?: string
    metaDescription?: string; faq?: { question: string; answer: string }[]
    prosAndCons?: { pros?: string[]; cons?: string[] }
  } }[]>(`*[_type == "store" && _id in $ids]{ _id, name, aiDraft }`, { ids })

  const result = await commitBulk(
    stores.map((s) => ({
      _id: s._id,
      label: s.name,
      fields: s.aiDraft
        ? {
            shortDescription: s.aiDraft.shortDescription ?? '',
            description: renderAboutHtml(s.name, s.aiDraft.about ?? ({} as AboutContent)),
            metaTitle: s.aiDraft.metaTitle ?? '',
            metaKeywords: s.aiDraft.metaKeywords ?? '',
            metaDescription: s.aiDraft.metaDescription ?? '',
            faq: s.aiDraft.faq ?? [],
            prosAndCons: s.aiDraft.prosAndCons ?? { pros: [], cons: [] },
          }
        : null,
    }))
  )
  revalidateStore()
  revalidatePath('/stores/[slug]', 'page')
  return result
}

export async function approveOfferDraftsBulk(ids: string[]): Promise<BulkApproveResult> {
  if (ids.length === 0) return { approved: 0, skipped: [] }
  const offers = await writeClient.fetch<{ _id: string; title: string; aiDraft?: {
    description?: string; usageTips?: string; eligibilityNotes?: string
  } }[]>(`*[_type == "offer" && _id in $ids]{ _id, title, aiDraft }`, { ids })

  const result = await commitBulk(
    offers.map((o) => ({
      _id: o._id,
      label: o.title,
      fields: o.aiDraft
        ? {
            description: o.aiDraft.description ?? '',
            // Ô trống thì bỏ hẳn key — giống hệt action đơn lẻ, để một draft
            // thiếu usageTips không ghi đè giá trị đang sống bằng chuỗi rỗng.
            ...(o.aiDraft.usageTips ? { usageTips: o.aiDraft.usageTips } : {}),
            ...(o.aiDraft.eligibilityNotes ? { eligibilityNotes: o.aiDraft.eligibilityNotes } : {}),
          }
        : null,
    }))
  )
  revalidateOffer()
  revalidatePath('/stores/[slug]', 'page')
  return result
}

export async function approveDealDraftsBulk(ids: string[]): Promise<BulkApproveResult> {
  if (ids.length === 0) return { approved: 0, skipped: [] }
  const deals = await writeClient.fetch<{ _id: string; title: string; aiDraft?: {
    summary?: string; prosAndCons?: { pros?: string[]; cons?: string[] }
    faq?: { question: string; answer: string }[]; metaTitle?: string; metaDescription?: string
  } }[]>(`*[_type == "deal" && _id in $ids]{ _id, title, aiDraft }`, { ids })

  const result = await commitBulk(
    deals.map((d) => ({
      _id: d._id,
      label: d.title,
      fields: d.aiDraft
        ? {
            summary: d.aiDraft.summary ?? '',
            prosAndCons: d.aiDraft.prosAndCons ?? { pros: [], cons: [] },
            faq: d.aiDraft.faq ?? [],
            metaTitle: d.aiDraft.metaTitle ?? '',
            metaDescription: d.aiDraft.metaDescription ?? '',
          }
        : null,
    }))
  )
  revalidateDeal()
  revalidatePath('/deals/[slug]', 'page')
  return result
}

export async function rejectAiDraft(storeId: string) {
  await writeClient.patch(storeId).set({ aiReviewStatus: 'rejected' }).unset(['aiDraft']).commit()
  revalidateStore()
}

export async function regenerateAiDraft(storeId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const store = await writeClient.fetch(
      `*[_id == $id][0]{ "id": _id, name, category, website, maxOffer, shortDescription, description }`,
      { id: storeId }
    )
    if (!store) return { ok: false, error: 'Store not found' }
    await generateStoreContent(store)
    revalidateStore()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ── Offers ──────────────────────────────────────────────────────

export async function approveOfferAiDraft(offerId: string, storeSlug: string | undefined, draft: {
  description: string
  usageTips?: string
  eligibilityNotes?: string
}) {
  await writeClient.patch(offerId).set({
    description: draft.description,
    usageTips: draft.usageTips || undefined,
    eligibilityNotes: draft.eligibilityNotes || undefined,
    aiReviewStatus: 'approved',
  }).unset(['aiDraft']).commit()
  revalidateOffer(storeSlug)
}

export async function rejectOfferAiDraft(offerId: string) {
  await writeClient.patch(offerId).set({ aiReviewStatus: 'rejected' }).unset(['aiDraft']).commit()
  revalidateOffer()
}

export async function regenerateOfferAiDraft(offerId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const offer = await writeClient.fetch(
      `*[_id == $id][0]{ "id": _id, title, offerText, expiresAt, "storeName": store->name, "hasCouponCode": defined(couponCode) }`,
      { id: offerId }
    )
    if (!offer) return { ok: false, error: 'Offer not found' }
    await generateOfferContent(offer)
    revalidateOffer()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ── Deals ───────────────────────────────────────────────────────

function revalidateDeal(slug?: string) {
  revalidatePath('/admin/ai-review')
  revalidatePath('/admin/deals')
  revalidatePath('/deals')
  if (slug) revalidatePath('/deals/[slug]', 'page')
}

export async function approveDealAiDraft(dealId: string, slug: string | undefined, draft: {
  summary: string
  prosAndCons: { pros: string[]; cons: string[] }
  faq: { question: string; answer: string }[]
  metaTitle: string
  metaDescription: string
}) {
  await writeClient.patch(dealId).set({
    summary: draft.summary,
    prosAndCons: draft.prosAndCons,
    faq: draft.faq,
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    aiReviewStatus: 'approved',
  }).unset(['aiDraft']).commit()
  revalidateDeal(slug)
}

export async function rejectDealAiDraft(dealId: string) {
  await writeClient.patch(dealId).set({ aiReviewStatus: 'rejected' }).unset(['aiDraft']).commit()
  revalidateDeal()
}

export async function regenerateDealAiDraft(dealId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const deal = await writeClient.fetch(
      `*[_id == $id][0]{ "id": _id, title, store, priceSale, priceOrig, discount }`,
      { id: dealId }
    )
    if (!deal) return { ok: false, error: 'Deal not found' }
    await generateDealContent(deal)
    revalidateDeal()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
