import { defineType, defineField } from 'sanity'

export const configSocialType = defineType({
  name: 'configSocial',
  title: 'Cấu hình mạng xã hội',
  type: 'document',
  fields: [
    defineField({ name: 'facebook', title: 'Facebook', type: 'url', description: 'VD: https://facebook.com/offerdy' }),
    defineField({ name: 'twitter', title: 'X (Twitter)', type: 'url' }),
    defineField({ name: 'instagram', title: 'Instagram', type: 'url' }),
    defineField({ name: 'youtube', title: 'YouTube', type: 'url' }),
    defineField({ name: 'linkedin', title: 'LinkedIn', type: 'url' }),
    defineField({ name: 'tiktok', title: 'TikTok', type: 'url' }),
    defineField({ name: 'pinterest', title: 'Pinterest', type: 'url' }),
    defineField({ name: 'telegram', title: 'Telegram', type: 'url' }),
  ],
  preview: { prepare: () => ({ title: 'Cấu hình mạng xã hội' }) },
})
