/**
 * Lời đọc cho video ngắn — bốn nhịp HOOK / PROBLEM / PRODUCT / CTA.
 *
 * ── ⚠️ TỐC ĐỘ ĐỌC KHÔNG PHẢI HẰNG SỐ ───────────────────────────────
 *
 * Bản đầu của file này lấy "2,3 chữ/giây" từ **một** phép đo rồi nhân ra cả bốn
 * ngân sách. Đo lại bằng ba đoạn thật trong cùng một lần chạy thì lộ ra là sai:
 *
 *    2 chữ = 1,36s  ->  1,47 chữ/giây
 *    5 chữ = 2,04s  ->  2,45 chữ/giây
 *   18 chữ = 5,90s  ->  3,05 chữ/giây
 *
 * Mỗi đoạn có một khoản phí cố định ~0,79 giây (lấy hơi, ngữ điệu mở đầu) rồi
 * mới tới phần tỉ lệ với số chữ. Khớp tuyến tính qua ba điểm trên sai số dưới
 * 0,2 giây, trong khi mô hình phẳng lệch tới 40% ở đoạn ngắn.
 *
 * Hậu quả của mô hình phẳng không phải là một con số hơi lệch: nó ép ngân sách
 * nhịp PRODUCT xuống 18 chữ trong khi 8 giây thật sự chứa được 25 chữ, nên mô
 * hình viết đúng vẫn bị báo "vượt" đều đặn.
 *
 * ── VÀ VÌ SAO VƯỢT KHUNG KHÔNG PHẢI LÀ LỖI CỨNG ────────────────────
 *
 * Bản đầu loại hẳn nhịp nào vượt ngân sách. Chạy thật thì nó **vứt mất nhịp
 * HOOK** vì lố đúng một chữ — tức vứt câu quan trọng nhất của video để đổi lấy
 * 0,1 giây. Sai người sai việc: bịa số là vấn đề *sự thật* nên phải chặn cứng;
 * dài quá là vấn đề *tay nghề*, mà người dựng nhìn thấy được và tự cắt được —
 * và chính họ mới là người đặt clip vào cảnh, chứ mấy con số ở đây không phải
 * điểm cắt thật.
 *
 * Nên: dài quá thì **hiện lên kèm số giây ước tính**, không loại.
 *
 * ── AI VIẾT CHỮ, CODE ĐIỀN SỐ ──────────────────────────────────────
 *
 * Giữ nguyên nguyên tắc của bộ caption: mô hình đặt `{price}`, `{was}`,
 * `{discount}`, `{code}`, `{coupon}`; code thay bằng giá trị thật. Khác một
 * điểm: lời đọc cần **dạng đọc** ("fourteen ninety nine") chứ không phải dạng
 * viết ("$14.99") — xem `src/lib/tts/docSoLen.ts`.
 */
import { z } from 'zod'
import { generateStructured } from '@/lib/ai/router'
import { MONEY_RE, type CaptionDealInput } from '@/lib/ai/generateCaption'
import { docGiaLen, docMaLen, docPhanTramLen } from '@/lib/tts/docSoLen'
import { dealDiscountBadge } from '@/lib/dealDiscountLabel'

/**
 * Phí cố định mỗi đoạn, và phần tỉ lệ theo số chữ — khớp từ ba phép đo thật
 * trên Gemini TTS kèm chỉ dẫn đọc nhanh (29/08).
 */
export const GIAY_MO_DAU = 0.79
export const GIAY_MOI_CHU = 0.284

/** Ước tính độ dài tiếng của một câu, theo mô hình đã khớp. */
export function giayUocTinh(soChu: number): number {
  return soChu <= 0 ? 0 : GIAY_MO_DAU + GIAY_MOI_CHU * soChu
}

