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
