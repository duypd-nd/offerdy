import { dealDiscountBadge } from './dealDiscountLabel'
import { docUuDaiMa } from './video/couponOffer'

export type CaptionDeal = {
  code?: number
  title: string
  priceSale: string
  priceOrig?: string
  discount: number
  discountByAmount?: boolean
  categoryName?: string
  slug?: string
  /** Ma coupon that cua SHOP ma deal nay dan toi. Xem `couponForDealUrl()`. */
  couponCode?: string
  /** `offerText` cua offer mang ma do — vi du "5% Off". Xem `docUuDaiMa()`. */
  couponOfferText?: string
}

export type LinkStyle = 'deal' | 'go'

// Trong caption thi bo "https://www." cho gon — Instagram/TikTok van tu nhan ra la
// link. Con QR va nut Copy phai dung URL day du dang `www.`: offerdy.com tran 308
// sang www, va mot QR di qua redirect la mot vong request them cho nguoi quet.
const DISPLAY_BASE = 'offerdy.com'
const FULL_BASE = 'https://www.offerdy.com'

function shortLinkPath(code: number | undefined, slug: string | undefined, style: LinkStyle, campaign?: string): string {
  const path = code
    ? `/${style === 'go' ? 'g' : 'd'}/${code}`
    : `/deals/${slug ?? ''}`
  // ?s= chi co nghia voi /d/ va /g/ (route doc tham so nay); URL slug thi khong.
  const q = code && campaign ? `?s=${campaign}` : ''
  return `${path}${q}`
}

/** Dang ngan de dan vao caption: `offerdy.com/d/1005?s=reel-jul25` */
export function shortLink(code: number | undefined, slug: string | undefined, style: LinkStyle, campaign?: string): string {
  return `${DISPLAY_BASE}${shortLinkPath(code, slug, style, campaign)}`
}

/** URL day du cho QR / clipboard: `https://www.offerdy.com/d/1005?s=reel-jul25` */
export function shortLinkUrl(code: number | undefined, slug: string | undefined, style: LinkStyle, campaign?: string): string {
  return `${FULL_BASE}${shortLinkPath(code, slug, style, campaign)}`
}

/**
 * Hashtag sinh tu DU LIEU THAT: ten danh muc + cac tu trong ten san pham. Co y
 * KHONG co tu khoa marketing tu bia ("besthdeal", "musthave"...) — nguyen tac cua
 * du an la khong tu tao noi dung kinh doanh, va hashtag sai chu de con lam bai dang
 * bi day ra khoi dung tep khan gia.
 *
 * Chi lay tu >= 4 ky tu, bo tu chua so/ky hieu (model number khong ai search), toi
 * da 3 tu — hashtag dai va nhieu khong giup gi.
 */
export function suggestHashtags(deal: CaptionDeal): string[] {
  const tags: string[] = []
  if (deal.categoryName) {
    const cat = deal.categoryName.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (cat) tags.push(cat)
  }
  const words = deal.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 4 && !/\d/.test(w))
    .slice(0, 3)
  for (const w of words) if (!tags.includes(w)) tags.push(w)
  tags.push('offerdy')
  return tags
}

/**
 * Khung caption. Chi ghep lai du lieu co san (ten, gia, % giam, ma) — khong co cau
 * quang cao nao duoc bia them. Admin sua truoc khi dang: day la cong cu soan, khong
 * phai may viet noi dung.
 */
export function buildCaption(deal: CaptionDeal, opts: {
  style: LinkStyle
  campaign?: string
  hashtags?: string[]
}): string {
  const badge = dealDiscountBadge(deal)
  const discountLine = deal.priceOrig
    ? `${deal.priceSale} (was ${deal.priceOrig}) — ${badge.main}${badge.sub ? ` ${badge.sub}` : ''}`
    : deal.priceSale
  const tags = (opts.hashtags ?? suggestHashtags(deal)).map(t => `#${t}`).join(' ')

  return [
    deal.title,
    '',
    discountLine,
    ...(couponLine(deal) ? ['', couponLine(deal)] : []),
    '',
    deal.code
      ? `Product ${'#'}${deal.code} — full details: ${shortLink(deal.code, deal.slug, opts.style, opts.campaign)}`
      : `Full details: ${shortLink(undefined, deal.slug, opts.style, opts.campaign)}`,
    '',
    tags,
  ].join('\n')
}

/**
 * Dong ma giam gia trong caption, hoac chuoi rong neu shop khong co ma.
 *
 * ⚠️ NOI DUNG MUC DO, KHONG HUA. Day la ma cua CA SHOP, khong phai ma rieng cho
 * san pham nay, va nhieu shop loai tru hang dang giam gia khoi ma. Nen
 * "Store code: X (5% off) — worth trying at checkout" thi duoc, con
 * "use X for an extra 5% off" thi KHONG: cau sau la mot loi hua, va mot ma khong
 * ap duoc o buoc thanh toan lam mat long tin nhieu hon la khong hien ma nao.
 * Cung luat da ap cho canh ma trong video (`buildSpec.ts`).
 *
 * ⚠️ Muc giam doc tu `offerText` THAT qua `docUuDaiMa()`. Doc khong ra thi chi
 * hien ma, KHONG bia mot con so nao.
 */
export function couponLine(deal: CaptionDeal): string {
  const ma = deal.couponCode?.trim()
  if (!ma) return ''
  const uuDai = docUuDaiMa(deal.couponOfferText)
  return uuDai
    ? `Store code: ${ma} (${uuDai.hienThi.replace(/ OFF$/, ' off')}) — worth trying at checkout`
    : `Store code: ${ma} — worth trying at checkout`
}
