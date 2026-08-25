/**
 * Dat ten cho nhung y tuong bai ma CONG KIEM DA MO.
 *
 * Vi tri trong luong: **cong kiem -> model -> hau kiem**. Day la buoc giua, va no bi
 * kep chat hai dau:
 *  - Dau vao chi la danh sach y tuong `availableTemplates()` da duyet. Model KHONG
 *    duoc nghi them y tuong, khong duoc doi mau, khong duoc doi danh sach san pham.
 *    No chi duoc doi mot chuoi: cai ten.
 *  - Dau ra di qua `findUnsafeIdea` — moi TU trong tieu de phai truy nguoc duoc ve
 *    ten san pham nguon, ten shop, nam, hoac danh sach lien tu cho phep.
 *
 * Vi sao hau kiem chat den vay: su co `/about` la mot cau van neu dich danh 15
 * thuong hieu ma site khong he ban. Mot tieu de bai viet la dung mot cau van do,
 * chi khac la no duoc Google doc va hien ra ket qua tim kiem. Prompt da dan ky, va
 * prompt van co the bi phot lo — tien le ghi o `generateCaption.ts:238`.
 *
 * MOT lenh goi cho MOI LAN QUET SHOP, khong phai moi y tuong: dat ten la viec nhin
 * ca chum roi phan biet chung voi nhau, khong phai viec lam rieng le. Goi tung cai
 * mot vua dat gap N lan vua de ra N tieu de na na nhau.
 */
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { getAnthropicClient } from './anthropicClient'
import { tokenize } from '@/lib/productMatch'
import type { ArticleIdea } from '@/lib/articleIdeas'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

/**
 * Tran do dai cua `metaTitle`.
 *
 * ⚠️ Con so nay khong tuy tien: `titleTemplate` la `%s | <ten site>` — voi "Offerdy"
 * la **10 ky tu** —
 * va Google cat quanh **60**. Du an vua ton mot dot don dep de dua 34 trang vuot 60
 * ky tu ve 0; mot bo dat ten khong biet tran nay se de lai dung cai dong do.
 *
 * Dem theo KY TU, khong theo byte: `[...s].length`. Dem bang byte tung bao nham 32
 * trang qua dai trong khi su that la 30 — dau gach ngang dai la 3 byte.
 */
export const META_TITLE_MAX = 50

const NamesSchema = z.object({
  names: z.array(z.object({
    key: z.string().describe('The exact idea key given in the input. Do not invent keys.'),
    title: z.string().describe('The article headline a reader sees on the page.'),
    metaTitle: z.string().describe(`The <title> tag. Must be at most ${META_TITLE_MAX} characters — a brand suffix is appended by the site.`),
  })).min(1),
})

const SYSTEM_PROMPT = `You name articles for an affiliate shopping site. Each article has already been approved by a separate system that checked the shop's real product catalogue. Your only job is to turn an ugly working title into a good one.

ABSOLUTE RULES — these are not style preferences:

1. Use ONLY words that appear in the source product names, the shop name, the year, and ordinary English connecting words. You may not introduce a noun that is not in the source data. In particular you may NEVER name a brand, model, retailer, certification or standard that is not in the source product names — the site does not sell it, and a title promising it is a lie that Google will show to readers.
2. NEVER write the site's own name. The site appends its brand automatically.
3. NEVER change what the article is about. You are given the template, the source products and the working title. If the working title scopes the promise to one shop ("at <shop>"), your title MUST keep that scope — dropping it turns "the best this shop sells" into "the best on the market", which the data does not support.
4. NEVER write a number that is not either the year, a figure already in a source product name, or the exact count of source products. "The 5 Best X" when four products were supplied is a false claim about the article's own contents.
5. NEVER promise something the products cannot answer: no "cheapest", no "fastest", no awards, no test results, no personal experience. Nothing was tested.
6. Return one entry per key you were given, using the key exactly as supplied. Do not add keys, do not drop keys, do not merge articles.

CAPITALISATION AND GRAMMAR — the source is not a style guide:
Shops capitalise erratically ("OFF Road TWO Wheel Electric Scooter", "Cowhide RUG Soft"). Copy the WORDS, not the shouting. Write ordinary English title case, and keep capitals only for genuine acronyms (LED, RO, ABS), model codes (P10, S24102, VG10) and the shop's own name as the shop writes it. Changing only the letter case of a source word introduces no new word and is expected of you.
For the same reason, a title must read as a finished phrase and end on the thing being bought. "Best Off-Road Dual-Motor Scooters at HWWH" — not "Best OFF Road TWO Wheel for Dual at HWWH", which ends on a bare adjective and names no product. The category noun must itself come from the source product names.

WHAT MAKES A GOOD TITLE HERE: it says what the reader will be able to decide after reading. Plain search-like wording beats clever wording — people type what they want, they do not type puns. The set of titles you return must be clearly different from one another; two articles about the same shop must not read as near-duplicates. Two ideas that differ only by one attribute word ("… Necklace Pendant" and "… Necklace Pendant for Gift") must be named so that a reader can tell from the titles alone which one answers their question — otherwise the two pages compete with each other for the same search.

metaTitle is the <title> tag and is hard-limited to ${META_TITLE_MAX} characters. It may be a shortened form of title. Count characters, not words.

Write in English.`

