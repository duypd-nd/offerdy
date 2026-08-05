/**
 * Viet than bai, tu du lieu THAT da cao ve tu trang san pham cua shop.
 *
 * Vi tri trong luong: **cong kiem -> dat ten -> VIET -> hau kiem**. Day la khau model
 * duoc noi tay nhat, nen cung la khau bi rang buoc chat nhat.
 *
 * ⚠️ **Dau vao khong chua MOT CON SO TIEN NAO.** Model chi biet `hasPrice: boolean`.
 * No viet `[PRICE:n]`, code dien gia that luc dung trang. Day la cung nguyen tac da
 * chung minh duoc o `generateCaption.ts`: model viet chu, code dien so. Mot con so
 * do model go ra la mot khang dinh khong ai kiem duoc, va gia thi troi tung ngay.
 *
 * ⚠️ Gia tri cua bai nay den tu **DOI CHIEU**, khong tu van moi. 23 review cu do AI
 * viet tu trang san pham chi duoc 128 hien thi / 0 bam trong 90 ngay. Cau lam nen
 * bai Frizzlife la cau khong trang nao cua shop co: *"PX600 va PD600-TAM3 cung 600
 * GPD"* — no chi xuat hien khi dat bon san pham canh nhau. Prompt duoi day noi thang
 * dieu do voi model.
 */
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { getAnthropicClient } from './anthropicClient'
import { MONEY_RE } from './generateCaption'
import { PRODUCT_GRADIENTS } from './generateReviewContent'
import { tokenize } from '@/lib/productMatch'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'
const GRADIENT_KEYS = Object.keys(PRODUCT_GRADIENTS) as [string, ...string[]]

// ── The trong than bai ────────────────────────────────────────────────

/**
 * The duoc phep, va so chi so cua tung loai.
 *
 * ⚠️ `[CTA:n]` co danh so theo SAN PHAM chu khong phai mot nut duy nhat cuoi bai.
 * Bai so 5 san pham ma chi co mot nut mua thi bon san pham kia khong co duong mua —
 * mat hoa hong am tham, va am tham la kieu that thu te nhat vi khong ai phat hien.
 */
export const ARTICLE_TAGS = ['IMAGE', 'CTA', 'PRODUCT', 'PRICE', 'WAS', 'TABLE', 'COUPON'] as const
export type ArticleTag = (typeof ARTICLE_TAGS)[number]

/** The khong mang chi so. */
const UNINDEXED: ReadonlySet<string> = new Set(['TABLE', 'COUPON'])

const TAG_RE = /\[([A-Z]+)(?::(\d+))?\]/g

const ArticleSchema = z.object({
  title: z.string(),
  excerpt: z.string().describe('1-2 sentences, used as the preview and meta description fallback.'),
  contentHtml: z.string().describe(
    'Article body as HTML using <h2>/<h3>/<p>/<ul>/<li>. Never write <a> or <img> yourself — ' +
    'use the bracket tokens only; the site replaces them with real markup at render time.'
  ),
  metaTitle: z.string().describe('<= 50 characters. A brand suffix is appended by the site.'),
  metaDescription: z.string().describe('<= 160 characters.'),
  coverEmoji: z.string().describe('One emoji that suits the product category.'),
  coverBg: z.enum(GRADIENT_KEYS),
  readTime: z.number().int().min(2).max(20).describe('Estimated reading minutes.'),
  faq: z.array(z.object({
    question: z.string(),
    answer: z.string(),
  })).min(4).max(8),
  comparisonRows: z.array(z.object({
    label: z.string().describe('What is being compared, e.g. "Flow rate" or "Fits under sink".'),
    values: z.array(z.string()).describe('One entry per source product, in the order given. Use "—" where the source does not say.'),
  })).describe('Structured comparison data. Return an empty array for a single-product article.'),
  /**
   * Cau chi xuat hien khi dat cac san pham CANH NHAU — thu khong trang nao cua shop
   * tu viet. Doi rieng mot truong de model phai tra loi, thay vi de no lan trong van.
   */
  crossComparisonInsight: z.string().describe(
    'One sentence that is only true because these products were placed side by side, and that no single product page states. If nothing like that exists in the data, return an empty string — do not manufacture one.'
  ),
  /** Bai khong tra loi duoc gi. Trang review cua du an da co muc nay va no giu duoc long tin. */
  notAnswered: z.array(z.string()).max(4).describe(
    'Questions a buyer would reasonably ask that this data cannot answer. Be specific.'
  ),
})

export type ArticleContent = z.infer<typeof ArticleSchema>

