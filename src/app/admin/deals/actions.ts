'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'
import { nextDealCode } from '@/sanity/queries'

function revalidateDeals() {
  revalidatePath('/admin/deals')
  revalidatePath('/deals')
  revalidatePath('/deals/[slug]', 'page')
  revalidatePath('/')
  revalidatePath('/links')
}

export async function updateDeal(id: string, patch: Record<string, unknown>, unset?: string[]) {
  let p = writeClient.patch(id).set(patch)
  if (unset?.length) p = p.unset(unset)
  await p.commit()
  revalidateDeals()
}

export async function deleteDeal(id: string) {
  await writeClient.delete(id)
  revalidateDeals()
}

export async function createDeal(data: {
  title: string; priceSale: string; priceOrig: string
  discount: number; verified: boolean; isExpiring: boolean
  image?: unknown; expiresAt?: string; dealUrl?: string
  relatedReview?: { _type: 'reference'; _ref: string }
  category?: { _type: 'reference'; _ref: string }
}) {
  const slug = data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const doc = await writeClient.create({
    _type: 'deal',
    ...data,
    // Ma san pham cap ngay luc tao: initialValue cua Sanity chi ap dung trong Studio,
    // deal tao qua API se thieu ma va bien mat khoi duong tim theo ma tren /links.
    code: await nextDealCode(),
    slug: { _type: 'slug', current: slug },
    expiresAt: data.expiresAt || undefined,
    dealUrl: data.dealUrl || undefined,
  })
  revalidateDeals()
  return doc
}

/**
 * Ghim / bo ghim deal len dau trang /links.
 *
 * Luu MOC THOI GIAN chu khong phai boolean: ghim nhieu san pham thi cai ghim sau
 * phai nam tren cai ghim truoc, va boolean khong mang thong tin do. `defined(pinnedAt)`
 * chinh la trang thai "dang ghim".
 */
export async function toggleDealPin(id: string, pinned: boolean) {
  const p = writeClient.patch(id)
  await (pinned ? p.set({ pinnedAt: new Date().toISOString() }) : p.unset(['pinnedAt'])).commit()
  revalidateDeals()
}

export async function bulkUpdateOrder(items: { id: string; order: number }[]) {
  await Promise.all(items.map(({ id, order }) => writeClient.patch(id).set({ order }).commit()))
  revalidateDeals()
}

export async function uploadDealImage(formData: FormData) {
  const file = formData.get('file') as File
  if (!file || file.size === 0) return null
  const asset = await writeClient.assets.upload('image', file, {
    filename: file.name,
    contentType: file.type,
  })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}

export async function uploadDealImageFromUrl(url: string) {
  if (!url) return null
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Không tải được ảnh từ URL: ${res.status}`)
  const blob = await res.blob()
  const filename = url.split('/').pop()?.split('?')[0] || 'deal.jpg'
  const asset = await writeClient.assets.upload('image', blob, {
    filename,
    contentType: blob.type || 'image/jpeg',
  })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}
