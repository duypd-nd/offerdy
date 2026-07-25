import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { getAnthropicClient } from './anthropicClient'
import { dealDiscountBadge } from '@/lib/dealDiscountLabel'
import { shortLink, type LinkStyle } from '@/lib/socialCaption'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

// ── Goc tiep can ──────────────────────────────────────────────
// Moi goc la mot cach mo dau khac han, khong phai mot "muc do giat gan" khac nhau.
// Tach ra thanh preset de con gan nhan ?s= rieng cho tung goc va do xem goc nao ra
// click that — xem README cua tinh nang trong PROJECT_CONTEXT.
export const CAPTION_ANGLES = [
  {
    id: 'price',
    label: 'Giá sốc',
    hint: 'Hợp khi chênh lệch giá lớn',
    // Ban dau brief nay viet "give one concrete reason the gap is believable" —
    // va model lam dung the: no bia ra "clearing out overstock", "a distributor is
    // offloading inventory". Do la khang dinh ve hoat dong kinh doanh cua merchant
    // ma khong ai kiem chung duoc. Loi o cau lenh, khong phai o model.
    brief: 'Lead with the raw number in the first few words. No adjectives before it — the figure does the work. Then say what the reader actually gets for that number, using only what the product title states. Do not explain why the price is low.',
  },
  {
    id: 'problem',
    label: 'Giải quyết vấn đề',
    hint: 'Hợp đồ công năng',
    brief: 'Open on a specific, physical annoyance the reader recognises. Do not name the product until the annoyance has landed. Then present it as the fix.',
  },
  {
    id: 'compare',
    label: 'So sánh',
    hint: 'Hợp khi có đối thủ rõ',
    brief: 'Set the price against what the reader expects to pay for this category, without naming or disparaging any specific competing brand. Say plainly what the difference is and is not.',
  },
  {
    id: 'whofor',
    label: 'Ai nên mua / ai đừng',
    hint: 'Hợp hàng giá cao',
    brief: 'State clearly who should skip this, before saying who it suits. The exclusion must be genuine and specific — it buys trust and filters out people who would return it.',
  },
  {
    id: 'question',
    label: 'Câu hỏi thật',
    hint: 'Hợp mọi loại',
    brief: 'Open with a question the target reader would actually answer yes to. Not rhetorical filler — a real question about their situation.',
  },
] as const

export type CaptionAngle = typeof CAPTION_ANGLES[number]['id']

// ── Cho trong AI duoc phep dung ────────────────────────────────
// AI KHONG BAO GIO tu viet con so. No dat cho trong, code thay bang gia tri that
// tu database. Nho vay khong the co chuyen caption noi sai gia, sai % giam, hay bia
// ra ma coupon — la nhung khang dinh ma nguoi dang affiliate phai chiu trach nhiem.
const PLACEHOLDERS = ['{price}', '{was}', '{discount}', '{link}', '{title}'] as const

const CaptionSchema = z.object({
  variants: z.array(z.object({
    hook: z.string().describe('First line. This alone decides whether anyone reads on.'),
    body: z.string().describe('1-3 short lines. May span multiple lines separated by \\n.'),
    cta: z.string().describe('One short line telling the reader what to do. Must contain the {link} placeholder.'),
    hashtags: z.array(z.string()).min(3).max(6).describe('Lowercase, no # prefix, no spaces. Derived from the product and the channel topic.'),
  })).min(1).max(5),
})

const SYSTEM_PROMPT = `You write short social captions for an affiliate deals channel. The captions run on Instagram and TikTok, where the first line decides whether anyone reads the rest.

ABSOLUTE RULES — these are not style preferences:

1. NEVER write a number that is a price, a discount, a percentage, a stock level, a rating, a review count, or a deadline. Use the placeholders instead: {price} {was} {discount} {link} {title}. The system substitutes real values. Writing "$40" or "50% off" yourself is a factual claim you cannot verify and it will be rejected.
1b. The placeholders are already complete. {price} and {was} arrive with their currency symbol — never put one in front of them. {discount} already reads like "45% OFF" — never follow it with the word "off". Write "for {price}", not "for \${price}"; write "{discount} right now", not "{discount} off right now".
2. NEVER invent product specifications, materials, dimensions, brand comparisons by name, or awards. You are given a title and prices — nothing else is known.
2b. NEVER explain or speculate about WHY the price is low — overstock, clearance, a distributor offloading inventory, a discontinued line, warehouse space, an upcoming model. You do not know, and any of those is a claim about the merchant's business. State the price; do not account for it.
2c. NEVER assert the product is unchanged, identical, equivalent or "the same" as anything — not as a pricier version, not as another brand, not as an earlier model. You have no basis for that comparison.
3. NEVER claim personal experience. You did not use, test, wear, or own this. No "I've had mine for months", no "my favourite".
4. NEVER manufacture urgency or scarcity — no "selling out", "only a few left", "today only", "hurry". If the deal has a real deadline the system adds it; you do not.
5. NEVER promise an outcome ("you will look", "this will fix"). Describe, don't guarantee.

WHAT MAKES THESE WORK: specificity plus an information gap. A concrete figure sitting next to something the reader wants explained. Exclamation marks, all-caps and emoji walls do the opposite — they signal an ad and readers skip them. At most one emoji per caption, and only if the channel's own voice uses them.

Write in English. Match the channel's voice given below as closely as you can — the caption should read like that person wrote it, not like generic marketing copy.

Each variant must open differently from the others. Do not produce variations on one sentence.`

export type CaptionDealInput = {
  code: number
  title: string
  priceSale: string
  priceOrig?: string
  discount: number
  discountByAmount?: boolean
  categoryName?: string
  slug?: string
}

