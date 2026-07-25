import { defineType, defineField } from 'sanity'

/**
 * Giong noi cua kenh — dung lam boi canh khi AI viet caption mang xa hoi.
 *
 * Day la don bay lon nhat quyet dinh caption dung duoc hay bo di. Khong co no, AI
 * viet ra thu ai cung nhan ra la AI viet: dung tu chung chung, khong co goc nhin,
 * khong biet dang noi voi ai. Co no, caption doc ra giong nguoi that dang van kenh.
 *
 * Khong phai noi dung cong khai — chi la boi canh gui cho model.
 */
export const configPersonaType = defineType({
  name: 'configPersona',
  title: 'Giọng kênh (cho AI viết caption)',
  type: 'document',
  fields: [
    defineField({
      name: 'creatorName',
      title: 'Tên kênh / người đăng',
      type: 'string',
      description: 'VD: Teelacodes — dùng khi caption cần nhắc tới chính mình',
    }),
    defineField({
      name: 'bio',
      title: 'Bio / câu định vị',
      type: 'text',
      rows: 2,
      description: 'Đúng câu bạn để trên Instagram/TikTok. VD: "Designer looks for less — under $50"',
    }),
    defineField({
      name: 'audience',
      title: 'Khán giả là ai',
      type: 'text',
      rows: 2,
      description: 'Càng cụ thể càng tốt: độ tuổi, mối quan tâm, ngân sách. AI dùng cái này để chọn góc và chọn từ.',
    }),
    defineField({
      name: 'contentPillars',
      title: 'Content pillars',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Các chủ đề cố định của kênh. VD: "Outfit styling — 1 piece, 3 ways", "Hauls & dupes"',
    }),
    defineField({
      name: 'toneNotes',
      title: 'Giọng viết',
      type: 'text',
      rows: 3,
      description: 'Mô tả cách bạn viết: câu ngắn hay dài, có emoji không, xưng hô thế nào, hài hay nghiêm. Dán luôn 2-3 caption cũ bạn ưng vào đây là cách nhanh nhất.',
    }),
    defineField({
      name: 'avoidWords',
      title: 'Từ/kiểu câu cần tránh',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'VD: "must-have", "game changer", "insane" — những từ bạn thấy sáo. AI sẽ không dùng.',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Giọng kênh (cho AI viết caption)' }),
  },
})
