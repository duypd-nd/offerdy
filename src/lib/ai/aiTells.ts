/**
 * Dau hieu van do MAY viet — dung tren dau ra cua model, TRUOC khi tao ban nhap.
 *
 * Nguon: [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing),
 * loc lay phan ap duoc cho mot bai so sanh hang cua mot shop (bo phan wikitext, DOI,
 * category, edit summary — khong lien quan).
 *
 * ⚠️ **Chia CUNG/MEM khong theo do "xau" ma theo do CHAC CHAN.**
 *
 * Tang A la **chuoi co dinh khong co cach dung hop le nao o day**: `boasts`,
 * `stands as a testament to`, `it's not just X, it's Y`, rac cua chatbot, Markdown lot
 * vao HTML. So khop chuoi neo chat, bao dong gia gan bang khong — nen chan cung duoc,
 * y het cach `"450%"` bi chan.
 *
 * Tang B la thu **CO** cach dung hop le: `, ensuring …` doi khi la mot menh de that,
 * `premium` doi khi la chu cua chinh shop. Chan cung nhung thu nay la tu tay dung mot
 * bo kiem hay bao dong gia — ma mot danh sach lan nao cung co rac la mot danh sach
 * khong ai doc nua.
 *
 * ⚠️ **Ba cai bay da tra gia de biet, dung go ra:**
 *
 * 1. **`comparisonRows` BAT BUOC dung dau `—`** cho o khong co nguon (ABSOLUTE RULE 6
 *    cua chinh prompt). Quet dau gach tren toan bo chu cua bai se chan MOI bai co mot o
 *    trong — tuc gan nhu moi bai. Nen `dashText` va `wordText` la HAI dau vao rieng.
 * 2. **Dau `—` do CODE chen khong bi tinh.** `priceNote()`, hop ma giam, disclaimer deu
 *    la cau co dinh cua site. Ham nay chay tren dau ra cua model **truoc** khi render
 *    nen tu dung — nhung dung bao gio dem no chay sau render.
 * 3. **KHONG cam dau nhay cong `'`.** Trang Wikipedia co liet ke, nhung luat van phong
 *    cua chinh ta YEU CAU viet tat (`doesn't`, `it's`). Cam no la phat dung cai vua bao
 *    model lam.
 */

/**
 * Tang A — cum co dinh, chan CUNG.
 *
 * Moi dong la mot cum bi cam, so khop khong phan biet hoa thuong va co ranh gioi tu.
 * Danh sach nay in NGUYEN VAN vao system prompt: model phai duoc thay dung cai no bi
 * cham diem, khong phai mot ban dien giai.
 */
export const BANNED_PHRASES: readonly string[] = [
  // Thoi phong tam quan trong
  'boasts', 'stands as', 'serves as a', 'is a testament to', 'is a reminder of',
  'underscores', 'underscoring', 'highlights its importance', 'showcases', 'showcasing',
  'vibrant', 'rich tapestry', 'tapestry', 'intricate', 'intricacies', 'interplay',
  'meticulous', 'meticulously', 'pivotal', 'enduring', 'fostering', 'garnered',
  'nestled', 'in the heart of', 'groundbreaking', 'renowned', 'a plethora of',
  'diverse array', 'commitment to', 'valuable insights', 'indelible mark',
  'deeply rooted', 'evolving landscape', 'focal point', 'setting the stage for',
  'marks a shift', 'key turning point',
  // Van dem kieu listicle va quang cao
  'game-changer', 'game changer', 'must-have', 'top-notch', 'look no further',
  'elevate', 'elevates', 'elevating', 'seamless', 'seamlessly', 'unleash', 'delve',
  'dive in', 'in conclusion', 'at the end of the day', 'there you have it',
  'the perfect blend of', "in today's", 'when it comes to', "it's worth noting",
  // Quyen uy mo ho — bai nay co DUNG MOT nguon: trang san pham cua shop
  'industry reports', 'observers have cited', 'experts argue', 'some critics argue',
  'several publications', 'studies show',
  // Ket bai cong thuc
  'despite these challenges', 'future outlook', 'final thoughts', 'key takeaways',
  // Giong tro ly, khong phai giong mot trang web
  'as an ai', 'my knowledge cutoff', 'i hope this helps', 'let me know if',
  "i'm not aware of",
]

/** Rac ky thuat cua tung nha model — khong bao gio la chu that. */
export const BANNED_ARTEFACTS: readonly string[] = [
  'contentreference', 'oai_citation', 'oaicite', 'turn0search', 'attributableindex',
  'grok_card', 'grok_render_citation_card_json', '[cite:', 'start_span',
  ':::writing', 'attached_file', 'ppl-ai-file-upload',
]

/** Tang B — co cach dung hop le, nen chi CANH BAO. */
const SOFT_WORDS: readonly string[] = [
  'crucial', 'essential', 'comprehensive', 'versatile', 'robust', 'cutting-edge',
  'state-of-the-art', 'enhance', 'enhances', 'enhancing',
]

