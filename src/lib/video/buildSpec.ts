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

import { shortLink, shortLinkUrl } from '@/lib/socialCaption'
import { MAC_DINH, chuyenCanhCho, keoVuaCanh, type PhongCachVideo } from './videoStyle'

/**
 * Nhan chien dich gan vao moi link ra tu video.
 *
 * Mot video = mot deal, nen `?s=video` + `/d/<ma>` la du de biet video NAO ra
 * tien: bang chien dich o `/admin/reports` cho tong luot bam tu video, con cot
 * ma deal cho biet cua video nao. Khong can nhan rieng cho tung video.
 *
 * ⚠️ `parseCampaign()` cat con `[a-z0-9_-]` va 24 ky tu — doi nhan nay thi phai
 * doi trong khuon do.
 */
export const NHAN_CHIEN_DICH = 'video'

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
  /**
   * Loai canh. Chi de nguoi doc hieu va de xem truoc — bo dung video khong dung
   * toi truong nay, no chi can anh, do dai, chu va kieu Ken Burns.
   */
  type: 'hook' | 'problem' | 'product' | 'benefit' | 'socialProof' | 'offer' | 'coupon' | 'cta'
  image: string
  duration: number
  kenBurns: 'in' | 'out'
  /**
   * Nhan ngan cho trang admin. ⚠️ KHONG duoc ve len video — chu tren man hinh
   * lay tu `voiceText` de khop voi giong doc. Giu truong nay vi danh sach canh
   * o `/admin/video` can mot dong ngan doc luot qua duoc.
   */
  overlayText: string
  /** Cau doc len. Cung la chu hien tren man (phu de). */
  voiceText?: string
  /**
   * Ban danh RIENG cho may doc, khi khac voi chu tren man.
   *
   * ⚠️ Ton tai vi hai ben can hai dang khac nhau cua CUNG mot cau: man hinh can
   * `$49.95` va `OFFERDY`, con may doc can "49 dollars 95" va "O F F E R D Y".
   * Truoc day chi co mot truong nen man hinh phai chiu dang cua may doc.
   */
  speakText?: string
  /** Chu LON, ve giua anh va phu de. Chi dung cho canh cuoi (% giam, ma, CTA). */
  badgeText?: string
  couponBadge?: string
  priceBadge?: { sale?: string; orig?: string }
  /**
   * Dia chi ngan ve len man, duoi phu de. Chi canh CTA co.
   *
   * ⚠️ Co y KHONG kem `?s=video`. Nguoi xem TikTok go tay duoc `offerdy.com/d/1470`
   * chu khong ai go mot chuoi truy van; ma mot dia chi go sai thi khong dan ai di
   * dau ca. Duong DO DUOC la link o bio/caption — `product.ctaUrl` — con dong chu
   * nay lo phan nho ten mien va van rot ve dung deal (chi la tinh vao luot bam
   * truc tiep thay vi vao nhan `video`).
   */
  linkText?: string
  /**
   * Chuyen canh RA khoi canh nay — canh cuoi khong co.
   *
   * ⚠️ Truoc 2026-08-22 ca video chi co MOT kieu chuyen canh (`spec.transition`),
   * nen khong bat chuoc duoc mot video CapCut von doi hieu ung theo tung canh.
   * Thieu truong nay thi bo dung roi ve `spec.transition` nhu cu — kich ban cu
   * van chay.
   */
  transitionOut?: { type: string; duration: number }
  /**
   * Canh nay la phan TIEP THEO cua nhip loi truoc — chi doi anh, khong doi cau.
   *
   * ⚠️ Bo dung PHAI khong doc lai `voiceText` o nhung canh nay. Thieu co nay thi
   * mot cau bi doc hai ba lan chong len nhau, va moi canh lai bi keo dai bang ca
   * cau — tuc dung ra mot video dai gap ba va noi lap.
   */
  tiepNoi?: boolean
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
  /**
   * Chuyen canh chung — chi con la duong lui cho canh nao khong co
   * `transitionOut` rieng, va cho kich ban cu sinh truoc 2026-08-22.
   */
  transition: { type: string; duration: number }
  /** Phong cach dung ra video nay. Bo dung doc vi tri va co chu tu day. */
  style?: PhongCachVideo
  scenes: Scene[]
}

