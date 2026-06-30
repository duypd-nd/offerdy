'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

function revalidateCategories() {
  revalidatePath('/admin/categories')
  revalidatePath('/categories')
  revalidatePath('/categories/[slug]', 'page')
  revalidatePath('/')
}

export async function updateCategory(id: string, patch: Record<string, unknown>) {
  await writeClient.patch(id).set(patch).commit()
  revalidateCategories()
}

export async function deleteCategory(id: string) {
  await writeClient.delete(id)
  revalidateCategories()
}

export async function createCategory(data: {
  name: string; slug: string; emoji: string
  dealCount?: string; colorClass?: string; order?: number
}) {
  const doc = await writeClient.create({
    _type: 'category',
    ...data,
    slug: { _type: 'slug', current: data.slug },
  })
  revalidateCategories()
  return doc
}
