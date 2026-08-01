import { defineType, defineField } from 'sanity'

/**
 * Email dang ky nhan thong bao khi mot store co ma giam gia moi.
 *
 * Vi sao luu vao Sanity thay vi gui thang qua Formspree: danh sach nam trong hop
 * thu thi khong loc, khong dem, khong noi duoc voi cron. Luu thanh document thi
 * sau nay chi can them buoc gui — phan thu thap da chay tu hom nay, va nguoi dang
 * ky som nhat khong bi mat.
 *
 * ⚠️ CHUA CO BUOC GUI MAIL. Du an chua co nha cung cap email nao (form lien he chi
 * POST sang Formspree roi lui ve mailto). Nut tren trang store noi ro dieu do thay
 * vi hua "se bao ngay khi co ma moi" — hua roi khong lam la cach nhanh nhat de mat
 * niem tin, va dia chi email thu ve se thanh vo gia tri.
 *
 * Ban ghi do NGUOI LA tao ra qua trang cong khai, nen moi truong deu readOnly o
 * Studio: day la du lieu van hanh, khong phai noi dung bien tap.
 */
export const couponAlertType = defineType({
  name: 'couponAlert',
  title: 'Đăng ký nhận mã giảm giá',
  type: 'document',
  fields: [
    defineField({ name: 'email', title: 'Email', type: 'string', readOnly: true }),
    defineField({
      name: 'store',
      title: 'Store',
      type: 'reference',
      to: [{ type: 'store' }],
      readOnly: true,
      // Weak reference: xoa store thi ban ghi dang ky khong chan lenh xoa. Nguoc lai
      // voi offer->store (strong) vi o day mat store la mat luon ly do ton tai cua
      // ban ghi, khong phai du lieu can giu toan ven.
      weak: true,
    }),
    // Chep ten store ra mot truong rieng: neu store bi xoa thi reference thanh rong,
    // va khong con biet duoc nguoi ta dang ky cho shop nao.
    defineField({ name: 'storeName', title: 'Tên store (lúc đăng ký)', type: 'string', readOnly: true }),
    defineField({ name: 'createdAt', title: 'Thời điểm đăng ký', type: 'datetime', readOnly: true }),
    defineField({
      name: 'notifiedAt',
      title: 'Đã gửi thông báo lúc',
      type: 'datetime',
      readOnly: true,
      description: 'Để trống cho tới khi có bước gửi mail thật.',
    }),
  ],
  preview: {
    select: { email: 'email', storeName: 'storeName', createdAt: 'createdAt' },
    prepare({ email, storeName, createdAt }) {
      const when = createdAt ? new Date(createdAt).toLocaleDateString('vi-VN') : ''
      return { title: email ?? '(không có email)', subtitle: [storeName, when].filter(Boolean).join(' — ') }
    },
  },
})