export const NHIP = [
  {
    id: 'hook',
    vai: 'HOOK',
    khung: '0–2 giây',
    giay: 2,
    // ⚠️ Không ghi cứng số chữ vào đây — ngân sách in ra từ `nganSachChu()` ngay
    // bên dưới trong prompt. Hai con số ở hai chỗ là chắc chắn lệch nhau, và bản
    // trước đã lệch đúng như vậy (brief nói 5, ngân sách tính ra 4).
    brief: 'Lead with the single most surprising concrete fact — usually the price. No greeting, no "check this out", no adjective before the number.',
  },
  {
    id: 'problem',
    vai: 'PROBLEM / CURIOSITY',
    khung: '2–7 giây',
    giay: 5,
    brief: 'Name one specific, physical annoyance with this category of product that the viewer would recognise. Do not name the product yet. Say only what the product title supports — never invent a statistic, a study, or what "most people" do.',
  },
  {
    id: 'product',
    vai: 'PRODUCT',
    khung: '7–15 giây',
    giay: 8,
    brief: 'Present the product as the answer. State a claim only if the product title states it, and attribute it to the seller ("the seller says…") rather than asserting it as fact. Put the price in here using the placeholders.',
  },
  {
    id: 'cta',
    vai: 'CTA mềm',
    khung: 'cuối video',
    giay: 4,
    brief: 'Soft close. No "buy now", no urgency you cannot back up — you do not know when this offer ends. Point at the product number and the bio link.',
  },
] as const

export type NhipId = typeof NHIP[number]['id']

/** Số chữ nhiều nhất mà một khung `giay` giây chứa được, làm tròn xuống. */
export function nganSachChu(giay: number): number {
  return Math.max(3, Math.floor((giay - GIAY_MO_DAU) / GIAY_MOI_CHU))
}

