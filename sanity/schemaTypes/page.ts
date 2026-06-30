import { defineField, defineType } from 'sanity'

export const pageType = defineType({
  name: 'page',
  title: 'Trang tĩnh',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Tiêu đề', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: r => r.required() }),
    defineField({ name: 'excerpt', title: 'Mô tả ngắn', type: 'text', rows: 2 }),
    defineField({ name: 'content', title: 'Nội dung HTML', type: 'text' }),
    defineField({ name: 'image', title: 'Hình ảnh đại diện', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'published', title: 'Hiển thị', type: 'boolean', initialValue: true }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'slug.current' },
    prepare: ({ title, subtitle }) => ({ title, subtitle: `/${subtitle}` }),
  },
})
