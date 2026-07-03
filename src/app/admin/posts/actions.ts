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
  const setFields: Record<string, unknown> = {}
  const unsetFields: string[] = []
  for (const [key, value] of Object.entries(patch)) {
    // null = client muon xoa field nay (undefined khong "song sot" qua Server Action nen khong dung duoc)
    if (value === undefined || value === null) unsetFields.push(key)
    else setFields[key] = value
  }
  let tx = writeClient.patch(id)
  if (Object.keys(setFields).length) tx = tx.set(setFields)
  if (unsetFields.length) tx = tx.unset(unsetFields)
  await tx.commit()
  revalidatePosts()
}

export async function deletePost(id: string) {
  await writeClient.delete(id)
  revalidatePosts()
}

export async function createPost(data: {
  title: string; slug: string; category?: string | null; author?: string | null
  publishedAt?: string | null; excerpt?: string | null; content?: string | null; image?: unknown
  externalImageUrl?: string | null
}) {
  const fields = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== null)
  )
  const doc = await writeClient.create({
    _type: 'post',
    ...fields,
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
