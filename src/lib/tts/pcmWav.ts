/**
 * PCM thô -> tệp WAV nghe được. Toàn hàm thuần, không mạng, không tiến trình con.
 *
 * ── VÌ SAO CẦN FILE NÀY ────────────────────────────────────────────
 *
 * Gemini TTS trả `audio/L16;codec=pcm;rate=24000` — tức mẫu 16-bit thô, KHÔNG
 * phải một tệp. Lưu thẳng ra đĩa rồi mở là im lặng hoặc rè: không có phần đầu
 * nào nói cho trình phát biết tần số lấy mẫu và số kênh. Bốn mươi tư byte đầu
 * của WAV chính là lời khai đó.
 *
 * Và WAV là lối duy nhất ở đây: đóng thành mp3 cần ffmpeg, mà `/admin/*` chạy
 * trên Vercel thì không có ffmpeg (xem PROJECT_CONTEXT mục "Rendering runs
 * locally"). WAV thì chỉ là ghép byte, nên chạy được ngay trong hàm serverless.
 *
 * ── VÌ SAO CẮT KHOẢNG LẶNG ─────────────────────────────────────────
 *
 * Đo 29/08 trên chính câu HOOK của deal #1178:
 *
 *   SAPI                       3.8s  — phần lớn là khoảng lặng đệm hai đầu
 *   Gemini, đọc thô            3.33s  (lặng đầu 0.22s)
 *   Gemini + chỉ dẫn đọc nhanh 2.41s  (lặng đầu 0.12s, lặng cuối 0.14s)
 *
 * Khung HOOK chỉ có 0–2 giây. Một phần tư giây lặng ở đầu là một phần tám khung
 * đó, tiêu vào chỗ không phát ra tiếng nào. Cắt đi là việc thuần tuý số học nên
 * làm được ở đây, không phải nhờ đến công cụ dựng phim.
 */

/** Gemini TTS hiện luôn trả 24kHz. Vẫn đọc từ mimeType chứ không ghi cứng. */
export const RATE_MAC_DINH = 24000

/** Ngưỡng coi là "có tiếng", trên thang 16-bit (32768). 500 ≈ 1,5%. */
const NGUONG_TUYET_DOI = 500
/** Và ít nhất 2% đỉnh của chính đoạn đó — đoạn thu nhỏ tiếng không bị cắt cụt. */
const NGUONG_THEO_DINH = 0.02
/** Khung xét: 20ms. Đủ nhỏ để bám sát, đủ lớn để không nhiễu vì một mẫu lẻ. */
const KHUNG_GIAY = 0.02
/** Chừa lại hai đầu, kẻo cắt mất tiếng bật đầu từ. */
const CHUA_GIAY = 0.04

/**
 * Đọc tần số lấy mẫu từ mimeType kiểu `audio/L16;codec=pcm;rate=24000`.
 *
 * Trả `RATE_MAC_DINH` khi không đọc được. Đoán sai tần số không làm hỏng tệp —
 * nó làm giọng đọc **cao hoặc trầm bất thường**, một lỗi nghe thấy được chứ
 * không im lặng, nên mặc định là chấp nhận được.
 */
export function docRate(mime: string | undefined | null): number {
  const m = /(?:^|;)\s*rate=(\d{4,6})\b/i.exec(mime ?? '')
  if (!m) return RATE_MAC_DINH
  const r = Number(m[1])
  return Number.isFinite(r) && r >= 8000 && r <= 48000 ? r : RATE_MAC_DINH
}

/** Số giây của một khối PCM 16-bit một kênh. */
export function giayCuaPcm(pcm: Uint8Array, rate: number = RATE_MAC_DINH): number {
  return pcm.length / (rate * 2)
}

