/**
 * Chon va lam sach mo ta san pham doc tu trang cua shop.
 *
 * De o file rieng (khong nam trong scrapeProductPage.ts) vi day la logic THUAN:
 * khong fetch, khong cheerio, khong env — nho vay test duoc truc tiep.
 */

/**
 * Ky tu thuoc khoi ky hieu Latin-1 (¡¢£¤¥¦§¨©...¿). Van ban san pham that gan nhu
 * khong dung chung, nhung text bi ma hoa hai lan thi day nhung ky tu nay.
 */
const SUSPICIOUS = /[¡-¿]/g

/** Tren ty le nay thi coi la van ban bi hong ma, khong phai van ban co dau thuong. */
const DIRTY_RATIO = 0.005

const countSuspicious = (text: string) => text.match(SUSPICIOUS)?.length ?? 0

/**
 * Sua van ban bi ma hoa hai lan: byte GBK bi doc nhu latin1.
 *
 * Gap that tren tennail.com/products/pink-peach-blossoms (2026-07-26): "Ombré" bi
 * bien thanh "Ombr¨¦" trong JSON-LD va trong than trang, du CHINH trang do vẫn co 15
 * cho khac in dung — tuc du lieu cua shop bi hong san, khong phai loi giai ma cua
 * minh. Giai nguoc bang GBK tra lai "Ombré".
 *
 * Chi thu khi van ban CO dau hieu hong, va chi nhan ket qua khi so ky tu dang nghi
 * GIAM. Van ban sach di qua day khong bi dung toi.
 */
export function repairDoubleEncoded(text: string): string {
  const before = countSuspicious(text)
  if (before === 0) return text

  // latin1 chi bieu dien duoc U+0000–U+00FF. Co ky tu ngoai khoang do (tieng Viet,
  // emoji, chu Trung...) thi phep giai nguoc se lam MAT du lieu — khong duoc thu.
  for (const ch of text) {
    if ((ch.codePointAt(0) ?? 0) > 0xff) return text
  }

  try {
    // TextDecoder('gbk') can ICU day du. Vercel/Node 24 co, nhung neu moi truong nao
    // thieu thi throw -> tra ve nguyen ban thay vi lam hong them.
    const fixed = new TextDecoder('gbk').decode(Buffer.from(text, 'latin1'))
    return countSuspicious(fixed) < before ? fixed : text
  } catch {
    return text
  }
}

/**
 * Chon mo ta tot nhat trong cac nguon: SUA loi ma truoc, roi SACH, roi DAI.
 *
 * Vi sao khong don gian lay ban dai nhat: meta/og:description la doan tom tat cho
 * ket qua tim kiem nen thuong bi cat ngan, con mo ta that do chu shop viet nam
 * trong than trang. Do that: cycleaddons.com cho 149 ky tu qua meta va 3246 ky tu
 * qua than trang — chenh 22 lan, va chi ban dai moi co thong so (800W, 48V 15Ah).
 *
 * Nhung dai khong duoc thang bang moi gia: neu MOI ban deu hong ma thi van lay ban
 * dai nhat (co du lieu con hon khong, va nguoi van hanh doc lai truoc khi duyet).
 */
export function bestDescription(candidates: (string | undefined)[]): string | undefined {
  const cleaned = candidates
    .map(c => c?.replace(/\s+/g, ' ').trim())
    .filter((c): c is string => !!c)
    // Bo nhan "Description" cua chinh cai tab chua mo ta (WooCommerce)
    .map(c => c.replace(/^Description[:\s]*/i, '').trim())
    .map(repairDoubleEncoded)
    .filter(Boolean)
  if (cleaned.length === 0) return undefined

  const clean = cleaned.filter(c => countSuspicious(c) / c.length < DIRTY_RATIO)
  const pool = clean.length ? clean : cleaned
  // Cat o 4000 ky tu de prompt khong phinh vo han.
  return pool.sort((a, b) => b.length - a.length)[0].slice(0, 4000)
}
