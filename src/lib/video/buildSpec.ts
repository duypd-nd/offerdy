/**
 * Dung tep kich ban video tu du lieu deal + anh da cao.
 *
 * Ham THUAN: khong goi mang, khong doc Sanity. Nguoi goi lo phan lay du lieu,
 * roi dua vao day. Nho vay ca trang `/admin/video` lan lenh `npm run video:spec`
 * deu dung CHUNG mot ham — khong co chuyen hai duong sinh ra hai kich ban khac
 * nhau cho cung mot deal.
 *
 * ── LUAT QUAN TRONG NHAT ──────────────────────────────────────────
 *
 * ⚠️ Moi con so doc len trong video phai den tu DEAL, khong tu trang san pham.
 * Trang san pham dung de LAY ANH. Gia tren trang co the khac gia trong kho —
 * Shopify Markets doi gia theo vi tri nguoi xem; da do that tren
 * empowerbeautiful.com tu Viet Nam: trang hien VND con API bao USD.
 *
 * ⚠️ Khong co gia goc thi KHONG noi ve giam gia. Khong co ma thi KHONG co scene
 * ma. Truong `verifiedFacts` ghi tung con so den tu dau.
 */

export type DealNguon = {
  code: number
  title: string
  slug?: string
  priceSale?: string
  priceOrig?: string
  discount?: number
  dealUrl?: string
  store?: string
}

export type Scene = {
  id: number
  type: 'hook' | 'reveal' | 'benefit' | 'offer' | 'coupon' | 'cta'
  image: string
  duration: number
  kenBurns: 'in' | 'out'
  overlayText: string
  voiceText?: string
  couponBadge?: string
  priceBadge?: { sale?: string; orig?: string }
}

export type VideoSpec = {
  version: number
  format: string
  width: number
  height: number
  fps: number
  output: string
  product: Record<string, unknown>
  verifiedFacts: string[]
  voice: { provider: string; voice: string | null; rate: number }
  transition: { type: string; duration: number }
  scenes: Scene[]
}

const CHUYEN_CANH = 0.5

/** Cac nhan phu de dung cho scene loi ich — moi anh mot nhan. */
const NHAN_LOI_ICH: [string, string][] = [
  ['SEE IT\nUP CLOSE', 'Here it is up close, so you can see what you actually get.'],
  ['EVERY\nDETAIL', 'Every part is finished properly, right down to the detail.'],
  ['BUILT\nTO LAST', 'Solid and well made, not something that gets used once.'],
  ['GREAT FOR\nGIFTING', 'It works for birthdays, weddings, or just because.'],
  ['READY TO\nUSE', 'It arrives ready to use, straight out of the box.'],
]