/** Biên độ lớn nhất trong khoảng [dau, cuoi) byte. */
function dinh(pcm: Uint8Array, dau: number, cuoi: number): number {
  let max = 0
  for (let i = dau; i + 1 < cuoi; i += 2) {
    // Little-endian, có dấu. `| 0` không đủ: phải mở rộng dấu từ 16 bit.
    const v = ((pcm[i] | (pcm[i + 1] << 8)) << 16) >> 16
    const a = v < 0 ? -v : v
    if (a > max) max = a
  }
  return max
}

/**
 * Cắt khoảng lặng ở hai đầu.
 *
 * ⚠️ Trả về **nguyên khối cũ** khi không tìm thấy khung nào có tiếng. Một đoạn
 * toàn lặng thì đúng là nên cắt sạch, nhưng cắt sạch nghĩa là giao một tệp rỗng
 * — mã thoát 0, tệp mở được, và không phát ra gì. Đó đúng là họ lỗi "báo thành
 * công mà vẫn hỏng" đắt nhất của dự án này. Giao đoạn lặng còn nghe ra là sai;
 * giao tệp rỗng thì không.
 */
export function catKhoangLang(pcm: Uint8Array, rate: number = RATE_MAC_DINH): Uint8Array {
  const khung = Math.floor(rate * KHUNG_GIAY) * 2
  if (khung <= 0 || pcm.length < khung * 2) return pcm

  const nguong = Math.max(NGUONG_TUYET_DOI, Math.round(dinh(pcm, 0, pcm.length) * NGUONG_THEO_DINH))

  let dau = -1
  for (let i = 0; i + khung <= pcm.length; i += khung) {
    if (dinh(pcm, i, i + khung) > nguong) { dau = i; break }
  }
  if (dau < 0) return pcm

  let cuoi = pcm.length
  for (let i = pcm.length - (pcm.length % khung) - khung; i >= 0; i -= khung) {
    if (dinh(pcm, i, i + khung) > nguong) { cuoi = i + khung; break }
  }

  const chua = Math.floor(rate * CHUA_GIAY) * 2
  const tu = Math.max(0, dau - chua)
  const den = Math.min(pcm.length, cuoi + chua)
  return den > tu ? pcm.subarray(tu, den) : pcm
}

// ── Cắt một khối tiếng thành nhiều đoạn theo khoảng lặng ───────
//
// Vì sao cần: đọc cả bốn nhịp trong MỘT lần gọi rồi cắt lại thì tốn một lần
// gọi thay vì bốn — với hạn mức ~10 lần/ngày mỗi khoá, đó là khác biệt giữa
// ~5 video và ~20 video một ngày.
//
// 📌 Đo thật 29/08 trên đúng bốn nhịp của deal #1471, gộp làm một lần đọc:
//
//   lần 1: 18,21s · ba khe 0,72 / 0,76 / 0,72s
//   lần 2: 17,25s · ba khe 0,62 / 0,56 / 0,54s · khe DÀI NHẤT trong câu: 0,10s
//
// Biên cách nhau hơn năm lần (0,54 so với 0,10), nên ngưỡng 0,30s nằm giữa rất
// thoáng. Cả hai lần đều ra đúng ba khe.
//
// ⚠️ NHƯNG hai lần thì chưa phải một tỉ lệ. Nên hàm dưới **trả `null`** khi
// không tìm đúng số khe cần, thay vì cắt bừa ở đâu đó. Cắt sai nghĩa là giao
// một clip đứt giữa từ — tệp vẫn mở được, vẫn phát được, và chỉ lộ ra khi người
// dùng đã dựng xong video. Đó đúng là họ lỗi đắt nhất của dự án này.

/** Ngưỡng coi một khoảng lặng là RANH GIỚI giữa hai đoạn, không phải nghỉ trong câu. */
export const KHE_RANH_GIOI_GIAY = 0.3
/** Đoạn ngắn hơn mức này thì gần như chắc chắn là cắt hỏng, không phải một nhịp. */
const DOAN_TOI_THIEU_GIAY = 0.25

export type KheIm = { tu: number; den: number; giay: number }

