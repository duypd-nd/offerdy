import { z } from 'zod'
import { generateStructured } from '@/lib/ai/router'
import { dealDiscountBadge } from '@/lib/dealDiscountLabel'
import { shortLink, type LinkStyle } from '@/lib/socialCaption'


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
    // Brief cu bao "set the price against what the reader expects to pay for this
    // category" — moi model dua ra nhan dinh ve mat bang gia thi truong ("many
    // sunglasses cost more than..."), thu no khong co du lieu de noi. So sanh duy
    // nhat co that trong tay la GIA CU voi GIA MOI.
    brief: 'Compare the two numbers that are actually known: the original price and the current one. Make the size of the drop concrete and easy to picture. Do not reference what the category "usually" costs, what other shops charge, or any competing product — you have no data on any of that.',
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
// ⚠️ `{code}` la MA SAN PHAM cua Offerdy (#1020) dung de tra o /links — KHONG phai
// ma coupon. Ma coupon cua shop la `{coupon}`, mot cho trong rieng. Gop hai thu nay
// vao mot placeholder se pha logic CTA (nen tang khong cho link bam duoc BAT BUOC
// phai co {code}) va lam nguoi xem go ma san pham vao o giam gia luc thanh toan.
const PLACEHOLDERS = ['{price}', '{was}', '{discount}', '{link}', '{title}', '{code}', '{coupon}'] as const

// ── Nen tang ──────────────────────────────────────────────────
// Khac biet quan trong nhat KHONG phai do dai caption ma la: URL trong caption co
// bam duoc khong.
//
// Instagram va TikTok KHONG bien URL trong caption thanh link — no chi la chu, nguoi
// xem phai tu go lai. Caption viet "See the listing at offerdy.com/d/1020" o hai noi
// do la mot cau CTA hong: no bao nguoi ta lam mot viec ho khong lam duoc bang mot
// cu cham. Dung cach la nhac MA (`{code}`) va chi ve link o bio — dung duong ma
// /links + o tim kiem theo ma da dung san cho viec nay.
export const CAPTION_PLATFORMS = [
  {
    id: 'instagram',
    label: 'Instagram',
    linkInCaption: false,
    brief: 'Instagram caption. The first line is what shows before "more" — it must work alone. Line breaks between short blocks. 4-6 hashtags at the end.',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    linkInCaption: false,
    brief: 'TikTok caption. Very short — two or three lines at most, the video carries the rest. 3-4 hashtags. Plain, spoken rhythm, no formal marketing sentences.',
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    linkInCaption: true,
    brief: 'Pinterest description. Written for search, not for a feed: lead with what the product is in plain descriptive words someone would type into the search box. Calm and factual, no hook-and-tease. 3-5 hashtags.',
  },
  {
    id: 'threads',
    label: 'Threads / X',
    linkInCaption: true,
    brief: 'Short post for Threads or X. Under about 250 characters total. Conversational, one idea. At most 2 hashtags — more looks like spam on these platforms.',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    linkInCaption: true,
    brief: 'Facebook post. Slightly longer and more explanatory than Instagram; readers there scroll less and read more. 2-3 hashtags at most.',
  },
] as const

export type CaptionPlatform = typeof CAPTION_PLATFORMS[number]['id']

export function platformById(id: CaptionPlatform) {
  return CAPTION_PLATFORMS.find(p => p.id === id) ?? CAPTION_PLATFORMS[0]
}

