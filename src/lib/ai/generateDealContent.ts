import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { writeClient } from '@/sanity/writeClient'
import { getAnthropicClient } from './anthropicClient'

const DealContentSchema = z.object({
  summary: z.string().describe('2-4 sentences explaining why this deal is worth buying — value proposition, not a spec sheet'),
  prosAndCons: z.object({
    pros: z.array(z.string()).min(3).max(3),
    cons: z.array(z.string()).min(2).max(3),
  }),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).min(3).max(4),
  metaTitle: z.string().describe('<=60 chars'),
  metaDescription: z.string().describe('<=160 chars'),
})

export type DealContentInput = {
  id: string
  title: string
  store?: string
  priceSale: string
  priceOrig: string
  discount: number
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

const SYSTEM_PROMPT = `You are an SEO/GEO content writer for Offerdy, a coupon and deals affiliate website.

Write honest, generic marketing copy for the deal described in the user message. You must NEVER invent facts: no product specs, features, brand/store name, or claims not present in the input (title, store, prices, discount). Use only the exact price and discount figures given — never invent a different number. Do not claim a specific stock level, review count, or rating. If the store is not specified, do not invent or guess one — refer to it generically (e.g. "this retailer") or rely on the product title only.

Write in English. Tone: helpful, trustworthy, concise. The summary should explain why the discount is worth taking, not describe hypothetical product features you were not given.`

function buildUserPrompt(deal: DealContentInput) {
  return `Deal title: ${deal.title}
Store: ${deal.store ?? 'not specified — do not invent or guess a store/brand name'}
Sale price: ${deal.priceSale}
Original price: ${deal.priceOrig}
Discount: ${deal.discount}%

Generate: a 2-4 sentence summary of why this deal is worth buying (based only on the price drop, not invented product features), prosAndCons (3 pros, 2-3 cons — frame honestly, e.g. "limited-time price" as a pro, "availability may vary" as a con), 3-4 FAQ pairs about this specific deal (general, not fabricated specifics like return policy details), an SEO metaTitle (<=60 chars), and a metaDescription (<=160 chars).`
}

export async function generateDealContent(deal: DealContentInput) {
  const response = await getAnthropicClient().messages.parse({
    model: MODEL,
    max_tokens: 1536,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(DealContentSchema) },
    messages: [{ role: 'user', content: buildUserPrompt(deal) }],
  })

  const parsed = response.parsed_output
  if (!parsed) {
    throw new Error(`AI content generation failed for deal ${deal.id}: no parsed output (stop_reason=${response.stop_reason})`)
  }

  await writeClient.patch(deal.id).set({
    aiDraft: {
      ...parsed,
      generatedAt: new Date().toISOString(),
      model: MODEL,
    },
    aiReviewStatus: 'pending',
  }).commit()

  return parsed
}
