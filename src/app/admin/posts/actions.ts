'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

function revalidatePosts() {
  revalidatePath('/admin/posts')
  revalidatePath('/blog')
  revalidatePath('/blog/[slug]', 'page')
  revalidatePath('/')
}

export async function updatePost(id: string, patch: Record<string, unknown>) {
  await writeClient.patch(id).set(patch).commit()
  revalidatePosts()
}

export async function deletePost(id: string) {
  await writeClient.delete(id)
  revalidatePosts()
}

export async function createPost(data: {
  title: string; slug: string; category?: string; author?: string
  publishedAt?: string; excerpt?: string; content?: string; image?: unknown
}) {
  const doc = await writeClient.create({
    _type: 'post',
    ...data,
    slug: { _type: 'slug', current: data.slug },
  })
  revalidatePosts()
  return doc
}

export async function checkPostSlug(slug: string, excludeId?: string): Promise<boolean> {
  if (!slug) return false
  const q = excludeId
    ? `*[_type == "post" && slug.current == $slug && _id != $excludeId][0]._id`
    : `*[_type == "post" && slug.current == $slug][0]._id`
  const res = await writeClient.fetch(q, { slug, excludeId: excludeId ?? null })
  return !!res
}

export async function bulkSetPublished(ids: string[], publishedAt: string | null) {
  await Promise.all(ids.map(id =>
    publishedAt
      ? writeClient.patch(id).set({ publishedAt }).commit()
      : writeClient.patch(id).unset(['publishedAt']).commit()
  ))
  revalidatePosts()
}

export async function uploadPostImage(formData: FormData) {
  const file = formData.get('file') as File
  if (!file || file.size === 0) return null
  const asset = await writeClient.assets.upload('image', file, {
    filename: file.name,
    contentType: file.type,
  })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}
