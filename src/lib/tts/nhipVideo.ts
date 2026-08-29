/**
 * Bốn nhịp của một video ngắn, và phép chia thời gian giữa chúng.
 *
 * ── VÌ SAO TÁCH KHỎI `generateVoiceover.ts` ────────────────────────
 *
 * Ô nhập độ dài video nằm trong một component `'use client'`, và nó cần
 * `canhBaoThoiLuong` cùng mấy hằng số ở đây. Nếu nó import từ
 * `generateVoiceover.ts` thì kéo theo cả bộ định tuyến AI (`generateStructured`,
 * các adapter nhà cung cấp, zod) vào gói gửi xuống trình duyệt — cùng đúng lý
 * do đã tách `giongNoi.ts` ra khỏi `geminiVoice.ts`.
 *
 * Ở đây không có gì ngoài số học thuần.
 */
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

// ── GÓC MỞ ĐẦU ────────────────────────────────────────────────
//
// ⚠️ Bản trước ghi CỨNG một hướng vào brief nhịp HOOK: "Lead with the single
// most surprising concrete fact. That is usually the price". Hậu quả đo được
// ngày 29/08: người vận hành bấm **Viết lại lời ba lần cho cùng một deal, cả ba
// lần câu đầu đều là giá** ("Just $89.95"). Đó không phải mô hình bướng — prompt
// chỉ cho nó đúng một hướng thì viết lại bao nhiêu lần cũng ra một thứ.
//
// Nên góc mở đầu tách hẳn thành danh sách, và **code chọn góc, không phải mô
// hình**. Để mô hình tự chọn thì nó lại rơi về hướng dễ nhất — cùng cái bẫy vừa
// thoát ra, chỉ khác chỗ đặt.
//
// 📌 Danh sách này là bản mở rộng của `CAPTION_ANGLES` trong `generateCaption.ts`
// (price / problem / whofor / compare / question) — cùng từ vựng, cùng cách đặt
// tên, để hai nơi còn so được với nhau. Video thêm bốn góc mà caption chữ không
// có: cảnh dùng thật, sai lầm hay mắc, thứ đang thay thế, và chặn nghi ngờ.
//
// ⚠️ Mỗi brief phải CẤM được cái chung chung. Một câu mở kiểu "Tired of clutter?"
// đặt vào 400 deal nào cũng vừa, tức nó không nói gì về sản phẩm này. Vì vậy
// brief nào cũng buộc gọi tên đúng vật và đúng cảnh dùng.

// ⚠️ Câu cuối là bản SỬA sau một phép đo. Bản đầu viết "Name the concrete object
// or the concrete situation", và chạy thật 9 góc trên deal #1471 thì **4 góc trả
// về đúng cái tên sản phẩm** làm lời đọc ("EverTote Expandable Mama Tote Bag").
// Mô hình đọc "name the object" thành "đọc tên sản phẩm lên". Nói cụ thể mà
// không nói tên là hai việc khác nhau, và phải viết ra cả hai vế.
const HOOK_CHUNG = 'Under two seconds. No greeting, no "check this out", no adjective piled in front. The PRODUCT beat is where the product gets named, so the hook must never be the product name and must never read like a product title. Be specific about the situation instead: if this line could be swapped onto a different product in the same category, it has failed.'