/**
 * ⚠️ `REQUIRED` noi rieng cho tung y tuong, khong gop vao luat chung o system prompt.
 *
 * Do that lan dau chay Frizzlife: luat "giu nguyen pham vi" nam trong system prompt,
 * va model bo mat ten shop o **ca 3/3** bai `best-in-store`. Hau kiem chan lai het —
 * dung nhu thiet ke — nhung mot mau bi loai 100% thi tinh nang khong cho ra gi ca.
 * Cau lenh dat ngay canh du lieu cua chinh y tuong do thi kho bi bo qua hon.
 */
function ideaBlock(idea: ArticleIdea, storeName: string): string {
  const mustNameStore = idea.template === 'best-in-store' || idea.template === 'best-for'
  return [
    `key: ${idea.key}`,
    `template: ${idea.template}`,
    `working title (ugly, replace it): ${idea.workingTitle}`,
    `why this article is allowed: ${idea.why}`,
    ...(mustNameStore
      ? [`REQUIRED: both title and metaTitle must contain the shop name "${storeName}". This article ranks only what this one shop sells, so a title without the shop name claims something the data cannot support and will be rejected.`]
      : []),
    `source products (${idea.products.length}) — the ONLY vocabulary you may draw nouns from:`,
    ...idea.products.map(p => `  - ${p.title}`),
  ].join('\n')
}

function buildUserPrompt(ideas: ArticleIdea[], storeName: string, year: number): string {
  return `Shop name: ${storeName}
Current year: ${year}

Name each of the following ${ideas.length} approved articles.

${ideas.map(i => ideaBlock(i, storeName)).join('\n\n')}`
}

// ── Hau kiem ──────────────────────────────────────────────────────────

/**
 * Tu noi cau, khong mang thong tin ve san pham nao ca. Danh sach nay co y NGAN: moi
 * tu them vao day la mot tu model duoc dung ma khong ai doi chieu voi du lieu.
 *
 * Khong co ten thuong hieu, ten cua hang, ten chung nhan, tinh tu chat luong nao
 * trong day — do dung la loai tu phai den tu ten san pham that.
 */
const CONNECTIVES = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with',
  'without', 'from', 'vs', 'versus', 'is', 'are', 'do', 'does', 'you', 'your', 'we',
  'which', 'what', 'when', 'where', 'how', 'why', 'who',
  'best', 'top', 'compared', 'comparison', 'compare', 'review', 'reviews', 'guide',
  'buying', 'buy', 'pick', 'picks', 'picking', 'choose', 'choosing', 'choice',
  'between', 'difference', 'differences', 'explained', 'breakdown', 'options',
  'option', 'right', 'one', 'ones', 'each', 'every', 'all', 'any', 'more', 'most',
  'need', 'needs', 'get', 'gets', 'should', 'worth', 'better', 'different',
  'vs.', 'versus.',
  // `series` la tu ta CAU TRUC cua mot tap hop, khong phai mot khang dinh ve san
  // pham — cung loai voi `compared` va `guide` o tren. Them vao sau khi chay that:
  // ca 3 bai `line-compared` deu bi loai vi mot chu nay, trong khi ban than cac ma
  // model (`PD600`, `PD800`) da truy nguoc duoc. Bao dong gia lam nguoi ta thoi tin
  // ca hang rao, nen tu nao khong mang noi dung su that thi khong nen chan.
  'series',
])

export type IdeaNameContext = {
  storeName: string
  /** Ten website that — hang rao chan lap thuong hieu doc tu day, khong go cung. */
  siteName: string
  /** Ten san pham nguon — kho tu vung DUY NHAT model duoc lay danh tu ra dung. */
  productTitles: string[]
  year: number
  /** So san pham cua y tuong — con so duy nhat noi ve so luong ma tieu de duoc mang. */
  productCount: number
  /** `best-in-store` bat buoc giu pham vi "at <shop>" trong ten. */
  mustNameStore?: boolean
}

