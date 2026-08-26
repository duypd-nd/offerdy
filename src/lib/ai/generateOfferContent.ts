import { z } from 'zod'
import { generateStructured } from '@/lib/ai/router'
import { fillSiteName } from '@/lib/siteNameToken'
import { writeClient } from '@/sanity/writeClient'

const OfferContentSchema = z.object({
  description: z.string().describe('1-2 sentences shown inline under the offer on the store page'),
  usageTips: z.string().describe('1 short sentence on how to apply this offer (e.g. where to enter the code, or how the discount applies at checkout)'),
  eligibilityNotes: z.string().describe('1 short sentence on eligibility/limitations if any can be inferred from the input (e.g. new customers only, minimum order); if nothing can be inferred, state it applies to all orders — never invent a specific minimum order value or exclusion not present in the input'),
})

export type OfferContentInput = {
  id: string
  title: string
  offerText: string
  storeName: string
  hasCouponCode: boolean
  expiresAt?: string
}


const SYSTEM_PROMPT = `You are an SEO/GEO content writer for {site}, a coupon and deals affiliate website.

Write a short (1-2 sentence) description, a usage tip, and an eligibility note for the coupon/offer described in the user message. You must NEVER invent facts: no discount percentages, dollar amounts, coupon codes, minimum order values, or expiry dates that are not present in the input. Do not reveal or make up the actual coupon code. If "has coupon code" is false, do not imply the offer requires or has a code.

Write in English. Tone: helpful, concise, trustworthy — these are supporting lines under the offer, not a full article.`

function buildUserPrompt(offer: OfferContentInput) {
  return `Store: ${offer.storeName}
Offer title: ${offer.title}
Offer summary: ${offer.offerText}
Has a coupon code: ${offer.hasCouponCode ? 'yes (do not reveal or invent the code itself)' : 'no'}
Expires: ${offer.expiresAt ? new Date(offer.expiresAt).toDateString() : 'not specified — do not mention an expiry date'}

Write a 1-2 sentence description, a 1-sentence usage tip, and a 1-sentence eligibility note for this offer for shoppers at ${offer.storeName}.`
}

/**
 * ⚠️ `siteName` la THAM SO chu khong phai mot lan doc Sanity ngay tai day.
 * Cac module trong `lib/ai/` duoc bo chay test nap bang Node THUAN — import
 * `@/sanity/queries` keo theo `next/cache` va lam vo 3 tep test (aiTells,
 * articleGuards, videoScriptGuard) vi `generateArticleContent` import gian tiep
 * qua `generateReviewContent`. Noi goi (server action / route) tu hoi ten.
 */
export async function generateOfferContent(offer: OfferContentInput, siteName: string) {
  // ⚠️ Di qua router (27/08) chu khong goi thang Anthropic nua. Khong co
  // khoa mien phi nao thi router roi thang xuong Claude — hanh vi y het truoc do.
  const { data: parsed, provider, model } = await generateStructured({
    task: 'offer-content',
    schema: OfferContentSchema,
    system: fillSiteName(SYSTEM_PROMPT, siteName),
    prompt: buildUserPrompt(offer),
    maxTokens: 512,
  })

  await writeClient.patch(offer.id).set({
    aiDraft: {
      description: parsed.description,
      usageTips: parsed.usageTips,
      eligibilityNotes: parsed.eligibilityNotes,
      generatedAt: new Date().toISOString(),
      model: `${provider}/${model}`,
    },
    aiReviewStatus: 'pending',
  }).commit()

  return parsed
}
