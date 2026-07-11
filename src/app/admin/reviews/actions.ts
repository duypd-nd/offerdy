'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'
import { uploadImageFromUrl } from '@/lib/safeFetch'
import { scrapeProductPage, type ScrapedProduct } from '@/lib/ai/scrapeProductPage'
import { generateReviewContent, PRODUCT_GRADIENTS } from '@/lib/ai/generateReviewContent'

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
  stars?: number | null; imgBg?: string | null
  productUrl?: string | null; affiliateUrl?: string | null; couponCode?: string | null
  faq?: { question: string; answer: string }[] | null
  prosAndCons?: { pros: string[]; cons: string[] } | null
  metaTitle?: string | null; metaDescription?: string | null
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

// ── AI Review Writer ──────────────────────────────────────────────

export async function scrapeProductLink(url: string): Promise<ScrapedProduct | { error: string }> {
  return scrapeProductPage(url)
}

function escapeHtmlAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function generateReviewDraft(input: {
  productUrl: string
  affiliateUrl?: string
  scraped: ScrapedProduct
  selectedImageUrls: string[]
}): Promise<{
  title: string; excerpt: string; content: string; faq: { question: string; answer: string }[]
  prosAndCons: { pros: string[]; cons: string[] }
  stars: number; imgBg: string; metaTitle: string; metaDescription: string
  image?: unknown; imageUrl?: string
} | { error: string }> {
  const { productUrl, affiliateUrl, scraped, selectedImageUrls } = input
  const linkUrl = affiliateUrl || productUrl

  try {
    const draft = await generateReviewContent({
      title: scraped.title,
      description: scraped.description,
      siteName: scraped.siteName,
      price: scraped.price,
      currency: scraped.currency,
      imageCount: selectedImageUrls.length,
    })

    const uploaded = await Promise.all(selectedImageUrls.map(u => uploadImageFromUrl(u)))
    const heroIndex = uploaded.findIndex(u => 'url' in u)
    const heroAsset = heroIndex >= 0 ? (uploaded[heroIndex] as { image: unknown; url: string }) : undefined

    let content = draft.contentHtml
    const altText = escapeHtmlAttr(draft.title || scraped.title)
    uploaded.forEach((u, i) => {
      const token = `[IMAGE:${i + 1}]`
      const replacement = 'url' in u
        ? `<figure><a href="${linkUrl}" target="_blank" rel="sponsored noopener noreferrer"><img src="${u.url}" alt="${altText}" /></a></figure>`
        : ''
      content = content.split(token).join(replacement)
    })
    content = content.split('[CTA]').join(
      `<a class="article-cta" href="${linkUrl}" target="_blank" rel="sponsored noopener noreferrer">Check the best price →</a>`
    )

    return {
      title: draft.title,
      excerpt: draft.excerpt,
      content,
      faq: draft.faq,
      prosAndCons: draft.prosAndCons,
      stars: draft.suggestedStars,
      imgBg: PRODUCT_GRADIENTS[draft.suggestedGradient] ?? PRODUCT_GRADIENTS['generic-green'],
      metaTitle: draft.metaTitle,
      metaDescription: draft.metaDescription,
      image: heroAsset?.image,
      imageUrl: heroAsset?.url,
    }
  } catch (err) {
    return { error: describeAiError(err) }
  }
}

function describeAiError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('Overloaded') || (err && typeof err === 'object' && 'status' in err && (err as { status?: number }).status === 529)) {
    return 'Máy chủ AI đang quá tải, vui lòng thử lại sau ít phút.'
  }
  if (message.includes('Failed to parse structured output')) {
    return 'AI trả về nội dung chưa đúng định dạng sau nhiều lần thử. Vui lòng bấm "Viết bài bằng AI" để thử lại.'
  }
  return `Không thể tạo bài viết bằng AI: ${message}`
}
