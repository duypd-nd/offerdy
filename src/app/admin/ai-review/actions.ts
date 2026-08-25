'use server'

import { revalidatePath } from 'next/cache'
import { getSiteName } from '@/sanity/queries'
import { writeClient } from '@/sanity/writeClient'
import { generateStoreContent } from '@/lib/ai/generateStoreContent'
import { generateOfferContent } from '@/lib/ai/generateOfferContent'
import { generateDealContent } from '@/lib/ai/generateDealContent'
import { renderAboutHtml, type AboutContent } from '@/lib/ai/aboutTemplate'
import { PRODUCT_GRADIENTS } from '@/lib/ai/generateReviewContent'
import { todayForPublish } from '@/lib/postDraft'

function revalidateStore(slug?: string) {
  revalidatePath('/admin/ai-review')
  revalidatePath('/admin/stores')
  if (slug) revalidatePath('/stores/[slug]', 'page')
  revalidatePath('/stores')
}

function revalidateOffer(storeSlug?: string) {
  revalidatePath('/admin/ai-review')
  revalidatePath('/admin/offers')
  revalidatePath('/admin/coupon-codes')
  revalidatePath('/coupon-codes')
  if (storeSlug) revalidatePath('/stores/[slug]', 'page')
}

export async function approveAiDraft(storeId: string, slug: string | undefined, storeName: string, draft: {
  shortDescription: string
  about: AboutContent
  metaTitle: string
  metaKeywords: string
  metaDescription: string
  faq: { question: string; answer: string }[]
  prosAndCons: { pros: string[]; cons: string[] }
}) {
  await writeClient.patch(storeId).set({
    shortDescription: draft.shortDescription,
    description: renderAboutHtml(storeName, draft.about),
    metaTitle: draft.metaTitle,
    metaKeywords: draft.metaKeywords,
    metaDescription: draft.metaDescription,
    faq: draft.faq,
    prosAndCons: draft.prosAndCons,
    aiReviewStatus: 'approved',
  }).unset(['aiDraft']).commit()
  revalidateStore(slug)
}

// ── Duyệt hàng loạt ─────────────────────────────────────────────
// Mỗi hàm gom toàn bộ patch vào MỘT transaction Sanity: 40 mục vẫn chỉ tốn
// 1 request API thay vì 40. Nội dung lấy thẳng từ aiDraft đã lưu — bản đang
// mở trong form được duyệt riêng bằng action đơn lẻ để không mất phần sửa tay.
export type BulkApproveResult = {
  approved: number
  skipped: { id: string; label: string; reason: string }[]
}

// Chia lô để một transaction không phình quá lớn khi chọn cả 150 offer. 50 mục
// vẫn chỉ là 1 request, nên duyệt trọn hàng đợi tốn 3 request thay vì 150.
const BULK_CHUNK = 50

async function commitBulk(
  docs: { _id: string; label: string; fields: Record<string, unknown> | null }[]
): Promise<BulkApproveResult> {
  const skipped: BulkApproveResult['skipped'] = []
  const usable = docs.filter((doc) => {
    if (doc.fields) return true
    skipped.push({ id: doc._id, label: doc.label, reason: 'không còn draft để duyệt' })
    return false
  })

  let approved = 0
  for (let i = 0; i < usable.length; i += BULK_CHUNK) {
    let tx = writeClient.transaction()
    const chunk = usable.slice(i, i + BULK_CHUNK)
    for (const doc of chunk) {
      tx = tx.patch(doc._id, (p) =>
        p.set({ ...doc.fields, aiReviewStatus: 'approved' }).unset(['aiDraft'])
      )
    }
    // Một transaction là all-or-nothing: lô nào lỗi thì lô đó không ghi gì cả,
    // các lô đã xong vẫn giữ nguyên. Báo đúng số đã ghi thay vì nuốt lỗi.
    try {
      await tx.commit()
      approved += chunk.length
    } catch (err) {
      for (const doc of chunk) {
        skipped.push({ id: doc._id, label: doc.label, reason: `lỗi khi ghi: ${String(err)}` })
      }
    }
  }

  return { approved, skipped }
}