const CHUYEN_CANH = 0.5

/** Mot nhip loi doc do AI viet. Cung hinh dang voi `Beat` trong generateVideoScript. */
export type NhipKichBan = {
  type: 'hook' | 'problem' | 'product' | 'benefit' | 'socialProof'
  voiceText: string
  overlayText: string
}

/**
 * Uoc thoi luong tu so tu. ~2,6 tu/giay khi doc, cong khoang lang hai dau.
 *
 * `nhip` la he so cua phong cach: 1 = toc do hien tai. Nho hon 1 thi canh ngan
 * lai — nhung san 2,6 giay van giu, duoi muc do thi mat khong kip doc phu de.
 */
const uocGiay = (chu: string, nhip = 1): number =>
  Math.max(2.6, Math.round((chu.trim().split(/\s+/).length / 2.6 + 0.8) * nhip * 10) / 10)

/**
 * Cat bot nhip khi phong cach doi video ngan hon.
 *
 * ⚠️ GIU HAI DAU, CAT O GIUA. Nhip dau la HOOK (khong co no thi khong ai xem
 * tiep) va nhip cuoi la SOCIAL PROOF — con so danh gia that, thu duy nhat trong
 * ca loi doc khong phai loi cua chinh ta. Cat tu cuoi ve la cat mat no. Nhung
 * BENEFIT o giua thi thua nhat: bo mot y ban hang van con hai y.
 */
export function chonNhip<T>(nhip: T[], toiDa: number | null): T[] {
  if (!toiDa || nhip.length <= toiDa) return nhip
  if (toiDa <= 1) return nhip.slice(0, 1)
  return [...nhip.slice(0, toiDa - 1), nhip[nhip.length - 1]]
}