export type ArticleProductInput = {
  /** So thu tu 1..N — chinh la `n` trong `[IMAGE:n]`, `[CTA:n]`, `[PRICE:n]`. */
  n: number
  title: string
  description?: string
  /** ⚠️ CHI la co/khong. Con so tuyet doi khong duoc di vao prompt. */
  hasPrice: boolean
  hasWas: boolean
  imageCount: number
}

export type ArticleInput = {
  articleTitle: string
  templateId: string
  storeName: string
  year: number
  products: ArticleProductInput[]
  /** Shop co ma giam dang hoat dong khong — quyet dinh `[COUPON]` co hop le hay khong. */
  hasCoupon: boolean
}

const SYSTEM_PROMPT = `You write buying-guide articles for an affiliate shopping site. Everything you are given was scraped from one shop's own product pages. You have nothing else, and you must not act as if you do.

WHERE THE VALUE COMES FROM — read this first:
This article is worth publishing only if it says something no single product page says. Restating one product page in fresh words produces a page Google already has, and pages like that are exactly what recent core updates demoted. Your job is COMPARISON: put the products side by side and surface what only becomes visible that way — two models that turn out to share a specification, a step in the range where the price stops buying more capacity, a feature that only the smaller model has. If the data genuinely does not support such an observation, say so in notAnswered rather than inventing one.

ABSOLUTE RULES — these are not style preferences:

1. NEVER write a price, a discount, a percentage off, a currency amount, a stock level, a rating, or a review count. You are not given any prices — only whether one exists. Write the token [PRICE:n] or [WAS:n] and the site fills in the real figure at render time. Writing a figure yourself is a claim you cannot support and it will be rejected outright.
2. NEVER write <a> or <img> tags. Use tokens only: [IMAGE:n] to place a product image, [CTA:n] for the buy button of product n, [PRODUCT:n] for the product's name, [TABLE] for the comparison table, [COUPON] for the shop's discount code. Anything else in square brackets is rejected.
3. EVERY product you were given must have at least one [CTA:n] somewhere in the body. A five-product article with one buy button leaves four products with no way to buy them.
4. NEVER mention a brand, retailer, model, certification or standard that does not appear in the supplied product names or descriptions. The site does not sell it and cannot stand behind the claim.
5. NEVER claim you tested, used, measured, owned or handled anything. Nothing was tested. Say what the shop states and attribute it that way.
6. NEVER invent specifications, dimensions, materials, warranty terms, delivery times or compatibility that the descriptions do not state. If a comparison cell has no source, write "—".
7. NEVER write the site's own name. The site adds its brand automatically.
8. Only use [COUPON] if you are told the shop has a code. If it does not, the token would render as nothing and the sentence around it would be meaningless.

STRUCTURE: open by naming the decision the reader is making, not by introducing the shop. Put [TABLE] early, right after the framing — a reader who only reads the table should still get the answer. Then work through the products, then close with who each one suits. Use <h2> for sections. Keep paragraphs short.

Write in English. Plain and specific: a reader deciding between two water filters wants the difference stated, not adjectives.`

function productBlock(p: ArticleProductInput): string {
  return [
    `--- product ${p.n} ---`,
    `name: ${p.title}`,
    `description from the shop: ${p.description?.trim() || 'the shop published no description — do not invent one, and say so if it matters'}`,
    `price: ${p.hasPrice ? `known — write [PRICE:${p.n}], never a figure` : 'not published — do not reference a price for this product'}`,
    `previous price: ${p.hasWas ? `known — write [WAS:${p.n}]` : 'not published'}`,
    `image: ${p.imageCount ? `available — write [IMAGE:${p.n}] once where it helps` : 'none was scraped — do not place an image for this product'}`,
  ].join('\n')
}

function buildUserPrompt(input: ArticleInput): string {
  return `Article title (already approved — write to it, do not change the subject): ${input.articleTitle}
Article type: ${input.templateId}
Shop: ${input.storeName}
Year: ${input.year}
Shop discount code: ${input.hasCoupon ? 'the shop has a working code — you may use [COUPON] once, at a natural point' : 'none — NEVER write [COUPON]'}

There are ${input.products.length} source products. comparisonRows must have exactly ${input.products.length} values per row, in this order.

REQUIRED TOKENS — the body is rejected outright if any of these is missing: ${[
    ...input.products.map(p => `[CTA:${p.n}]`),
    ...input.products.filter(p => p.imageCount > 0).map(p => `[IMAGE:${p.n}]`),
  ].join(', ')}. Each product needs its own buy button and its own picture: a product a reader cannot see and cannot buy is a product the article failed to cover.

${input.products.map(productBlock).join('\n\n')}`
}

