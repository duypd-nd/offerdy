import { defineType, defineField } from 'sanity'

export const configGeneralType = defineType({
  name: 'configGeneral',
  title: 'Cấu hình chung',
  type: 'document',
  fields: [
    defineField({ name: 'siteName', title: 'Tên website', type: 'string' }),
    defineField({ name: 'tagline', title: 'Slogan', type: 'string' }),

    defineField({
      name: 'logo',
      title: 'Logo trang web',
      type: 'image',
      description: 'PNG/SVG nền trong hoặc nền trắng. Khuyến nghị: 200×60px',
      options: { hotspot: false },
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      description: 'Ảnh vuông 32×32px hoặc 64×64px',
      options: { hotspot: false },
    }),

    defineField({
      name: 'navigation',
      title: 'Menu điều hướng',
      description: 'Các mục hiển thị trên thanh nav',
      type: 'array',
      of: [{
        type: 'object',
        name: 'navItem',
        fields: [
          defineField({ name: 'label', title: 'Nhãn', type: 'string' }),
          defineField({ name: 'url', title: 'URL', type: 'string' }),
        ],
        preview: { select: { title: 'label', subtitle: 'url' } },
      }],
    }),

    defineField({
      name: 'footerColumns',
      title: 'Cột footer',
      type: 'array',
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

    defineField({ name: 'copyrightText', title: 'Dòng bản quyền (footer)', type: 'string' }),
  ],
  preview: { prepare: () => ({ title: 'Cấu hình chung' }) },
})
