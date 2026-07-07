'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

export async function updateStore(id: string, patch: Record<string, unknown>) {
  await writeClient.patch(id).set(patch).commit()
  revalidatePath('/admin/stores')
  revalidatePath('/stores/[slug]', 'page')
  revalidatePath('/stores')
  revalidatePath('/', 'page')
}

export async function deleteStore(id: string) {
  await writeClient.delete(id)
  revalidatePath('/admin/stores')
  revalidatePath('/stores')
  revalidatePath('/', 'page')
}

export async function createStore(data: {
  name: string
  slug: string
  website?: string
  affiliateLink?: string
  category?: string
  maxOffer?: number
  abbr?: string
  shortDescription?: string
  description?: string
  published: boolean
}) {
  const doc = await writeClient.create({
    _type: 'store',
    ...data,
    slug: { _type: 'slug', current: data.slug },
  })
  revalidatePath('/admin/stores')
  revalidatePath('/stores')
  revalidatePath('/', 'page')
  return doc
}

export async function uploadStoreImage(formData: FormData) {
  const file = formData.get('file') as File
  if (!file || file.size === 0) return null
  const asset = await writeClient.assets.upload('image', file, {
    filename: file.name,
    contentType: file.type,
  })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}

export async function getStoreDescription(id: string): Promise<string | undefined> {
  const result = await writeClient.fetch<{ description?: string } | null>(
    `*[_id == $id][0]{ description }`,
    { id }
  )
  return result?.description
}

export async function checkStoreSlug(slug: string, excludeId?: string): Promise<boolean> {
  if (!slug) return false
  const q = excludeId
    ? `*[_type == "store" && slug.current == $slug && _id != $excludeId][0]._id`
    : `*[_type == "store" && slug.current == $slug][0]._id`
  const res = await writeClient.fetch(q, { slug, excludeId: excludeId ?? null })
  return !!res
}

export async function uploadStoreImageFromUrl(url: string) {
  if (!url) return null
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Không tải được ảnh từ URL: ${res.status}`)
  const blob = await res.blob()
  const filename = url.split('/').pop()?.split('?')[0] || 'logo.jpg'
  const asset = await writeClient.assets.upload('image', blob, {
    filename,
    contentType: blob.type || 'image/jpeg',
  })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}