// ── Hau kiem ──────────────────────────────────────────────────────────

export type ArticleProblems = {
  /** Khong tao ban nhap. Bai da noi mot dieu khong chong do duoc. */
  hard: string[]
  /** Van tao, nhung nguoi duyet phai nhin thay co do. */
  soft: string[]
}

export type ArticleGuardContext = {
  storeName: string
  productCount: number
  /** Ten + mo ta san pham — kho tu vung that cua bai. */
  sourceText: string[]
  imageCounts: number[]
  hasCoupon: boolean
  year: number
}

/**
 * Tu viet hoa binh thuong gap trong van tieng Anh. Danh sach nay chi phuc vu canh
 * bao MEM (quet danh tu rieng la) nen sai o day khong lam hong gi — chi lam nguoi
 * duyet phai liec them mot dong.
 */
const COMMON_CAPITALS = new Set([
  'i', 'a', 'the', 'this', 'that', 'these', 'those', 'it', 'they', 'we', 'you',
  'if', 'but', 'and', 'or', 'so', 'for', 'in', 'on', 'at', 'to', 'of', 'with',
  'what', 'when', 'where', 'which', 'who', 'why', 'how', 'both', 'each', 'every',
  'most', 'more', 'less', 'there', 'here', 'however', 'because', 'while', 'after',
  'before', 'once', 'unlike', 'instead', 'still', 'yes', 'no', 'not', 'all', 'any',
  'its', 'their', 'his', 'her', 'our', 'your', 'my', 'one', 'two', 'three', 'four',
  'five', 'both', 'either', 'neither', 'check', 'buy', 'see', 'note', 'also', 'then',
  'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
  'september', 'october', 'november', 'december',
])

/**
 * Bo the HTML **va bo cac the vuong** truoc khi quet danh tu rieng.
 *
 * ⚠️ Bo the vuong la phan de quen: `[CTA:1]`, `[IMAGE:1]`, `[TABLE]` deu la chu in
 * hoa, nen khong bo thi bai nao cung sinh ra "tên riêng lạ CTA/IMAGE/TABLE". Canh bao
 * mem chi co gia tri khi nguoi duyet doc no; mot danh sach lan nao cung co 5 dong rac
 * la mot danh sach khong ai doc nua.
 */
