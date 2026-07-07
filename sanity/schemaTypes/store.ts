import { defineField, defineType } from 'sanity'

export const storeType = defineType({
  name: 'store',
  title: 'Store',
  type: 'document',
  groups: [
    { name: 'basic',   title: '📋 Thông tin cơ bản', default: true },
    { name: 'content', title: '📝 Nội dung' },
    { name: 'events',  title: '📅 Events' },
    { name: 'seo',     title: '🔍 SEO' },
    { name: 'ai',      title: '🤖 AI Content' },
  ],
  fields: [
    // ── Trạng thái ─────────────────────────────────────────────
    defineField({
      name: 'published',
      title: 'Duyệt bài — Hiện trên website',
      type: 'boolean',
      initialValue: true,
      group: 'basic',
      description: 'Bật = xuất hiện trên web · Tắt = ẩn đi',
    }),

    // ── Thông tin cơ bản ───────────────────────────────────────
    defineField({
      name: 'name',
      title: 'Tên Store',
      type: 'string',
      validation: r => r.required(),
      group: 'basic',
    }),
    defineField({
      name: 'slug',
      title: 'Slug (URL)',
      type: 'slug',
      options: { source: 'name' },
      validation: r => r.required(),
      group: 'basic',
    }),
    defineField({
      name: 'category',
      title: 'Danh mục',
      type: 'string',
      group: 'basic',
      options: {
        list: [
          { title: '📱 Điện tử & Công nghệ', value: 'electronics' },
          { title: '👗 Thời trang & Phụ kiện', value: 'fashion' },
          { title: '💄 Làm đẹp & Sức khỏe', value: 'beauty' },
          { title: '🏠 Gia dụng & Nội thất', value: 'home' },
          { title: '🏃 Thể thao & Outdoor', value: 'sports' },
          { title: '🍕 Thực phẩm & Đồ uống', value: 'food' },
          { title: '✈️ Du lịch & Khách sạn', value: 'travel' },
          { title: '📚 Sách & Giáo dục', value: 'books' },
          { title: '🎮 Game & Giải trí', value: 'gaming' },
          { title: '🛒 Tổng hợp', value: 'general' },
        ],
      },
    }),
    defineField({
      name: 'image',
      title: 'Hình ảnh / Logo Store',
      type: 'image',
      group: 'basic',
      options: { hotspot: true },
      description: 'Logo hoặc ảnh đại diện — khuyến nghị 400×400px nền trong',
    }),
    defineField({
      name: 'abbr',
      title: 'Chữ viết tắt (2-3 ký tự)',
      type: 'string',
      validation: r => r.max(3),
      group: 'basic',
      description: 'Hiện khi chưa có logo — VD: Am, BB, Nk',
    }),
    defineField({
      name: 'maxOffer',
      title: 'Max Offer (%)',
      type: 'number',
      group: 'basic',
      validation: r => r.min(1).max(100),
      description: 'Mức giảm giá tối đa — VD: 70 → hiện "Up to 70% off"',
    }),
    defineField({
      name: 'website',
      title: 'Website URL (domain gốc)',
      type: 'url',
      group: 'basic',
      description: 'VD: https://amazon.com — chỉ dùng để hiển thị domain',
    }),
    defineField({
      name: 'affiliateLink',
      title: 'Affiliate / Tiếp thị Link',
      type: 'url',
      group: 'basic',
      description: 'Link tiếp thị — khi có sẽ tự dùng làm href; hiển thị vẫn là domain gốc',
    }),
    defineField({
      name: 'clicks',
      title: 'Lượt click (link website/event của store)',
      type: 'number',
      initialValue: 0,
      group: 'basic',
      description: 'Số lần khách bấm link website/event của store (không tính click Get Code/Get Deal của offer — xem ở offer) — tự động cập nhật từ website',
      readOnly: true,
    }),

    // ── Nội dung ───────────────────────────────────────────────
    defineField({
      name: 'shortDescription',
      title: 'Mô tả ngắn (tagline)',
      type: 'string',
      group: 'content',
      description: 'Hiện ngay dưới tên store — 1 câu ngắn gọn',
    }),
    defineField({
      name: 'description',
      title: 'About Store (hỗ trợ HTML)',
      type: 'text',
      rows: 8,
      group: 'content',
      description: 'Hỗ trợ thẻ HTML: <b>bold</b>, <i>italic</i>, <br>, <p>, <ul><li>...',
    }),
    defineField({
      name: 'faq',
      title: 'FAQ',
      type: 'array',
      group: 'content',
      description: 'Câu hỏi thường gặp về store — hiện trên trang store + FAQPage schema',
      of: [
        {
          type: 'object',
          name: 'faqItem',
          title: 'FAQ Item',
          fields: [
            defineField({ name: 'question', title: 'Câu hỏi', type: 'string', validation: r => r.required() }),
            defineField({ name: 'answer', title: 'Câu trả lời', type: 'text', rows: 3, validation: r => r.required() }),
          ],
          preview: {
            select: { title: 'question' },
          },
        },
      ],
    }),
    defineField({
      name: 'prosAndCons',
      title: 'Ưu điểm / Nhược điểm',
      type: 'object',
      group: 'content',
      fields: [
        defineField({ name: 'pros', title: 'Ưu điểm', type: 'array', of: [{ type: 'string' }] }),
        defineField({ name: 'cons', title: 'Nhược điểm', type: 'array', of: [{ type: 'string' }] }),
      ],
    }),

    // ── Events ─────────────────────────────────────────────────
    defineField({
      name: 'events',
      title: 'Events',
      type: 'array',
      group: 'events',
      description: 'Sale events, sự kiện khuyến mãi theo mùa của store',
      of: [
        {
          type: 'object',
          name: 'event',
          title: 'Event',
          fields: [
            defineField({
              name: 'title',
              title: 'Tên event',
              type: 'string',
              validation: r => r.required(),
            }),
            defineField({
              name: 'date',
              title: 'Ngày diễn ra',
              type: 'datetime',
            }),
            defineField({
              name: 'description',
              title: 'Mô tả event',
              type: 'text',
              rows: 2,
            }),
            defineField({
              name: 'discount',
              title: 'Giảm giá (%)',
              type: 'number',
              description: 'VD: 50 → "Up to 50% off"',
            }),
            defineField({
              name: 'link',
              title: 'Link event',
              type: 'url',
            }),
          ],
          preview: {
            select: { title: 'title', date: 'date', discount: 'discount' },
            prepare(value: Record<string, unknown>) {
              const { title, date, discount } = value as { title?: string; date?: string; discount?: number }
              const d = date ? new Date(date).toLocaleDateString('vi-VN') : 'Chưa có ngày'
              const pct = discount ? ` · -${discount}%` : ''
              return { title: title ?? 'Event', subtitle: `${d}${pct}` }
            },
          },
        },
      ],
    }),

    // ── SEO ────────────────────────────────────────────────────
    defineField({
      name: 'metaTitle',
      title: 'Meta Title',
      type: 'string',
      group: 'seo',
      description: 'Tiêu đề SEO — nếu bỏ trống tự dùng tên store',
    }),
    defineField({
      name: 'metaKeywords',
      title: 'Meta Keywords',
      type: 'string',
      group: 'seo',
      description: 'Từ khóa cách nhau bằng dấu phẩy — VD: amazon deals, amazon coupon, amazon promo code',
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta Description',
      type: 'text',
      rows: 3,
      group: 'seo',
      description: 'Mô tả SEO (150-160 ký tự) — nếu bỏ trống dùng mô tả ngắn',
    }),

    // ── AI Content Engine ──────────────────────────────────────
    defineField({
      name: 'aiReviewStatus',
      title: 'Trạng thái duyệt AI',
      type: 'string',
      group: 'ai',
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
      group: 'ai',
      readOnly: true,
      description: 'Nội dung AI đề xuất — duyệt tại /admin/ai-review, không chỉnh tay ở đây',
      fields: [
        defineField({ name: 'shortDescription', title: 'Mô tả ngắn (draft)', type: 'string' }),
        defineField({
          name: 'about',
          title: 'About Store (draft)',
          type: 'object',
          fields: [
            defineField({ name: 'tagline', title: 'Câu giới thiệu ngắn', type: 'string' }),
            defineField({ name: 'introBadgeEmoji', title: 'Emoji badge', type: 'string' }),
            defineField({ name: 'introText', title: 'Đoạn giới thiệu', type: 'text', rows: 3 }),
            ...(['productRange', 'customerBenefits', 'shoppingExperience', 'whyChoose'] as const).map(name =>
              defineField({
                name,
                title: { productRange: 'Card: Product Range', customerBenefits: 'Card: Customer Benefits', shoppingExperience: 'Card: Shopping Experience', whyChoose: 'Card: Why Choose' }[name],
                type: 'object',
                fields: [
                  defineField({ name: 'icon', title: 'Icon (emoji)', type: 'string' }),
                  defineField({ name: 'title', title: 'Tiêu đề', type: 'string' }),
                  defineField({ name: 'text', title: 'Nội dung', type: 'text', rows: 3 }),
                ],
              })
            ),
          ],
        }),
        defineField({ name: 'metaTitle', title: 'Meta Title (draft)', type: 'string' }),
        defineField({ name: 'metaKeywords', title: 'Meta Keywords (draft)', type: 'string' }),
        defineField({ name: 'metaDescription', title: 'Meta Description (draft)', type: 'text', rows: 3 }),
        defineField({
          name: 'faq',
          title: 'FAQ (draft)',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'faqItem',
              fields: [
                defineField({ name: 'question', title: 'Câu hỏi', type: 'string' }),
                defineField({ name: 'answer', title: 'Câu trả lời', type: 'text', rows: 3 }),
              ],
            },
          ],
        }),
        defineField({
          name: 'prosAndCons',
          title: 'Ưu/Nhược điểm (draft)',
          type: 'object',
          fields: [
            defineField({ name: 'pros', title: 'Ưu điểm', type: 'array', of: [{ type: 'string' }] }),
            defineField({ name: 'cons', title: 'Nhược điểm', type: 'array', of: [{ type: 'string' }] }),
          ],
        }),
        defineField({ name: 'generatedAt', title: 'Thời gian generate', type: 'datetime' }),
        defineField({ name: 'model', title: 'Model', type: 'string' }),
      ],
    }),
  ],

  preview: {
    select: {
      title: 'name',
      category: 'category',
      media: 'image',
      published: 'published',
      maxOffer: 'maxOffer',
    },
    prepare(value: Record<string, unknown>) {
      const { title, category, media, published, maxOffer } = value as {
        title?: string; category?: string; media?: unknown; published?: boolean; maxOffer?: number
      }
      const status = published !== false ? '🟢' : '🔴'
      const cat = category ? ` · ${category}` : ''
      const offer = maxOffer ? ` · Up to ${maxOffer}% off` : ''
      return {
        title: `${status} ${title ?? 'Chưa có tên'}`,
        subtitle: `${cat}${offer}`.replace(/^ · /, ''),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        media: media as any,
      }
    },
  },
})
