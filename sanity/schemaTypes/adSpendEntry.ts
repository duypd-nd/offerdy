import { defineType, defineField } from 'sanity'

/**
 * Chi tieu quang cao MOT NGAY cua MOT chien dich, nhap tay tu Google Ads.
 *
 * VI SAO NHAP TAY chu khong goi Google Ads API: API can developer token va phai
 * qua vong duyet cua Google. Ban nhap tay chay duoc ngay hom nay, va khi nao co
 * token thi chinh cho nay la cho thay the — khong phai viet lai trang.
 *
 * VI SAO MOT TAI LIEU MOI NGAY chu khong phai mot mang trong `adCampaign`: day la
 * chuoi thoi gian. Mang long trong tai lieu cha se phai doc/ghi ca khoi de sua
 * mot ngay, va hai lan nhap cung luc se de len nhau.
 *
 * ⚠️ `cost` la thu DUY NHAT trong ca he thong biet chac chan. Luot bam sang
 * merchant thi do duoc, con DON HANG THAT nam ben GoAffPro va site khong nhin
 * thay. Nen dung bao gio lay cac so o day nhan voi mot ty le doan roi goi ket qua
 * la "loi nhuan" — xem `src/lib/adPerformance.ts`.
 */
export const adSpendEntryType = defineType({
  name: 'adSpendEntry',
  title: 'Chi tiêu quảng cáo theo ngày',
  type: 'document',
  fields: [
    defineField({
      name: 'campaign',
      title: 'Chiến dịch',
      type: 'reference',
      to: [{ type: 'adCampaign' }],
      weak: true,
      validation: r => r.required(),
    }),

    // Luu ca nhan `?s=` BEN CANH tham chieu, co y trung lap: tham chieu yeu se
    // thanh mo neu chien dich bi xoa, va luc do khong con cach nao biet ban ghi
    // chi tieu nay thuoc ve dau. Nhan la thu doi chieu duoc voi tai lieu `click`.
    defineField({
      name: 'campaignTag',
      title: 'Nhãn (?s=)',
      type: 'string',
      readOnly: true,
      description: 'Chép từ chiến dịch lúc tạo. Giữ lại để số liệu sống sót nếu chiến dịch bị xoá.',
    }),

    defineField({
      name: 'date',
      title: 'Ngày',
      type: 'date',
      options: { dateFormat: 'YYYY-MM-DD' },
      validation: r => r.required(),
    }),

    defineField({
      name: 'cost',
      title: 'Chi phí (USD)',
      type: 'number',
      validation: r => r.required().min(0),
    }),
    // ── Luu lai NGUYEN VAN thu nguoi van hanh go, ben canh so USD da quy doi ──
    // Vi sao khong chi luu USD: ty gia doi moi ngay. Ba thang sau nhin lai mot
    // ban ghi "$0,47" ma khong biet no tu 12.300d hay 12.800d thi khong doi
    // chieu duoc voi hoa don Google. Ba o nay lam ban ghi TU KIEM TRA duoc.
    defineField({
      name: 'costNhapVao',
      title: 'Số đã gõ (nguyên văn)',
      type: 'number',
      readOnly: true,
    }),
    defineField({
      name: 'donViNhap',
      title: 'Đơn vị đã gõ',
      type: 'string',
      readOnly: true,
      options: { list: [{ title: 'USD', value: 'usd' }, { title: 'VNĐ', value: 'vnd' }] },
    }),
    defineField({
      name: 'tyGia',
      title: 'Tỉ giá lúc nhập (1 USD = ? VNĐ)',
      type: 'number',
      readOnly: true,
    }),

    defineField({
      name: 'adClicks',
      title: 'Lượt bấm quảng cáo',
      type: 'number',
      validation: r => r.min(0),
      description: 'Số Google báo. KHÁC với lượt bấm sang merchant — site tự đếm cái đó.',
    }),
    defineField({
      name: 'impressions',
      title: 'Lượt hiển thị',
      type: 'number',
      validation: r => r.min(0),
    }),
  ],

  preview: {
    select: { date: 'date', cost: 'cost', tag: 'campaignTag' },
    prepare({ date, cost, tag }) {
      return { title: `${date ?? '?'} — $${cost ?? 0}`, subtitle: `?s=${tag ?? '?'}` }
    },
  },
})