function stripHtml(html: string): string {
  return html
    .replace(TAG_RE, ' ')
    // ⚠️ The KHOI ket thuc mot cau ngay ca khi khong co dau cham. Khong doi chung
    // thanh dau cham thi tu dau moi doan van/moi muc danh sach bi coi la giua cau va
    // sinh bao dong gia — do that: *"Check the price"* mo dau mot <p> bi bao la ten
    // rieng la. Chi doi the KHOI, khong doi the inline: doi het thi mot ten rieng nam
    // trong <b> se thanh "dau cau" va lot luoi.
    .replace(/<\/?(p|h[1-6]|li|ul|ol|div|tr|td|th|table|br)\b[^>]*>/gi, ' . ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
}

/** Moi doan chu trong ca bai — de soi tien va soi the. */
function allText(a: ArticleContent): string {
  return [
    a.title, a.excerpt, a.metaTitle, a.metaDescription,
    a.contentHtml,
    a.crossComparisonInsight,
    ...a.notAnswered,
    ...a.faq.flatMap(f => [f.question, f.answer]),
    ...a.comparisonRows.flatMap(r => [r.label, ...r.values]),
  ].join('\n')
}

/**
 * Hau kiem doc lap voi prompt.
 *
 * Chia CUNG/MEM co chu dich. Loi cung la loi khong the song chung: mot con so tien do
 * model go ra thi ca bai het dang tin. Loi mem la thu **may khong quyet duoc**: mot
 * ten viet hoa la co the la thuong hieu bia ra, cung co the la "Reverse Osmosis" hay
 * "Black Friday". Tu dong loai thi qua nhieu bao dong gia; dua cho nguoi xem thi gan
 * nhu khong bao gio sai.
 */
export function findUnsafeArticle(a: ArticleContent, ctx: ArticleGuardContext): ArticleProblems {
  const hard: string[] = []
  const soft: string[] = []
  const text = allText(a)

  // ── Tien va phan tram ──
  //
  // Dung LAI `MONEY_RE` cua generateCaption (khong chep ban thu hai), nhung chay o
  // che do `g` de soi HET chu khong chi cai dau tien.
  //
  // ⚠️ Bai viet khac caption o mot cho, va khac biet do quan trong: **mot phan tram
  // CO THAT trong mo ta cua shop la thong tin dung nhat cua ca bai** ("removes 99% of
  // chlorine"). Caption khong bao gio can no nen chan het la dung; bai viet ma chan
  // het thi vua mat thong tin tot nhat, vua bien mot bo loc dang tin thanh mot bo loc
  // hay bao dong gia. Nen: **so tien luon chan; phan tram chi chan khi con so KHONG
  // xuat hien trong mo ta nguon.**
  //
  // Do that lan chay thu hai tren Frizzlife: model go ra "450%" — mot con so khong he
  // co trong mo ta cua shop. Do la thu phai chan, va no da bi chan.
  const sourceBlob = ctx.sourceText.join(' ')
  for (const m of text.matchAll(new RegExp(MONEY_RE.source, 'gi'))) {
    const hit = m[0].trim()
    const pct = hit.match(/^(\d+(?:[.,]\d+)?)\s?%$/)
    if (pct && sourceBlob.includes(pct[1])) continue
    const around = text.slice(Math.max(0, (m.index ?? 0) - 45), (m.index ?? 0) + 45).replace(/\s+/g, ' ')
    hard.push(`model tự viết số tiền/phần trăm: "${hit}" (…${around}…)`)
    break
  }

  if (/offerdy/i.test(a.title) || /offerdy/i.test(a.metaTitle)) {
    hard.push('tiêu đề chứa chữ "Offerdy" — titleTemplate đã nối hậu tố rồi')
  }

  // Nam: bai de nam sai la bai tu khai minh cu ngay hom dang.
  for (const m of text.matchAll(/\b(19|20)\d{2}\b/g)) {
    const n = Number(m[0])
    if (n !== ctx.year && n !== ctx.year + 1) {
      hard.push(`nhắc năm "${m[0]}" — không phải năm nay (${ctx.year}) hay năm sau`)
      break
    }
  }

  // ── The tho trong HTML ──
  if (/<a[\s>]/i.test(a.contentHtml)) {
    hard.push('tự viết thẻ <a> — link tiếp thị phải do code gắn lúc render, nếu không nó ra ngoài không mang ref')
  }
  if (/<img[\s>]/i.test(a.contentHtml)) hard.push('tự viết thẻ <img>')

  // ── The: ten hop le, chi so trong pham vi ──
  const ctaSeen = new Set<number>()
  const imageSeen = new Set<number>()
  for (const m of a.contentHtml.matchAll(TAG_RE)) {
    const [whole, name, index] = m
    if (!(ARTICLE_TAGS as readonly string[]).includes(name)) {
      hard.push(`thẻ lạ "${whole}"`)
      continue
    }
    if (UNINDEXED.has(name)) {
      if (index !== undefined) hard.push(`thẻ "${whole}" không được mang chỉ số`)
      continue
    }
    if (index === undefined) {
      hard.push(`thẻ "${whole}" thiếu chỉ số sản phẩm`)
      continue
    }
    const n = Number(index)
    if (n < 1 || n > ctx.productCount) {
      hard.push(`thẻ "${whole}" trỏ tới sản phẩm ${n} nhưng bài chỉ có ${ctx.productCount}`)
      continue
    }
    if (name === 'IMAGE' && (ctx.imageCounts[n - 1] ?? 0) === 0) {
      hard.push(`thẻ "${whole}" nhưng sản phẩm ${n} không cào được ảnh nào`)
    }
    if (name === 'CTA') ctaSeen.add(n)
    if (name === 'IMAGE') imageSeen.add(n)
  }

  const everyProduct = Array.from({ length: ctx.productCount }, (_, i) => i + 1)

  // ⚠️ Moi san pham phai co it nhat mot duong mua.
  const noCta = everyProduct.filter(n => !ctaSeen.has(n))
  if (noCta.length) {
    hard.push(`sản phẩm ${noCta.join(', ')} không có [CTA:n] nào — người đọc không có đường mua`)
  }

  /**
   * ⚠️ Va moi san pham phai co it nhat mot ANH RIENG.
   *
   * Bai so sanh ma vai san pham khong co hinh thi nguoi doc khong so duoc bang mat —
   * chinh viec dat canh nhau la ly do bai ton tai. Day la loi CUNG vi model thoa man
   * no chi bang cach dat them mot the, y het luat [CTA:n].
   *
   * Chi doi voi san pham CO anh cao duoc: khong cao duoc anh nao la van de du lieu,
   * khong phai loi cua model — cai do bao mem o duoi.
   */
  const noImage = everyProduct.filter(n => (ctx.imageCounts[n - 1] ?? 0) > 0 && !imageSeen.has(n))
  if (noImage.length) {
    hard.push(`sản phẩm ${noImage.join(', ')} không có [IMAGE:n] nào dù đã cào được ảnh — người đọc không nhìn thấy món hàng`)
  }

  const noPhotoAtAll = everyProduct.filter(n => (ctx.imageCounts[n - 1] ?? 0) === 0)
  if (noPhotoAtAll.length) {
    soft.push(`sản phẩm ${noPhotoAtAll.join(', ')} không cào được ảnh nào — bài sẽ thiếu hình cho những sản phẩm đó`)
  }

  if (!ctx.hasCoupon && a.contentHtml.includes('[COUPON]')) {
    hard.push('dùng [COUPON] nhưng shop này không có mã giảm nào')
  }

  // ── Bang so sanh: so o phai khop so san pham ──
  for (const row of a.comparisonRows) {
    if (row.values.length !== ctx.productCount) {
      hard.push(`hàng bảng "${row.label}" có ${row.values.length} ô nhưng bài có ${ctx.productCount} sản phẩm`)
      break
    }
  }

  // ── MEM: danh tu rieng khong co trong nguon ──
  const vocab = new Set<string>(COMMON_CAPITALS)
  for (const token of [...ctx.sourceText.flatMap(t => tokenize(t)), ...tokenize(ctx.storeName)]) {
    vocab.add(token)
    // Doan chu / doan so cua tung token — cung ly do voi `nameArticleIdeas`: nguon
    // viet `PD600-TAM3` thanh hai token `pd600` + `tam3`, nen chu `PD` don le trong
    // bai bi bao la ten rieng la du no la tien to cua hai ma model that.
    for (const part of token.match(/[a-z]+|\d+/g) ?? []) vocab.add(part)
  }

  const flagged = new Set<string>()
  for (const sentence of stripHtml(a.contentHtml).split(/(?<=[.!?])\s+/)) {
    // Bo tu dau cau: tieng Anh viet hoa no theo luat chinh ta, khong phai vi no la
    // ten rieng. Khong bo thi moi cau sinh mot bao dong gia.
    const words = sentence.trim().split(/\s+/).slice(1)
    for (const raw of words) {
      if (!/^[A-Z]/.test(raw)) continue
      // ⚠️ Xe tu ghep ra tung manh roi doi chieu, thay vi cat dau/duoi roi so ca cum.
      // Cat dau/duoi bien `PD600-TAM3` thanh `PD600-TAM` — mot chuoi khong bao gio
      // khop duoc voi bat cu gi trong nguon, nen bai nao co ma model cung bao dong.
      const parts = tokenize(raw)
      if (!parts.length) continue
      const unknown = parts.filter(p => p.length >= 2 && !vocab.has(p))
      if (!unknown.length) continue
      const label = unknown.join(' ')
      if (flagged.has(label)) continue
      flagged.add(label)
      soft.push(`tên riêng lạ "${raw}" — không có trong tên/mô tả sản phẩm nguồn hay tên shop`)
    }
  }

  if (!a.crossComparisonInsight.trim() && ctx.productCount > 1) {
    soft.push('không nêu được câu đối chiếu nào — bài nhiều sản phẩm mà không có gì chỉ thấy khi đặt cạnh nhau thì giá trị rất mỏng')
  }

  return { hard, soft }
}

// ── Goi model ─────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 3

function isRetryable(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status?: number }).status
    if (status && [429, 500, 502, 503, 529].includes(status)) return true
  }
  if (err instanceof Error && err.message.includes('Failed to parse structured output')) return true
  return false
}

export async function generateArticleContent(
  input: ArticleInput,
  attempt = 1
): Promise<ArticleContent> {
  try {
    const response = await getAnthropicClient().messages.parse({
      model: MODEL,
      // ⚠️ Sonnet 5 bat adaptive thinking mac dinh, va `max_tokens` chan **thinking +
      // chu cong lai**. Chang 3 da tra gia cho bai hoc nay: 4096 cho mot dau ra ~1000
      // token van bi cat. Bai tong hop dai hon review nhieu.
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(ArticleSchema) },
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    })

    // ⚠️ Bai bi cat VAN parse thanh JSON hop le — cho toi luc khong. Am tham dang
    // nua bai la ket cuc te nhat co the, nen coi day la loi cung.
    if (response.stop_reason === 'max_tokens') {
      throw new Error('Bài bị cắt giữa chừng (stop_reason=max_tokens) — không dùng được')
    }
    const parsed = response.parsed_output
    if (!parsed) throw new Error(`Không sinh được bài (stop_reason=${response.stop_reason})`)
    return parsed
  } catch (err) {
    if (isRetryable(err) && attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, attempt * 1500))
      return generateArticleContent(input, attempt + 1)
    }
    throw err
  }
}