export function buildSpec(input: {
  deal: DealNguon
  images: string[]
  beats: NhipKichBan[]
  couponCode?: string | null
  storeName?: string | null
  provider?: string
  /** Thieu thi dung `MAC_DINH` — y het video truoc 2026-08-22. */
  phongCach?: PhongCachVideo
}): VideoSpec {
  const { deal, images, beats } = input
  if (!images.length) throw new Error('Khong co anh nao de dung video')
  if (!beats.length) throw new Error('Khong co nhip kich ban nao — AI chua viet loi doc')

  const shop = input.storeName ?? deal.store ?? 'the store'
  const ma = input.couponCode ?? null
  const pc = input.phongCach ?? MAC_DINH

  // ⚠️ Anh LAP LAI tu dau khi het, va so canh KHONG bi cat theo so anh.
  //
  // Truoc day so canh loi ich = so anh tru 2, nen mot deal chi co 3 anh chi ra
  // duoc 1 canh loi ich va video ngan hon 30 giay. Nay kich ban quyet dinh so
  // canh, con anh thi quay vong — mot anh dung lai o canh thu 8 van hon han
  // viec cat mat mot y ban hang.
  const lay = (i: number) => images[i % images.length]

  // ⚠️ Anh vao canh GIA phai la anh TOT NHAT trong so chua dung, khong phai anh
  // cuoi danh sach. `scoreImages()` xep tot-truoc (anh ghim, roi diem giam dan),
  // nen `images[images.length - 1]` chinh la anh TE NHAT — va no lai roi vao dung
  // canh ban hang quan trong nhat. Do that 2026-08-22 tren deal #1470: sau khi
  // lay lai mot anh Claude cham 1/10 (anh lay lai xep cuoi), so do xuong chau
  // nhay len lam nen canh gia. Cac nhip AI da dung het `0..beats.length-1`, nen
  // `nhipDung.length` la anh dau tien chua dung — cung la anh cao diem nhat con lai.

  const scenes: Scene[] = []
  const them = (type: Scene['type'], s: Omit<Scene, 'id' | 'type' | 'kenBurns'>) =>
    scenes.push({ id: scenes.length + 1, type, kenBurns: scenes.length % 2 ? 'out' : 'in', ...s })

  // ── Phan AI viet: hook, problem, product, benefit, socialProof ───
  //
  // Anh so 0 la anh trong kho (nguoi van hanh da chon) nen de o canh dau; tu
  // canh thu hai tro di lay lan luot cac anh cao tu trang san pham.
  //
  // ⚠️ MOT NHIP LOI CO THE TRAI RA NHIEU CANH HINH. Do 4 video mau TikTok:
  // 1,1-2,4 giay moi canh, trong khi mot nhip cua ta dai 4,5 giay vi do la thoi
  // gian doc xong mot cau. Khong the noi nhanh gap ba, nen ANH phai doi giua
  // chung cau: giong doc va phu de chay lien mach, hinh thi cat. Anh lap lai tu
  // dau khi het — mot anh xuat hien lai o canh sau van hon la de mot canh dai
  // gap ba nhip cat cua mau.
  const nhipDung = chonNhip(beats, pc.soNhipToiDa)
  nhipDung.forEach((b, i) => {
    them(b.type, {
      image: lay(i),
      duration: uocGiay(b.voiceText, pc.nhipCanh),
      overlayText: b.overlayText,
      voiceText: b.voiceText,
    })
  })

  // ── Gia: chi noi khi co so THAT ─────────────────────────────────
  if (deal.priceOrig && deal.discount) {
    them('offer', {
      image: lay(nhipDung.length), duration: 4,
      overlayText: `${deal.discount}% OFF`,
      badgeText: `${deal.discount}% OFF`,
      priceBadge: { sale: deal.priceSale, orig: deal.priceOrig },
      voiceText: `Right now it is ${deal.priceSale}, down from ${deal.priceOrig}.`,
      speakText: `Right now it is ${docGia(deal.priceSale)}, down from ${docGia(deal.priceOrig)}.`,
    })
  } else if (deal.priceSale) {
    them('offer', {
      image: lay(nhipDung.length), duration: 3.4,
      overlayText: String(deal.priceSale).trim(),
      badgeText: String(deal.priceSale).trim(),
      voiceText: `It is ${deal.priceSale}.`,
      speakText: `It is ${docGia(deal.priceSale)}.`,
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
      badgeText: `CODE\n${ma}`,
      couponBadge: ma,
      voiceText: `${shop} currently has the code ${ma}. Worth trying at checkout.`,
      speakText: `${shop} currently has the code ${danhVan(ma)}. Worth trying at checkout.`,
    })
  }

  them('cta', {
    image: lay(1), duration: 4,
    overlayText: 'SHOP NOW\nLINK IN BIO',
    badgeText: 'SHOP NOW\nLINK IN BIO',
    voiceText: "Tap the link to check today's price.",
    linkText: shortLink(deal.code, deal.slug, 'deal'),
  })

  // ── Cat nho canh de hinh chay nhanh hon loi ─────────────────────
  //
  // ⚠️ Do 4 video mau TikTok: 1,1-2,4 giay moi canh, con canh cua ta 4,5 giay vi
  // do la thoi gian doc xong mot cau. Khong the noi nhanh gap ba, nen ANH phai
  // doi giua chung cau: giong doc va phu de chay lien mach, hinh thi cat.
  //
  // ⚠️ CAT MOI LOAI CANH, ke ca gia / ma / CTA. Ban dau chi cat canh loi doc, va
  // do that cho thay ket qua sai ro: 18 giay dau cat 1,5 giay mot lan roi **12
  // giay cuoi dung im**. Ma 12 giay cuoi chinh la doan ban hang. Chu LON (`44%
  // OFF`, `CODE OFFERDY`) van dung yen vi no duoc chep sang moi canh con.
  //
  // ⚠️ Canh DAU cua moi doan giu nguyen anh da chon o tren — nho vay moi bao dam
  // cu con nguyen: canh gia van lay anh tot nhat chua dung, canh ma van lay anh
  // trong kho. Chi cac canh NOI THEM moi lay anh moi tu con tro.
  if (pc.giayMoiAnh) {
    const goc = scenes.splice(0, scenes.length)
    let conAnh = goc.length
    for (const s of goc) {
      const so = Math.max(1, Math.round(s.duration / pc.giayMoiAnh))
      const moi = Math.round((s.duration / so) * 10) / 10
      for (let k = 0; k < so; k++) {
        scenes.push({
          ...s,
          id: scenes.length + 1,
          kenBurns: scenes.length % 2 ? 'out' : 'in',
          image: k === 0 ? s.image : lay(conAnh++),
          // Canh cuoi nuot phan le, de tong dung bang do dai cau noi.
          duration: k === so - 1
            ? Math.round((s.duration - moi * (so - 1)) * 10) / 10
            : moi,
          // ⚠️ Canh noi them giu `voiceText` (chu tren man phai chay lien tuc)
          // nhung BO `speakText` va bat `tiepNoi` — thieu co nay thi bo dung doc
          // lai cung mot cau o moi canh, tuc mot cau bi phat ba lan chong nhau.
          ...(k > 0 ? { tiepNoi: true, speakText: undefined } : {}),
        })
      }
    }
  }

  // ── Chuyen canh cho tung mat noi ────────────────────────────────
  //
  // Gan SAU khi da dung xong moi canh, vi do dai chuyen canh phai biet ca canh
  // truoc lan canh sau de keo cho vua. Canh CUOI khong co `transitionOut` — no
  // khong noi vao dau ca.
  for (let i = 0; i < scenes.length - 1; i++) {
    const cc = chuyenCanhCho(pc, i)
    scenes[i].transitionOut = {
      type: cc.type,
      duration: keoVuaCanh(cc.duration, scenes[i].duration, scenes[i + 1].duration),
    }
  }

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
      // ⚠️ Mot cho dung URL duy nhat. Truoc day dong nay tu noi chuoi
      // `https://www.offerdy.com/d/<ma>?s=video` — tuc ban thu hai cua
      // `shortLinkUrl()`, va la cho de lech khi ten mien hay duong dan doi.
      ctaUrl: shortLinkUrl(deal.code, deal.slug, 'deal', NHAN_CHIEN_DICH),
      ctaCampaign: NHAN_CHIEN_DICH,
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
    // Duong lui, giu de kich ban cu va bo dung cu van hieu. Lay kieu dau tien
    // cua phong cach chu khong viet cung 'fade' nua.
    transition: { type: scenes[0]?.transitionOut?.type ?? 'fade', duration: pc.daiChuyen },
    style: pc,
    scenes,
  }
}

