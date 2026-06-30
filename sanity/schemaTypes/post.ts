import { defineType, defineField } from 'sanity'

export const postType = defineType({
  name: 'post',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: r => r.required() }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3 }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Tips & Guides', value: 'Tips & Guides' },
          { title: 'Comparison', value: 'Comparison' },
          { title: 'Store Guide', value: 'Store Guide' },
          { title: 'Deals Roundup', value: 'Deals Roundup' },
          { title: 'News', value: 'News' },
        ],
      },
    }),
    defineField({ name: 'author', title: 'Author', type: 'string' }),
    defineField({ name: 'publishedAt', title: 'Published At', type: 'date' }),
    defineField({ name: 'coverEmoji', title: 'Cover Emoji', type: 'string' }),
    defineField({ name: 'coverBg', title: 'Cover Background (CSS gradient)', type: 'string' }),
    defineField({ name: 'readTime', title: 'Read Time (minutes)', type: 'number' }),
    defineField({ name: 'content', title: 'Nội dung HTML', type: 'text' }),
    defineField({ name: 'image', title: 'Hình ảnh đại diện', type: 'image', options: { hotspot: true } }),
    defineField({
      name: 'body',
      title: 'Body (Portable Text)',
      type: 'array',
      of: [
        { type: 'block' },
        { type: 'image', options: { hotspot: true } },
      ],
    }),
  ],
  orderings: [{ title: 'Published Date, New', name: 'publishedAtDesc', by: [{ field: 'publishedAt', direction: 'desc' }] }],
})
