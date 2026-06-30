import { defineField, defineType } from 'sanity'

export const reviewType = defineType({
  name: 'review',
  title: 'Review / Comparison',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: r => r.required() }),
    defineField({ name: 'excerpt', title: 'Excerpt', type: 'text', rows: 3, validation: r => r.required() }),
    defineField({ name: 'emoji', title: 'Emoji', type: 'string' }),
    defineField({
      name: 'tag', title: 'Type', type: 'string',
      options: { list: ['Review', 'Comparison'], layout: 'radio' },
      validation: r => r.required(),
    }),
    defineField({ name: 'stars', title: 'Stars (1-5)', type: 'number', validation: r => r.required().min(1).max(5) }),
    defineField({ name: 'publishedAt', title: 'Published At', type: 'date', validation: r => r.required() }),
    defineField({ name: 'imgBg', title: 'Card Background Gradient', type: 'string', description: 'CSS gradient, e.g. linear-gradient(135deg,#EEF2FF,#C7D2FE)' }),
    defineField({ name: 'content', title: 'Nội dung HTML', type: 'text' }),
    defineField({ name: 'image', title: 'Hình ảnh đại diện', type: 'image', options: { hotspot: true } }),
    defineField({ name: 'externalImageUrl', title: 'External Image URL', type: 'url' }),
    defineField({
      name: 'body', title: 'Full Article (Portable Text)', type: 'array',
      of: [{ type: 'block' }, { type: 'image', options: { hotspot: true } }],
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'tag' },
  },
})
