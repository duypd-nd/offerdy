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
import {
  NHIP, THOI_LUONG_MAC_DINH,
  chonGocHook, demChu, giayUocTinh, kepThoiLuong, khungTheoThoiLuong, nganSachChu,
  type GocHookId, type KhungNhip, type NhipId,
} from '@/lib/tts/nhipVideo'

// Cho phép nơi gọi lấy cả phần thuần từ một cửa. Bản thân định nghĩa nằm ở
// `nhipVideo.ts` — client import thẳng từ đó để không kéo bộ định tuyến AI theo.
export * from '@/lib/tts/nhipVideo'

const NhipSchema = z.object({
  id: z.enum(['hook', 'problem', 'product', 'cta']),
  hienTrenMan: z.string().min(1).max(80),
  docLen: z.string().min(1).max(300),
})
/**
 * ⚠️ Quan sát 29/08, CHƯA giải thích được — đừng đọc thành kết luận.
 *
 * `groq/openai/gpt-oss-20b` trả `json_validate_failed` ở **4 trên 6** lượt gọi
 * việc này, mất ~3 giây rồi router mới rơi xuống Gemini (chạy được). Nghi
 * `.length(4)` ép `minItems`/`maxItems` làm mô hình vướng, nên đã thử nới thành
 * `.min(1).max(6)`: ra **1 đạt / 1 trượt**.
 *
 * Hai lượt thì không phân biệt được gì — cả schema chặt lẫn schema nới đều có
 * lúc đạt lúc trượt. Nên giữ schema CHẶT (nó đúng với thứ ta cần) và ghi lại
 * quan sát. Muốn kết luận thì phải chạy đủ mẫu ở cả hai bên, chưa ai làm.
 *
 * Không chặn gì: router tự rơi sang nhà khác, người dùng chỉ chờ thêm ~3 giây.
 */
const Schema = z.object({ nhip: z.array(NhipSchema).length(4) })

export type NhipViet = z.infer<typeof NhipSchema>