/** Đếm chữ như người đọc đếm — chỗ trống `{price}` tính là một chữ. */
export function demChu(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

const NhipSchema = z.object({
  id: z.enum(['hook', 'problem', 'product', 'cta']),
  hienTrenMan: z.string().min(1).max(80),
  docLen: z.string().min(1).max(300),
})
const Schema = z.object({ nhip: z.array(NhipSchema).length(4) })

export type NhipViet = z.infer<typeof NhipSchema>

function prompt(deal: CaptionDealInput): string {
  const dong = NHIP.map(n =>
    `${n.vai} (${n.khung}) — at most ${nganSachChu(n.giay)} words spoken.\n  ${n.brief}`
  ).join('\n\n')

  return `You are writing the spoken voiceover for a vertical short-form video (TikTok / Reels) about one product. A young American audience is watching with the sound on.

PRODUCT — this is everything that is known. Do not add to it.
Title: ${deal.title}
Category: ${deal.categoryName ?? 'not specified'}
Sale price: use {price}
${deal.priceOrig ? 'Original price: use {was}' : 'No original price is known — never reference one.'}
Discount: use {discount} — it already carries the word "OFF" ("31% OFF", spoken "thirty-one percent off"), so never write "off" straight after it
Product number: use {code}
${deal.couponCode
  ? 'Shop coupon: a working store-wide code exists. You MAY use {coupon} in the CTA beat only. It is store-wide, so never claim it applies to this product or stacks on the discount.'
  : 'Shop coupon: none. NEVER write {coupon}.'}

BEATS — write exactly these four, in this order:

${dong}

FOR EACH BEAT, RETURN TWO THINGS
- hienTrenMan: the on-screen caption. Fragment, not a sentence. Very short.
- docLen: the words actually spoken aloud.
They are not the same text. On-screen is what the eye catches in half a second; spoken is what the ear follows.

HARD RULES
- Never write a figure yourself — not a price, not a percentage, not a count. Use the placeholders. Code substitutes the real values from the database.
- The word budget is the hard part. Count the words in docLen. Over budget means the voice runs past the cut and the video is wrong.
- Plain spoken English. Contractions are good. No em dashes, no "elevate", no "game-changer", no "let's dive in".
- Say nothing about shipping, stock, returns, warranty, or how long the price lasts. You do not know any of it.`
}

export type LoiTuChoi = { nhip: NhipId; ly: string }

/**
 * Kiểm lại đầu ra, độc lập với prompt. Prompt có thể bị phớt lờ; kiểm thì không.
 *
 * Trả danh sách lý do từ chối, rỗng nghĩa là đạt.
 *
 * ⚠️ **Độ dài KHÔNG nằm ở đây.** Chỉ những thứ làm lời đọc *nói sai sự thật*
 * mới bị loại: số do mô hình tự viết, và mã giảm giá không tồn tại. Dài quá thì
 * người dựng nhìn thấy và tự cắt — loại nó đi là vứt cả một nhịp đúng nội dung.
 */
export function soatNhip(n: NhipViet, coCoupon: boolean): string[] {
  const loi: string[] = []
  const dinhNghia = NHIP.find(x => x.id === n.id)
  if (!dinhNghia) return [`nhịp lạ: ${n.id}`]

  for (const [ten, chu] of [['docLen', n.docLen], ['hienTrenMan', n.hienTrenMan]] as const) {
    const tien = chu.match(MONEY_RE)
    if (tien) loi.push(`${ten} tự viết số: "${tien[0].trim()}"`)
  }

  if (!coCoupon && /\{coupon\}/.test(n.docLen + n.hienTrenMan)) {
    loi.push('dùng {coupon} trong khi shop này không có mã')
  }
  // ⚠️ `{coupon}` chỉ được phép ở CTA. Đọc một mã giảm giá lên giữa đoạn giới
  // thiệu sản phẩm thì người nghe chưa có lý do gì để nhớ nó.
  if (n.id !== 'cta' && /\{coupon\}/.test(n.docLen + n.hienTrenMan)) {
    loi.push('{coupon} chỉ được đặt ở nhịp CTA')
  }
  return loi
}

/**
 * Thay chỗ trống bằng giá trị thật.
 *
 * `dang` quyết định dạng số: `'man'` cho chữ hiện trên màn hình ("$14.99"),
 * `'doc'` cho lời đọc ("fourteen ninety nine"). Cùng một nguồn dữ liệu, hai
 * cách trình bày — chứ không phải hai nguồn.
 */
export function dienCho(chu: string, deal: CaptionDealInput, dang: 'man' | 'doc'): string {
  const doc = dang === 'doc'
  // ⚠️ `dealDiscountBadge` trả `{main, sub}` chứ không trả chuỗi — nhét thẳng
  // vào chỗ trống là ra `[object Object]` giữa lời đọc. Đã mắc đúng vậy khi viết
  // file này, và test đầu tiên KHÔNG bắt được vì cả hai vế so sánh đều hỏng
  // giống nhau.
  const huy = dealDiscountBadge(deal)
  const giam = huy.sub ? `${huy.main} ${huy.sub}` : huy.main
  // ⚠️ Dạng đọc KHÔNG dùng ngoặc đơn. Caption viết "OFFERDY (5% Off)" thì mắt
  // đọc ra ngay, còn tai nghe thành "OFFERDY mở ngoặc năm phần trăm off". Cùng
  // một dữ liệu, hai cách trình bày — đúng nguyên tắc của cả file này.
  const maGiam = !deal.couponCode ? ''
    : !deal.couponOfferText ? deal.couponCode
      : doc ? `${deal.couponCode}, ${docUuDai(deal.couponOfferText)}`
        : `${deal.couponCode} (${deal.couponOfferText})`

  return chu
    .replace(/\{price\}/g, doc ? docGiaLen(deal.priceSale) : (deal.priceSale ?? ''))
    .replace(/\{was\}/g, doc ? docGiaLen(deal.priceOrig) : (deal.priceOrig ?? ''))
    // ⚠️ `{discount}` có thể là "50% OFF" hoặc "Save $15.00" tuỳ `discountByAmount`
    // — nên phải đi qua `dealDiscountBadge`, đúng chỗ mọi nơi khác đang dùng.
    //
    // Dạng đọc lấy con số TỪ CHÍNH cái huy hiệu đó rồi mới chuyển sang chữ, chứ
    // không tự tính lại mức giảm. Để mộc thì máy đọc "Save $15.00" thành "save
    // dollar fifteen point zero zero"; tự tính lại thì thành phép đọc giá thứ hai.
    .replace(/\{discount\}/g, doc ? docGiamLen(huy, deal.discount) : giam)
    .replace(/\{code\}/g, doc ? `number ${docMaLen(deal.code)}` : `#${deal.code}`)
    .replace(/\{coupon\}/g, maGiam)
    .replace(/\{title\}/g, deal.title)
    // ⚠️ Lưới an toàn cho "off off". `{discount}` đã mang sẵn chữ OFF, nhưng mô
    // hình vẫn viết "{discount} off today" — chạy thật 29/08 ra "thirty-one
    // percent off off today". Prompt đã dặn, nhưng prompt thì phớt lờ được, và
    // một chữ lặp trong lời đọc thì đến lúc nghe mới phát hiện ra.
    // Giữ nguyên chữ hoa của lần đầu: dạng màn hình là "50% OFF", gộp bằng một
    // chuỗi thường sẽ âm thầm hạ nó xuống "50% off".
    .replace(/\b(off)\s+off\b/gi, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?])/g, '$1')
    .trim()
}

