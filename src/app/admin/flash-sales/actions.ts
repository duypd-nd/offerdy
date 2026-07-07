'use server'

import { writeClient } from '@/sanity/writeClient'
import { revalidatePath } from 'next/cache'

function revalidate() {
  revalidatePath('/admin/flash-sales')
  revalidatePath('/flash-sales')
  revalidatePath('/stores/[slug]', 'page')
}

export async function updateOfferExpiry(id: string, patch: Record<string, unknown>) {
  await writeClient.patch(id).set(patch).commit()
  revalidate()
}

export async function toggleOfferActive(id: string, active: boolean) {
  await writeClient.patch(id).set({ active }).commit()
  revalidate()
}

export async function deleteOffer(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await writeClient.delete(id)
    revalidate()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function createFlashSaleOffer(data: {
  title: string
  offerText: string
  couponCode?: string
  storeId: string
  expiresAt: string
  link: string
  active: boolean
  verified: boolean
}) {
  const doc = await writeClient.create({
    _type: 'offer',
    title: data.title,
    offerText: data.offerText,
    couponCode: data.couponCode || undefined,
    store: { _type: 'reference', _ref: data.storeId },
    expiresAt: data.expiresAt,
    link: data.link,
    active: data.active,
    verified: data.verified,
    order: 0,
  })
  revalidate()
  return doc
}
