'use server'

import { writeClient } from '@/sanity/writeClient'
import { revalidatePath } from 'next/cache'
import { revalidateStoreHostConsumers } from '@/lib/revalidateStoreHosts'

/**
 * Ma coupon la thu duoc `store-hosts` mang theo, va trang deal hien no qua
 * `getDealCoupon()`. Thieu `revalidateStoreHostConsumers()` thi sua ma xong,
 * trang deal con quang cao ma cu toi 5 phut — dung loai sai lam mat long tin ma
 * hop coupon trang review da co luat rieng de tranh.
 */
function revalidate() {
  revalidatePath('/admin/coupon-codes')
  revalidatePath('/coupon-codes')
  revalidatePath('/stores/[slug]', 'page')
  revalidateStoreHostConsumers()
}

export async function updateCouponOffer(id: string, patch: Record<string, unknown>) {
  await writeClient.patch(id).set(patch).commit()
  revalidate()
}

export async function deleteCouponOffer(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await writeClient.delete(id)
    revalidate()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function createCouponOffer(data: {
  title: string
  offerText: string
  couponCode: string
  storeId: string
  link: string
  description?: string
  expiresAt?: string
  active: boolean
  verified: boolean
}) {
  const doc = await writeClient.create({
    _type: 'offer',
    title: data.title,
    offerText: data.offerText,
    couponCode: data.couponCode,
    store: { _type: 'reference', _ref: data.storeId },
    link: data.link,
    description: data.description || undefined,
    expiresAt: data.expiresAt || undefined,
    active: data.active,
    verified: data.verified,
    order: 0,
  })
  revalidate()
  return doc
}