export const GOC_HOOK = [
  {
    id: 'price',
    nhan: 'Giá sốc',
    hop: 'khi mức giảm lớn',
    // ⚠️ Đây là câu MỜI GỌI bịa số: mô hình được bảo mở đầu bằng một con số mà
    // nó lại không được cho biết con số đó. Chạy thật 29/08 trên production, nó
    // viết "$2…" vào `hienTrenMan` và cả nhịp HOOK bị loại. Nên phải chỉ đúng
    // chỗ trống ngay trong câu bảo nó nói giá.
    brief: 'Lead with the number and nothing in front of it. The price is written {price} — exactly those characters, never a digit, never a currency symbol. Then one short clause naming what that number buys.',
  },
  {
    id: 'problem',
    nhan: 'Giải quyết vấn đề',
    hop: 'đồ công năng',
    brief: 'Open on one specific physical annoyance this exact kind of product answers — the thing that goes wrong, in the moment it goes wrong. Do not name the product. Do not mention price in this beat.',
  },
  {
    id: 'whofor',
    nhan: 'Ai nên mua / ai đừng',
    hop: 'hàng giá cao',
    brief: 'Say who should skip this before saying who it suits. The exclusion must be genuine and specific to this product, and must follow from what the title actually states. Do not mention price in this beat.',
  },
  {
    id: 'question',
    nhan: 'Câu hỏi thật',
    hop: 'mọi loại',
    brief: 'Ask one question the target viewer would genuinely answer yes to, about their own situation, not about the product. Not rhetorical filler. Do not mention price in this beat.',
  },
  {
    id: 'usecase',
    nhan: 'Cảnh dùng thật',
    hop: 'đồ mang theo người',
    brief: 'Drop the viewer into one concrete moment where this product is being used: where they are, what is in their hands, what time of day. One scene, not a list. Do not name the product. Do not mention price in this beat.',
  },
  {
    id: 'mistake',
    nhan: 'Sai lầm hay mắc',
    hop: 'đồ mua theo thói quen',
    brief: 'Name the thing people habitually get wrong when buying or using this kind of product. State it as an observation, never as a study, a statistic, or what "most people" do — you have no data for any of that. Do not mention price in this beat.',
  },
  {
    id: 'replace',
    nhan: 'Thay thứ đang dùng',
    hop: 'đồ thay đồ cũ',
    brief: 'Point at the older, clumsier thing the viewer uses right now for this job, and what is irritating about it. Never name a competing brand and never claim this product beats it. Do not mention price in this beat.',
  },
  {
    id: 'objection',
    nhan: 'Chặn nghi ngờ',
    hop: 'loại hay bị chê',
    brief: 'Say out loud the doubt a sceptical viewer already has about this kind of product, in their own words, before answering it. Do not promise the doubt is unfounded — answer only with what the title supports. Do not mention price in this beat.',
  },
  {
    id: 'compare',
    nhan: 'Hai con số',
    hop: 'cần có giá gốc',
    // ⚠️ Chỉ so hai con số CÓ THẬT trong tay: giá gốc và giá hiện tại. Bản
    // caption từng bảo "đặt giá cạnh mặt bằng của loại hàng này" và mô hình liền
    // phán về giá thị trường — thứ nó không có dữ liệu để nói.
    brief: 'Put the two known numbers next to each other: {was} then {price}, those exact characters. Say nothing about what the category "usually" costs, what other shops charge, or any competing product.',
  },
] as const

export type GocHookId = typeof GOC_HOOK[number]['id']

/**
 * Góc nào DÙNG ĐƯỢC cho deal này — lọc theo dữ liệu thật đang có.
 *
 * Chỉ hai góc có điều kiện, và cả hai đều là điều kiện về **số liệu có tồn tại
 * hay không**: `compare` cần giá gốc (không có thì lấy đâu ra hai con số),
 * `price` cần giá bán. Bảy góc còn lại chỉ cần cái tên sản phẩm nên deal nào
 * cũng dùng được — đó chính là thứ làm cho nút *Viết lại lời* có nghĩa.
 */
export function gocKhaDung(deal: { priceSale?: string | null; priceOrig?: string | null }): GocHookId[] {
  return GOC_HOOK
    .filter(g => (g.id === 'compare' ? !!deal.priceOrig : g.id === 'price' ? !!deal.priceSale : true))
    .map(g => g.id)
}

/**
 * Chọn góc mở đầu, tránh những góc vừa dùng cho chính deal này.
 *
 * ⚠️ `tranh` mới là thứ chữa đúng cái người vận hành gặp: bấm *Viết lại lời* mà
 * vẫn ra kiểu mở đầu y hệt thì nút đó vô dụng. Ngẫu nhiên thuần KHÔNG đủ — chín
 * góc thì hai lần liên tiếp vẫn trùng nhau khoảng 11% số lần.
 *
 * Hết góc để tránh thì quay vòng lại từ đầu chứ không trả rỗng: người dùng bấm
 * đến lần thứ mười vẫn phải có lời đọc.
 */
export function chonGocHook(
  deal: { priceSale?: string | null; priceOrig?: string | null },
  tranh: readonly string[] = [],
  rand: () => number = Math.random,
): GocHookId {
  const duoc = gocKhaDung(deal)
  const con = duoc.filter(g => !tranh.includes(g))
  const tu = con.length ? con : duoc
  // ⚠️ Kẹp chỉ số: `rand()` trả đúng 1 (hoặc một cài đặt trong test trả 1) thì
  // `tu[tu.length]` là `undefined` và cả nhịp HOOK mất brief mà không ai báo.
  return tu[Math.min(tu.length - 1, Math.floor(rand() * tu.length))]
}

