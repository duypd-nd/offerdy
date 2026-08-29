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

export const NHIP = [
  {
    id: 'hook',
    vai: 'HOOK',
    // ⚠️ Không ghi cứng số chữ vào đây — ngân sách in ra từ `nganSachChu()` ngay
    // bên dưới trong prompt. Hai con số ở hai chỗ là chắc chắn lệch nhau, và bản
    // trước đã lệch đúng như vậy (brief nói 5, ngân sách tính ra 4).
    brief: 'Lead with the single most surprising concrete fact — usually the price. No greeting, no "check this out", no adjective before the number.',
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

export function khungTheoThoiLuong(tongGiay: number): KhungNhip[] {
  const T = kepThoiLuong(tongGiay)
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
      id: n.id, vai: n.vai, brief: n.brief,
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

