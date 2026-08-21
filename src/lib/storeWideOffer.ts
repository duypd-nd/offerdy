/**
 * Uu dai nay ap cho CA SHOP, hay tro duoc toi mot san pham cu the?
 *
 * ── VI SAO CAN ─────────────────────────────────────────────────────
 *
 * `/admin/deep-links` hien tien do "da gan link san pham". Mau so phai la so
 * offer CO THE tro toi mot san pham — dem ca uu dai cap shop vao thi nguoi van
 * hanh duoi theo mot dich khong bao gio dat duoc.
 *
 * Phep loc cu (`meaningfulTokens(...).length >= 2`) da bat duoc 144 cai, nhung
 * do that ngay 2026-08-22 tren 92 cai con lai thi gan nhu TAT CA van la cap
 * shop, chi khac ngon ngu:
 *
 *   "Free shipping on all US order or order above $100"
 *   "GRATIS VERZENDING OP ALLE BESTELLINGEN"        (Ha Lan)
 *   "Kostenloser Versand ab 250 €"                  (Duc)
 *   "Livraison Offerte dès 60€ d'achat"             (Phap)
 *   "¡Envío GRATIS a partir de 40€ en Península!"   (Tay Ban Nha)
 *   "30 DAYS RETURN - Exchange within 30 days"
 *   "Frizzlife Rewards Program"
 *
 * Chung deu co >= 2 tu "co nghia" nen lot het. Ket qua: tien do hien 181/273
 * trong khi so tro duoc THAT chi khoang 195 — tuc viec gan nhu da xong ma bang
 * dieu khien bao con 92 viec.
 *
 * ── CACH LAM, VA GIOI HAN CUA NO ───────────────────────────────────
 *
 * Danh sach cum tu, nhieu ngon ngu, rut ra tu DU LIEU THAT chu khong tu nghi.
 * Day la phep doan, khong phai chan ly — nen no chi dung de DEM cho dung, khong
 * dung de tu dong xoa hay tu dong gan gi ca.
 *
 * ⚠️ Kiem bang HAI tap, va tap thu hai moi quan trong:
 *   · 92 offer chua co link  -> phai nhan ra phan lon la cap shop
 *   · 181 offer DA co link   -> nguoi that da gan link san pham cho chung, nen
 *                               chung CHAC CHAN tro duoc. Neu ham nay goi chung
 *                               la "cap shop" thi no qua tay va lam mat viec.
 */

/**
 * Cum tu bao hieu uu dai ap cho ca don hang / ca shop.
 *
 * Khong dung ranh gioi tu (`\b`) vi tieng Duc noi tu ("Einkaufswert") va tieng
 * Ha Lan/Phap co dau. So khop tren chuoi da chuan hoa: thuong hoa, bo dau.
 */
const CUM_CAP_SHOP = [
  // ── Van chuyen ──
  'free shipping', 'free same day shipping', 'free us shipping', 'fast shipping',
  'free delivery', 'shipping on orders', 'shipping on all', 'tax-free',
  'kostenloser versand', 'versand innerhalb', 'gratis verzending', 'verzending op alle',
  'livraison offerte', 'livraison gratuite', 'envio gratis', 'envio gratuito',
  // ── Doi tra / bao hanh ──
  'day return', 'days return', 'day returns', 'money-back', 'money back',
  'return guarantee', 'easy returns', 'satisfaction guarantee', 'lifetime warranty',
  'lifetime service warranty', 'year warranty', 'geld terug', 'garantie',
  'satisfait ou rembourse', 'guarantee with', 'payment secure',
  // ── Ap cho ca don hang ──
  'on your order', 'on all orders', 'on orders', 'order above', 'orders above',
  'your first order', 'first purchase', 'first order', 'sitewide', 'site-wide',
  'storewide', 'store-wide', 'entire order', 'whole order', 'alle bestellingen',
  'einkaufswert', "d'achat", 'a partir de', 'ab 250', 'auto applied',
  'automatically applied', 'applies automatically', 'no discount code required',
  'no code needed', 'at checkout',
  // ── Chuong trinh, khong phai san pham ──
  'rewards program', 'newsletter sign-up', 'newsletter signup', 'sign-up',
  'bulk discounts', 'subscription', 'subscriptions',
]

/** Thuong hoa, bo dau tieng Viet/Phap/Duc/Tay Ban Nha, gom khoang trang. */
const chuanHoa = (s: string): string =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

export function isStoreWideOffer(title: string): boolean {
  const t = chuanHoa(title)
  if (!t) return true
  return CUM_CAP_SHOP.some(cum => t.includes(chuanHoa(cum)))
}

/**
 * Uu dai nay co the tro toi mot san pham khong.
 *
 * Hai dieu kien, phai dat CA HAI:
 *   1. Khong phai uu dai cap shop (ham tren)
 *   2. Con du tu "co nghia" de co cai ma doi chieu voi danh muc san pham —
 *      dieu kien cu, giu nguyen
 */
export function isLinkableOffer(title: string, meaningfulTokenCount: number): boolean {
  return meaningfulTokenCount >= 2 && !isStoreWideOffer(title)
}
