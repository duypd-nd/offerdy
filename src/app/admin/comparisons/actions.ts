'use server'

import { writeClient } from '@/sanity/writeClient'
import { revalidatePath } from 'next/cache'

function revalidate() {
  revalidatePath('/admin/comparisons')
  revalidatePath('/comparisons')
  revalidatePath('/blog/[slug]', 'page')
}

export async function updateComparison(id: string, patch: Record<string, unknown>) {
  await writeClient.patch(id).set(patch).commit()
  revalidate()
}

export async function deleteComparison(id: string) {
  await writeClient.delete(id)
  revalidate()
}

export async function createComparison(data: {
  title: string; slug: string; author?: string
  publishedAt?: string; excerpt?: string; content?: string
}) {
  const doc = await writeClient.create({
    _type: 'post',
    category: 'Comparison',
    title: data.title,
    slug: { _type: 'slug', current: data.slug },
    author: data.author || undefined,
    publishedAt: data.publishedAt || undefined,
    excerpt: data.excerpt || undefined,
    content: data.content || undefined,
  })
  revalidate()
  return doc
}

export async function checkComparisonSlug(slug: string, excludeId?: string): Promise<boolean> {
  if (!slug) return false
  const q = excludeId
    ? `*[_type == "post" && slug.current == $slug && _id != $excludeId][0]._id`
    : `*[_type == "post" && slug.current == $slug][0]._id`
  const res = await writeClient.fetch(q, { slug, excludeId: excludeId ?? null })
  return !!res
}
