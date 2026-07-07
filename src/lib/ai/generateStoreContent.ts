import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { writeClient } from '@/sanity/writeClient'
import { getAnthropicClient } from './anthropicClient'

const AboutCardSchema = z.object({
  icon: z.string().describe('A single emoji representing this card'),
  title: z.string(),
  text: z.string(),
})

const StoreContentSchema = z.object({
  shortDescription: z.string(),
  about: z.object({
    tagline: z.string().describe('One sentence shown under the "About {Store}" heading'),
    introBadgeEmoji: z.string().describe('A single emoji representing the brand/category'),
    introText: z.string().describe('2-4 sentences. Rendered directly after "<strong>{StoreName}</strong> " to form one continuous sentence — so it MUST start lowercase with a verb (e.g. "is a...", "specializes in...") and must NOT repeat the store name'),
    productRange: AboutCardSchema.describe('Card 1: what the store sells'),
    customerBenefits: AboutCardSchema.describe('Card 2: why shopping here is good (quality, guarantees, support — not discounts)'),
    shoppingExperience: AboutCardSchema.describe('Card 3: checkout, delivery, site usability'),
    whyChoose: AboutCardSchema.describe('Card 4: general trust/differentiation summary — never a "Deals"/"Promotions" card, never fabricated promos'),
  }),
  metaTitle: z.string(),
  metaKeywords: z.string(),
  metaDescription: z.string(),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).min(3).max(5),
  prosAndCons: z.object({
    pros: z.array(z.string()).min(3).max(3),
    cons: z.array(z.string()).min(2).max(3),
  }),
})

export type StoreContentInput = {
  id: string
  name: string
  category?: string
  website?: string
  maxOffer?: number
  shortDescription?: string
  description?: string
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

const SYSTEM_PROMPT = `You are an SEO/GEO content writer for Offerdy, a coupon and deals affiliate website.

Write honest, generic marketing copy for the store described in the user message. You must NEVER invent facts: no specific discount percentages, dates, coupon codes, or claims not present in the input. If a max discount is given, you may reference it using that exact number — do not invent a different number. Do not claim a specific number of active offers, coupons, or promotions.

The "about" section renders into a fixed 4-card HTML layout on the site. Write the "cards" content to match this exact order and topic: (1) Product Range — what the store sells, (2) Customer Benefits — why shopping here is good (quality, guarantees, support — not discounts), (3) Shopping Experience — checkout, delivery, site usability, (4) Why Choose {Store} — a general trust/differentiation summary. Do not add a "Deals" or "Promotions" card.

Write in English. Tone: helpful, trustworthy, concise.`

function buildUserPrompt(store: StoreContentInput) {
  return `Store name: ${store.name}
Category: ${store.category ?? 'general retail'}
Website: ${store.website ?? 'unknown'}
Max advertised discount: ${store.maxOffer ? `${store.maxOffer}%` : 'not specified — do not mention a discount percentage'}
Existing short description: ${store.shortDescription ?? '(none)'}
Existing long description: ${store.description ?? '(none)'}

Generate: a 1-sentence tagline (shortDescription), an "about" section (tagline sub-heading, intro badge emoji, a 2-4 sentence intro paragraph, and exactly 4 cards per the required order/topics above), an SEO metaTitle (<=60 chars), metaKeywords (5-8 comma separated keywords), a metaDescription (<=160 chars), 3-5 FAQ pairs about shopping at this store (general, not fabricated specifics), and prosAndCons (3 pros, 2-3 cons, framed honestly and generically — e.g. shipping fees may apply on some orders, availability varies by region).`
}

export async function generateStoreContent(store: StoreContentInput) {
  const response = await getAnthropicClient().messages.parse({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(StoreContentSchema) },
    messages: [{ role: 'user', content: buildUserPrompt(store) }],
  })

  const parsed = response.parsed_output
  if (!parsed) {
    throw new Error(`AI content generation failed for store ${store.id}: no parsed output (stop_reason=${response.stop_reason})`)
  }

  await writeClient.patch(store.id).set({
    aiDraft: {
      ...parsed,
      generatedAt: new Date().toISOString(),
      model: MODEL,
    },
    aiReviewStatus: 'pending',
  }).commit()

  return parsed
}
