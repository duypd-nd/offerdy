'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

function revalidateDeals() {
  revalidatePath('/admin/deals')
  revalidatePath('/deals')
  revalidatePath('/deals/[slug]', 'page')
  revalidatePath('/')
}

export async function updateDeal(id: string, patch: Record<string, unknown>) {
  await writeClient.patch(id).set(patch).commit()
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
}) {
  const slug = data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const doc = await writeClient.create({
    _type: 'deal',
    ...data,
    slug: { _type: 'slug', current: slug },
    expiresAt: data.expiresAt || undefined,
    dealUrl: data.dealUrl || undefined,
  })
  revalidateDeals()
  return doc
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
