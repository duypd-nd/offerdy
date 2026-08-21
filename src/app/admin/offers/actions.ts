'use server'

import { writeClient } from '@/sanity/writeClient'
import { revalidatePath } from 'next/cache'
import { revalidateStoreHostConsumers } from '@/lib/revalidateStoreHosts'
import { recordAudit, describeDoc } from '@/lib/adminAudit'

/**
 * Doi mot offer la doi ca `store-hosts` — bang do giu MA COUPON NOI BAT cua tung
 * shop, va ma do hien tren TRANG DEAL qua `getDealCoupon()`. Truoc day bon cho
 * duoi day chi lam moi /admin/offers, /stores/[slug] va /coupon-codes, nen sua
 * ma coupon xong thi trang deal con hien ma cu toi 5 phut.
 */
function revalidateOfferDependents() {
  revalidatePath('/admin/offers')
  revalidatePath('/stores/[slug]', 'page')
  revalidatePath('/coupon-codes')
  revalidateStoreHostConsumers()
}

export async function updateOffer(id: string, patch: Record<string, unknown>) {
  await writeClient.patch(id).set(patch).commit()
  revalidateOfferDependents()
}

export async function deleteOffer(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const label = await describeDoc(id)
    await writeClient.delete(id)
    await recordAudit({ action: 'offer.delete', target: id, label })
    revalidateOfferDependents()
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

  // MOT muc cho ca me, khong phai mot muc moi offer: lay ten tung cai la N luot
  // hoi Sanity truoc mot thao tac von da nang, va mot nhat ky co 200 dong giong
  // nhau thi khong ai doc.
  const done = ids.length - failed.length
  if (done > 0) {
    await recordAudit({
      action: 'offer.bulkDelete',
      target: ids.filter(id => !failed.includes(id)).join(' '),
      label: `${done} offer${failed.length ? ` (${failed.length} thất bại)` : ''}`,
    })
  }

  revalidateOfferDependents()
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
  revalidateOfferDependents()
}
