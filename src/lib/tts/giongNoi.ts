/**
 * Danh sách giọng đọc — tách riêng khỏi `geminiVoice.ts` **có chủ đích**.
 *
 * Ô chọn giọng nằm trong một component `'use client'`. Nếu nó import từ
 * `geminiVoice.ts` thì kéo theo cả `khoaCuaNha` và bộ đăng ký khoá API vào gói
 * gửi xuống trình duyệt. Next thay `process.env.GEMINI_API_KEY` bằng
 * `undefined` cho biến không có tiền tố `NEXT_PUBLIC` nên không lộ khoá — nhưng
 * đó là dựa vào một hành vi của công cụ dựng để giữ bí mật, chứ không phải một
 * ranh giới. Ranh giới là file này.
 *
 * Ở đây không có gì ngoài dữ liệu thuần.
 */

/**
 * ⚠️ **Đã gọi thử từng giọng ngày 29/08, cả năm đều trả 200.** Gemini có nhiều
 * giọng hơn; ở đây chỉ giữ những giọng đã tự tay kiểm, vì một tên giọng chép
 * theo trí nhớ mà sai thì lỗi trả về là 400 ngay giữa lúc người dùng đang chờ —
 * và nó tiêu mất một lần gọi trong hạn mức ~10 lần mỗi ngày.
 *
 * Số giây kèm theo là độ dài đo được của cùng một câu "Fifteen dollars."
 */
export const GIONG = [
  { id: 'Leda', nhan: 'Leda — nữ, trẻ', mota: 'Mặc định. Hợp khán giả trẻ Mỹ.' },
  { id: 'Puck', nhan: 'Puck — nam, hào hứng', mota: 'Nảy, hợp mở đầu giật.' },
  { id: 'Zephyr', nhan: 'Zephyr — nữ, sáng', mota: 'Nhanh nhất trong năm giọng đã đo (1,37s).' },
  { id: 'Kore', nhan: 'Kore — nữ, chắc', mota: 'Điềm, hợp đoạn nói giá.' },
  { id: 'Aoede', nhan: 'Aoede — nữ, thoáng', mota: 'Thong thả nhất (1,73s), hợp CTA mềm.' },
] as const

export type GiongId = typeof GIONG[number]['id']
export const GIONG_MAC_DINH: GiongId = 'Leda'

export function laGiongHopLe(g: string): g is GiongId {
  return GIONG.some(v => v.id === g)
}
