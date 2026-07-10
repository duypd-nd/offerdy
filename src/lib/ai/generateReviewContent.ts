import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { getAnthropicClient } from './anthropicClient'

export const PRODUCT_GRADIENTS: Record<string, string> = {
  'tech-blue': 'linear-gradient(135deg,#EFF6FF,#BFDBFE)',
  'beauty-pink': 'linear-gradient(135deg,#FDF2F8,#FBCFE8)',
  'home-green': 'linear-gradient(135deg,#F0FDF4,#BBF7D0)',
  'fashion-purple': 'linear-gradient(135deg,#FAF5FF,#E9D5FF)',
  'food-orange': 'linear-gradient(135deg,#FFF7ED,#FED7AA)',
  'generic-green': 'linear-gradient(135deg,#EEF2FF,#C7D2FE)',
}
const GRADIENT_KEYS = Object.keys(PRODUCT_GRADIENTS) as [string, ...string[]]

const ReviewContentSchema = z.object({
  title: z.string().describe('Review title, engaging, SEO-friendly, <=70 characters'),
  excerpt: z.string().describe('1-2 sentence summary, used as meta/preview text'),
  contentHtml: z.string().describe(
    'Full review body as HTML using <h2>/<p>/<ul>/<li> tags. ' +
    'ONLY use the tokens [IMAGE:1]..[IMAGE:n] and [CTA] for images/CTA button placement (never invent <img> or <a href> tags yourself) — ' +
    'the code will replace these tokens with real tags afterwards.'
  ),
  prosAndCons: z.object({
    pros: z.array(z.string()).min(3).max(5),
    cons: z.array(z.string()).min(2).max(4),
  }),
  faq: z.array(z.object({ question: z.string(), answer: z.string() })).min(5).max(8),
  suggestedStars: z.number().int().min(1).max(5),
  starsReasoning: z.string().describe('Brief reasoning for the suggested star rating — shown only internally to the admin, never published'),
  suggestedGradient: z.enum(GRADIENT_KEYS).describe('Pick the one gradient key that best matches this product\'s category'),
  metaTitle: z.string().describe('<=60 chars'),
  metaDescription: z.string().describe('<=160 chars'),
})

export type ReviewContent = z.infer<typeof ReviewContentSchema>

export type ReviewContentInput = {
  title: string
  description?: string
  siteName?: string
  price?: string
  currency?: string
  imageCount: number
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

const SYSTEM_PROMPT = `You are an SEO/GEO content writer for Offerdy, a coupon and deals affiliate website, writing an in-depth product review.

You must NEVER invent facts: no specs, features, warranty/return-policy details, stock levels, or review counts that are not present in the input. Use only the exact product name, description, price and site name given. If the description is thin, keep the review honest and moderately general rather than fabricating detailed specifications.

Write in English. Tone: helpful, trustworthy, detailed but concise.

The contentHtml must be structured with semantic HTML headings covering (in this order): a short intro, key features/highlights (based only on the given description), who this product is best for, and a final verdict. Do NOT include a pros/cons section in contentHtml — that is rendered separately from the structured prosAndCons field. Use the token [CTA] once at a natural point (e.g. after the verdict) where a "check price" button should appear, and use tokens [IMAGE:1] through [IMAGE:{imageCount}] spread naturally through the sections to illustrate the product — do not invent <img> or <a href> tags yourself, only use these bracket tokens exactly as specified.

prosAndCons must contain 3-5 honest pros and 2-4 honest cons based only on the given input — frame things like "limited-time pricing" or "availability may vary" honestly rather than inventing specs.

The FAQ must contain between 5 and 8 genuinely useful buyer questions (e.g. is it worth the price, who should buy it, how does it compare to alternatives, is it good value) — do not fabricate specific return/warranty policy details not given in the input. You MUST include at least 5 FAQ entries; never submit fewer than 5.`

function buildUserPrompt(input: ReviewContentInput) {
  return `Product title: ${input.title}
Description: ${input.description ?? 'not provided — write generally based on the title only, do not invent specs'}
Site/store: ${input.siteName ?? 'not specified'}
Price: ${input.price ? `${input.price} ${input.currency ?? ''}`.trim() : 'not provided — do not invent a price'}
Number of product images available for placement: ${input.imageCount}

Write a complete product review following the system instructions. Suggest a star rating (1-5) with brief internal reasoning, and pick the closest matching gradient theme key for this product's category.`
}

const MAX_ATTEMPTS = 3

function isRetryable(err: unknown): boolean {
  // Loi tam thoi tu Anthropic API (qua tai / rate limit / 5xx)
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status?: number }).status
    if (status && [429, 500, 502, 503, 529].includes(status)) return true
  }
  // Model tra ve output khong dat schema (vd thieu FAQ) — thu lai thuong se ra ket qua khac
  if (err instanceof Error && err.message.includes('Failed to parse structured output')) return true
  return false
}

async function callAnthropic(input: ReviewContentInput, attempt = 1): Promise<ReviewContent> {
  try {
    const response = await getAnthropicClient().messages.parse({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(ReviewContentSchema) },
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    })

    const parsed = response.parsed_output
    if (!parsed) {
      throw new Error(`AI review generation failed: no parsed output (stop_reason=${response.stop_reason})`)
    }
    return parsed
  } catch (err) {
    if (isRetryable(err) && attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, attempt * 1500))
      return callAnthropic(input, attempt + 1)
    }
    throw err
  }
}

export async function generateReviewContent(input: ReviewContentInput): Promise<ReviewContent> {
  return callAnthropic(input)
}
