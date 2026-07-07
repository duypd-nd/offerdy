import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { writeClient } from '@/sanity/writeClient'
import { getAnthropicClient } from './anthropicClient'

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

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

const SYSTEM_PROMPT = `You are an SEO/GEO content writer for Offerdy, a coupon and deals affiliate website.

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

export async function generateOfferContent(offer: OfferContentInput) {
  const response = await getAnthropicClient().messages.parse({
    model: MODEL,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(OfferContentSchema) },
    messages: [{ role: 'user', content: buildUserPrompt(offer) }],
  })

  const parsed = response.parsed_output
  if (!parsed) {
    throw new Error(`AI content generation failed for offer ${offer.id}: no parsed output (stop_reason=${response.stop_reason})`)
  }

  await writeClient.patch(offer.id).set({
    aiDraft: {
      description: parsed.description,
      usageTips: parsed.usageTips,
      eligibilityNotes: parsed.eligibilityNotes,
      generatedAt: new Date().toISOString(),
      model: MODEL,
    },
    aiReviewStatus: 'pending',
  }).commit()

  return parsed
}
