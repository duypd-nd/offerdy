import { defineField, defineType } from 'sanity'

export const categoryType = defineType({
  name: 'category',
  title: 'Category',
  type: 'document',
  fields: [
    defineField({ name: 'name', title: 'Name', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'name' }, validation: r => r.required() }),
    defineField({ name: 'emoji', title: 'Emoji', type: 'string', validation: r => r.required() }),
    defineField({ name: 'dealCount', title: 'Deal Count (e.g. 4,820 deals)', type: 'string' }),
    defineField({
      name: 'colorClass', title: 'Color Class', type: 'string',
      options: { list: ['ci-tech','ci-fashion','ci-beauty','ci-home','ci-food','ci-travel','ci-ai','ci-sports','ci-kids'] },
    }),
    defineField({ name: 'order', title: 'Display Order', type: 'number' }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'dealCount' },
  },
})
