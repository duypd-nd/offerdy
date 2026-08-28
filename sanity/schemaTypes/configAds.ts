import { defineType, defineField } from 'sanity'

export const configAdsType = defineType({
  name: 'configAds',
  title: 'Cấu hình Ads',
  type: 'document',
  fields: [
    defineField({
      name: 'enableAds',
      title: 'Bật quảng cáo',
      type: 'boolean',
      initialValue: false,
      description: 'Bật/tắt toàn bộ quảng cáo trên website',
    }),

    defineField({
      name: 'googleAdsenseId',
      title: 'Google AdSense ID',
      type: 'string',
      description: 'VD: ca-pub-1234567890123456',
    }),

    defineField({
      name: 'headerBannerSlot',
      title: 'Slot quảng cáo — Header Banner',
      type: 'string',
      description: 'Ad Unit ID cho banner phía trên header (728×90)',
    }),
    defineField({
      name: 'inFeedSlot',
      title: 'Slot quảng cáo — In-feed',
      type: 'string',
      description: 'Ad Unit ID hiển thị xen giữa danh sách deals',
    }),
    defineField({
      name: 'sidebarSlot',
      title: 'Slot quảng cáo — Sidebar',
      type: 'string',
      description: 'Ad Unit ID cho sidebar (300×250)',
    }),
    defineField({
      name: 'articleSlot',
      title: 'Slot quảng cáo — Trong bài viết',
      type: 'string',
      description: 'Ad Unit ID hiển thị giữa nội dung bài review/blog',
    }),

    defineField({
      name: 'googleTagManagerId',
      title: 'Google Tag Manager ID',
      type: 'string',
      description: 'VD: GTM-XXXXXXX (nếu dùng GTM thay vì trực tiếp AdSense)',
    }),
    defineField({
      name: 'facebookPixelId',
      title: 'Facebook Pixel ID',
      type: 'string',
    }),

    // ── MUA quảng cáo (khác hẳn phần trên: trên là HIỂN THỊ quảng cáo để kiếm
    // tiền, dưới là TIÊU tiền mua lượt truy cập). Hai ô này là toàn bộ phần
    // "giả định" của /admin/ads — cố ý gom về một chỗ, khai báo một lần, nhìn
    // thấy được và sửa được.
    //
    // ⚠️ Đây KHÔNG phải số đo. Doanh thu affiliate thật nằm bên GoAffPro và site
    // không nhìn thấy, nên hai ô này là thứ duy nhất cho phép quy một lượt bấm
    // sang merchant ra tiền. Sai ở đây thì mọi phán quyết tăng/giữ/dừng đều sai
    // theo — nên giao diện phải luôn in kèm giả định, đừng giấu nó đi.
    defineField({
      name: 'estimatedOrderRate',
      title: '⟶ Ước tính: bao nhiêu % khách bấm sang merchant sẽ mua?',
      type: 'number',
      validation: r => r.min(0).max(100),
      description:
        'GIẢ ĐỊNH, không phải số đo — GoAffPro giữ số thật. Traffic coupon thường 1–3%. ' +
        'Đặt cao là tự cho phép mình tiêu nhiều hơn mức an toàn.',
    }),
    defineField({
      name: 'tyGiaVndPerUsd',
      title: '⟶ Tỉ giá: 1 USD = ? VNĐ',
      type: 'number',
      validation: r => r.min(1),
      description:
        'Để nhập chi phí Google Ads thẳng bằng đồng. Tài khoản Google Ads của Offerdy ' +
        'tính bằng VNĐ còn trang này tính bằng USD. Đo 28/08/2026: ~26.200. ' +
        'Tỉ giá dùng lúc nhập được LƯU LẠI theo từng ngày, nên sửa ô này không làm ' +
        'số cũ chạy lung tung.',
    }),

    defineField({
      name: 'fallbackEarningsPerOrder',
      title: '⟶ Hoa hồng mỗi đơn (USD) khi store chưa khai',
      type: 'number',
      validation: r => r.min(0),
      description:
        'Dùng khi store chưa điền "% hoa hồng" và "Giá trị đơn TB" ở /admin/ad-planner ' +
        '(đo 28/08/2026: 0/107 store đã khai). Số của store luôn thắng số này.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Cấu hình Ads' }) },
})