/** Mọi khoảng lặng nằm GIỮA (bỏ hai đầu), tính theo byte. */
export function timKheIm(pcm: Uint8Array, rate: number = RATE_MAC_DINH): KheIm[] {
  const khung = Math.floor(rate * KHUNG_GIAY) * 2
  if (khung <= 0 || pcm.length < khung * 3) return []
  const nguong = Math.max(NGUONG_TUYET_DOI, Math.round(dinh(pcm, 0, pcm.length) * NGUONG_THEO_DINH))

  const ra: KheIm[] = []
  let dau: number | null = null
  let daCoTieng = false
  for (let i = 0; i + khung <= pcm.length; i += khung) {
    const co = dinh(pcm, i, i + khung) > nguong
    if (co) {
      // Chỉ tính khe nằm giữa hai vùng CÓ TIẾNG. Khoảng lặng ở đầu tệp không
      // phải ranh giới đoạn — nó là phần đệm, và `catKhoangLang` lo việc đó.
      if (dau !== null && daCoTieng) ra.push({ tu: dau, den: i, giay: (i - dau) / (rate * 2) })
      dau = null
      daCoTieng = true
    } else if (dau === null) {
      dau = i
    }
  }
  return ra
}

/**
 * Cắt `pcm` thành đúng `soDoan` đoạn tại các khoảng lặng dài.
 *
 * Trả **`null`** khi không tìm được đúng `soDoan - 1` khe, hoặc khi có đoạn
 * ngắn bất thường. Nơi gọi phải xử lý `null` bằng cách giao một tệp liền —
 * không bao giờ bằng cách cắt đại.
 */
export function catThanhDoan(
  pcm: Uint8Array,
  soDoan: number,
  rate: number = RATE_MAC_DINH,
  nguongGiay: number = KHE_RANH_GIOI_GIAY,
): Uint8Array[] | null {
  if (soDoan < 1) return null
  if (soDoan === 1) return [pcm]

  const ranh = timKheIm(pcm, rate).filter(k => k.giay >= nguongGiay)
  // Nhiều hơn hoặc ít hơn đều là dấu hiệu mô hình không nghỉ như đã dặn. Lấy
  // bừa `soDoan-1` khe dài nhất là đoán, và đoán sai ở đây thì im lặng.
  if (ranh.length !== soDoan - 1) return null

  const ra: Uint8Array[] = []
  let tu = 0
  for (const k of ranh) {
    // Cắt ở GIỮA khe: chừa lại một chút đuôi tiếng cho đoạn trước và một chút
    // đầu cho đoạn sau, thay vì xén sát ngay chỗ biên độ vừa tụt xuống ngưỡng.
    // Làm chẵn 2 byte, kẻo lệch nửa mẫu 16-bit và cả đoạn sau thành tiếng rè.
    const giua = (k.tu + Math.floor((k.den - k.tu) / 2)) & ~1
    ra.push(pcm.subarray(tu, giua))
    tu = giua
  }
  ra.push(pcm.subarray(tu))

  // ⚠️ Cắt lặng TRƯỚC rồi mới đo. Đo trên đoạn thô là đo cả nửa khoảng nghỉ ở
  // hai bên (~0,7s cho hai nửa), nên một nhịp cụt 0,1 giây vẫn qua được ngưỡng
  // 0,25s — tức phép chặn tồn tại mà không chặn gì. Đã mắc đúng vậy khi viết.
  const goc = ra.map(d => catKhoangLang(d, rate))
  if (goc.some(d => giayCuaPcm(d, rate) < DOAN_TOI_THIEU_GIAY)) return null
  return goc
}

/** Một khối lặng dài `giay` giây. */
export function khoangLang(giay: number, rate: number = RATE_MAC_DINH): Uint8Array {
  return new Uint8Array(Math.max(0, Math.round(giay * rate)) * 2)
}

