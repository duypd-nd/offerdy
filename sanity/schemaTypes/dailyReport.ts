import { defineField, defineType } from 'sanity'

export const dailyReportType = defineType({
  name: 'dailyReport',
  title: 'Daily Report (AI)',
  type: 'document',
  readOnly: true,
  description: 'Tự động sinh mỗi ngày qua cron /api/cron/daily-report — không chỉnh tay',
  fields: [
    defineField({ name: 'generatedAt', title: 'Thời gian tạo', type: 'datetime' }),
    defineField({ name: 'summary', title: 'Tóm tắt (AI)', type: 'text', rows: 4 }),
    defineField({ name: 'recommendations', title: 'Đề xuất hành động (AI)', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'avgHealthScore', title: 'Điểm sức khỏe TB', type: 'number' }),
    defineField({ name: 'criticalStoreCount', title: 'Số store Poor/Critical', type: 'number' }),
    defineField({ name: 'brokenLinkCount', title: 'Số offer link hỏng', type: 'number' }),
    defineField({ name: 'missingContentCount', title: 'Số store thiếu nội dung', type: 'number' }),
    defineField({ name: 'openErrorCount', title: 'Số lỗi production chưa xử lý', type: 'number' }),
    defineField({ name: 'seoIssueCount', title: 'Số vấn đề SEO Audit', type: 'number' }),
    defineField({ name: 'todayClicks', title: 'Click hôm nay', type: 'number' }),
    defineField({ name: 'sevenDayClicks', title: 'Click 7 ngày qua', type: 'number' }),
    defineField({ name: 'needsAttentionCount', title: 'Offer có click cần chú ý', type: 'number' }),
    defineField({ name: 'zeroClickStoreCount', title: 'Số store chưa từng có click', type: 'number' }),
    defineField({ name: 'model', title: 'Model', type: 'string' }),
  ],
  preview: {
    select: { generatedAt: 'generatedAt', summary: 'summary' },
    prepare({ generatedAt, summary }: { generatedAt?: string; summary?: string }) {
      return {
        title: generatedAt ? new Date(generatedAt).toLocaleString('vi-VN') : 'Daily Report',
        subtitle: summary,
      }
    },
  },
})
