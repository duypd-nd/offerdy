'use server'

import { writeClient } from '@/sanity/writeClient'
import { revalidatePath } from 'next/cache'

export async function updateOffer(id: string, patch: Record<string, unknown>) {
  await writeClient.patch(id).set(patch).commit()
  revalidatePath('/admin/offers')
  revalidatePath('/stores/[slug]', 'page')
  revalidatePath('/coupon-codes')
}

export async function deleteOffer(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await writeClient.delete(id)
    revalidatePath('/admin/offers')
    revalidatePath('/stores/[slug]', 'page')
    revalidatePath('/coupon-codes')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function bulkDelete(ids: string[]): Promise<{ ok: boolean; failed: string[]; error?: string }> {
  const results = await Promise.allSettled(ids.map(id => writeClient.delete(id)))
  const failed = results
    .map((r, i) => (r.status === 'rejected' ? ids[i] : null))
    .filter((id): id is string => id !== null)
  revalidatePath('/admin/offers')
  revalidatePath('/stores/[slug]', 'page')
  revalidatePath('/coupon-codes')
  return { ok: failed.length === 0, failed }
}

export async function createOffer(data: {
  title: string
  offerText: string
  couponCode: string
  storeId: string
  order: number
  active: boolean
  verified: boolean
}) {
  await writeClient.create({
    _type: 'offer',
    title: data.title,
    offerText: data.offerText,
    couponCode: data.couponCode || undefined,
    store: { _type: 'reference', _ref: data.storeId },
    order: data.order,
    active: data.active,
    verified: data.verified,
  })
  revalidatePath('/admin/offers')
  revalidatePath('/stores/[slug]', 'page')
  revalidatePath('/coupon-codes')
}
