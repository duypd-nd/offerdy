import { defineField, defineType } from 'sanity'

export const dealType = defineType({
  name: 'deal',
  title: 'Deal',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: r => r.required() }),
    defineField({
      name: 'code',
      title: 'Mã sản phẩm (#)',
      type: 'number',
      readOnly: true,
      description:
        'Hệ thống tự cấp, bắt đầu từ 1000 và tăng dần — dùng để nhắc sản phẩm trong caption Instagram/TikTok (VD: "#1000"), tìm trên /links, và short link offerdy.com/d/1000. KHÔNG sửa tay: mã đã đăng lên mạng xã hội thì phải giữ nguyên vĩnh viễn, đổi mã = link cũ chết. Deal thiếu mã: chạy /admin/migrate/deal-codes.',
      validation: r => r.integer().positive(),
    }),
    defineField({
      name: 'shortLinkClicks',
      title: 'Lượt mở short link /d/<mã>',
      type: 'number',
      readOnly: true,
      description:
        'Số lần short link offerdy.com/d/<mã> được mở (đã lọc bot/trình đọc link preview). Đây KHÔNG phải click ra merchant — click affiliate đếm riêng trên offer/store. Xem chi tiết theo nguồn (Instagram/TikTok…) tại /admin/reports.',
    }),
    defineField({ name: 'store', title: 'Store (e.g. Apple · Best Buy)', type: 'string', validation: r => r.required() }),
    defineField({ name: 'emoji', title: 'Emoji', type: 'string', description: 'e.g. 🎧 📺 👟' }),
    defineField({
      name: 'imgClass', title: 'Image Background', type: 'string',
      options: { list: ['di-tech', 'di-home', 'di-fashion', 'di-beauty'] },
    }),
    defineField({ name: 'priceSale', title: 'Sale Price (e.g. $189)', type: 'string', validation: r => r.required() }),
    defineField({ name: 'priceOrig', title: 'Original Price (e.g. $249)', type: 'string', validation: r => r.required() }),
    defineField({ name: 'discount', title: 'Discount %', type: 'number', validation: r => r.required().min(1).max(99) }),
    defineField({
      name: 'discountByAmount',
      title: 'Hiển thị giảm theo số tiền (VD: $100 OFF thay vì %)',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({ name: 'verified', title: 'Verified', type: 'boolean', initialValue: true }),
    defineField({ name: 'isExpiring', title: 'Expiring Soon?', type: 'boolean', initialValue: false }),
    defineField({ name: 'expiresAt', title: 'Expires At', type: 'datetime' }),
    defineField({ name: 'dealUrl', title: 'Deal URL', type: 'url' }),
    defineField({
      name: 'category',
      title: 'Danh mục',
      type: 'reference',
      to: [{ type: 'category' }],
      description: 'Dùng để lọc trên trang /deals. Tham chiếu tới document Category (không phải enum text như store.category) — đổi tên/emoji ở Category là đổi khắp nơi. Để trống thì deal vẫn hiện ở tab "All", chỉ không lọc được theo danh mục.',
    }),
    defineField({
      name: 'relatedReview',
      title: 'Review liên quan',
      type: 'reference',
      to: [{ type: 'review' }],
      description: 'Chỉ chọn nếu có sẵn bài Review nói đúng về sản phẩm/deal này — không tự động khớp, chọn tay để tránh gán nhầm sản phẩm.',
    }),

    // ── GEO Content (hiển thị trên /deals/[slug]) ──────────────
    defineField({ name: 'summary', title: 'Tóm tắt (vì sao đáng mua)', type: 'text', rows: 3 }),
    defineField({
      name: 'prosAndCons', title: 'Ưu điểm / Nhược điểm', type: 'object',
      fields: [
        defineField({ name: 'pros', title: 'Pros', type: 'array', of: [{ type: 'string' }] }),
        defineField({ name: 'cons', title: 'Cons', type: 'array', of: [{ type: 'string' }] }),
      ],
    }),
    defineField({
      name: 'faq', title: 'FAQ', type: 'array',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'question', title: 'Câu hỏi', type: 'string' }),
          defineField({ name: 'answer', title: 'Trả lời', type: 'text', rows: 2 }),
        ],
      }],
    }),
    defineField({ name: 'metaTitle', title: 'Meta Title', type: 'string' }),
    defineField({ name: 'metaDescription', title: 'Meta Description', type: 'text', rows: 2 }),

    // ── AI Content Engine ──────────────────────────────────────
    defineField({
      name: 'aiReviewStatus',
      title: 'Trạng thái duyệt AI',
      type: 'string',
      initialValue: 'none',
      options: {
        list: [
          { title: 'Chưa có draft', value: 'none' },
          { title: 'Chờ duyệt', value: 'pending' },
          { title: 'Đã duyệt', value: 'approved' },
          { title: 'Đã từ chối', value: 'rejected' },
        ],
      },
      readOnly: true,
      description: 'Quản lý qua trang /admin/ai-review — không chỉnh tay',
    }),
    defineField({
      name: 'aiDraft',
      title: 'AI Draft (chờ duyệt)',
      type: 'object',
      readOnly: true,
      description: 'Nội dung AI đề xuất — duyệt tại /admin/ai-review, không chỉnh tay ở đây',
      fields: [
        defineField({ name: 'summary', title: 'Tóm tắt (draft)', type: 'text', rows: 3 }),
        defineField({
          name: 'prosAndCons', title: 'Pros/Cons (draft)', type: 'object',
          fields: [
            defineField({ name: 'pros', title: 'Pros', type: 'array', of: [{ type: 'string' }] }),
            defineField({ name: 'cons', title: 'Cons', type: 'array', of: [{ type: 'string' }] }),
          ],
        }),
        defineField({
          name: 'faq', title: 'FAQ (draft)', type: 'array',
          of: [{
            type: 'object',
            fields: [
              defineField({ name: 'question', title: 'Câu hỏi', type: 'string' }),
              defineField({ name: 'answer', title: 'Trả lời', type: 'text', rows: 2 }),
            ],
          }],
        }),
        defineField({ name: 'metaTitle', title: 'Meta Title (draft)', type: 'string' }),
        defineField({ name: 'metaDescription', title: 'Meta Description (draft)', type: 'text', rows: 2 }),
        defineField({ name: 'generatedAt', title: 'Thời gian generate', type: 'datetime' }),
        defineField({ name: 'model', title: 'Model', type: 'string' }),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'store', media: 'emoji' },
    prepare({ title, subtitle }) { return { title, subtitle } },
  },
})