function prompt(
  deal: CaptionDealInput, khung: KhungNhip[], tongGiay: number, nhac?: LoiTuChoi[],
): string {
  const dong = khung.map(n =>
    `${n.vai} (${n.nhan}) — at most ${nganSachChu(n.giay)} words spoken.\n  ${n.brief}`
  ).join('\n\n')

  // Lượt hỏi lại: nói thẳng nhịp nào trượt và trượt vì gì. Gửi lại y nguyên
  // prompt cũ thì mô hình không có lý do gì để trả lời khác đi.
  const lanHai = nhac?.length
    ? `\n\nYOUR PREVIOUS ATTEMPT WAS REJECTED. Rewrite ALL four beats, and fix these:
${nhac.map(b => `- ${b.nhip}: ${b.ly}`).join('\n')}
The most common cause is writing a figure instead of a placeholder. If a price belongs in a line, the line must contain {price} or {was} — the literal characters, braces included. Writing "$29.95" or "31%" is always wrong, even when the figure looks right.
The second cause is the hook opening on the price when its brief asked for something else. If that is what you were told above, rewrite the hook to do exactly what its brief says and leave every placeholder out of it.
The third cause is a hook that is just the product name read aloud. The product name belongs in the PRODUCT beat and nowhere else.`
    : ''

  return `You are writing the spoken voiceover for a vertical short-form video (TikTok / Reels) about one product. A young American audience is watching with the sound on.

The finished video is ${tongGiay} seconds long. The four beats below must fill it — no more, no less.

PRODUCT — this is everything that is known. Do not add to it.
Title: ${deal.title}
Category: ${deal.categoryName ?? 'not specified'}
Sale price: use {price}
${deal.priceOrig ? 'Original price: use {was}' : 'No original price is known — never reference one.'}
Discount: use {discount} — it already carries the word "OFF" ("31% OFF", spoken "thirty-one percent off"), so never write "off" straight after it
Product number: use {code} — it already reads as "number 1178", so never write "number" or "item" straight before it
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
- The HOOK brief above is one of nine possible openings and it was chosen for you. Follow it exactly. Unless it names {price} or {was} itself, the hook must contain no price, no percentage and no placeholder at all — opening on the price is the default you must not fall back to.
- The hook must be about THIS product. A line that would work just as well for a different product in the same category is a failed hook, however catchy it reads.
- The word budget is the hard part. Count the words in docLen. Over budget means the voice runs past the cut and the video is wrong.
- Plain spoken English. Contractions are good. No em dashes, no "elevate", no "game-changer", no "let's dive in".
- Say nothing about shipping, stock, returns, warranty, or how long the price lasts. You do not know any of it.${lanHai}`
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
 * Nhịp HOOK có bám đúng góc được giao không — hàng rào **MỀM**.
 *
 * ⚠️ Cố ý tách khỏi `soatNhip`, và cố ý không cùng độ cứng. Bịa số là nói sai
 * sự thật nên phải chặn cứng. Còn mở đầu bằng giá trong khi được giao góc khác
 * chỉ là *lạc đề*: câu vẫn đúng, chỉ không phải thứ người vận hành vừa bấm nút
 * để đổi. Vứt cả nhịp HOOK vì lạc đề là lặp lại đúng lỗi đã trả giá ngày 29/08
 * (mất câu quan trọng nhất của video để đổi lấy một hàng rào).
 *
 * Nên nó chỉ có sức nặng ở **lượt đầu**: trượt thì hỏi lại kèm lý do; lượt hai
 * viết gì cũng nhận. Xem `nhan()` bên dưới.
 */
export function soatGocHook(n: NhipViet, goc: GocHookId, tieuDe = ''): string[] {
  if (n.id !== 'hook') return []
  const loi: string[] = []

  // Hai góc này ĐƯỢC giao nhiệm vụ nói số — chính brief của chúng đặt chỗ trống.
  if (goc !== 'price' && goc !== 'compare' && /\{(price|was|discount)\}/.test(`${n.docLen} ${n.hienTrenMan}`)) {
    loi.push(`góc "${goc}" mà hook vẫn mở bằng giá`)
  }

  // ⚠️ Hook = tên sản phẩm. Đo thật 29/08 trên deal #1471: **4 trên 9 góc** trả
  // về đúng cái tên ("EverTote Expandable Mama Tote Bag") làm lời đọc. Prompt đã
  // dặn, nhưng prompt thì phớt lờ được — và một câu mở là tên sản phẩm thì
  // người lướt không có lý do nào để dừng lại.
  //
  // Phép so là "nằm gọn trong nhau" chứ không phải đếm chữ trùng: hook hay và
  // đúng vẫn mượn vài chữ của tên hàng ("that tiny mama bag"), chỉ có bản chép
  // nguyên tên mới nằm gọn.
  const gon = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
  const t = gon(tieuDe)
  const d = gon(n.docLen)
  if (t && d && (t.includes(d) || d.includes(t))) {
    loi.push('hook chỉ là tên sản phẩm')
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
    // ⚠️ Hai chỗ trống mang sẵn một chữ mà mô hình hay viết lại lần nữa:
    //   {discount} -> "…percent off"      mô hình viết "{discount} off"
    //   {code}     -> "number one one…"   mô hình viết "number {code}"
    // Cả hai đều đã dặn trong prompt, và cả hai đều đã xảy ra khi chạy thật.
    // Giữ nguyên chữ hoa của lần đầu: dạng màn hình là "50% OFF", gộp bằng một
    // chuỗi thường sẽ âm thầm hạ nó xuống "50% off".
    .replace(/\b(off)\s+off\b/gi, '$1')
    .replace(/\b(number)\s+number\b/gi, '$1')
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
  return t
    .replace(/(\d+)\s*%/g, (_, n) => docPhanTramLen(Number(n)))
    // ⚠️ Mã giảm theo SỐ TIỀN cũng có: `offerText` thật của một shop là "$100 Off".
    // Không đổi thì máy đọc "dollar one hundred off". Đi qua `docGiaLen` để dùng
    // đúng bộ đọc giá của dự án, không tự tách số ở đây.
    .replace(/[$£€]\s?\d[\d.,]*/g, m => docGiaLen(m))
    .toLowerCase()
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
  /** Độ dài video người dùng khai, sau khi kẹp vào khoảng cho phép. */
  tongGiay: number
  /** Góc mở đầu đã dùng — giao diện in ra để người vận hành biết mình vừa được gì. */
  goc: GocHookId
  provider: string
  model: string
}

export async function generateVoiceover(
  deal: CaptionDealInput,
  tongGiayVao: number = THOI_LUONG_MAC_DINH,
  env: Record<string, string | undefined> = process.env,
  // Chỉ test mới truyền `kho` — cùng nếp với `generateStructured`. Không có nó
  // thì phép kiểm "hỏi lại một lần" phải gọi API thật, tức kết quả phụ thuộc
  // vào việc hôm đó mô hình có ngẫu nhiên bịa số hay không. Một phép kiểm như
  // vậy xanh hay đỏ đều không nói lên điều gì.
  kho?: Parameters<typeof generateStructured>[2],
  // Góc mở đầu. Nơi gọi (server action) chọn để còn TRÁNH được góc vừa dùng cho
  // chính deal này; không truyền thì chọn ngẫu nhiên ngay tại đây, vì một nơi
  // gọi quên truyền không được phép làm cả tính năng rơi về một góc duy nhất —
  // đó đúng là trạng thái vừa phải sửa.
  gocVao?: GocHookId,
): Promise<KetQuaLoiDoc> {
  const tongGiay = Math.round(kepThoiLuong(tongGiayVao))
  const goc = gocVao ?? chonGocHook(deal)
  const khung = khungTheoThoiLuong(tongGiay, goc)
  const coCoupon = !!deal.couponCode

  const goi = (nhac?: LoiTuChoi[]) => generateStructured({
    task: 'voiceover',
    schema: Schema,
    system: 'You write spoken voiceover for short affiliate product videos. You never invent a number, a statistic, or a claim the product title does not support. You count your words against the budget you are given.',
    prompt: prompt(deal, khung, tongGiay, nhac),
    maxTokens: 1200,
    metadata: { deal: deal.code, giay: tongGiay, lan: nhac ? 2 : 1 },
  }, env, kho)

  // Giữ theo `id` chứ không đẩy vào mảng: lượt hỏi lại chỉ vá đúng nhịp đã
  // trượt, và nhịp vá vào phải nằm lại đúng chỗ của nó trong phễu.
  const dat = new Map<NhipId, KetQuaLoiDoc['nhip'][number]>()
  let boQua: LoiTuChoi[] = []

  // `conMem` = còn được phép từ chối vì lỗi MỀM (lạc góc). Lượt hai thì hết
  // quyền đó: nhận bản viết ra chứ không để nhịp HOOK trống.
  const nhan = (data: z.infer<typeof Schema>, conMem: boolean) => {
    const truot: LoiTuChoi[] = []
    for (const dn of khung) {
      if (dat.has(dn.id)) continue
      const viet = data.nhip.find(n => n.id === dn.id)
      if (!viet) { truot.push({ nhip: dn.id, ly: 'mô hình không viết nhịp này' }); continue }
      const loi = [...soatNhip(viet, coCoupon), ...(conMem ? soatGocHook(viet, goc, deal.title) : [])]
      if (loi.length) { truot.push({ nhip: dn.id, ly: loi.join(' · ') }); continue }
      // ⚠️ Đếm chữ trên bản ĐÃ ĐIỀN, không phải bản còn chỗ trống. `{price}` là
      // một chữ trên giấy nhưng đọc lên là "eighty-nine ninety-five" — ba chữ.
      // Đếm bản chưa điền là ước lượng ngắn hơn thực tế đúng ở nhịp nói giá.
      const docLen = dienCho(viet.docLen, deal, 'doc')
      const soChu = demChu(docLen)
      dat.set(dn.id, {
        id: dn.id,
        vai: dn.vai,
        khung: dn.nhan,
        hienTrenMan: dienCho(viet.hienTrenMan, deal, 'man'),
        docLen,
        soChu,
        giayUoc: giayUocTinh(soChu),
        giayKhung: dn.giay,
      })
    }
    return truot
  }

  const r = await goi()
  boQua = nhan(r.data, true)

  // ── HỎI LẠI MỘT LẦN ──────────────────────────────────────────
  //
  // Bịa số là lỗi CỨNG và phải cứng: một con số sai đọc lên thành tiếng thì
  // người nghe không có cách nào đối chiếu. Nhưng loại xong rồi thôi thì hậu
  // quả lại sai — chạy thật trên production 29/08 mất nguyên nhịp **HOOK** vì
  // mô hình viết "$2..." thay cho `{price}`, tức mất câu quan trọng nhất của
  // video để đổi lấy một hàng rào đã làm đúng việc.
  //
  // Đường ra không phải nới hàng rào mà là **hỏi lại**, kèm đúng lý do vừa
  // trượt. Rẻ: bộ định tuyến đi nhà miễn phí trước, mất ~2 giây. Và chỉ hỏi
  // lại MỘT lần — hai mô hình cùng bịa ở cùng một chỗ thì đó là tín hiệu cần
  // nói ra, không phải thứ để lặp cho tới khi may mắn.
  let r2: Awaited<ReturnType<typeof goi>> | null = null
  if (boQua.length > 0) {
    r2 = await goi(boQua)
    boQua = nhan(r2.data, false)
  }

  const nhip = khung.map(k => dat.get(k.id)).filter((n): n is NonNullable<typeof n> => !!n)
  return { nhip, boQua, tongGiay, goc, provider: (r2 ?? r).provider, model: (r2 ?? r).model }
}
