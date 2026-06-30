import { defineType, defineField } from 'sanity'

export const configContentType = defineType({
  name: 'configContent',
  title: 'Cấu hình nội dung',
  type: 'document',
  fields: [
    // Số lượng hiển thị
    defineField({
      name: 'dealsPerPage',
      title: 'Số deals mỗi trang',
      type: 'number',
      initialValue: 8,
      validation: r => r.min(4).max(24),
    }),
    defineField({
      name: 'reviewsPerPage',
      title: 'Số reviews mỗi trang',
      type: 'number',
      initialValue: 8,
      validation: r => r.min(4).max(24),
    }),
    defineField({
      name: 'postsPerPage',
      title: 'Số bài blog mỗi trang',
      type: 'number',
      initialValue: 9,
      validation: r => r.min(3).max(24),
    }),

    // Hiển thị
    defineField({
      name: 'showExpiringBand',
      title: 'Hiển thị dải "Expiring Soon"',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'announcementBar',
      title: 'Thông báo trên cùng',
      type: 'string',
      description: 'Hiển thị banner thông báo phía trên header. Để trống để ẩn.',
      placeholder: 'VD: 🎉 Prime Day sắp đến — Theo dõi để nhận alert!',
    }),
    defineField({
      name: 'announcementBarUrl',
      title: 'Liên kết thông báo',
      type: 'string',
      description: 'URL khi click vào banner thông báo',
    }),

    // Mô tả offer mặc định
    defineField({
      name: 'defaultOfferDescription',
      title: 'Mô tả offer mặc định',
      type: 'text',
      rows: 3,
      description: 'Mỗi dòng = 1 mô tả riêng. Offer sẽ tự xoay vòng qua các dòng. Dùng {store} để chèn tên cửa hàng.',
    }),

    // Hướng dẫn 3 bước (dùng {store} để chèn tên cửa hàng)
    defineField({
      name: 'howToSteps',
      title: 'Hướng dẫn 3 bước sử dụng mã — áp dụng toàn site',
      type: 'array',
      description: 'Dùng {store} trong văn bản để tự chèn tên cửa hàng. Để trống → dùng nội dung mặc định.',
      of: [{
        type: 'object',
        name: 'step',
        fields: [
          defineField({ name: 'title', title: 'Tiêu đề bước', type: 'string', validation: r => r.required() }),
          defineField({ name: 'description', title: 'Mô tả (dùng {store} để chèn tên)', type: 'text', rows: 3 }),
        ],
        preview: {
          select: { title: 'title' },
          prepare(v: Record<string, unknown>) { return { title: v.title as string ?? 'Bước' } },
        },
      }],
    }),

    // FAQ mặc định (dùng {store} để chèn tên cửa hàng)
    defineField({
      name: 'defaultFaqs',
      title: 'FAQ mặc định — áp dụng toàn site',
      type: 'array',
      description: 'Dùng {store} để chèn tên cửa hàng. Áp dụng cho tất cả stores trừ khi store có FAQ riêng.',
      of: [{
        type: 'object',
        name: 'faq',
        fields: [
          defineField({ name: 'question', title: 'Câu hỏi (dùng {store})', type: 'string', validation: r => r.required() }),
          defineField({ name: 'answer', title: 'Trả lời (dùng {store})', type: 'text', rows: 3, validation: r => r.required() }),
        ],
        preview: {
          select: { title: 'question' },
          prepare(v: Record<string, unknown>) { return { title: v.title as string ?? 'FAQ' } },
        },
      }],
    }),

    // Chân trang bài viết
    defineField({
      name: 'articleDisclaimer',
      title: 'Câu disclaimer affiliate (cuối bài review/blog)',
      type: 'text',
      rows: 4,
      description: 'Dùng {store} để chèn tên cửa hàng. Để trống để ẩn.',
      placeholder: 'This page contains affiliate links. {site} may earn a commission when you click through and complete a qualifying purchase at no extra cost to you.',
    }),
    defineField({
      name: 'articleReviewedBy',
      title: 'Tên team biên tập (hiện ở dòng "Reviewed by...")',
      type: 'string',
      placeholder: 'Offerdy Editorial Team',
    }),

    // Trang deals
    defineField({
      name: 'dealsGridColumns',
      title: 'Số cột lưới deals (desktop)',
      type: 'number',
      initialValue: 4,
      options: { list: [{ title: '3 cột', value: 3 }, { title: '4 cột', value: 4 }], layout: 'radio' },
    }),
    defineField({
      name: 'showVerifiedBadge',
      title: 'Hiển thị badge Verified trên mỗi deal',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: { prepare: () => ({ title: 'Cấu hình nội dung' }) },
})
