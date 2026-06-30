import { defineField, defineType } from 'sanity'

export const dealType = defineType({
  name: 'deal',
  title: 'Deal',
  type: 'document',
  fields: [
    defineField({ name: 'title', title: 'Title', type: 'string', validation: r => r.required() }),
    defineField({ name: 'slug', title: 'Slug', type: 'slug', options: { source: 'title' }, validation: r => r.required() }),
    defineField({ name: 'store', title: 'Store (e.g. Apple · Best Buy)', type: 'string', validation: r => r.required() }),
    defineField({ name: 'emoji', title: 'Emoji', type: 'string', description: 'e.g. 🎧 📺 👟' }),
    defineField({
      name: 'imgClass', title: 'Image Background', type: 'string',
      options: { list: ['di-tech', 'di-home', 'di-fashion', 'di-beauty'] },
    }),
    defineField({ name: 'priceSale', title: 'Sale Price (e.g. $189)', type: 'string', validation: r => r.required() }),
    defineField({ name: 'priceOrig', title: 'Original Price (e.g. $249)', type: 'string', validation: r => r.required() }),
    defineField({ name: 'discount', title: 'Discount %', type: 'number', validation: r => r.required().min(1).max(99) }),
    defineField({ name: 'verified', title: 'Verified', type: 'boolean', initialValue: true }),
    defineField({ name: 'isExpiring', title: 'Expiring Soon?', type: 'boolean', initialValue: false }),
    defineField({ name: 'expiresAt', title: 'Expires At', type: 'datetime' }),
    defineField({ name: 'dealUrl', title: 'Deal URL', type: 'url' }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'store', media: 'emoji' },
    prepare({ title, subtitle }) { return { title, subtitle } },
  },
})