export function buildSpec(input: {
  deal: DealNguon
  images: string[]
  couponCode?: string | null
  storeName?: string | null
  provider?: string
}): VideoSpec {
  const { deal, images } = input
  if (!images.length) throw new Error('Khong co anh nao de dung video')

  const ten = String(deal.title).split('—')[0].trim()
  const shop = input.storeName ?? deal.store ?? 'the store'
  const ma = input.couponCode ?? null
  const lay = (i: number) => images[i % images.length]

  const scenes: Scene[] = []
  const them = (type: Scene['type'], s: Omit<Scene, 'id' | 'type' | 'kenBurns'>) =>
    scenes.push({ id: scenes.length + 1, type, kenBurns: scenes.length % 2 ? 'out' : 'in', ...s })

  them('hook', {
    image: lay(0), duration: 3.6,
    overlayText: 'LOOKING FOR\nA REAL GIFT?',
    voiceText: 'Looking for something that actually gets used?',
  })
  them('reveal', {
    image: lay(1), duration: 4,
    overlayText: ten.toUpperCase(),
    voiceText: `This is the ${ten} from ${shop}.`,
  })

  // Mot scene cho moi anh con lai. Day la thu lam video do mat thay vi mot tam
  // anh dung yen — deal trong kho chi co 1 anh, phan con lai cao tu trang shop.
  const soLoiIch = Math.min(NHAN_LOI_ICH.length, Math.max(0, images.length - 2))
  for (let i = 0; i < soLoiIch; i++) {
    them('benefit', {
      image: lay(i + 2), duration: 4,
      overlayText: NHAN_LOI_ICH[i][0],
      voiceText: NHAN_LOI_ICH[i][1],
    })
  }

  // ── Gia: chi noi khi co so THAT ─────────────────────────────────
  if (deal.priceOrig && deal.discount) {
    them('offer', {
      image: lay(images.length - 1), duration: 4,
      overlayText: `${deal.discount}% OFF`,
      priceBadge: { sale: deal.priceSale, orig: deal.priceOrig },
      voiceText: `Right now it is ${docGia(deal.priceSale)}, down from ${docGia(deal.priceOrig)}.`,
    })
  } else if (deal.priceSale) {
    them('offer', {
      image: lay(images.length - 1), duration: 3.4,
      overlayText: String(deal.priceSale).trim(),
      voiceText: `It is ${docGia(deal.priceSale)}.`,
    })
  }

  // ── Ma cua shop ─────────────────────────────────────────────────
  //
  // ⚠️ NOI DUNG MUC DO, KHONG HUA. `src/sanity/queries.ts` ghi ro: day la ma cua
  // CA SHOP, khong phai ma rieng cho san pham, va nhieu shop loai tru hang dang
  // giam gia khoi ma. Nen "shop dang co ma X, thu o buoc thanh toan" chu KHONG
  // phai "dung ma X de duoc giam them" — cau sau la mot loi hua, va mot ma khong
  // ap duoc o buoc thanh toan lam mat long tin nhieu hon la khong hien ma nao.
  if (ma) {
    them('coupon', {
      image: lay(0), duration: 5,
      overlayText: `CODE\n${ma}`,
      couponBadge: ma,
      voiceText: `${shop} currently has the code ${danhVan(ma)}. Worth trying at checkout.`,
    })
  }

  them('cta', {
    image: lay(1), duration: 4,
    overlayText: 'LINK IN BIO',
    voiceText: "Tap the link to check today's price.",
  })

  return {
    version: 1,
    format: '9:16',
    width: 1080, height: 1920, fps: 30,
    output: `deal-${deal.code}-${(deal.slug ?? 'video').slice(0, 40)}`,
    product: {
      dealCode: deal.code,
      brand: shop,
      name: deal.title,
      priceSale: deal.priceSale ?? null,
      priceOrig: deal.priceOrig ?? null,
      discountPercent: deal.discount ?? null,
      couponCode: ma,
      ctaUrl: `https://www.offerdy.com/d/${deal.code}?s=video`,
      sourceUrl: deal.dealUrl ?? null,
    },
    verifiedFacts: [
      `priceSale = ${deal.priceSale ?? '(khong co)'} — tu deal #${deal.code}`,
      deal.priceOrig ? `priceOrig = ${deal.priceOrig} — tu deal #${deal.code}` : 'khong co gia goc -> KHONG noi ve giam gia',
      deal.discount ? `discountPercent = ${deal.discount} — code tinh tu hai gia tren` : 'khong co % giam',
      ma ? `couponCode = ${ma} — tu couponForDealUrl()` : 'shop khong co ma -> KHONG bia ma',
      `${images.length} anh — tu ${deal.dealUrl ?? 'kho'}`,
    ],
    voice: { provider: input.provider ?? 'elevenlabs', voice: null, rate: 0 },
    transition: { type: 'fade', duration: CHUYEN_CANH },
    scenes,
  }
}

/** Tong do dai sau khi tru phan chong nhau cua cac lan chuyen canh. */
export const tongThoiLuong = (scenes: { duration: number }[], chuyen = CHUYEN_CANH): number =>
  scenes.reduce((n, s) => n + s.duration, 0) - chuyen * Math.max(0, scenes.length - 1)

/**
 * "$79.95" -> "79 dollars 95" de giong doc phat am tu nhien.
 *
 * ⚠️ Doc `$79.95` nguyen van thi ElevenLabs doc thanh "dollar seventy nine point
 * nine five" — dung chu nhung nghe nhu may doc bang gia.
 */
export function docGia(s?: string): string {
  const m = String(s ?? '').match(/([\d.,]+)/)
  if (!m) return String(s ?? '')
  const so = m[1].replace(/,/g, '')
  const [nguyen, le] = so.split('.')
  const donVi = /€/.test(String(s)) ? 'euro' : /£/.test(String(s)) ? 'pounds' : 'dollars'
  return le && le !== '00' ? `${nguyen} ${donVi} ${le}` : `${nguyen} ${donVi}`
}

/** "OFFERDY" -> "O F F E R D Y" de giong doc danh van tung chu. */
export const danhVan = (s: string): string => String(s).toUpperCase().split('').join(' ')
