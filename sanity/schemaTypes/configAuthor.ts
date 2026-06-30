import { defineType, defineField } from 'sanity'

export const configAuthorType = defineType({
  name: 'configAuthor',
  title: 'Cấu hình tác giả',
  type: 'document',
  fields: [
    defineField({ name: 'defaultName', title: 'Tên tác giả mặc định', type: 'string' }),
    defineField({ name: 'role', title: 'Chức danh', type: 'string', placeholder: 'VD: Editor, Content Writer' }),
    defineField({
      name: 'avatar',
      title: 'Ảnh đại diện',
      type: 'image',
      description: 'Ảnh vuông, khuyến nghị 200×200px',
      options: { hotspot: true },
    }),
    defineField({
      name: 'bio',
      title: 'Giới thiệu ngắn',
      type: 'text',
      rows: 3,
      description: 'Hiển thị dưới bài viết blog/review',
    }),
    defineField({ name: 'email', title: 'Email liên hệ', type: 'string' }),
    defineField({ name: 'twitterHandle', title: 'Twitter/X handle', type: 'string', description: 'VD: @offerdy (không bắt buộc)' }),
  ],
  preview: { prepare: () => ({ title: 'Cấu hình tác giả' }) },
})
