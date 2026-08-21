/**
 * Ten SAN PHAM cua mot bai review — khac tieu de bai viet.
 *
 * ── VI SAO CAN ─────────────────────────────────────────────────────
 *
 * Du lieu co cau truc cua trang review khai mot nut `Product`, va `name` cua no
 * dang lay thang tieu de bai:
 *
 *   "6'8\" New School Model Fun Shape Surfboard Review"
 *
 * Do la ten BAI VIET, khong phai ten san pham. Khong san pham nao ten ket thuc
 * bang chu "Review". Google doc nut do de doi chieu voi san pham that ngoai doi,
 * nen mot cai ten sai lam giam kha nang khop — va no cung hien ra cho nguoi doc
 * neu ket qua nhieu dinh dang duoc kich hoat.
 *
 * ── THU TU UU TIEN ─────────────────────────────────────────────────
 *
 * 1. `productName` do nguoi viet nhap — luon dung nhat, va la ly do truong do
 *    ton tai. Nhap o /admin/reviews hoac cot `product_name` khi import Excel.
 * 2. Neu de trong: suy ra tu tieu de bang cach cat cac duoi thuong gap.
 *
 * ⚠️ Buoc 2 la PHUONG AN DU PHONG, khong phai giai phap. No chi cat nhung duoi
 * chac chan la cua bai viet ("Review", "Danh gia", "Hands-on"...). Gap gi la thi
 * TRA VE NGUYEN TIEU DE — mot cai ten hoi dai van tot hon mot cai ten bi cat cut
 * mat chu quan trong. Vi du "Surfboard Review Deck" khong duoc thanh "Surfboard".
 */

/**
 * Cac duoi bi cat. Chi khop o CUOI chuoi, va chi khi dung mot minh (co ranh gioi
 * tu phia truoc) — de "Preview" hay "Overview" khong bi cat mat "view".
 */
const DUOI = [
  'review', 'reviews',
  'đánh giá', 'danh gia',
  'hands-on', 'hands on',
  'first look', 'tested', 'test',
]

/** Dau ngan cach dung truoc duoi: "Ten — Review", "Ten: Review", "Ten (Review)". */
const NGAN_CACH = String.raw`[\s\-–—:|·,]`

/**
 * Cat mot lan duy nhat, khong lap.
 *
 * ⚠️ Cat lap se an mon dan ten that: "Test Kitchen Review" -> "Test Kitchen" ->
 * "Test" -> "". Mot lan la du cho moi tieu de that gap trong thuc te.
 */
export function deriveProductName(title: string): string {
  const goc = (title ?? '').trim()
  if (!goc) return goc

  for (const d of DUOI) {
    // Duoi co the nam trong ngoac: "Ten (2026 Review)" — bo ca cum ngoac neu
    // phan con lai trong ngoac chi la nam/so.
    const trongNgoac = new RegExp(String.raw`\s*[（(\[]\s*(?:\d{4}\s*)?${d}\s*[)）\]]\s*$`, 'i')
    if (trongNgoac.test(goc)) {
      const cat = goc.replace(trongNgoac, '').trim()
      if (cat) return cat
    }
    // Duoi tran o cuoi, phai co dau ngan cach hoac khoang trang truoc no.
    const tran = new RegExp(String.raw`${NGAN_CACH}+${d}\s*$`, 'i')
    if (tran.test(goc)) {
      const cat = goc.replace(tran, '').trim()
      // ⚠️ Cat xong ma con qua ngan thi gan nhu chac chan da cat nham vao chinh
      // ten san pham. Giu nguyen tieu de.
      if (cat.length >= 3) return cat
    }
  }
  return goc
}

/** Ten hien trong du lieu co cau truc: nguoi nhap truoc, suy ra sau. */
export const productNameOf = (review: { productName?: string; title: string }): string =>
  review.productName?.trim() || deriveProductName(review.title)
