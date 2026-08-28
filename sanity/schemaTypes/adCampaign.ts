import { defineType, defineField } from 'sanity'

/**
 * Mot chien dich Google Ads dang duoc theo doi.
 *
 * ⚠️ TAI LIEU NAY KHONG DIEU KHIEN GOOGLE. No la so ghi chep phia minh: Google
 * Ads van la noi bat/tat that. Ly do la co y — tran ngan sach va lenh tat phai
 * nam BEN GOOGLE (Google Ads Script / Automated Rules) de cron cua ta chet thi
 * tran van giu. Mot cai nut o admin nay ma Google khong nghe se cho cam giac an
 * toan gia, va do la kieu hong dat nhat cua du an nay.
 *
 * ⚠️ `campaignTag` la SOI DAY DUY NHAT noi tien ra voi ket qua vao. No phai
 * xuat hien trong URL dich cua quang cao duoi dang `?s=<tag>`, roi
 * `src/lib/proxyAttribution.ts` ghi no vao cookie, roi `trackClick.ts` ghi no
 * vao tai lieu `click`. Dat sai o mot mat xich la chien dich do vinh vien khong
 * quy duoc ket qua — va no hong IM LANG, khong co thong bao nao.
 */
export const adCampaignType = defineType({
  name: 'adCampaign',
  title: 'Chiến dịch quảng cáo',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Tên chiến dịch',
      type: 'string',
      validation: r => r.required(),
      description: 'Đặt trùng tên bên Google Ads để dễ đối chiếu.',
    }),

    defineField({
      name: 'campaignTag',
      title: 'Nhãn theo dõi (?s=)',
      type: 'string',
      validation: r => r.required().regex(/^[a-z0-9_-]{1,24}$/, {
        name: 'chữ thường, số, gạch ngang/dưới, tối đa 24 ký tự',
      }),
      description:
        'Dán vào URL đích của quảng cáo: https://www.offerdy.com/blog/abc?s=NHÃN-NÀY. ' +
        'Đây là thứ duy nhất nối tiền quảng cáo với lượt bấm sang merchant — sai là mất số liệu.',
    }),

    defineField({
      name: 'destinationType',
      title: 'Loại trang đích',
      type: 'string',
      initialValue: 'blog',
      options: {
        list: [
          { title: '📝 Bài blog', value: 'blog' },
          { title: '⭐ Bài review', value: 'review' },
          { title: '🏬 Trang store', value: 'store' },
        ],
        layout: 'radio',
      },
      validation: r => r.required(),
      description:
        'Trang store là bridge page theo cách Google định nghĩa và dễ bị từ chối; ' +
        'blog/review có nội dung gốc nên chống đỡ được. Chọn store thì phải khai ' +
        '"Cho chạy quảng cáo trả tiền?" ở store đó trước.',
    }),

    // Tham chieu YEU (_weak) va khong bat buoc: xoa mot bai blog khong duoc lam
    // hong so ghi chep chi tieu. Cung nguyen tac voi ban ghi `click` trong
    // `trackClick.ts` — so lieu lich su phai song sot qua viec xoa noi dung.
    defineField({
      name: 'destinationStore',
      title: 'Store đích',
      type: 'reference',
      to: [{ type: 'store' }],
      weak: true,
      hidden: ({ parent }) => parent?.destinationType !== 'store',
    }),
    defineField({
      name: 'destinationPost',
      title: 'Bài blog đích',
      type: 'reference',
      to: [{ type: 'post' }],
      weak: true,
      hidden: ({ parent }) => parent?.destinationType !== 'blog',
    }),
    defineField({
      name: 'destinationReview',
      title: 'Bài review đích',
      type: 'reference',
      to: [{ type: 'review' }],
      weak: true,
      hidden: ({ parent }) => parent?.destinationType !== 'review',
    }),

    defineField({
      name: 'dailyBudget',
      title: 'Ngân sách/ngày (USD)',
      type: 'number',
      validation: r => r.min(0),
      description: 'Con số đang đặt bên Google Ads. Ghi ở đây để đối chiếu, KHÔNG điều khiển Google.',
    }),
    defineField({
      name: 'maxDailyBudget',
      title: 'Trần ngân sách/ngày (USD)',
      type: 'number',
      validation: r => r.min(0),
      description:
        'Mức không bao giờ được vượt. ⚠️ Trần THẬT phải đặt bằng Google Ads Script ' +
        'phía Google — ô này chỉ để admin cảnh báo khi chi tiêu nhập vào đã vượt.',
    }),

    defineField({
      name: 'status',
      title: 'Trạng thái',
      type: 'string',
      initialValue: 'draft',
      options: {
        list: [
          { title: '📄 Nháp — chưa chạy', value: 'draft' },
          { title: '▶️ Đang chạy', value: 'active' },
          { title: '⏸️ Đã tạm dừng', value: 'paused' },
        ],
        layout: 'radio',
      },
    }),

    defineField({ name: 'startedAt', title: 'Bắt đầu chạy lúc', type: 'datetime' }),
    defineField({ name: 'note', title: 'Ghi chú', type: 'text', rows: 3 }),
  ],

  preview: {
    select: { name: 'name', tag: 'campaignTag', status: 'status', dest: 'destinationType' },
    prepare({ name, tag, status, dest }) {
      const icon = status === 'active' ? '▶️' : status === 'paused' ? '⏸️' : '📄'
      return { title: `${icon} ${name ?? '(chưa đặt tên)'}`, subtitle: `?s=${tag ?? '?'} — ${dest ?? '?'}` }
    },
  },
})
