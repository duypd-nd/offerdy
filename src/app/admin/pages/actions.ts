'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

export async function updatePage(id: string, patch: Record<string, unknown>) {
  await writeClient.patch(id).set(patch).commit()
  revalidatePath('/admin/pages')
  revalidatePath('/', 'layout')
}

export async function deletePage(id: string) {
  await writeClient.delete(id)
  revalidatePath('/admin/pages')
}

export async function createPage(data: {
  title: string; slug: string; excerpt?: string; content?: string; image?: unknown; published?: boolean
}) {
  const doc = await writeClient.create({
    _type: 'page',
    ...data,
    slug: { _type: 'slug', current: data.slug },
  })
  revalidatePath('/admin/pages')
  return doc
}

export async function checkPageSlug(slug: string, excludeId?: string): Promise<boolean> {
  if (!slug) return false
  const q = excludeId
    ? `*[_type == "page" && slug.current == $slug && _id != $excludeId][0]._id`
    : `*[_type == "page" && slug.current == $slug][0]._id`
  const res = await writeClient.fetch(q, { slug, excludeId: excludeId ?? null })
  return !!res
}

export async function bulkSetPagePublished(ids: string[], published: boolean) {
  await Promise.all(ids.map(id => writeClient.patch(id).set({ published }).commit()))
  revalidatePath('/admin/pages')
  revalidatePath('/', 'layout')
}

export async function uploadPageImage(formData: FormData) {
  const file = formData.get('file') as File
  if (!file || file.size === 0) return null
  const asset = await writeClient.assets.upload('image', file, {
    filename: file.name,
    contentType: file.type,
  })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}