/** Tinh tu khang dinh ve mot vat khong ai o day cam vao tay. */
const SOFT_UNSUPPORTED: readonly string[] = [
  'premium', 'durable', 'high-quality', 'well-made', 'reliable',
]

/** Duoi phan tu hien tai — dau hieu "phan tich hoi hot" ma trang Wikipedia neu ten. */
const SOFT_PARTICIPLE: readonly string[] = [
  ', ensuring', ', highlighting', ', reflecting', ', emphasizing', ', contributing to',
  ', encompassing', ', allowing for',
]

/** Cum dan nguon — dung mot lan la kỷ luat, dung sau lan la nghe nhu cai nhau voi nguon. */
const ATTRIBUTION = /\b(the shop says|described by the shop|what the shop calls|according to the shop|the shop describes)\b/gi

const NEGATIVE_PARALLEL: readonly { re: RegExp; label: string }[] = [
  { re: /\bnot only\b[^.!?]{0,90}\bbut\b/i, label: '"not only … but …"' },
  { re: /\b(it'?s|this is|that'?s|these are)\s+not\s+just\b/i, label: '"it\'s not just X, it\'s Y"' },
  { re: /\b(isn'?t|aren'?t)\s+just\b/i, label: '"isn\'t just X, it\'s Y"' },
  { re: /\bdespite (its|their|these)\b[^.!?]{0,80}\b(challenge|challenges|hurdle|hurdles|limitation|limitations)\b/i, label: '"Despite its …, faces challenges"' },
  { re: /\bwhether you'?re\b[^.!?]{0,60}\bor\b/i, label: '"whether you\'re X or Y"' },
]

/** Emoji va ky hieu trang tri — the `coverEmoji` la mot truong rieng, than bai thi khong. */
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/u

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * So khop mot cum co dinh, co ranh gioi tu o hai dau khi hai dau la chu/so.
 *
 * Can ranh gioi that: khong co no thi `elevate` khop trong `elevated railway` va
 * `delve` khop trong... khong gi ca, nhung `renowned` se khop trong ten rieng. Con
 * `[cite:` thi khong co ranh gioi tu nao ca, nen chi neo dau nao la chu/so.
 */
function phraseRe(phrase: string): RegExp {
  const left = /[a-z0-9]/i.test(phrase[0]) ? '\\b' : ''
  const right = /[a-z0-9]/i.test(phrase.at(-1)!) ? '\\b' : ''
  return new RegExp(`${left}${escapeRe(phrase)}${right}`, 'i')
}

function around(text: string, index: number, len: number): string {
  return text
    .slice(Math.max(0, index - 45), index + len + 45)
    .replace(/\s+/g, ' ')
    .trim()
}

export type AiTellInput = {
  /**
   * Chu cua model, KHONG gom `comparisonRows`. Dung cho phep quet dau `—` va Markdown.
   * Xem bay so 1 o dau file.
   */
  dashText: string
  /** Chu de soi tu ngu — gom duoc ca `comparisonRows` vi cum bi cam khong nam trong o bang. */
  wordText: string
  /** Rieng than bai: dem `<strong>`, dem doan mo bang the san pham, soi emoji/Markdown. */
  contentHtml: string
}

export type AiTells = { hard: string[]; soft: string[] }

/** Toi da bao nhieu doan duoc phep mo dau bang mot the ten san pham. */
export const MAX_PRODUCT_LED_PARAGRAPHS = 2
/** Toi da bao nhieu `<strong>` trong ca bai. */
const MAX_STRONG = 3
/** Toi da bao nhieu lan lap mot cum dan nguon. */
const MAX_ATTRIBUTION = 3

/**
 * ⚠️ Nan dau nhay cong ve dau nhay thang TRUOC khi so khop.
 *
 * Luat van phong cua chinh ta yeu cau viet tat (`doesn't`, `it's`), va model hay go dau
 * nhay cong. Khong nan thi `"in today's"` va `"it's worth noting"` trong danh sach cam
 * khong bao gio khop — mot bo cam im lang la mot bo cam khong ton tai.
 */
function flatten(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
}

export function findAiTells(input: AiTellInput): AiTells {
  const hard: string[] = []
  const soft: string[] = []
  const dashText = flatten(input.dashText)
  const wordText = flatten(input.wordText)
  const contentHtml = flatten(input.contentHtml)

  // ── Tang A: cum co dinh ──
  for (const phrase of BANNED_PHRASES) {
    const m = wordText.match(phraseRe(phrase))
    if (m?.index !== undefined) {
      hard.push(`dùng cụm bị cấm "${phrase}" (…${around(wordText, m.index, m[0].length)}…)`)
    }
  }
  for (const { re, label } of NEGATIVE_PARALLEL) {
    const m = wordText.match(re)
    if (m?.index !== undefined) {
      hard.push(`đối lập giả kiểu ${label} (…${around(wordText, m.index, m[0].length)}…)`)
    }
  }
  for (const artefact of BANNED_ARTEFACTS) {
    const m = wordText.toLowerCase().indexOf(artefact)
    if (m >= 0) hard.push(`rác kỹ thuật của chatbot lọt vào bài: "${artefact}"`)
  }

  // ── Tang A: dau cau va dinh dang ──
  //
  // ⚠️ `dashText` KHONG chua `comparisonRows`: o bang khong co nguon PHAI ghi `—`.
  const dash = dashText.indexOf('—')
  if (dash >= 0) {
    hard.push(`dùng dấu gạch ngang dài "—" (…${around(dashText, dash, 1)}…) — dùng dấu phẩy, dấu chấm hoặc dấu hai chấm`)
  }
  const emoji = contentHtml.match(EMOJI)
  if (emoji?.index !== undefined) {
    hard.push(`emoji "${emoji[0]}" trong thân bài — coverEmoji là trường riêng`)
  }
  // Markdown lot vao HTML se hien NGUYEN DANG cho nguoi doc.
  if (/\*\*[^*\n]+\*\*/.test(contentHtml)) hard.push('viết Markdown `**đậm**` trong HTML — nó sẽ hiện nguyên dấu sao cho người đọc')
  if (/(^|\n)\s*#{1,6}\s/.test(contentHtml)) hard.push('viết Markdown `## tiêu đề` trong HTML — dùng <h2>')
  if (/(^|\n)\s*[-*]\s+\S/.test(contentHtml)) hard.push('viết Markdown `- gạch đầu dòng` trong HTML — dùng <ul><li>')

  const strong = (contentHtml.match(/<(strong|b)\b/gi) ?? []).length
  if (strong > MAX_STRONG) {
    hard.push(`${strong} thẻ in đậm trong một bài (tối đa ${MAX_STRONG}) — bôi đậm máy móc là dấu hiệu văn máy`)
  }

  /**
   * ⚠️ Doan mo dau bang the ten san pham — ban DO DUOC CHINH XAC cua tat lon nhat.
   *
   * Bai PoshRug that co 12/12 doan bat dau bang mot chuoi marketing muoi bon tu. Do
   * duoc chinh xac vi ten san pham la mot THE chu khong phai chu: khong can doan.
   */
  //
  // ⚠️ Phai bo cac the KHOI dung dau doan truoc khi xet. `[IMAGE:n]` va `[CTA:n]` dinh
  // dau doan bi `liftImageTokens`/`liftTrailingCtas` KEO RA KHOI `<p>` luc render, nen
  // doan van nguoi doc thay van bat dau bang ten san pham. Ban dau cua phep dem nay bo
  // sot dung cho do: bai PoshRug that co 12/16 doan dang `[IMAGE:n] [PRODUCT:n] …` va
  // no chi dem duoc 1.
  const LEADING_BLOCK = /^(?:\s*\[(?:IMAGE|CTA|CTABLOCK):\d+\])*\s*/
  const paragraphs = [...contentHtml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m => m[1])
  const led = paragraphs.filter(p => /^\[PRODUCT:\d+(\|[a-z]+)?\]/i.test(p.replace(LEADING_BLOCK, ''))).length
  if (led > MAX_PRODUCT_LED_PARAGRAPHS) {
    hard.push(
      `${led}/${paragraphs.length} đoạn mở đầu bằng tên sản phẩm (tối đa ${MAX_PRODUCT_LED_PARAGRAPHS}) — ` +
      'đọc như một bảng tính đổ vào câu văn'
    )
  }

  // ── Tang B: canh bao mem ──
  for (const word of [...SOFT_WORDS, ...SOFT_UNSUPPORTED, ...SOFT_PARTICIPLE]) {
    const m = wordText.match(phraseRe(word))
    if (m?.index !== undefined) {
      const why = SOFT_UNSUPPORTED.includes(word)
        ? 'khẳng định về một vật không ai ở đây cầm vào tay — có trong mô tả của shop thì phải dẫn nguồn'
        : 'từ hay gặp trong văn máy'
      soft.push(`"${word}" — ${why} (…${around(wordText, m.index, m[0].length)}…)`)
    }
  }
  if (/(^|\n|>)\s*Additionally,/.test(wordText)) {
    soft.push('câu mở đầu bằng "Additionally," — nối câu kiểu máy')
  }

  const attributions = (wordText.match(ATTRIBUTION) ?? []).length
  if (attributions > MAX_ATTRIBUTION) {
    soft.push(
      `${attributions} lần lặp cụm dẫn nguồn shop (tối đa ${MAX_ATTRIBUTION}) — ` +
      'dẫn nguồn một lần cho cả cụm khẳng định, đừng dẫn từng câu'
    )
  }

  // `<h2>` viet Title Case. MEM chu khong cung: mot tieu de chua `VG10 Steel Knife
  // Series` viet hoa hoan toan hop le, may khong quyet duoc.
  for (const m of contentHtml.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)) {
    const text = m[1].replace(/<[^>]*>/g, ' ').trim()
    const long = text.split(/\s+/).filter(w => w.length >= 4)
    if (long.length >= 3 && long.every(w => /^[A-Z]/.test(w))) {
      soft.push(`tiêu đề mục viết Title Case: "${text}" — trang này viết tiêu đề kiểu câu thường`)
    }
  }

  return { hard, soft }
}
