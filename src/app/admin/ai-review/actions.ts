'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'
import { generateStoreContent } from '@/lib/ai/generateStoreContent'
import { generateOfferContent } from '@/lib/ai/generateOfferContent'
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

export async function regenerateAiDraft(storeId: string) {
  const store = await writeClient.fetch(
    `*[_id == $id][0]{ "id": _id, name, category, website, maxOffer, shortDescription, description }`,
    { id: storeId }
  )
  if (!store) throw new Error('Store not found')
  await generateStoreContent(store)
  revalidateStore()
}

// ── Offers ──────────────────────────────────────────────────────

export async function approveOfferAiDraft(offerId: string, storeSlug: string | undefined, description: string) {
  await writeClient.patch(offerId).set({ description, aiReviewStatus: 'approved' }).unset(['aiDraft']).commit()
  revalidateOffer(storeSlug)
}

export async function rejectOfferAiDraft(offerId: string) {
  await writeClient.patch(offerId).set({ aiReviewStatus: 'rejected' }).unset(['aiDraft']).commit()
  revalidateOffer()
}

export async function regenerateOfferAiDraft(offerId: string) {
  const offer = await writeClient.fetch(
    `*[_id == $id][0]{ "id": _id, title, offerText, expiresAt, "storeName": store->name, "hasCouponCode": defined(couponCode) }`,
    { id: offerId }
  )
  if (!offer) throw new Error('Offer not found')
  await generateOfferContent(offer)
  revalidateOffer()
}