export async function approveStoreDraftsBulk(ids: string[]): Promise<BulkApproveResult> {
  if (ids.length === 0) return { approved: 0, skipped: [] }
  const stores = await writeClient.fetch<{ _id: string; name: string; aiDraft?: {
    shortDescription?: string; about?: AboutContent; metaTitle?: string; metaKeywords?: string
    metaDescription?: string; faq?: { question: string; answer: string }[]
    prosAndCons?: { pros?: string[]; cons?: string[] }
  } }[]>(`*[_type == "store" && _id in $ids]{ _id, name, aiDraft }`, { ids })

  const result = await commitBulk(
    stores.map((s) => ({
      _id: s._id,
      label: s.name,
      fields: s.aiDraft
        ? {
            shortDescription: s.aiDraft.shortDescription ?? '',
            description: renderAboutHtml(s.name, s.aiDraft.about ?? ({} as AboutContent)),
            metaTitle: s.aiDraft.metaTitle ?? '',
            metaKeywords: s.aiDraft.metaKeywords ?? '',
            metaDescription: s.aiDraft.metaDescription ?? '',
            faq: s.aiDraft.faq ?? [],
            prosAndCons: s.aiDraft.prosAndCons ?? { pros: [], cons: [] },
          }
        : null,
    }))
  )
  revalidateStore()
  revalidatePath('/stores/[slug]', 'page')
  return result
}

export async function approveOfferDraftsBulk(ids: string[]): Promise<BulkApproveResult> {
  if (ids.length === 0) return { approved: 0, skipped: [] }
  const offers = await writeClient.fetch<{ _id: string; title: string; aiDraft?: {
    description?: string; usageTips?: string; eligibilityNotes?: string
  } }[]>(`*[_type == "offer" && _id in $ids]{ _id, title, aiDraft }`, { ids })

  const result = await commitBulk(
    offers.map((o) => ({
      _id: o._id,
      label: o.title,
      fields: o.aiDraft
        ? {
            description: o.aiDraft.description ?? '',
            // Ô trống thì bỏ hẳn key — giống hệt action đơn lẻ, để một draft
            // thiếu usageTips không ghi đè giá trị đang sống bằng chuỗi rỗng.
            ...(o.aiDraft.usageTips ? { usageTips: o.aiDraft.usageTips } : {}),
            ...(o.aiDraft.eligibilityNotes ? { eligibilityNotes: o.aiDraft.eligibilityNotes } : {}),
          }
        : null,
    }))
  )
  revalidateOffer()
  revalidatePath('/stores/[slug]', 'page')
  return result
}

export async function approveDealDraftsBulk(ids: string[]): Promise<BulkApproveResult> {
  if (ids.length === 0) return { approved: 0, skipped: [] }
  const deals = await writeClient.fetch<{ _id: string; title: string; aiDraft?: {
    summary?: string; prosAndCons?: { pros?: string[]; cons?: string[] }
    faq?: { question: string; answer: string }[]; metaTitle?: string; metaDescription?: string
  } }[]>(`*[_type == "deal" && _id in $ids]{ _id, title, aiDraft }`, { ids })

  const result = await commitBulk(
    deals.map((d) => ({
      _id: d._id,
      label: d.title,
      fields: d.aiDraft
        ? {
            summary: d.aiDraft.summary ?? '',
            prosAndCons: d.aiDraft.prosAndCons ?? { pros: [], cons: [] },
            faq: d.aiDraft.faq ?? [],
            metaTitle: d.aiDraft.metaTitle ?? '',
            metaDescription: d.aiDraft.metaDescription ?? '',
          }
        : null,
    }))
  )
  revalidateDeal()
  revalidatePath('/deals/[slug]', 'page')
  return result
}

export async function rejectAiDraft(storeId: string) {
  await writeClient.patch(storeId).set({ aiReviewStatus: 'rejected' }).unset(['aiDraft']).commit()
  revalidateStore()
}