/** Nhãn tiếng Việt của một góc, cho giao diện admin. */
export function nhanGoc(goc: string): string {
  return GOC_HOOK.find(g => g.id === goc)?.nhan ?? goc
}

export const NHIP = [
  {
    id: 'hook',
    vai: 'HOOK',
    // ⚠️ Không ghi cứng số chữ vào đây — ngân sách in ra từ `nganSachChu()` ngay
    // bên dưới trong prompt. Hai con số ở hai chỗ là chắc chắn lệch nhau, và bản
    // trước đã lệch đúng như vậy (brief nói 5, ngân sách tính ra 4).
    // ⚠️ Brief THẬT của nhịp này do GÓC quyết định — xem `GOC_HOOK` ở trên và
    // tham số `goc` của `khungTheoThoiLuong`. Chuỗi dưới đây chỉ là đường lùi
    // khi không ai truyền góc vào, và nó cố tình KHÔNG nhắc tới giá: chính câu
    // "usually the price" của bản trước đã khoá cứng mọi lần viết lại vào một
    // hướng duy nhất.
    brief: `${HOOK_CHUNG} Lead with the single most surprising concrete thing about this product.`,
  },
  {
    id: 'problem',
    vai: 'PROBLEM / CURIOSITY',
    brief: 'Name one specific, physical annoyance with this category of product that the viewer would recognise. Do not name the product yet. Say only what the product title supports — never invent a statistic, a study, or what "most people" do.',
  },
  {
    id: 'product',
    vai: 'PRODUCT',
    brief: 'Present the product as the answer. State a claim only if the product title states it, and attribute it to the seller ("the seller says…") rather than asserting it as fact. Put the price in here using the placeholders.',
  },
  {
    id: 'cta',
    vai: 'CTA mềm',
    brief: 'Soft close. No "buy now", no urgency you cannot back up — you do not know when this offer ends. Point at the product number and the bio link.',
  },
] as const

export type NhipId = typeof NHIP[number]['id']

/** Số chữ nhiều nhất mà một khung `giay` giây chứa được, làm tròn xuống. */
export function nganSachChu(giay: number): number {
  return Math.max(3, Math.floor((giay - GIAY_MO_DAU) / GIAY_MOI_CHU))
}

// ── Chia khung theo độ dài video thật ──────────────────────────
//
// Bản đầu ghi cứng 0–2 / 2–7 / 7–15 giây. Video 30 giây thì cả bốn khung sai
// hết, và lời đọc hết trước khi video hết. Nay người dùng khai độ dài thật.
//
// ⚠️ **HOOK không giãn ra theo video.** Người xem quyết định lướt tiếp trong
// khoảng hai giây đầu, bất kể video dài bao nhiêu — một "hook" 9 giây không còn
// là hook. CTA cũng vậy: nói lâu hơn không làm người ta nhớ mã hơn. Nên hai
// nhịp đó có TRẦN, còn PROBLEM và PRODUCT hút phần dôi ra.
//
// 📌 Kiểm chứng công thức: đặt T = 19s thì nó trả về 2,0 / 5,0 / 8,2 / 3,8 —
// gần đúng bằng khung 2 / 5 / 8 / 4 mà bản đầu thiết kế bằng tay. Nghĩa là đây
// không phải một công thức mới nghĩ ra, mà là cách viết tổng quát của thứ đã có.

const TRAN_HOOK = 2
const TRAN_CTA = 4
/** Khi video quá ngắn, HOOK/CTA co lại theo tỉ lệ thay vì ăn hết thời lượng. */
const TI_LE_HOOK = 0.15
const TI_LE_CTA = 0.2
/** Phần dôi ra chia cho PROBLEM và PRODUCT. */
const TI_LE_PROBLEM = 0.38

export const THOI_LUONG_MAC_DINH = 15
export const THOI_LUONG_TOI_THIEU = 5
export const THOI_LUONG_TOI_DA = 600

export type KhungNhip = {
  id: NhipId
  vai: string
  brief: string
  batDau: number
  giay: number
  /** Nhãn cho giao diện, ví dụ "2–7,2s". */
  nhan: string
}