/**
 * Kho tu vung ma tieu de duoc phep lay tu ra dung.
 *
 * ⚠️ Moi token con dong gop them cac DOAN CHU va DOAN SO cua no. Ly do la mot bao
 * dong gia that: ten nguon viet lien `600GPD`, nen `tokenize` cho ra token `600gpd`
 * va mot tieu de hoan toan trung thuc — *"Frizzlife 600 vs 1000 GPD Water Filter"* —
 * bi tu choi vi `600` "khong co trong nguon". Bao dong gia dat hon ta tuong: du an
 * da mot lan phai sua dung loai loi nay o luat `long_meta_title`, va ghi lai rang no
 * la thu lam nguoi ta thoi tin ca bang.
 */
function buildVocab(ctx: IdeaNameContext): Set<string> {
  const vocab = new Set<string>(CONNECTIVES)
  for (const token of [...ctx.productTitles.flatMap(t => tokenize(t)), ...tokenize(ctx.storeName)]) {
    vocab.add(token)
    for (const part of token.match(/[a-z]+|\d+/g) ?? []) vocab.add(part)
  }

  // Chu viet tat cua mot cum CO THAT trong nguon. "Reverse Osmosis" -> `ro`.
  //
  // ⚠️ Sinh tu chinh nguon chu KHONG phai mot danh sach viet cung, va KHONG lay tu
  // ca danh muc shop. Ten san pham thuong nhac thuong hieu khac o phan tuong thich
  // ("replaces Waterdrop WD-G3"); mo tu vung ra ca danh muc la tu tay cho phep dat
  // ten bai bang thuong hieu site khong ban — dung su co `/about`.
  //
  // Can that: `metaTitle` chi co 50 ky tu, nen viet tat gan nhu bat buoc. Chan `RO`
  // trong khi nguon ghi day du "Reverse Osmosis" la bao dong gia, va bao dong gia
  // lam nguoi ta thoi tin ca hang rao.
  for (const title of ctx.productTitles) {
    const words = tokenize(title)
    for (let size = 2; size <= 4; size++) {
      for (let i = 0; i + size <= words.length; i++) {
        vocab.add(words.slice(i, i + size).map(w => w[0]).join(''))
      }
    }
  }
  return vocab
}

/** So sanh bo qua khac biet so it/so nhieu — "Filter" trong nguon dat duoc "Filters". */
function inVocab(word: string, vocab: Set<string>): boolean {
  if (vocab.has(word)) return true
  if (word.endsWith('es') && vocab.has(word.slice(0, -2))) return true
  if (word.endsWith('s') && vocab.has(word.slice(0, -1))) return true
  return vocab.has(word + 's') || vocab.has(word + 'es')
}

/**
 * Hau kiem doc lap voi prompt. Tra ve ly do bang tieng Viet, hoac `null` neu sach.
 *
 * ⚠️ Cach dung: ten bi tu choi thi **lui ve `workingTitle`**, khong sua chua no.
 * Mot tieu de vua bi bat noi mot dieu khong co trong du lieu thi phan con lai cua no
 * cung khong con dang tin — giong het cach `generateCaptions` loai ca bien the.
 */
export function findUnsafeIdea(title: string, ctx: IdeaNameContext): string | null {
  const text = title.trim()
  if (!text) return 'tiêu đề rỗng'

  if (ctx.siteName && text.toLowerCase().includes(ctx.siteName.toLowerCase())) {
    return `chứa chữ "${ctx.siteName}" — hậu tố thương hiệu do titleTemplate tự thêm, viết vào đây là lặp hai lần`
  }

  const vocab = buildVocab(ctx)

  if (ctx.mustNameStore) {
    const storeTokens = tokenize(ctx.storeName)
    const titleTokens = new Set(tokenize(text))
    if (!storeTokens.every(t => titleTokens.has(t))) {
      return `bỏ mất tên shop "${ctx.storeName}" — lời hứa "tốt nhất" không kèm tên shop là lời hứa về cả thị trường`
    }
  }

  for (const word of tokenize(text)) {
    // So: nam nay/nam sau, hoac con so co san trong ten san pham, hoac dung bang so
    // san pham cua bai. "The 5 Best X" tren 4 san pham la khai sai ve chinh noi dung
    // bai — va la loai sai khong ai kiem lai truoc khi dang.
    if (/^\d+$/.test(word)) {
      const n = Number(word)
      if (n === ctx.year || n === ctx.year + 1) continue
      if (n === ctx.productCount) continue
      if (vocab.has(word)) continue
      // Nam sai (2024, 2030...) dang mot loi rieng va rat de xay ra.
      if (word.length === 4 && n >= 1900 && n < 2100) {
        return `năm "${word}" không phải năm nay (${ctx.year}) hay năm sau`
      }
      return `con số "${word}" không có trong tên sản phẩm nguồn và không phải số sản phẩm của bài (${ctx.productCount})`
    }
    if (!inVocab(word, vocab)) {
      return `từ "${word}" không truy ngược được về tên sản phẩm nguồn, tên shop hay danh sách liên từ cho phép`
    }
  }

  return null
}

