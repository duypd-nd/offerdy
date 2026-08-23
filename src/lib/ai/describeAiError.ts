/**
 * Đổi lỗi thô từ Anthropic SDK thành câu người vận hành đọc được **và biết phải
 * làm gì tiếp**.
 *
 * Tách ra khỏi `admin/reviews/actions.ts` khi đường sinh bài thứ hai (đặt tên ý
 * tưởng) cần dùng y hệt. Một bản sao thứ hai chắc chắn sẽ lệch: một bên thêm
 * nhánh xử lý `max_tokens`, bên kia không, và người vận hành nhận hai câu khác
 * nhau cho cùng một sự cố.
 *
 * ⚠️ VÌ SAO MỞ RỘNG (23/08/2026): `/admin/video` và `/admin/social-kit` không đi
 * qua hàm này mà tự `String(err)`, nên khi ví API cạn tiền thì màn hình phun ra
 *
 *     Error: 400 {"type":"error","error":{"type":"invalid_request_error",
 *     "message":"Your credit balance is too low to access the Anthropic API..."}}
 *
 * Đọc xong không biết bấm vào đâu. Mà hết tiền thì **chắc chắn còn gặp lại** —
 * nó không phải sự cố, nó là trạng thái bình thường của một ví trả trước.
 *
 * ⚠️ Hàm THUẦN: không gọi mạng, không đọc env. Nhờ vậy mọi trang admin dùng
 * chung một câu chữ, và câu chữ đó test được.
 *
 * ⚠️ Không nhận ra thì **trả lại nguyên văn** (đã cắt ngắn), không nuốt lỗi. Một
 * câu chung chung kiểu "Có lỗi xảy ra" còn tệ hơn khối JSON thô: ít nhất khối
 * JSON còn tra cứu được.
 */

const DAI_TOI_DA = 300

/** Gom mọi hình dạng lỗi về một chuỗi để dò. */
function chuoiLoi(err: unknown): string {
  if (typeof err === 'string') return err
  if (err instanceof Error) return `${err.message} ${String(err)}`
  try {
    return JSON.stringify(err) ?? String(err)
  } catch {
    return String(err)
  }
}

/** Mã trạng thái HTTP nếu SDK có đính kèm. */
function maTrangThai(err: unknown): number | null {
  const s = (err as { status?: unknown })?.status
  return typeof s === 'number' ? s : null
}

export function describeAiError(err: unknown): string {
  const raw = chuoiLoi(err)
  const chu = raw.toLowerCase()
  const ma = maTrangThai(err)

  // ── Hết tiền ────────────────────────────────────────────────────
  // ⚠️ Anthropic trả **400**, không phải 402, cho trường hợp này — nên không dò
  // được bằng mã trạng thái, phải dò theo chữ.
  if (chu.includes('credit balance is too low') || (chu.includes('billing') && chu.includes('credit'))) {
    return 'Tài khoản API Anthropic đã hết tiền. Vào console.anthropic.com → Plans & Billing để nạp thêm. '
      + 'Đây là ví trả-theo-dùng của khoá ANTHROPIC_API_KEY, tách hẳn khỏi gói Claude Code.'
  }

  // ── Khoá sai / bị thu hồi / thiếu ────────────────────────────────
  if (chu.includes('could not resolve authentication') || chu.includes('x-api-key')) {
    return 'Thiếu hoặc sai khoá ANTHROPIC_API_KEY. Mở /admin/cron-check xem biến có tới được runtime không.'
  }
  if (ma === 401 || chu.includes('authentication_error') || chu.includes('invalid api key')) {
    return 'Khoá ANTHROPIC_API_KEY bị từ chối — sai hoặc đã bị thu hồi. Cấp khoá mới ở console.anthropic.com.'
  }
  if (ma === 403 || chu.includes('permission_error')) {
    return 'Khoá ANTHROPIC_API_KEY không có quyền cho việc này. Kiểm tra giới hạn của khoá ở console.anthropic.com.'
  }

  // ── Quá tải / chặn tốc độ ────────────────────────────────────────
  // ⚠️ Mấy loại này TỰ HẾT, khác hẳn hết tiền. Phải nói rõ "thử lại" để người
  // vận hành khỏi đi nạp tiền một cách vô ích.
  if (ma === 429 || chu.includes('rate_limit')) {
    return 'Gọi quá nhanh, Anthropic đang chặn tốc độ. Chờ một phút rồi thử lại — không cần sửa gì.'
  }
  if (ma === 529 || chu.includes('overloaded')) {
    return 'Máy chủ AI đang quá tải, vui lòng thử lại sau ít phút.'
  }
  if (ma === 500 || ma === 502 || ma === 503) {
    return `Anthropic lỗi máy chủ (HTTP ${ma}). Thử lại sau vài phút — không phải lỗi bên mình.`
  }

  // ── Hết giờ ──────────────────────────────────────────────────────
  if (chu.includes('etimedout') || chu.includes('timeout') || chu.includes('aborted')) {
    return 'Gọi Anthropic quá lâu rồi bị cắt. Thử lại; nếu lặp lại thì kiểm tra mạng.'
  }

  // ── Trả về sai định dạng ─────────────────────────────────────────
  if (chu.includes('failed to parse structured output')) {
    return 'AI trả về nội dung chưa đúng định dạng sau nhiều lần thử. Vui lòng bấm lại để thử lần nữa.'
  }

  // ── Đầu vào quá dài ──────────────────────────────────────────────
  if (chu.includes('prompt is too long') || (chu.includes('max_tokens') && chu.includes('exceed'))) {
    return 'Nội dung gửi đi quá dài so với giới hạn của model. Bớt dữ liệu đầu vào rồi thử lại.'
  }

  // Không nhận ra → trả nguyên văn, đừng nuốt.
  return `Không thể gọi AI: ${raw.trim()}`.slice(0, DAI_TOI_DA)
}
