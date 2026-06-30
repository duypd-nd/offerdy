'use server'

import { writeClient } from '@/sanity/writeClient'
import { revalidatePath } from 'next/cache'

export async function updateOffer(id: string, patch: Record<string, unknown>) {
  await writeClient.patch(id).set(patch).commit()
  revalidatePath('/admin/offers')
  revalidatePath('/stores/[slug]', 'page')
}

export async function deleteOffer(id: string) {
  await writeClient.delete(id)
  revalidatePath('/admin/offers')
  revalidatePath('/stores/[slug]', 'page')
}

export async function bulkDelete(ids: string[]) {
  await Promise.all(ids.map(id => writeClient.delete(id)))
  revalidatePath('/admin/offers')
  revalidatePath('/stores/[slug]', 'page')
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
}