/**
 * Định dạng giây cho giao diện tiếng Việt: dấu phẩy thập phân, bỏ ".0" thừa.
 *
 * ⚠️ Export để giao diện dùng CHUNG hàm này. In thẳng số thực ra màn hình cho
 * ra "9.120000000000001s" — đã hiện đúng như vậy khi đo video 30 giây.
 */
export function fmtGiay(x: number): string {
  const r = Math.round(x * 10) / 10
  return (Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ',')) + 's'
}

/**
 * Kẹp độ dài vào khoảng dùng được.
 *
 * ⚠️ `NaN` PHẢI chặn riêng: `Math.max(5, NaN)` vẫn ra `NaN`, và một `NaN` lọt
 * vào đây thì cả bốn khung thành `NaN`, giao diện hiện `NaNs`, và prompt gửi
 * lên AI cũng mang chữ `NaN`. Ô nhập rỗng hay một thân yêu cầu hỏng đều tới đây
 * được, nên đừng dựa vào phía trình duyệt đã lọc giúp.
 */
export function kepThoiLuong(tongGiay: number): number {
  if (!Number.isFinite(tongGiay)) return THOI_LUONG_MAC_DINH
  return Math.min(THOI_LUONG_TOI_DA, Math.max(THOI_LUONG_TOI_THIEU, tongGiay))
}

/**
 * Bốn khung thời gian + brief của từng nhịp.
 *
 * `goc` chỉ thay brief của nhịp HOOK. Cố ý gói vào đây chứ không nối chuỗi ở
 * `generateVoiceover`: prompt dựng từ đúng mảng này, nên nhét góc ở chỗ khác là
 * mở ra khả năng brief và ngân sách chữ nói hai chuyện khác nhau — đúng cái
 * bẫy đã ghi trong `NHIP`.
 */
export function khungTheoThoiLuong(tongGiay: number, goc?: GocHookId): KhungNhip[] {
  const T = kepThoiLuong(tongGiay)
  const briefHook = goc && GOC_HOOK.find(g => g.id === goc)
    ? `${HOOK_CHUNG} ${GOC_HOOK.find(g => g.id === goc)!.brief}`
    : undefined
  const hook = Math.min(TRAN_HOOK, T * TI_LE_HOOK)
  const cta = Math.min(TRAN_CTA, T * TI_LE_CTA)
  const con = T - hook - cta
  const giay: Record<NhipId, number> = {
    hook,
    problem: con * TI_LE_PROBLEM,
    product: con * (1 - TI_LE_PROBLEM),
    cta,
  }

  let moc = 0
  return NHIP.map(n => {
    const g = giay[n.id]
    const k: KhungNhip = {
      id: n.id, vai: n.vai, brief: n.id === 'hook' && briefHook ? briefHook : n.brief,
      batDau: moc, giay: g,
      nhan: `${fmtGiay(moc).replace('s', '')}–${fmtGiay(moc + g)}`,
    }
    moc += g
    return k
  })
}

/**
 * Cảnh báo khi độ dài nằm ngoài vùng mà cấu trúc bốn nhịp còn có nghĩa.
 *
 * Trả `null` khi không có gì đáng nói. **Không chặn** — người dùng biết video
 * của họ dài bao nhiêu, việc của ta là nói cho họ biết hậu quả.
 */
export function canhBaoThoiLuong(tongGiay: number): string | null {
  // Mỗi nhịp tốn ~0,79 giây chỉ để lấy hơi và vào giọng, bốn nhịp là ~3,2 giây
  // trước khi nói được chữ nào. Dưới 10 giây thì phần chữ còn lại quá ít.
  if (tongGiay < GIAY_MO_DAU * NHIP.length + 6) {
    return `Video ${tongGiay}s là ngắn cho bốn nhịp — riêng phần lấy hơi đã tốn ~${(GIAY_MO_DAU * NHIP.length).toFixed(1)}s. Lời sẽ rất cụt.`
  }
  if (tongGiay > 90) {
    return `Video ${Math.round(tongGiay)}s thì bốn nhịp là quá thưa — nhịp PRODUCT sẽ thành một đoạn độc thoại dài. Cân nhắc cắt ngắn video.`
  }
  return null
}

/** Đếm chữ như người đọc đếm — chỗ trống `{price}` tính là một chữ. */
export function demChu(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