export type Persona = {
  creatorName?: string
  bio?: string
  audience?: string
  contentPillars?: string[]
  toneNotes?: string
  avoidWords?: string[]
}

function personaBlock(p: Persona): string {
  const lines: string[] = []
  if (p.creatorName) lines.push(`Channel name: ${p.creatorName}`)
  if (p.bio) lines.push(`Channel bio: ${p.bio}`)
  if (p.audience) lines.push(`Audience: ${p.audience}`)
  if (p.contentPillars?.length) lines.push(`Recurring topics: ${p.contentPillars.join(' · ')}`)
  if (p.toneNotes) lines.push(`Voice: ${p.toneNotes}`)
  if (p.avoidWords?.length) lines.push(`Words and phrases this channel never uses: ${p.avoidWords.join(', ')}`)
  return lines.length
    ? lines.join('\n')
    : 'No channel voice has been configured. Write plainly and neutrally — do not invent a personality.'
}

function buildUserPrompt(deal: CaptionDealInput, angle: CaptionAngle, count: number, persona: Persona) {
  const a = CAPTION_ANGLES.find(x => x.id === angle) ?? CAPTION_ANGLES[0]
  return `CHANNEL VOICE
${personaBlock(persona)}

PRODUCT (this is everything that is known — do not add to it)
Title: ${deal.title}
Category: ${deal.categoryName ?? 'not specified'}
Sale price: use {price}
${deal.priceOrig ? 'Original price: use {was}' : 'No original price is known — do not reference one.'}
Discount: use {discount}

ANGLE — ${a.label}
${a.brief}

Write ${count} caption variant${count > 1 ? 's' : ''} from this angle. Each must open in a genuinely different way.
The cta must contain {link}. Use {price}${deal.priceOrig ? ', {was}' : ''} and {discount} where the numbers belong — never write the figures yourself.`
}

// ── Kiem tra dau ra ────────────────────────────────────────────
// Lop bao ve thu hai, doc lap voi prompt. Prompt co the bi phot lo; kiem tra thi
// khong. Bat dung hai thu nguy hiem nhat: so tien va phan tram do AI tu viet.
const MONEY_RE = /(?:[$£€₫]|USD|VND)\s?\d|(?<!\{)\b\d+(?:[.,]\d+)?\s?%/i
const UNKNOWN_PLACEHOLDER_RE = /\{([a-z_]+)\}/gi

export function findUnsafeText(text: string): string | null {
  const money = text.match(MONEY_RE)
  if (money) return `tự viết số tiền/phần trăm: "${money[0].trim()}"`
  for (const m of text.matchAll(UNKNOWN_PLACEHOLDER_RE)) {
    if (!PLACEHOLDERS.includes(`{${m[1]}}` as typeof PLACEHOLDERS[number])) {
      return `dùng chỗ trống không hợp lệ: "{${m[1]}}"`
    }
  }
  return null
}

/** Thay cho trong bang gia tri that tu database. */
export function fillPlaceholders(
  text: string,
  deal: CaptionDealInput,
  opts: { style: LinkStyle; campaign?: string }
): string {
  const badge = dealDiscountBadge(deal)
  const filled = text
    .replaceAll('{price}', deal.priceSale)
    .replaceAll('{was}', deal.priceOrig ?? deal.priceSale)
    .replaceAll('{discount}', `${badge.main}${badge.sub ? ` ${badge.sub}` : ''}`)
    .replaceAll('{title}', deal.title)
    .replaceAll('{link}', shortLink(deal.code, deal.slug, opts.style, opts.campaign))

  // Don cho dinh nhau. Prompt da dan ky nhung model van co xu huong viet "${price}"
  // va "{discount} off" theo phan xa — ra "$$1,297.79" va "45% OFF off". Prompt la
  // loi khuyen, buoc chuan hoa nay moi la thu chac chan.
  //
  // `\1+` chu khong phai `\1`: model co khi viet "$${price}", sau khi dien thanh
  // BA dau $. Mot regex chi gom mot cap se bien "$$$" thanh "$$" roi di tiep —
  // dung loi da gap, va no trong y het nhu chua sua gi.
  return filled
    .replace(/([$£€₫])[\s]*\1+/g, '$1')        // $$$1,297 -> $1,297 (moi do dai)
    .replace(/\bOFF\s+off\b/gi, 'OFF')         // 45% OFF off -> 45% OFF
    .replace(/\boff\s+off\b/gi, 'off')
}

export type CaptionVariant = { hook: string; body: string; cta: string; hashtags: string[] }

export async function generateCaptions(input: {
  deal: CaptionDealInput
  angle: CaptionAngle
  count: number
  persona: Persona
}): Promise<{ variants: CaptionVariant[]; rejected: string[] }> {
  const { deal, angle, count, persona } = input

  const response = await getAnthropicClient().messages.parse({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(CaptionSchema) },
    messages: [{ role: 'user', content: buildUserPrompt(deal, angle, count, persona) }],
  })

  const parsed = response.parsed_output
  if (!parsed) {
    throw new Error(`Không sinh được caption (stop_reason=${response.stop_reason})`)
  }

  // Loai bien the vi pham thay vi sua no: mot caption da tu bia ra con so thi cac
  // cau con lai cung khong con dang tin.
  const variants: CaptionVariant[] = []
  const rejected: string[] = []
  for (const v of parsed.variants) {
    const problem = findUnsafeText([v.hook, v.body, v.cta].join('\n'))
    if (problem) rejected.push(problem)
    else variants.push(v)
  }
  return { variants, rejected }
}
