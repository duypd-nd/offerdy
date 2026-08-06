import { defineType, defineField } from 'sanity'
import { POST_CATEGORY_OPTIONS } from '@/lib/postCategory'

export const postType = defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  groups: [
    { name: 'content', title: 'Nội dung', default: true },
    { name: 'seo', title: 'SEO' },
    { name: 'ai', title: 'AI' },
  ],
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', group: 'content', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, group: 'content', validation: r => r.required() }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3, group: 'content' }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'content',
      // Dung chung danh sach voi giao dien — xem src/lib/postCategory.ts.
      options: { list: POST_CATEGORY_OPTIONS },
    }),
    defineField({ name: 'author', title: 'Author', type: 'string', group: 'content' }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'date',
      group: 'content',
      // ⚠️ De TRONG la bai CONG KHAI, khong phai ban nhap: bo loc cua du an la
      // `!defined(publishedAt) || publishedAt <= now()`. Ban nhap do AI sinh ra
      // duoc dat mot moc tuong lai (xem DRAFT_PUBLISHED_AT trong
      // src/lib/postDraft.ts) de khong ro ra trang cong khai.
      description: 'Để trống = ĐĂNG NGAY. Muốn giữ nháp thì đặt ngày ở tương lai.',
    }),
    defineField({ name: 'coverEmoji', title: 'Cover Emoji', type: 'string', group: 'content' }),
    defineField({ name: 'coverBg', title: 'Cover Background (CSS gradient)', type: 'string', group: 'content' }),
    defineField({ name: 'readTime', title: 'Read Time (minutes)', type: 'number', group: 'content' }),
    defineField({ name: 'content', title: 'Nội dung HTML', type: 'text', group: 'content' }),
    defineField({ name: 'image', title: 'Hình ảnh đại diện', type: 'image', options: { hotspot: true }, group: 'content' }),
    defineField({ name: 'externalImageUrl', title: 'Hình ảnh đại diện (link ngoài)', type: 'url', group: 'content' }),
    defineField({
      name: 'body',
      title: 'Body (Portable Text)',
      type: 'array',
      group: 'content',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    }),

    // ── SEO ──────────────────────────────────────────────────────
    // ⚠️ KHONG duoc chua chu "Offerdy": `titleTemplate` o layout tu them duoi
    // thuong hieu. Xem muc "Page titles" trong PROJECT_CONTEXT.md.
    defineField({
      name: 'metaTitle', title: 'Meta Title', type: 'string', group: 'seo',
      description: 'Để trống = dùng Title. KHÔNG chứa chữ "Offerdy" — đuôi thương hiệu do site tự thêm. Nên ≤ 48 ký tự.',
    }),
    defineField({
      name: 'metaDescription', title: 'Meta Description', type: 'text', rows: 2, group: 'seo',
      description: 'Để trống = dùng Excerpt. Nên ≤ 160 ký tự.',
    }),

    // ── Bai do AI sinh tu mot store ──────────────────────────────
    // ⚠️ Hai truong nay ton tai vi buoc DUYET go `aiDraft` di. Khong co cho chua
    // chung o cap post thi FAQ va bang so sanh bien mat ngay khi bai duoc duyet —
    // va do dung la hai thu trang bai can: `FAQPage` trong JSON-LD, va the [TABLE]
    // trong than bai duoc dung lai luc goi trang.
    defineField({
      name: 'faq', title: 'FAQ', type: 'array', group: 'content',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'question', title: 'Câu hỏi', type: 'string' }),
          defineField({ name: 'answer', title: 'Câu trả lời', type: 'text', rows: 3 }),
        ],
        preview: { select: { title: 'question' } },
      }],
    }),
    defineField({
      name: 'comparisonRows', title: 'Bảng so sánh', type: 'array', group: 'content',
      description: 'Dữ liệu có cấu trúc — trang tự dựng <table>. Số ô mỗi hàng khớp số sản phẩm trong bài.',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'label', title: 'Tiêu chí', type: 'string' }),
          defineField({ name: 'values', title: 'Giá trị', type: 'array', of: [{ type: 'string' }] }),
        ],
        preview: { select: { title: 'label' } },
      }],
    }),
    defineField({
      name: 'notAnswered', title: 'Bài KHÔNG trả lời được', type: 'array', group: 'content',
      description:
        'Câu hỏi người mua sẽ hỏi mà trang sản phẩm của shop không trả lời được. HIỆN CÔNG KHAI cuối bài — ' +
        'đây là thứ trung thực nhất luồng này sản xuất ra, và trước 06/08/2026 nó chết trong aiDraft.warnings.',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'sourceStore', title: 'Store nguồn', type: 'reference', to: [{ type: 'store' }], group: 'content',
      description: 'Bài viết về sản phẩm của shop này. Dùng để lấy mã giảm giá và gắn link tiếp thị.',
    }),
    defineField({
      name: 'articleProducts', title: 'Sản phẩm trong bài', type: 'array', group: 'content',
      description: 'Giá được chụp lại lúc viết bài — trang hiển thị kèm mốc thời gian, không giả vờ là giá thời gian thực.',
      of: [{
        type: 'object',
        fields: [
          defineField({ name: 'url', title: 'URL sản phẩm', type: 'url' }),
          defineField({ name: 'title', title: 'Tên sản phẩm', type: 'string' }),
          defineField({ name: 'imageUrl', title: 'Ảnh', type: 'url' }),
          defineField({ name: 'priceAtWriting', title: 'Giá lúc viết', type: 'string' }),
          defineField({ name: 'currency', title: 'Tiền tệ', type: 'string' }),
          defineField({ name: 'capturedAt', title: 'Chụp lúc', type: 'datetime' }),
        ],
        preview: { select: { title: 'title', subtitle: 'priceAtWriting' } },
      }],
    }),

    // ── AI ───────────────────────────────────────────────────────
    // Cung khuon voi store/offer/deal: ban nhap nam rieng o `aiDraft`, duyet o
    // /admin/ai-review moi chep sang truong that roi go `aiDraft` di.
    defineField({
      name: 'aiReviewStatus', title: 'Trạng thái duyệt AI', type: 'string', group: 'ai',
      initialValue: 'none', readOnly: true,
      description: 'Quản lý qua trang /admin/ai-review — không chỉnh tay.',
      options: { list: ['none', 'pending', 'approved', 'rejected'] },
    }),
    defineField({
      name: 'aiDraft', title: 'Bản nháp AI', type: 'object', group: 'ai', readOnly: true,
      fields: [
        defineField({ name: 'title', type: 'string' }),
        defineField({ name: 'excerpt', type: 'text', rows: 2 }),
        defineField({ name: 'contentHtml', type: 'text', rows: 10 }),
        defineField({ name: 'metaTitle', type: 'string' }),
        defineField({ name: 'metaDescription', type: 'text', rows: 2 }),
        defineField({ name: 'coverEmoji', type: 'string' }),
        defineField({ name: 'coverBg', type: 'string' }),
        defineField({ name: 'readTime', type: 'number' }),
        defineField({ name: 'templateId', type: 'string' }),
        defineField({
          name: 'faq', type: 'array',
          of: [{ type: 'object', fields: [
            defineField({ name: 'question', type: 'string' }),
            defineField({ name: 'answer', type: 'text', rows: 2 }),
          ] }],
        }),
        defineField({
          name: 'comparisonRows', type: 'array',
          of: [{ type: 'object', fields: [
            defineField({ name: 'label', type: 'string' }),
            defineField({ name: 'values', type: 'array', of: [{ type: 'string' }] }),
          ] }],
        }),
        // ⚠️ Phai co ban sao o CA HAI cap. Buoc duyet `.unset(['aiDraft'])`, nen thu gi
        // khong co cho o cap post se bien mat dung luc bai duoc duyet — dung ly do `faq`
        // va `comparisonRows` da phai them vao cap post truoc do.
        defineField({ name: 'notAnswered', type: 'array', of: [{ type: 'string' }] }),
        // Canh bao "mem" cua bo hau kiem — bai van duoc tao nhung nguoi duyet
        // phai nhin thay. Vd: ten rieng khong co trong danh muc san pham.
        defineField({ name: 'warnings', type: 'array', of: [{ type: 'string' }] }),
        defineField({ name: 'generatedAt', type: 'datetime' }),
        defineField({ name: 'model', type: 'string' }),
      ],
    }),
  ],
  orderings: [{ title: 'Published Date, New', name: 'publishedAtDesc', by: [{ field: 'publishedAt', direction: 'desc' }] }],
})
