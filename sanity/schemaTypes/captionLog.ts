import { defineType, defineField } from 'sanity'

/**
 * Nhat ky caption AI da sinh, doi chieu duoc voi so click qua nhan `?s=`.
 *
 * Vi sao can luu: `?s=` da cho biet GOC nao ra click, nhung thong tin do khong quay
 * lai cho sinh caption. Luu lai thi lan sau co the dua chinh nhung caption da chung
 * minh la an vao prompt lam vi du — AI thoi viet theo ly thuyet ma viet theo thu
 * da hop voi khan gia that cua kenh.
 *
 * Ban ghi chi tao khi admin BAM DUNG mot ban (khong luu moi thu AI sinh ra): thu bi
 * bo di khong noi len dieu gi, va luu het se lam nhieu du lieu doi chieu.
 *
 * Khong hien o Studio duoi dang noi dung bien tap — day la du lieu van hanh.
 */
export const captionLogType = defineType({
  name: 'captionLog',
  title: 'Nhật ký caption AI',
  type: 'document',
  fields: [
    defineField({ name: 'campaign', title: 'Nhãn (?s=)', type: 'string', readOnly: true }),
    defineField({ name: 'dealCode', title: 'Mã sản phẩm', type: 'number', readOnly: true }),
    defineField({ name: 'angle', title: 'Góc', type: 'string', readOnly: true }),
    defineField({ name: 'platform', title: 'Nền tảng', type: 'string', readOnly: true }),
    defineField({ name: 'text', title: 'Caption', type: 'text', rows: 8, readOnly: true }),
    defineField({ name: 'usedAt', title: 'Thời điểm chọn', type: 'datetime', readOnly: true }),
  ],
  preview: {
    select: { campaign: 'campaign', angle: 'angle', text: 'text' },
    prepare({ campaign, angle, text }) {
      return { title: campaign ?? '(chưa có nhãn)', subtitle: `${angle ?? '?'} — ${(text ?? '').slice(0, 60)}` }
    },
  },
})
