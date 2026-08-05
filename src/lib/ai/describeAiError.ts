/**
 * Doi loi tho tu Anthropic SDK thanh cau nguoi van hanh doc duoc.
 *
 * Tach ra khoi `admin/reviews/actions.ts` khi duong sinh bai thu hai (dat ten y tuong)
 * can dung y het. Mot ban sao thu hai chac chan se lech: mot ben them nhanh xu ly
 * `max_tokens`, ben kia khong, va nguoi van hanh nhan hai cau khac nhau cho cung mot
 * su co.
 */
export function describeAiError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  if (
    message.includes('Overloaded') ||
    (err && typeof err === 'object' && 'status' in err && (err as { status?: number }).status === 529)
  ) {
    return 'Máy chủ AI đang quá tải, vui lòng thử lại sau ít phút.'
  }
  if (message.includes('Failed to parse structured output')) {
    return 'AI trả về nội dung chưa đúng định dạng sau nhiều lần thử. Vui lòng bấm lại để thử lần nữa.'
  }
  return `Không thể gọi AI: ${message}`
}