/**
 * Tong do dai sau khi tru phan chong nhau cua cac lan chuyen canh.
 *
 * ⚠️ PHAI CONG DON TUNG MAT NOI, khong duoc nhan `chuyen × (so canh − 1)`. Tu khi
 * moi canh co chuyen canh rieng, cac mat noi dai ngan khac nhau — mot phep nhan
 * se tra ve mot con so KHONG phai do dai that. Va do dai that lai la thu quyet
 * dinh moc dat tung doan tieng noi trong bo dung: sai o day thi tieng troi dan
 * khoi hinh, moi canh lech them mot chut, den canh cuoi lech vai giay.
 *
 * Tham so `chuyen` chi con dung cho canh khong khai bao `transitionOut` (kich ban
 * sinh truoc 2026-08-22).
 */
export const tongThoiLuong = (
  scenes: { duration: number; transitionOut?: { duration: number } }[],
  chuyen = CHUYEN_CANH,
): number => {
  const tong = scenes.reduce((n, s) => n + s.duration, 0)
  // Chi cac mat noi THAT: canh cuoi khong noi vao dau ca.
  const chongNhau = scenes
    .slice(0, Math.max(0, scenes.length - 1))
    .reduce((n, s) => n + (s.transitionOut?.duration ?? chuyen), 0)
  return tong - chongNhau
}

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