/** Nối các đoạn lại, chèn `giayNghi` giây lặng vào giữa (không thêm ở hai đầu). */
export function ghepPcm(doan: Uint8Array[], giayNghi: number, rate: number = RATE_MAC_DINH): Uint8Array {
  const co = doan.filter(d => d.length > 0)
  if (co.length === 0) return new Uint8Array(0)
  const nghi = khoangLang(giayNghi, rate)
  const tong = co.reduce((s, d) => s + d.length, 0) + nghi.length * (co.length - 1)
  const ra = new Uint8Array(tong)
  let vt = 0
  for (let i = 0; i < co.length; i++) {
    if (i > 0) { ra.set(nghi, vt); vt += nghi.length }
    ra.set(co[i], vt); vt += co[i].length
  }
  return ra
}

/** Số byte của phần đầu WAV mà `wavTuPcm` sinh ra. */
export const DAU_WAV = 44

/**
 * Lấy lại phần mẫu thô từ một tệp WAV do chính `wavTuPcm` sinh ra.
 *
 * ⚠️ Chỉ đúng với WAV của hàm bên dưới — phần đầu 44 byte, một khối `fmt ` rồi
 * ngay `data`. Tệp WAV nói chung có thể chèn thêm khối (`LIST`, `fact`) nên
 * đừng dùng hàm này cho tệp người dùng tải lên.
 *
 * Có nó thì phía trình duyệt ghép các nhịp lại được bằng **chính** `ghepPcm`
 * dưới đây, thay vì viết một bản ghép thứ hai. Hai bản ghép là hai chỗ để lệch.
 */
export function pcmTuWav(wav: Uint8Array): Uint8Array {
  return wav.length > DAU_WAV ? wav.subarray(DAU_WAV) : new Uint8Array(0)
}

/**
 * Đọc tần số lấy mẫu ra từ phần đầu WAV (byte 24–27).
 *
 * Ghép hai đoạn khác tần số mà không biết là ra một tệp mà nửa sau nghe nhanh
 * hoặc chậm bất thường — hỏng theo kiểu nghe mới biết, sau khi đã dựng xong.
 */
export function rateTuWav(wav: Uint8Array): number {
  if (wav.length < DAU_WAV) return RATE_MAC_DINH
  const r = new DataView(wav.buffer, wav.byteOffset, wav.byteLength).getUint32(24, true)
  return r >= 8000 && r <= 48000 ? r : RATE_MAC_DINH
}

/**
 * Bọc PCM 16-bit một kênh thành tệp WAV.
 *
 * ⚠️ Mọi số nhiều byte trong WAV là little-endian, kể cả trên máy big-endian —
 * `DataView` với `littleEndian = true` nói rõ điều đó, đừng để nó theo mặc định
 * của máy.
 */
export function wavTuPcm(pcm: Uint8Array, rate: number = RATE_MAC_DINH): Uint8Array {
  const KENH = 1, BIT = 16
  const byteMoiGiay = rate * KENH * (BIT / 8)
  const ra = new Uint8Array(44 + pcm.length)
  const dv = new DataView(ra.buffer)
  const chu = (vt: number, s: string) => { for (let i = 0; i < s.length; i++) ra[vt + i] = s.charCodeAt(i) }

  chu(0, 'RIFF')
  dv.setUint32(4, 36 + pcm.length, true)   // cỡ cả tệp trừ 8 byte đầu
  chu(8, 'WAVE')
  chu(12, 'fmt ')
  dv.setUint32(16, 16, true)               // cỡ khối fmt — 16 với PCM
  dv.setUint16(20, 1, true)                // 1 = PCM không nén
  dv.setUint16(22, KENH, true)
  dv.setUint32(24, rate, true)
  dv.setUint32(28, byteMoiGiay, true)
  dv.setUint16(32, KENH * (BIT / 8), true) // cỡ một khung
  dv.setUint16(34, BIT, true)
  chu(36, 'data')
  dv.setUint32(40, pcm.length, true)
  ra.set(pcm, 44)
  return ra
}