/** Tu doi mot bo ngu dung sau no — ket tieu de bang mot trong nay la cum bo lung. */
const DANGLING_TAIL = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with',
  'without', 'from', 'vs', 'vs.', 'versus', 'versus.', 'between',
])

/**
 * Canh bao MEM ve cach doc cua tieu de. Khong bao gio loai bai.
 *
 * ⚠️ Vi sao mem chu khong cung: cai nay khong noi ve tinh dung/sai cua noi dung — moi
 * tu o day deu da truy nguoc duoc ve nguon — ma noi ve chuyen no doc nhu may. Loai bai
 * vi mot chu viet hoa la lui ve `workingTitle`, con xau hon.
 *
 * ⚠️ Va vi sao no dung CHINH CACH VIET CUA NGUON lam thuoc do, khong dung mot danh
 * sach viet tat viet cung: shop viet hoa lung tung ("OFF Road TWO Wheel Electric
 * Scooter", "Cowhide RUG Soft"), model chep y nguyen vi tuong phai giu nguyen tung chu,
 * va tieu de ra `Best OFF Road TWO Wheel at HWWH`. Nhung `LED`, `RO`, `ABS`, `TDS` la
 * viet tat THAT va phai giu hoa. Phan biet duoc hai loai bang mot tin hieu co san:
 * **mot viet tat that thi trong nguon khong bao gio viet thuong**, con mot tu thuong
 * ("off", "two", "rug", "soft") thi o dau do trong mo ta san pham se xuat hien o dang
 * thuong. Bao dong gia dat hon ta tuong — danh sach nao cung co rac la danh sach khong
 * ai doc nua — nen thuoc do phai lay tu du lieu chu khong tu tri nho.
 *
 * `sourceText` nen gom CA mo ta san pham chu khong chi ten: ten hang la cho chu hoa
 * lung tung sinh ra, mo ta moi la van xuoi binh thuong de doi chieu.
 */
export function findAwkwardTitle(title: string, storeName: string, sourceText: string[]): string[] {
  const notes: string[] = []
  const storeTokens = new Set(tokenize(storeName))
  const blob = sourceText.join(' ')

  for (const raw of new Set(title.match(/[A-Za-z]{2,}/g) ?? [])) {
    if (raw !== raw.toUpperCase()) continue
    if (storeTokens.has(raw.toLowerCase())) continue
    // Nguon co viet chu nay o dang khong-toan-hoa khong? Neu co thi no la tu thuong,
    // khong phai viet tat — va chu hoa trong tieu de la chu hoa chep tu ten hang.
    const lowered = [...blob.matchAll(new RegExp(`\\b${raw}\\b`, 'gi'))]
      .some(m => m[0] !== m[0].toUpperCase())
    if (lowered) {
      notes.push(`tiêu đề giữ chữ hoa "${raw}" chép từ tên hàng của shop — nguồn cũng viết thường chữ này, nên nhiều khả năng nó là từ thường chứ không phải viết tắt`)
    }
  }

  // Tieu de ket bang gioi tu/lien tu la mot cum bo lung: "… Scooters at", "… vs".
  //
  // ⚠️ KHONG dung ca `CONNECTIVES` lam thuoc do — chinh test da bat duoc: no chua
  // `compared`, `guide`, `explained`, ma "… Scooters Compared" la khuon dat ten chuan
  // cua du an (8/48 bai dang dung). Chi nhung tu that su doi mot bo ngu dung sau moi
  // tinh la bo lung.
  const lastWord = (title.trim().match(/[A-Za-z.]+$/)?.[0] ?? '').toLowerCase()
  if (lastWord && DANGLING_TAIL.has(lastWord)) {
    notes.push(`tiêu đề kết thúc bằng giới từ/liên từ "${lastWord}" — cụm bị bỏ lửng`)
  }

  return notes
}