export async function regenerateAiDraft(storeId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const store = await writeClient.fetch(
      `*[_id == $id][0]{ "id": _id, name, category, website, maxOffer, shortDescription, description }`,
      { id: storeId }
    )
    if (!store) return { ok: false, error: 'Store not found' }
    await generateStoreContent(store, await getSiteName())
    revalidateStore()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ── Offers ──────────────────────────────────────────────────────

export async function approveOfferAiDraft(offerId: string, storeSlug: string | undefined, draft: {
  description: string
  usageTips?: string
  eligibilityNotes?: string
}) {
  await writeClient.patch(offerId).set({
    description: draft.description,
    usageTips: draft.usageTips || undefined,
    eligibilityNotes: draft.eligibilityNotes || undefined,
    aiReviewStatus: 'approved',
  }).unset(['aiDraft']).commit()
  revalidateOffer(storeSlug)
}

export async function rejectOfferAiDraft(offerId: string) {
  await writeClient.patch(offerId).set({ aiReviewStatus: 'rejected' }).unset(['aiDraft']).commit()
  revalidateOffer()
}

export async function regenerateOfferAiDraft(offerId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const offer = await writeClient.fetch(
      `*[_id == $id][0]{ "id": _id, title, offerText, expiresAt, "storeName": store->name, "hasCouponCode": defined(couponCode) }`,
      { id: offerId }
    )
    if (!offer) return { ok: false, error: 'Offer not found' }
    await generateOfferContent(offer, await getSiteName())
    revalidateOffer()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ── Deals ───────────────────────────────────────────────────────

function revalidateDeal(slug?: string) {
  revalidatePath('/admin/ai-review')
  revalidatePath('/admin/deals')
  revalidatePath('/deals')
  if (slug) revalidatePath('/deals/[slug]', 'page')
}

export async function approveDealAiDraft(dealId: string, slug: string | undefined, draft: {
  summary: string
  prosAndCons: { pros: string[]; cons: string[] }
  faq: { question: string; answer: string }[]
  metaTitle: string
  metaDescription: string
}) {
  await writeClient.patch(dealId).set({
    summary: draft.summary,
    prosAndCons: draft.prosAndCons,
    faq: draft.faq,
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    aiReviewStatus: 'approved',
  }).unset(['aiDraft']).commit()
  revalidateDeal(slug)
}

export async function rejectDealAiDraft(dealId: string) {
  await writeClient.patch(dealId).set({ aiReviewStatus: 'rejected' }).unset(['aiDraft']).commit()
  revalidateDeal()
}

// ── Bài viết (post) ─────────────────────────────────────────────
// ⚠️ Tab này khác ba tab trên ở một điểm quyết định cách viết `reject`: ba loại kia
// duyệt nội dung vào một document ĐÃ TỒN TẠI SẴN, còn bài viết thì do chính bước
// sinh tạo ra. Xem chú thích của `rejectArticleAiDraft`.

export type PostDraftFields = {
  title: string
  excerpt: string
  contentHtml: string
  metaTitle: string
  metaDescription: string
  coverEmoji?: string
  coverBg?: string
  readTime?: number
  faq?: { question: string; answer: string }[]
  comparisonRows?: { label: string; values: string[] }[]
  notAnswered?: string[]
}

function revalidateArticle(slug?: string) {
  revalidatePath('/admin/ai-review')
  revalidatePath('/admin/posts')
  revalidatePath('/blog')
  revalidatePath('/comparisons')
  if (slug) revalidatePath(`/blog/${slug}`)
  revalidatePath('/sitemap.xml')
}

/**
 * `coverBg` trong draft la KHOA gradient (`home-green`), con truong tren post la
 * chuoi CSS. Duyet ma quen doi thi trang bai lay nguyen chu "home-green" lam
 * background va cai anh bia thanh mau trong suot.
 */
function resolveCoverBg(value?: string): string | undefined {
  if (!value) return undefined
  return PRODUCT_GRADIENTS[value] ?? (value.includes('gradient') ? value : undefined)
}

function articleFields(draft: PostDraftFields, firstImage?: string) {
  return {
    title: draft.title,
    excerpt: draft.excerpt,
    content: draft.contentHtml,
    metaTitle: draft.metaTitle,
    metaDescription: draft.metaDescription,
    ...(draft.coverEmoji ? { coverEmoji: draft.coverEmoji } : {}),
    ...(resolveCoverBg(draft.coverBg) ? { coverBg: resolveCoverBg(draft.coverBg) } : {}),
    ...(draft.readTime ? { readTime: draft.readTime } : {}),
    faq: draft.faq ?? [],
    comparisonRows: draft.comparisonRows ?? [],
    notAnswered: draft.notAnswered ?? [],
    ...(firstImage ? { externalImageUrl: firstImage } : {}),
    // ⚠️ Day moi la luc bai that su len song: ban nhap mang moc 2099, duyet moi
    // dat ve hom nay. Quen dong nay thi bai duyet roi van vo hinh.
    publishedAt: todayForPublish(),
  }
}

export async function approveArticleAiDraft(
  postId: string,
  slug: string | undefined,
  draft: PostDraftFields
): Promise<{ ok: boolean; error?: string }> {
  /**
   * ⚠️ **Từ chối ghi khi không có gì để ghi.** Đây là một lỗi đã thực sự xảy ra và
   * nó XOÁ TRẮNG một bài đang sống.
   *
   * Kịch bản: một `post` nằm lại ở `pending` mà `aiDraft` đã bị gỡ (duyệt một lần
   * rồi bị đưa về nháp, hoặc một lượt ghi dở dang). Hàng đợi vẫn hiện nó, form nạp
   * từ `aiDraft` nên rỗng trơn, và một cú bấm "Duyệt" ghi chuỗi rỗng đè lên tiêu đề,
   * tóm tắt, thân bài, FAQ và bảng so sánh. Sanity không cho lấy lại nội dung cũ
   * (API history trả 403 trên gói này), nên mất là mất hẳn.
   *
   * Đường duyệt HÀNG LOẠT đã có chốt này từ trước (`commitBulk` bỏ qua mục không còn
   * draft) — chỉ đường đơn lẻ là thiếu. Đúng kiểu hai đường ghi cùng một thứ mà mỗi
   * đường giữ một bộ luật riêng.
   */
  if (!draft.title.trim() || !draft.contentHtml.trim()) {
    return { ok: false, error: 'Bản nháp trống (không còn aiDraft) — không ghi gì để khỏi xoá trắng bài đang có.' }
  }

  const post = await writeClient.fetch<{ image?: string } | null>(
    `*[_id == $postId][0]{ "image": articleProducts[0].imageUrl }`,
    { postId }
  )
  await writeClient
    .patch(postId)
    .set({ ...articleFields(draft, post?.image), aiReviewStatus: 'approved' })
    .unset(['aiDraft'])
    .commit()
  revalidateArticle(slug)
  return { ok: true }
}

export async function approveArticleDraftsBulk(ids: string[]): Promise<BulkApproveResult> {
  if (ids.length === 0) return { approved: 0, skipped: [] }
  const posts = await writeClient.fetch<{
    _id: string; title: string; image?: string; aiDraft?: PostDraftFields
  }[]>(
    `*[_type == "post" && _id in $ids]{ _id, title, "image": articleProducts[0].imageUrl, aiDraft }`,
    { ids }
  )

  const result = await commitBulk(
    posts.map(p => ({
      _id: p._id,
      label: p.title,
      fields: p.aiDraft ? articleFields(p.aiDraft, p.image) : null,
    }))
  )
  revalidateArticle()
  return result
}

/**
 * ⚠️ **XOÁ HẲN, không đặt trạng thái `rejected`.**
 *
 * Ba tab kia duyệt nội dung vào một document đã tồn tại sẵn: một store bị từ chối
 * vẫn là một store, chỉ là chưa có mô tả AI. Còn một bài viết bị từ chối là một
 * `post` RỖNG — không tiêu đề thật, không thân bài, không lý do tồn tại.
 *
 * Để lại là tích luỹ post ma: mỗi bài từ chối một cái, và chỉ cần MỘT truy vấn nào
 * đó quên lọc `aiReviewStatus` là chúng lên trang công khai. Dự án đã dựng hai lớp
 * chặn cho đúng rủi ro này; cách chắc chắn hơn cả hai là không để document tồn tại.
 */
export async function rejectArticleAiDraft(postId: string) {
  await writeClient.delete(postId)
  revalidateArticle()
}

export async function regenerateDealAiDraft(dealId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const deal = await writeClient.fetch(
      `*[_id == $id][0]{ "id": _id, title, store, priceSale, priceOrig, discount }`,
      { id: dealId }
    )
    if (!deal) return { ok: false, error: 'Deal not found' }
    await generateDealContent(deal, await getSiteName())
    revalidateDeal()
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
