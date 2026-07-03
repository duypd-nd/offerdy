'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

function revalidateReviews() {
  revalidatePath('/admin/reviews')
  revalidatePath('/reviews')
  revalidatePath('/reviews/[slug]', 'page')
  revalidatePath('/')
}

export async function updateReview(id: string, patch: Record<string, unknown>) {
  const setFields: Record<string, unknown> = {}
  const unsetFields: string[] = []
  for (const [key, value] of Object.entries(patch)) {
    // null = client muon xoa field nay (undefined khong "song sot" qua Server Action)
    if (value === undefined || value === null) unsetFields.push(key)
    else setFields[key] = value
  }
  let tx = writeClient.patch(id)
  if (Object.keys(setFields).length) tx = tx.set(setFields)
  if (unsetFields.length) tx = tx.unset(unsetFields)
  await tx.commit()
  revalidateReviews()
}

export async function deleteReview(id: string) {
  await writeClient.delete(id)
  revalidateReviews()
}

export async function createReview(data: {
  title: string; slug: string; tag: string; publishedAt: string
  excerpt?: string | null; content?: string | null; author?: string | null; image?: unknown; externalImageUrl?: string | null
}) {
  const fields = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== null)
  )
  const doc = await writeClient.create({
    _type: 'review',
    ...fields,
    slug: { _type: 'slug', current: data.slug },
  })
  revalidateReviews()
  return doc
}

export async function checkReviewSlug(slug: string, excludeId?: string): Promise<boolean> {
  if (!slug) return false
  const q = excludeId
    ? `*[_type == "review" && slug.current == $slug && _id != $excludeId][0]._id`
    : `*[_type == "review" && slug.current == $slug][0]._id`
  const res = await writeClient.fetch(q, { slug, excludeId: excludeId ?? null })
  return !!res
}

export async function uploadReviewImage(formData: FormData) {
  const file = formData.get('file') as File
  if (!file || file.size === 0) return null
  const asset = await writeClient.assets.upload('image', file, {
    filename: file.name,
    contentType: file.type,
  })
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
}