/** Kiem rieng cho `metaTitle` — no la the <title>, chiu them rang buoc do dai. */
export function findUnsafeMetaTitle(metaTitle: string, ctx: IdeaNameContext): string | null {
  const problem = findUnsafeIdea(metaTitle, ctx)
  if (problem) return problem
  // Dem KY TU chu khong dem byte: dem bang byte tung bao nham 32 trang qua dai
  // trong khi su that la 30.
  const length = [...metaTitle.trim()].length
  if (length > META_TITLE_MAX) {
    return `metaTitle dài ${length} ký tự, vượt ${META_TITLE_MAX} (titleTemplate còn nối thêm hậu tố thương hiệu)`
  }
  return null
}

// ── Goi model ─────────────────────────────────────────────────────────

export type IdeaName = { key: string; title: string; metaTitle: string }
export type NameResult = {
  named: IdeaName[]
  /** Ten bi hau kiem loai — y tuong giu nguyen `workingTitle`, va ly do hien cho nguoi vận hành. */
  rejected: { key: string; reason: string }[]
}

const MAX_ATTEMPTS = 3

function isRetryable(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status?: number }).status
    if (status && [429, 500, 502, 503, 529].includes(status)) return true
  }
  if (err instanceof Error && err.message.includes('Failed to parse structured output')) return true
  return false
}

async function callModel(
  ideas: ArticleIdea[],
  storeName: string,
  year: number,
  attempt = 1
): Promise<z.infer<typeof NamesSchema>> {
  try {
    const response = await getAnthropicClient().messages.parse({
      model: MODEL,
      // ⚠️ Dat ten la dau ra NGAN — 12 y tuong x (tieu de + metaTitle) chua toi 1000
      // token — nen 4096 trong nhu du gap boi. KHONG du: Sonnet 5 bat adaptive
      // thinking mac dinh khi khong khai `thinking`, va `max_tokens` chan **thinking
      // + chu cong lai**. Do that tren Frizzlife (12 y tuong, 2026-08-05): 4096 chay
      // 35 giay roi tra ve `stop_reason: max_tokens` va khong mot ten nao dung duoc.
      // Uoc luong theo do dai dau ra la sai phuong phap o day.
      max_tokens: 12000,
      system: SYSTEM_PROMPT,
      output_config: { format: zodOutputFormat(NamesSchema) },
      messages: [{ role: 'user', content: buildUserPrompt(ideas, storeName, year) }],
    })
    if (response.stop_reason === 'max_tokens') {
      throw new Error('Bị cắt giữa chừng (stop_reason=max_tokens)')
    }
    const parsed = response.parsed_output
    if (!parsed) throw new Error(`Không đặt được tên (stop_reason=${response.stop_reason})`)
    return parsed
  } catch (err) {
    if (isRetryable(err) && attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, attempt * 1500))
      return callModel(ideas, storeName, year, attempt + 1)
    }
    throw err
  }
}

export async function nameArticleIdeas(input: {
  ideas: ArticleIdea[]
  storeName: string
  year: number
  /** Ten website that — hang rao chan lap thuong hieu trong tieu de doc tu day. */
  siteName: string
}): Promise<NameResult> {
  const { ideas, storeName, year, siteName } = input
  if (!ideas.length) return { named: [], rejected: [] }

  const parsed = await callModel(ideas, storeName, year)

  const byKey = new Map(ideas.map(i => [i.key, i]))
  const named: IdeaName[] = []
  const rejected: { key: string; reason: string }[] = []
  const seen = new Set<string>()

  for (const entry of parsed.names) {
    const idea = byKey.get(entry.key)
    // Khoa la nhan nhan dang cua mot y tuong CONG DA DUYET. Khoa la -> model tu nghi
    // ra mot bai khong ai kiem — bo han, khong co so tu dong.
    if (!idea) continue
    if (seen.has(entry.key)) continue
    seen.add(entry.key)

    const ctx: IdeaNameContext = {
      storeName,
      siteName,
      productTitles: idea.products.map(p => p.title),
      year,
      productCount: idea.products.length,
      mustNameStore: idea.template === 'best-in-store' || idea.template === 'best-for',
    }

    const titleProblem = findUnsafeIdea(entry.title, ctx)
    if (titleProblem) {
      rejected.push({ key: entry.key, reason: `tiêu đề — ${titleProblem}` })
      continue
    }
    const metaProblem = findUnsafeMetaTitle(entry.metaTitle, ctx)
    if (metaProblem) {
      rejected.push({ key: entry.key, reason: `metaTitle — ${metaProblem}` })
      continue
    }
    named.push({ key: entry.key, title: entry.title.trim(), metaTitle: entry.metaTitle.trim() })
  }

  return { named, rejected }
}
