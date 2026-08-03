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
      name: 'productUrl',
      title: 'Link trang sản phẩm',
      type: 'url',
      description:
        'URL trang sản phẩm cụ thể, dán TRẦN (không cần ?ref=…) — code tự gắn mã ref của shop. Để trống = dùng link chung của cửa hàng.',
    }),
    defineField({
      name: 'description',
      title: 'Mô tả chi tiết',
      type: 'text',
      rows: 3,
      description: 'Thông tin thêm về điều kiện áp dụng, sản phẩm áp dụng…',
    }),
    defineField({
      name: 'usageTips',
      title: 'Cách dùng (usage tips)',
      type: 'string',
      description: '1 câu ngắn hướng dẫn cách áp dụng offer này',
    }),
    defineField({
      name: 'eligibilityNotes',
      title: 'Điều kiện áp dụng (eligibility)',
      type: 'string',
      description: '1 câu ngắn về điều kiện/giới hạn áp dụng (nếu có)',
    }),
    defineField({
      name: 'expiresAt',
      title: 'Hết hạn vào',
      type: 'datetime',
      description: 'Để trống nếu không có ngày hết hạn',
    }),
    // ── Thu ma that o quay thanh toan ───────────────────────────
    // Khac han `verified` (mac dinh true, khong ai bam) va `linkCheckedAt` (cron
    // chi kiem link CON SONG). Ba truong nay ghi lai viec nguoi that mang ma di
    // ap vao gio hang that.
    //
    // Vi sao dang co: ca nganh coupon do duoc 26,2% ma bi tu choi khi thanh toan
    // (78,8 trieu luot thu), va 87,6% phieu binh chon cua nguoi dung la phieu che
    // — nen mot nhan "Verified" khong kem ngay thang gan nhu vo gia tri. Ket qua
    // thu that, co ngay, la thu duy nhat doi thu khong sao chep duoc, va dung la
    // "Information Gain" ma Google 2026 cham diem.
    //
    // ⚠️ Chi DIEN TAY. Khong co cron nao duoc phep ghi vao day — dat mot ngay tu
    // dong vao o "da thu that" la bien no thanh mot nhan rong thu hai.
    defineField({
      name: 'codeTestedAt',
      title: 'Đã thử mã lúc',
      type: 'datetime',
      description: 'Thời điểm BẠN thật sự mang mã đi áp vào giỏ hàng. Để trống nếu chưa thử.',
    }),
    defineField({
      name: 'codeTestResult',
      title: 'Kết quả thử',
      type: 'string',
      options: {
        list: [
          { title: '✅ Áp được', value: 'worked' },
          { title: '⚠️ Áp được nhưng có điều kiện', value: 'partial' },
          { title: '❌ Bị từ chối', value: 'rejected' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'codeTestNote',
      title: 'Quan sát được gì',
      type: 'string',
      description:
        'Viết đúng thứ nhìn thấy trên màn hình thanh toán, ví dụ "giảm 10%, không yêu cầu đơn tối thiểu, không áp cho hàng sale". Câu này hiện công khai.',
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

    // ── Link Health ─────────────────────────────────────────────
    defineField({
      name: 'linkStatus',
      title: 'Trạng thái link',
      type: 'string',
      initialValue: 'unchecked',
      options: {
        list: [
          { title: 'Chưa kiểm tra', value: 'unchecked' },
          { title: 'Còn hoạt động', value: 'ok' },
          { title: 'Hỏng', value: 'broken' },
        ],
      },
      readOnly: true,
      description: 'Tự động cập nhật từ /admin/link-checker hoặc cron kiểm tra link — không chỉnh tay',
    }),
    defineField({
      name: 'linkCheckedAt',
      title: 'Lần kiểm tra link gần nhất',
      type: 'datetime',
      readOnly: true,
    }),

    // ── AI Content Engine ──────────────────────────────────────
    defineField({
      name: 'aiReviewStatus',
      title: 'Trạng thái duyệt AI',
      type: 'string',
      initialValue: 'none',
      options: {
        list: [
          { title: 'Chưa có draft', value: 'none' },
          { title: 'Chờ duyệt', value: 'pending' },
          { title: 'Đã duyệt', value: 'approved' },
          { title: 'Đã từ chối', value: 'rejected' },
        ],
      },
      readOnly: true,
      description: 'Quản lý qua trang /admin/ai-review — không chỉnh tay',
    }),
    defineField({
      name: 'aiDraft',
      title: 'AI Draft (chờ duyệt)',
      type: 'object',
      readOnly: true,
      description: 'Nội dung AI đề xuất — duyệt tại /admin/ai-review, không chỉnh tay ở đây',
      fields: [
        defineField({ name: 'description', title: 'Mô tả chi tiết (draft)', type: 'text', rows: 3 }),
        defineField({ name: 'usageTips', title: 'Cách dùng (draft)', type: 'string' }),
        defineField({ name: 'eligibilityNotes', title: 'Điều kiện áp dụng (draft)', type: 'string' }),
        defineField({ name: 'generatedAt', title: 'Thời gian generate', type: 'datetime' }),
        defineField({ name: 'model', title: 'Model', type: 'string' }),
      ],
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