const CaptionSchema = z.object({
  variants: z.array(z.object({
    hook: z.string().describe('First line. This alone decides whether anyone reads on.'),
    body: z.string().describe('1-3 short lines. May span multiple lines separated by \\n.'),
    cta: z.string().describe('One short line telling the reader what to do. Must contain {link} or {code}, whichever the platform section requires.'),
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
6. NEVER write about what you are not claiming. Sentences like "without any claim about matching a brand" or "this says nothing about build quality" are you narrating your own instructions into the post. A reader finds that baffling. Simply leave out what you cannot support — say nothing about it at all.

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
  /** URL ra merchant — dung de suy ra shop nao, tu do lay ma coupon that. */
  dealUrl?: string
  /**
   * Ma coupon THAT cua shop ma deal nay dan toi — suy ra tu domain cua `dealUrl`
   * (xem src/lib/dealStoreMatch.ts), khong phai do model nghi ra. Bo trong thi
   * `{coupon}` bi tu choi han o findUnsafeText.
   */
  couponCode?: string
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

function buildUserPrompt(
  deal: CaptionDealInput, angle: CaptionAngle, count: number, persona: Persona, platform: CaptionPlatform,
  provenCaptions?: { text: string; clicks: number }[]
) {
  // Vi du lay tu chinh kenh nay va tu nhung caption DA RA CLICK THAT — khong phai
  // vi du chung chung. Chi dua vao khi thuc su co du lieu; ep model bat chuoc mot
  // mau chua chung minh duoc gi thi con te hon la khong co vi du nao.
  //
  // Noi ro day la vi du ve GIONG DIEU va CAU TRUC, khong phai de sao chep con so:
  // caption cu chua gia cua san pham CU, model ma bat chuoc nguyen van la sai gia.
  const provenBlock = provenCaptions?.length
    ? `\n\nWHAT HAS ACTUALLY WORKED ON THIS CHANNEL
These captions were posted and led to real clicks through to the merchant. Study the rhythm, the sentence length and how each one opens — then write in that manner. They are about DIFFERENT products, so never copy their figures or product details.
${provenCaptions.map((c, i) => `--- example ${i + 1} (${c.clicks} clicks) ---\n${c.text}`).join('\n')}`
    : ''
  return provenBlock ? _basePrompt(deal, angle, count, persona, platform) + provenBlock
    : _basePrompt(deal, angle, count, persona, platform)
}

function _basePrompt(
  deal: CaptionDealInput, angle: CaptionAngle, count: number, persona: Persona, platform: CaptionPlatform
) {
  const a = CAPTION_ANGLES.find(x => x.id === angle) ?? CAPTION_ANGLES[0]
  const p = platformById(platform)
  const ctaRule = p.linkInCaption
    ? 'The cta must contain {link}. On this platform a URL in the caption is clickable.'
    : `The cta must contain {code} and must NOT contain {link}. On this platform a URL written in the caption is NOT clickable — it is plain text the reader would have to retype, so pointing them at a URL is a dead end. Instead tell them the link is in the bio and give them the product code ({code}) to find it with. Phrase it in the channel's own voice; do not copy a stock phrase.`
  return `PLATFORM — ${p.label}
${p.brief}
${ctaRule}

CHANNEL VOICE
${personaBlock(persona)}

PRODUCT (this is everything that is known — do not add to it)
Title: ${deal.title}
Category: ${deal.categoryName ?? 'not specified'}
Sale price: use {price}
${deal.priceOrig ? 'Original price: use {was}' : 'No original price is known — do not reference one.'}
Discount: use {discount}
${deal.couponCode
  ? `Shop coupon: this shop has a working discount code, and the caption MUST contain the token {coupon} exactly once.
  Writing ABOUT a code without including {coupon} is worthless — "there's also a code at checkout" tells the reader a code exists while withholding it, which is worse than saying nothing. Give them the token.
  {coupon} and {code} are DIFFERENT things and both belong in the caption: {code} is the product number they search in the bio link to find this listing; {coupon} is the discount code they type at checkout. Never describe {coupon} as something to search with, and never call {code} a discount.
  It is a STORE-WIDE code, so do NOT claim it applies to this product, do NOT say how much it saves, and do NOT add it on top of the discount figure ("{discount} plus another 15%" is a claim you cannot make). "code {coupon} at checkout" is right; "use {coupon} for an extra 20% off this bike" is not.`
  : 'Shop coupon: none is known for this shop. NEVER write {coupon} — there is nothing to substitute and the caption would ship with a literal placeholder in it.'}

ANGLE — ${a.label}
${a.brief}

Write ${count} caption variant${count > 1 ? 's' : ''} from this angle, for ${p.label}. Each must open in a genuinely different way.
Use {price}${deal.priceOrig ? ', {was}' : ''} and {discount} where the numbers belong — never write the figures yourself.`
}

// ── Kiem tra dau ra ────────────────────────────────────────────
// Lop bao ve thu hai, doc lap voi prompt. Prompt co the bi phot lo; kiem tra thi
// khong. Bat dung hai thu nguy hiem nhat: so tien va phan tram do AI tu viet.
// Export de bo hau kiem bai viet (`generateArticleContent.ts`) dung LAI chinh regex
// nay thay vi chep mot ban thu hai: lich su chu thich cua no — vi sao co lookbehind
// `(?<!\{)`, vi sao bat ca `USD`/`VND` — la thu mot ban chep se mat.
export const MONEY_RE = /(?:[$£€₫]|USD|VND)\s?\d|(?<!\{)\b\d+(?:[.,]\d+)?\s?%/i
const UNKNOWN_PLACEHOLDER_RE = /\{([a-z_]+)\}/gi

export function findUnsafeText(
  text: string,
  platform?: CaptionPlatform,
  opts?: { hasCoupon?: boolean }
): string | null {
  const money = text.match(MONEY_RE)
  if (money) return `tự viết số tiền/phần trăm: "${money[0].trim()}"`
  for (const m of text.matchAll(UNKNOWN_PLACEHOLDER_RE)) {
    if (!PLACEHOLDERS.includes(`{${m[1]}}` as typeof PLACEHOLDERS[number])) {
      return `dùng chỗ trống không hợp lệ: "{${m[1]}}"`
    }
  }
  // Shop khong co ma nao ma model van viet {coupon} -> caption se dang len kem
  // dung chu "{coupon}", hoac te hon la bi thay bang chuoi rong lam cau vo nghia.
  // Prompt da noi ro, nhung prompt la loi khuyen; day moi la thu chac chan.
  if (!opts?.hasCoupon && text.includes('{coupon}')) {
    return 'dùng {coupon} nhưng shop này không có mã coupon nào'
  }
  // Chieu nguoc lai: shop CO ma ma caption noi ve ma nhung khong dua ma.
  // Da xay ra that trong lan thu dau — model viet "there's also a store-wide code
  // at checkout" roi bo lung, tuc bao khach la co ma nhung giu ma lai. Nhu vay con
  // te hon khong nhac gi: no tao mong doi rong. Prompt gio yeu cau ro, va day la
  // lop chac chan.
  if (opts?.hasCoupon && /\b(coupon|promo|discount)\s+code\b|\bcode at checkout\b/i.test(text)
      && !text.includes('{coupon}')) {
    return 'nói về mã giảm giá nhưng không đưa {coupon} vào (khách không dùng được mã mà họ không biết)'
  }
  // URL trong caption Instagram/TikTok khong bam duoc — de lot mot cai la giao cho
  // nguoi xem mot viec ho khong lam duoc bang mot cu cham.
  if (platform && !platformById(platform).linkInCaption && text.includes('{link}')) {
    return `đặt link vào caption ${platformById(platform).label} (link ở đó không bấm được)`
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
    .replaceAll('{code}', `#${deal.code}`)
    // Neu khong co ma thi findUnsafeText da loai variant nay tu truoc; nhanh nay
    // chi la phong ho cuoi, va thay bang chuoi rong con hon de lo "{coupon}".
    .replaceAll('{coupon}', deal.couponCode ?? '')
    .replaceAll('{link}', shortLink(deal.code, deal.slug, opts.style, opts.campaign))

  // Don cho dinh nhau. Prompt da dan ky nhung model van co xu huong viet "${price}"
  // va "{discount} off" theo phan xa — ra "$$1,297.79" va "45% OFF off". Prompt la
  // loi khuyen, buoc chuan hoa nay moi la thu chac chan.
  //
  // `\1+` chu khong phai `\1` de gom duoc chuoi dai bat ky ("$$${price}"), khong
  // chi mot cap.
  //
  // CANH BAO KHI DEBUG: dung tin chuoi doc thang tu payload cua server action.
  // React Flight NHAN DOI dau $ o DAU chuoi (de phan biet voi ky hieu tham chieu),
  // client tu go lai. Doc payload tho se thay "$$1,297.79" o nhung caption bat dau
  // bang gia — trong y het mot loi chuan hoa, nhung la escape. Dau hieu phan biet:
  // dau $ o GIUA cau khong bi nhan doi. Da mat kha nhieu thoi gian vi cho nay.
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
  platform: CaptionPlatform
  /** Caption cua chinh kenh nay da ra click that — dung lam vi du, xem buildUserPrompt. */
  provenCaptions?: { text: string; clicks: number }[]
}): Promise<{ variants: CaptionVariant[]; rejected: string[] }> {
  const { deal, angle, count, persona, platform, provenCaptions } = input

  // ⚠️ Di qua router (27/08) chu khong goi thang Anthropic nua. Khong co
  // khoa mien phi nao thi router roi thang xuong Claude — hanh vi y het truoc do.
  const { data: parsed, provider, model } = await generateStructured({
    task: 'caption',
    schema: CaptionSchema,
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(deal, angle, count, persona, platform, provenCaptions),
    maxTokens: 2048,
  })

  // Loai bien the vi pham thay vi sua no: mot caption da tu bia ra con so thi cac
  // cau con lai cung khong con dang tin.
  const variants: CaptionVariant[] = []
  const rejected: string[] = []
  for (const v of parsed.variants) {
    const problem = findUnsafeText([v.hook, v.body, v.cta].join('\n'), platform, {
      hasCoupon: Boolean(deal.couponCode),
    })
    if (problem) rejected.push(problem)
    else variants.push(v)
  }
  return { variants, rejected }
}
