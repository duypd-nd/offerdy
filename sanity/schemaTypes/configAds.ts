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
  ],
  preview: { prepare: () => ({ title: 'Cấu hình Ads' }) },
})
