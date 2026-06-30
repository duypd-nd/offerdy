import { defineType, defineField } from 'sanity'

export const configSEOType = defineType({
  name: 'configSEO',
  title: 'Cấu hình SEO',
  type: 'document',
  fields: [
    defineField({
      name: 'titleTemplate',
      title: 'Template tiêu đề trang',
      type: 'string',
      description: 'Dùng %s để đặt tên trang. VD: %s | Offerdy',
      placeholder: '%s | Offerdy — Real Deals. Verified.',
    }),
    defineField({
      name: 'defaultTitle',
      title: 'Tiêu đề mặc định (trang chủ)',
      type: 'string',
    }),
    defineField({
      name: 'defaultDescription',
      title: 'Meta description mặc định',
      type: 'text',
      rows: 2,
      description: '~155 ký tự. Hiển thị trên Google khi không có description riêng.',
    }),
    defineField({
      name: 'defaultOgImage',
      title: 'Ảnh Open Graph mặc định',
      type: 'image',
      description: 'Hiển thị khi chia sẻ lên mạng xã hội. 1200×630px',
    }),
    defineField({
      name: 'keywords',
      title: 'Từ khóa chung',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      description: 'Từ khóa chung của toàn site',
    }),
    defineField({
      name: 'googleSiteVerification',
      title: 'Google Site Verification',
      type: 'string',
      description: 'Mã xác minh từ Google Search Console',
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      description: 'Domain chính của website. VD: https://offerdy.com',
    }),
    defineField({
      name: 'twitterCard',
      title: 'Twitter Card type',
      type: 'string',
      options: {
        list: [
          { title: 'Summary', value: 'summary' },
          { title: 'Summary Large Image', value: 'summary_large_image' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: { prepare: () => ({ title: 'Cấu hình SEO' }) },
})