/**
 * `offerText` của mã giảm ("5% Off") ở dạng đọc lên.
 *
 * Đổi phần trăm sang chữ bằng chính `docPhanTramLen` — không viết bộ đọc số
 * thứ hai cho riêng ô này.
 */
function docUuDai(t: string): string {
  return t.replace(/(\d+)\s*%/g, (_, n) => docPhanTramLen(Number(n))).toLowerCase()
}

/**
 * Mức giảm ở dạng đọc lên.
 *
 * `huy.sub === 'OFF'` là mốc phân biệt hai kiểu giảm — đúng cái mốc mà
 * `dealDiscountBadge` tự đặt ra, chứ không đọc lại `discountByAmount` (trường
 * đó bật mà thiếu giá gốc thì huy hiệu vẫn rơi về phần trăm, và lời đọc phải
 * theo huy hiệu, không theo cờ).
 */
function docGiamLen(huy: { main: string; sub: string | null }, phanTram: number): string {
  if (huy.sub) return `${docPhanTramLen(phanTram)} off`
  const so = huy.main.replace(/^Save\s*/i, '')
  return `save ${docGiaLen(so)}`
}

export type KetQuaLoiDoc = {
  nhip: {
    id: NhipId; vai: string; khung: string
    hienTrenMan: string; docLen: string
    soChu: number
    /** Ước tính theo mô hình đã khớp — thay bằng số đo thật sau khi đọc. */
    giayUoc: number
    /** Khung định trước, để giao diện in "≈6,5s / 8s". */
    giayKhung: number
  }[]
  boQua: LoiTuChoi[]
  provider: string
  model: string
}

export async function generateVoiceover(
  deal: CaptionDealInput,
  env: Record<string, string | undefined> = process.env,
): Promise<KetQuaLoiDoc> {
  const r = await generateStructured({
    task: 'voiceover',
    schema: Schema,
    system: 'You write spoken voiceover for short affiliate product videos. You never invent a number, a statistic, or a claim the product title does not support. You count your words against the budget you are given.',
    prompt: prompt(deal),
    maxTokens: 1200,
    metadata: { deal: deal.code },
  }, env)

  const coCoupon = !!deal.couponCode
  const boQua: LoiTuChoi[] = []
  const nhip: KetQuaLoiDoc['nhip'] = []

  for (const dn of NHIP) {
    const viet = r.data.nhip.find(n => n.id === dn.id)
    if (!viet) { boQua.push({ nhip: dn.id, ly: 'mô hình không viết nhịp này' }); continue }
    const loi = soatNhip(viet, coCoupon)
    if (loi.length) { boQua.push({ nhip: dn.id, ly: loi.join(' · ') }); continue }
    // ⚠️ Đếm chữ trên bản ĐÃ ĐIỀN, không phải bản còn chỗ trống. `{price}` là
    // một chữ trên giấy nhưng đọc lên là "eighty-nine ninety-five" — ba chữ.
    // Đếm bản chưa điền là ước lượng ngắn hơn thực tế đúng ở nhịp nói giá.
    const docLen = dienCho(viet.docLen, deal, 'doc')
    const soChu = demChu(docLen)
    nhip.push({
      id: dn.id,
      vai: dn.vai,
      khung: dn.khung,
      hienTrenMan: dienCho(viet.hienTrenMan, deal, 'man'),
      docLen,
      soChu,
      giayUoc: giayUocTinh(soChu),
      giayKhung: dn.giay,
    })
  }

  return { nhip, boQua, provider: r.provider, model: r.model }
}
