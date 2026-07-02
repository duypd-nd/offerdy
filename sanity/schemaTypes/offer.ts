import { defineField, defineType } from 'sanity'

export const offerType = defineType({
  name: 'offer',
  title: 'Offer',
  type: 'document',
  fields: [
    defineField({
      name: 'active',
      title: 'Duyệt (hiển thị trên web)',
      type: 'boolean',
      initialValue: true,
      description: 'Bật = xuất hiện trên web · Tắt = ẩn đi',
    }),
    defineField({
      name: 'verified',
      title: 'Verified (đã kiểm tra)',
      type: 'boolean',
      initialValue: true,
      description: 'Bật = hiện badge ✓ Verified trên offer',
    }),
    defineField({
      name: 'order',
      title: 'STT (thứ tự ưu tiên)',
      type: 'number',
      initialValue: 0,
      description: 'Số càng lớn hiện càng lên trên',
    }),
    defineField({
      name: 'title',
      title: 'Tên Offer',
      type: 'string',
      validation: r => r.required(),
      description: 'Ví dụ: Giảm 30% toàn bộ sản phẩm',
    }),
    defineField({
      name: 'store',
      title: 'Cửa hàng',
      type: 'reference',
      to: [{ type: 'store' }],
      validation: r => r.required(),
    }),
    defineField({
      name: 'offerText',
      title: 'Nội dung ưu đãi',
      type: 'string',
      validation: r => r.required(),
      description: 'Tóm tắt ngắn gọn · Ví dụ: Giảm thêm 20% khi nhập mã',
    }),
    defineField({
      name: 'couponCode',
      title: 'Mã giảm giá',
      type: 'string',
      description: 'Ví dụ: SAVE20 — để trống nếu offer không cần mã',
    }),
    defineField({
      name: 'link',
      title: 'Link liên kết',
      type: 'url',
      validation: r => r.required(),
      description: 'URL dẫn đến trang offer của cửa hàng',
    }),
    defineField({
      name: 'description',
      title: 'Mô tả chi tiết',
      type: 'text',
      rows: 3,
      description: 'Thông tin thêm về điều kiện áp dụng, sản phẩm áp dụng…',
    }),
    defineField({
      name: 'expiresAt',
      title: 'Hết hạn vào',
      type: 'datetime',
      description: 'Để trống nếu không có ngày hết hạn',
    }),
    defineField({
      name: 'votesActive',
      title: 'Votes: Still Works',
      type: 'number',
      initialValue: 0,
      description: 'Số người xác nhận offer này còn hoạt động (tự động cập nhật từ website)',
      readOnly: false,
    }),
    defineField({
      name: 'votesExpired',
      title: 'Votes: Expired / Not Working',
      type: 'number',
      initialValue: 0,
      description: 'Số người báo offer này đã hết hạn hoặc không hoạt động',
      readOnly: false,
    }),
    defineField({
      name: 'clicks',
      title: 'Lượt click (Get Code / Get Deal)',
      type: 'number',
      initialValue: 0,
      description: 'Số lần khách bấm nút Get Code/Get Deal (tự động cập nhật từ website)',
      readOnly: true,
    }),
  ],
  orderings: [
    {
      title: 'Mới nhất',
      name: 'createdDesc',
      by: [{ field: '_createdAt', direction: 'desc' }],
    },
    {
      title: 'Đang hiển thị trước',
      name: 'activeFirst',
      by: [{ field: 'active', direction: 'desc' }, { field: '_createdAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      title: 'title',
      storeName: 'store.name',
      active: 'active',
      couponCode: 'couponCode',
    },
    prepare({ title, storeName, active, couponCode }: {
      title: string; storeName?: string; active?: boolean; couponCode?: string
    }) {
      const status = active !== false ? '🟢' : '🔴'
      const code = couponCode ? ` · 🏷️ ${couponCode}` : ''
      return {
        title: `${status} ${title ?? 'Chưa có tên'}`,
        subtitle: `${storeName ?? '— chưa chọn cửa hàng'}${code}`,
      }
    },
  },
})
