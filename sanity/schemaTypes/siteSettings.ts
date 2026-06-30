import { defineType, defineField } from 'sanity'

export const siteSettingsType = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    // ── Thông tin cơ bản ──────────────────────────────────────
    defineField({ name: 'siteName', title: 'Tên website', type: 'string' }),
    defineField({ name: 'tagline', title: 'Slogan', type: 'string' }),
    defineField({
      name: 'seoDescription',
      title: 'Mô tả SEO',
      type: 'text',
      rows: 2,
      description: 'Hiển thị trên Google Search (~160 ký tự)',
    }),

    // ── Menu điều hướng ───────────────────────────────────────
    defineField({
      name: 'navigation',
      title: 'Menu điều hướng',
      type: 'array',
      description: 'Các mục hiển thị trên thanh nav và mobile menu',
      of: [{
        type: 'object',
        name: 'navItem',
        fields: [
          defineField({ name: 'label', title: 'Nhãn', type: 'string' }),
          defineField({ name: 'url', title: 'Đường dẫn (URL)', type: 'string' }),
        ],
        preview: { select: { title: 'label', subtitle: 'url' } },
      }],
    }),

    // ── Mạng xã hội ───────────────────────────────────────────
    defineField({
      name: 'socialMedia',
      title: 'Mạng xã hội',
      type: 'array',
      description: 'Các liên kết mạng xã hội hiển thị ở footer',
      of: [{
        type: 'object',
        name: 'socialItem',
        fields: [
          defineField({
            name: 'platform',
            title: 'Nền tảng',
            type: 'string',
            options: {
              list: [
                { title: 'Facebook', value: 'Facebook' },
                { title: 'X (Twitter)', value: 'X' },
                { title: 'Instagram', value: 'Instagram' },
                { title: 'YouTube', value: 'YouTube' },
                { title: 'LinkedIn', value: 'LinkedIn' },
                { title: 'TikTok', value: 'TikTok' },
              ],
            },
          }),
          defineField({ name: 'url', title: 'URL trang', type: 'url' }),
          defineField({
            name: 'icon',
            title: 'Ký hiệu hiển thị',
            type: 'string',
            description: 'Ký tự ngắn hoặc emoji. VD: f, 𝕏, in, ▶',
          }),
        ],
        preview: { select: { title: 'platform', subtitle: 'url' } },
      }],
    }),

    // ── Footer ────────────────────────────────────────────────
    defineField({
      name: 'footerColumns',
      title: 'Cột footer',
      type: 'array',
      description: 'Các cột liên kết ở footer (tối đa 4 cột)',
      of: [{
        type: 'object',
        name: 'footerColumn',
        fields: [
          defineField({ name: 'title', title: 'Tiêu đề cột', type: 'string' }),
          defineField({
            name: 'links',
            title: 'Danh sách liên kết',
            type: 'array',
            of: [{
              type: 'object',
              name: 'footerLink',
              fields: [
                defineField({ name: 'label', title: 'Nhãn', type: 'string' }),
                defineField({ name: 'url', title: 'URL', type: 'string' }),
              ],
              preview: { select: { title: 'label', subtitle: 'url' } },
            }],
          }),
        ],
        preview: { select: { title: 'title' } },
      }],
    }),

    defineField({
      name: 'copyrightText',
      title: 'Dòng bản quyền',
      type: 'string',
      description: 'Hiển thị ở đáy footer. VD: © 2026 Offerdy. Real deals, no spam.',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Site Settings' }),
  },
})
