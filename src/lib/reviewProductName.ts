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
 * Dau bao hieu phan PHU DE bat dau ngay sau tu khoa.
 *
 * ⚠️ KHUON PHO BIEN NHAT trong du lieu that, va ban dau bi bo sot hoan toan:
 *
 *   Kyoku 10" Bullnose Butcher Knife Review: VG10 Steel
 *   Frizzlife PX500-A Tankless RO System Review: Worth $379.99?
 *
 * Do 2026-08-21 tren ca 23 bai that: **21 bai** theo khuon nay. Ban dau ham chi
 * cat duoi o CUOI chuoi nen khong dung toi 21 bai do, va con cat nham mot bai
 * ("...Review: 800W Power Tested" -> "...Review: 800W Power") — te hon la khong
 * lam gi. Bai hoc lap lai: fixture tu nghi ra thi qua het, chay tren du lieu
 * that moi lo.
 */
const BAT_DAU_PHU_DE = String.raw`[:：|—–]`

/**
 * Cat mot lan duy nhat, khong lap.
 *
 * ⚠️ Cat lap se an mon dan ten that: "Test Kitchen Review" -> "Test Kitchen" ->
 * "Test" -> "". Mot lan la du cho moi tieu de that gap trong thuc te.
 */
export function deriveProductName(title: string): string {
  const goc = (title ?? '').trim()
  if (!goc) return goc
  const duGiu = (s: string) => s.length >= 3

  // ── 1. Tu khoa GIUA cau, ngay sau la phu de ──────────────────────
  // "Ten Review: phu de" -> "Ten". Lay lan xuat hien SOM NHAT trong cac tu khoa
  // de "X Review: Y Test" cat o "Review" chu khong phai o "Test".
  let somNhat = -1
  for (const d of DUOI) {
    const re = new RegExp(String.raw`\s+${d}\s*${BAT_DAU_PHU_DE}`, 'i')
    const m = re.exec(goc)
    if (m && (somNhat < 0 || m.index < somNhat)) somNhat = m.index
  }
  if (somNhat > 0) {
    const cat = goc.slice(0, somNhat).trim()
    if (duGiu(cat)) return cat
  }

  for (const d of DUOI) {
    // ── 2. Tu khoa trong ngoac o cuoi: "Ten (2026 Review)" ─────────
    const trongNgoac = new RegExp(String.raw`\s*[（(\[]\s*(?:\d{4}\s*)?${d}\s*[)）\]]\s*$`, 'i')
    if (trongNgoac.test(goc)) {
      const cat = goc.replace(trongNgoac, '').trim()
      if (cat) return cat
    }
    // ── 3. Tu khoa tran o CUOI chuoi ───────────────────────────────
    const tran = new RegExp(String.raw`${NGAN_CACH}+${d}\s*$`, 'i')
    if (tran.test(goc)) {
      const cat = goc.replace(tran, '').trim()
      // ⚠️ Cat xong ma con qua ngan thi gan nhu chac chan da cat nham vao chinh
      // ten san pham. Giu nguyen tieu de.
      if (duGiu(cat)) return cat
    }
  }
  return goc
}

/** Ten hien trong du lieu co cau truc: nguoi nhap truoc, suy ra sau. */
export const productNameOf = (review: { productName?: string; title: string }): string =>
  review.productName?.trim() || deriveProductName(review.title)
