/**
 * Cong kiem tinh trung thuc cho luong sinh bai AI tu mot link store.
 *
 * Tai sao module nay ton tai, va tai sao no la CODE chu khong phai mot dong dan
 * trong prompt: luat "khong bao gio nhac thuong hieu site khong ban" dung loai luat
 * model vi pham khi no dang co to ra huu ich. Tien le trong repo o
 * `generateCaption.ts:238` — *"Prompt co the bi phot lo; kiem tra thi khong."*
 * Thu tu cung cua ca luong la: **cong kiem -> model -> hau kiem**. Day la khau dau.
 *
 * Nhiem vu: nhan danh muc san pham THAT cua mot shop, tra ve nhung mau bai co du
 * bang chung de viet — kem danh sach mau BI TU CHOI va ly do. Hien ca hai la co y:
 * mot cong kiem im lang thi nguoi van hanh khong phan biet duoc "shop nay khong hop"
 * voi "tinh nang hong".
 *
 * ⚠️ `Best X` la HAI mau khac nhau, khong phai mot:
 *   - `best-cross-brand` (*Best RO Filters 2026*) ham y toan thi truong -> khoa lai
 *     tru khi Sanity that su co >=2 store cung nhom hang.
 *   - `best-in-store`  (*Best RO Filters at Frizzlife 2026*) pham vi hoa loi hua vao
 *     dung thu chung minh duoc -> mo khi shop co >=3 san pham so duoc.
 * Khoa cung ca nhom `Best...` thi shop dau tien ra gan nhu khong y tuong nao.
 *
 * Thuan tuy: khong fetch, khong Sanity, khong env, khong `new Date()` (nam duoc
 * truyen vao) — nho vay test duoc truc tiep bang `node --test`.
 */
import { tokenize, modelCodes } from '@/lib/productMatch'

// ── Kieu du lieu ──────────────────────────────────────────────────────

/**
 * Mot san pham ung vien. `url`/`title` den tu `fetchProductCatalog` (mien phi, ca
 * shop); `description`/`price` chi co sau khi cao tung trang bang `scrapeProductPage`.
 *
 * ⚠️ `undefined` nghia la CHUA CAO, khac han voi chuoi rong (cao roi ma shop khong
 * viet gi). Cong kiem phai phan biet hai cai do de bao dung ly do tu choi.
 */
export type IdeaProduct = {
  url: string
  title: string
  description?: string
  /** Gia dang so, tien te goc cua shop. Khong ghep ky hieu — cong kiem chi so sanh. */
  price?: number
}

export const TEMPLATE_IDS = [
  'review',
  'versus',
  'line-compared',
  'best-in-store',
  'best-for',
  'best-cross-brand',
] as const

export type TemplateId = (typeof TEMPLATE_IDS)[number]

/** Nhan tieng Viet cho `/admin/article-ideas`. */
export const TEMPLATE_LABEL: Record<TemplateId, string> = {
  review: 'Đánh giá một sản phẩm',
  versus: 'So kè hai sản phẩm',
  'line-compared': 'So cả một dòng sản phẩm',
  'best-in-store': 'Tốt nhất trong shop này',
  'best-for': 'Tốt nhất cho từng nhu cầu',
  'best-cross-brand': 'Tốt nhất xuyên thương hiệu',
}

export type ArticleIdea = {
  template: TemplateId
  /** Khoa on dinh de tich chon — suy tu template + slug san pham, khong doi giua hai lan quet. */
  key: string
  /**
   * Tieu de TAM, suy tu token. Xau la dung — Chang 3 moi cho model dat ten, va
   * tieu de xau o day lam ro vi sao can buoc do.
   */
  workingTitle: string
  /** Bang chung lam cong mo, hien thang cho nguoi van hanh. */
  why: string
  keywords: string[]
  products: IdeaProduct[]
}

export type RejectedIdea = {
  template: TemplateId
  /** Ly do bi tu choi, tieng Viet, hien thang len man hinh admin. */
  reason: string
  /** Can them gi thi mau nay mo. */
  needed: string
}

export type IdeaScan = {
  offered: ArticleIdea[]
  rejected: RejectedIdea[]
  /** So san pham THAT sau khi gop bien the — con so cong kiem dung, khong phai so dong danh muc. */
  productCount: number
  /** So dong bi gop vi chi la bien the mau/kich co cua mot san pham da co. */
  variantsMerged: number
}

export type IdeaContext = {
  storeName: string
  /** Nam truyen vao chu khong `new Date()`: test phai tat dinh. */
  year: number
  /**
   * So store trong Sanity ban CUNG MOT NHOM HANG, ke ca store dang quet. Chi cong
   * `best-cross-brand` doc gia tri nay.
   *
   * ⚠️ KHONG duoc dien bang so store cung `store.category`. Truong do chi co 10 gia
   * tri rat rong (`home`, `electronics`...) — Frizzlife ban may loc nuoc va mot shop
   * ban ghe sofa deu la `home`. Dem theo do thi cong mo ra *"Best Reverse Osmosis
   * Water 2026"* trong khi site chi co dung MOT hang may loc RO: dung lai su co
   * `/about` da phai sua, chi o quy mo mot bai viet hoan chinh.
   *
   * Muon mo cong nay that thi phai biet shop kia ban gi — tuc phai co document
   * `storeCatalog`. Ke hoach da co y hoan sang dot sau.
   */
  categoryStoreCount?: number
}

// ── Nguong ────────────────────────────────────────────────────────────

/** Duoi muc nay thi mo ta chi la mot dong nhan, khong du de viet mot bai review. */
const MIN_REVIEW_DESCRIPTION = 200
/** Lech gia duoi 10% khong phai mot truc so sanh — no la nhieu lam tron/khuyen mai. */
const MIN_PRICE_GAP = 0.1
const MIN_GROUP_FOR_BEST = 3
/**
 * Tran tren cua mot bai "tot nhat".
 *
 * ⚠️ Do that tren danh muc Frizzlife (179 san pham, 2026-08-05): khong co tran nay,
 * cong mo ra *Best Replacement Cartridge at Frizzlife* voi **75 san pham**. Do khong
 * phai bai "tot nhat" — do la trang danh muc phu tung viet bang van xuoi. Mot nhom
 * qua to nghia la tu khoa chung qua chung, khong phai la shop co nhieu lua chon.
 */
const MAX_GROUP_FOR_BEST = 12
const MIN_LINE_MEMBERS = 3
/**
 * So tu khoa chung KHONG ke ten shop, de mot nhom duoc coi la mot LOAI HANG.
 *
 * Mot tu chung la qua mong: ca shop deu dinh chu "Frizzlife", va rieng chu "filter"
 * thi gom ca may loc RO lan loi loc thay the vao mot ro. Bai "tot nhat" dung tren
 * cai ro do la mot bai so cai may voi phu kien cua chinh no.
 */
const MIN_CATEGORY_KEYWORDS = 2
const MAX_GROUPS = 40
const CAP: Record<TemplateId, number> = {
  review: 5,
  versus: 4,
  'line-compared': 3,
  'best-in-store': 3,
  'best-for': 2,
  'best-cross-brand': 1,
}

// ── Thong so dang so ──────────────────────────────────────────────────

/**
 * Don vi do duoc coi la THONG SO. Hai san pham cung "600 GPD" la cung mot muc
 * cong suat; khac GPD la mot truc so sanh that — chinh la loai cau ma khong trang
 * nao cua shop tu viet (*"PX600 va PD600-TAM3 cung 600 GPD"*).
 */
const UNIT_ALIAS: Record<string, string> = {
  inches: 'inch', in: 'inch', lbs: 'lb', pounds: 'lb', pound: 'lb', kgs: 'kg',
  gallons: 'gal', gallon: 'gal', microns: 'micron', lumens: 'lumen',
  liters: 'l', litres: 'l', liter: 'l', litre: 'l', watts: 'w', watt: 'w',
}

const KNOWN_UNITS = new Set([
  'gpd', 'gph', 'gpm', 'mah', 'wh', 'psi', 'ppm', 'micron', 'inch', 'cm', 'mm',
  'ft', 'oz', 'ml', 'lb', 'kg', 'gal', 'hz', 'khz', 'mhz', 'ghz', 'rpm', 'lumen',
  'btu', 'mph', 'kph', 'km', 'tb', 'gb', 'mb', 'mp', 'w', 'v', 'k', 'g', 'l', 'a',
])

/**
 * Don vi mot chu cai (va `in`) CHI duoc tinh khi dinh lien so: `4K`, `500W`, `13in`.
 * Co khoang trang o giua thi `2 k`, `5 in` gan nhu luon la thu khac — `in` la gioi
 * tu, con mot chu cai roi thi thuong la chu dau cua tu bi cat.
 */
const ATTACHED_ONLY = new Set(['w', 'v', 'k', 'g', 'l', 'a', 'in'])

/**
 * ⚠️ `(?:\s\d)` la de vot lai dau thap phan bi slug an thit.
 *
 * 17/28 shop cua Offerdy khong mo `/products.json`, nen tieu de duoc suy tu slug:
 * `27-5-inch-full-suspension-mountain-bike` -> `27 5 inch full suspension...`. Khong
 * co nhanh nay thi cong doc ra **5 inch** va tu tin bao *"INCH khac nhau (24 vs 5)"*
 * — mot con so sai dua thang cho nguoi van hanh, va o Chang 4 la mot con so sai dua
 * thang cho model. Chi nhan DUNG MOT chu so sau khoang trang, nen `24 26 inch` van
 * doc ra 26 chu khong thanh 24,26.
 */
const SPEC_RE = /(\d+(?:\s\d)?(?:[.,]\d+)?)(\s*)([a-zA-Z]{1,7})\b/g

type SpecScan = {
  /** don vi -> gia tri. Trung don vi thi giu lan xuat hien dau. */
  specs: Record<string, number>
  /** Tieu de da bo cac cum thong so — de `modelCodes` khong nham `600gpd` la ma model. */
  stripped: string
}

export function scanSpecs(title: string): SpecScan {
  const specs: Record<string, number> = {}
  const stripped = title.replace(SPEC_RE, (whole, num: string, gap: string, rawUnit: string) => {
    const lower = rawUnit.toLowerCase()
    if (gap.length > 0 && ATTACHED_ONLY.has(lower)) return whole
    const unit = UNIT_ALIAS[lower] ?? lower
    if (!KNOWN_UNITS.has(unit)) return whole
    const value = Number.parseFloat(num.replace(/\s/, '.').replace(',', '.'))
    if (!Number.isFinite(value)) return whole
    if (!(unit in specs)) specs[unit] = value
    return ' '
  })
  return { specs, stripped }
}

// ── Phan tieu de noi len san pham LA GI ───────────────────────────────

/**
 * Cat phan "hop voi cai gi" ra khoi phan "la cai gi".
 *
 * ⚠️ Do that tren Frizzlife: *"ASR611 Replacement Filter Cartridge **for PD1200
 * Reverse Osmosis System**"* la mot LOI LOC, khong phai mot may loc RO — nhung moi
 * tu dinh danh may loc RO deu nam trong ten no. Khong cat thi:
 *   - no chui vao nhom "reverse osmosis system" (nhom 51 san pham lan lon may voi phu tung)
 *   - va ma `pd1200` bien no thanh thanh vien dong PD.
 * Day dung la lop loi da tung day offer PD1200 sang trang `/products/fcr100`.
 *
 * ⚠️ CHI cat o tu tuong thich, TUYET DOI khong cat o dau phay. Ban dau em cat ca dau
 * phay (nghi phan sau la doan quang cao thong so) — do that tren Frizzlife cho thay
 * shop dat MA MODEL o dung do: *"...Under-Sink Water Filter System, **DW15**"*. Cat
 * dau phay lam DW10 va DW15 co dinh danh y het nhau va bi gop lam mot san pham, keo
 * theo MD40/MD40-2F/MD40-4F, SS99/DS99, SP99/MP99/DW10F, SW10/FK99 — 179 dong danh
 * muc co lai con 160 bang cach danh mat SKU that. Cat ngan luon nguy hiem hon giu dai.
 */
const COMPAT_CUT = /\b(for|fits?|compatible|works?\s+with)\b/i

/**
 * San pham nay co tu mo ta minh bang MOT SAN PHAM KHAC khong.
 *
 * Dung de xep hang, khong dung de chan. Phu tung gan nhu luon phai noi no lap vao
 * cai gi (*"...for PD1200 Reverse Osmosis System"*), con san pham chinh thi khong.
 * Nho vay phan biet duoc "Best Tankless System" voi "Best HF Replacement Housing" ma
 * khong can mot danh sach tu tieng Anh viet cung — tin hieu den tu chinh du lieu.
 */
export function mentionsCompatibility(title: string): boolean {
  return COMPAT_CUT.test(title)
}

export function identityPart(title: string): string {
  const m = title.match(COMPAT_CUT)
  const cut = m?.index !== undefined ? title.slice(0, m.index) : title
  // Tieu de bat dau bang "For ..." thi cat di khong con gi — giu nguyen con hon.
  return cut.trim().length >= 3 ? cut.trim() : title.trim()
}

// ── Gop bien the ──────────────────────────────────────────────────────

/**
 * Tu chi phan biet BIEN THE cua cung mot san pham, khong phan biet san pham khac
 * nhau. `PD600 Black` va `PD600 White` la MOT san pham — dem thanh hai la cach de
 * nhat de sinh ra bai "4 lua chon tot nhat" ma thuc ra chi co 2 thu de chon.
 *
 * ⚠️ Danh sach nay co y rong hon muc an toan tuyet doi (`mini`, `large` doi khi la
 * san pham that su khac). Gop nham lam nhom NHO di -> cong dong lai -> it y tuong
 * hon. Bo sot lam nhom TO gia -> sinh ra mot bai noi doi. Hai kieu sai nay khong
 * ngang gia, nen nghieng ve phia gop.
 */
const VARIANT_WORDS = new Set([
  'black', 'white', 'silver', 'gold', 'golden', 'blue', 'red', 'green', 'grey',
  'gray', 'pink', 'purple', 'yellow', 'orange', 'brown', 'beige', 'ivory', 'navy',
  'chrome', 'brushed', 'matte', 'glossy', 'clear', 'transparent',
  'left', 'right', 'small', 'medium', 'large', 'mini', 'xs', 'xl', 'xxl',
  'pack', 'packs', 'set', 'sets', 'bundle', 'pcs', 'pc', 'piece', 'pieces',
  'color', 'colour', 'style', 'edition', 'version', 'size', 'variant',
])

/**
 * Dinh danh mot san pham, bo qua khac biet ve mau/kich co.
 *
 * Giu lai TOKEN THUONG (khong chi ma model): `PD600 RO System` va `PD600 Replacement
 * Filter` cung mang ma `pd600` nhung mot cai la may, mot cai la loi loc — gop lai la
 * dung lai lo hong da tung day offer PD1200 sang trang `/products/fcr100`.
 */
export function productKey(title: string): string {
  // Token lay tu phan DINH DANH, nhung thong so doc tren CA tieu de: nhieu shop de
  // thong so sau dau phay (*"RO System, 600 GPD"*), va do lai la thu phan biet hai
  // san pham co ten y het nhau.
  const { specs } = scanSpecs(title)
  const { stripped } = scanSpecs(identityPart(title))
  const core = tokenize(stripped)
    .filter(t => !VARIANT_WORDS.has(t))
    .sort()
  const spec = Object.keys(specs).sort().map(u => `${u}=${specs[u]}`).join(',')
  return `${core.join(' ')}|${spec}`
}

/** Gop bien the, giu lai ban ghi co tieu de NGAN nhat lam dai dien (thuong la ten goc). */
export function dedupeVariants(products: IdeaProduct[]): {
  products: IdeaProduct[]
  merged: number
} {
  const byKey = new Map<string, IdeaProduct>()
  let merged = 0
  for (const p of products) {
    const key = productKey(p.title)
    const kept = byKey.get(key)
    if (!kept) {
      byKey.set(key, p)
      continue
    }
    merged++
    // Giu ban co du lieu day hon; hoa thi giu ten ngan hon.
    const keptScore = (kept.description ? 2 : 0) + (kept.price !== undefined ? 1 : 0)
    const newScore = (p.description ? 2 : 0) + (p.price !== undefined ? 1 : 0)
    if (newScore > keptScore || (newScore === keptScore && p.title.length < kept.title.length)) {
      byKey.set(key, p)
    }
  }
  return { products: [...byKey.values()], merged }
}

// ── Gom nhom ──────────────────────────────────────────────────────────

/**
 * Tu khong mang thong tin phan loai. Ngan gon co y: cat qua tay thi hai san pham
 * that su cung ho lai khong con tu chung nao de gap nhau.
 */
const KEYWORD_STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'for', 'with', 'without', 'from', 'to',
  'in', 'on', 'at', 'by', 'your', 'our', 'you', 'is', 'it', 'new', 'free', 'best',
  'top', 'premium', 'quality', 'official', 'genuine', 'original', 'sale', 'shop',
  'buy', 'online', 'product', 'products', 'item', 'items',
])

/** Token dung de gom nhom va dat ten: bo bien the, bo so tran, bo tu vo nghia. */
export function keywordTokens(title: string): string[] {
  const { stripped } = scanSpecs(identityPart(title))
  const out = new Set<string>()
  for (const t of tokenize(stripped)) {
    if (KEYWORD_STOP.has(t)) continue
    if (VARIANT_WORDS.has(t)) continue
    if (/^\d+$/.test(t)) continue
    if (t.length < 2) continue
    out.add(t)
  }
  return [...out]
}

export type ProductGroup = {
  /** Token CHUNG cua moi thanh vien, da xep theo thu tu xuat hien trong ten ngan nhat. */
  keywords: string[]
  products: IdeaProduct[]
}

/**
 * Gom san pham theo token chung. Mot nhom = tap san pham cung chua mot token nao do;
 * tap trung nhau thi gop lam mot va lay giao cua token lam ten nhom.
 *
 * Nhom lon nhat thuong la token thuong hieu (co trong moi san pham) — do chinh la
 * pham vi ma `best-in-store` can, nen KHONG loai no.
 */
export function groupCatalog(products: IdeaProduct[]): ProductGroup[] {
  const tokensOf = new Map<IdeaProduct, Set<string>>()
  for (const p of products) tokensOf.set(p, new Set(keywordTokens(p.title)))

  const byToken = new Map<string, IdeaProduct[]>()
  for (const p of products) {
    for (const t of tokensOf.get(p)!) {
      const list = byToken.get(t)
      if (list) list.push(p)
      else byToken.set(t, [p])
    }
  }

  // Tap san pham giong het nhau -> mot nhom duy nhat, ten nhom la GIAO cua token.
  const bySignature = new Map<string, IdeaProduct[]>()
  for (const [, members] of byToken) {
    if (members.length < 2) continue
    const signature = members.map(p => p.url).sort().join('\n')
    if (!bySignature.has(signature)) bySignature.set(signature, members)
  }

  const groups: ProductGroup[] = []
  for (const members of bySignature.values()) {
    let shared: string[] = [...tokensOf.get(members[0])!]
    for (const p of members.slice(1)) {
      const other = tokensOf.get(p)!
      shared = shared.filter(t => other.has(t))
    }
    if (!shared.length) continue
    groups.push({ keywords: orderKeywords(shared, members), products: members })
  }

  return groups
    .sort(
      (a, b) =>
        b.products.length - a.products.length ||
        b.keywords.length - a.keywords.length ||
        a.keywords.join(' ').localeCompare(b.keywords.join(' '))
    )
    .slice(0, MAX_GROUPS)
}

/**
 * Ma model cua CHINH san pham do — la ma dau tien trong phan dinh danh.
 *
 * ⚠️ "Ma dau tien" khong phai chi tiet lam cho: ten thuc te dat model ngay sau ten
 * hang (*"Frizzlife PD600-TAM3 600GPD Tankless RO System"*), con phu tung nhac model
 * khac o phia sau (*"ASR611 Replacement Cartridge for PD1200..."*). Lay het ma trong
 * ten thi 22 san pham Frizzlife bi coi la "cung dong PD", trong do phan lon la loi
 * loc chi TUONG THICH voi dong PD.
 */
function ownModelCode(title: string): string | undefined {
  return modelCodes(tokenize(scanSpecs(identityPart(title)).stripped))[0]
}

/**
 * Xep tu khoa theo thu tu chung xuat hien trong tieu de NGAN nhat cua nhom.
 * Xep theo tan suat thi ra dung tu nhung sai trat tu — "filter water osmosis reverse"
 * khong doc duoc, ma tieu de tam la thu nguoi van hanh phai doc.
 */
function orderKeywords(keywords: string[], products: IdeaProduct[]): string[] {
  const shortest = [...products].sort((a, b) => a.title.length - b.title.length)[0]
  const order = tokenize(scanSpecs(shortest.title).stripped)
  const rank = (t: string) => {
    const i = order.indexOf(t)
    return i < 0 ? Number.MAX_SAFE_INTEGER : i
  }
  return [...keywords].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

// ── Dat ten tam ───────────────────────────────────────────────────────

function titleCaseToken(t: string): string {
  if (/\d/.test(t)) return t.toUpperCase()
  if (t.length <= 3) return t.toUpperCase()
  return t[0].toUpperCase() + t.slice(1)
}

/** Tu khoa noi len LOAI HANG — bo token trung ten shop, vi ca shop deu mang no. */
function categoryKeywords(keywords: string[], storeName: string): string[] {
  const storeTokens = new Set(tokenize(storeName))
  return keywords.filter(t => !storeTokens.has(t))
}

/**
 * Cum tu khoa cua nhom, da bo token trung ten shop (tieu de da co "at <shop>" roi).
 * Khong con tu nao thi tra ve chuoi rong — KHONG lui ve ten shop. Lui nhu vay de ra
 * *"Frizzlife PD1000 Frizzlife Compared"*, mot tieu de vua thua vua vo nghia.
 */
function keywordPhrase(keywords: string[], storeName: string, max = 4): string {
  return categoryKeywords(keywords, storeName).slice(0, max).map(titleCaseToken).join(' ')
}

/**
 * Ten ngan de HIEN, khong phai de dinh danh: lay phan dinh danh, cat o dau phay dau
 * tien, bo ten shop, con 5 tu. Cat dau phay o day la an toan vi khong co phep so
 * khop nao doc chuoi nay — no chi de nguoi van hanh doc.
 */
function shortName(title: string, storeName: string): string {
  const storeTokens = new Set(tokenize(storeName))
  const words = identityPart(title)
    .split(/[,|]/)[0]
    .split(/[\s·—–]+/)
    .filter(Boolean)
    .filter(w => !storeTokens.has(w.toLowerCase()))
  // Cat 5 tu de lai dau gach/dau cham lung o cuoi (*"...Water Filter -"*) — go di,
  // nguoi doc khong biet do la mot tieu de bi cat hay mot tieu de sai.
  return words.slice(0, 5).join(' ').replace(/[\s\-–—:,]+$/, '')
}

function slugOf(url: string): string {
  const path = url.split('?')[0].replace(/\/+$/, '')
  const last = path.split('/').filter(Boolean).pop()
  return last ?? url
}

function ideaKey(template: TemplateId, products: IdeaProduct[]): string {
  return `${template}:${products.map(p => slugOf(p.url)).sort().join('+')}`
}

// ── Cong kiem tung mau ────────────────────────────────────────────────

type Verdict = { ideas: ArticleIdea[]; reject?: RejectedIdea }

function offerReview(products: IdeaProduct[], ctx: IdeaContext): Verdict {
  const scraped = products.filter(p => p.description !== undefined)
  const ideas = products
    .filter(p => (p.description?.trim().length ?? 0) >= MIN_REVIEW_DESCRIPTION)
    .sort((a, b) => (b.description!.length ?? 0) - (a.description!.length ?? 0))
    .slice(0, CAP.review)
    .map<ArticleIdea>(p => ({
      template: 'review',
      key: ideaKey('review', [p]),
      workingTitle: `${shortName(p.title, ctx.storeName)} Review (${ctx.year})`,
      why: `Trang sản phẩm có ${p.description!.trim().length} ký tự mô tả của chính shop.`,
      keywords: keywordTokens(p.title).slice(0, 6),
      products: [p],
    }))

  if (ideas.length) return { ideas }

  if (!scraped.length) {
    return {
      ideas: [],
      reject: {
        template: 'review',
        reason: 'Chưa cào trang sản phẩm nào, nên chưa biết shop viết được bao nhiêu.',
        needed: `Cào ít nhất 1 trang sản phẩm để lấy mô tả (cần ≥${MIN_REVIEW_DESCRIPTION} ký tự).`,
      },
    }
  }
  const longest = Math.max(...scraped.map(p => p.description!.trim().length))
  return {
    ideas: [],
    reject: {
      template: 'review',
      reason: `Đã cào ${scraped.length} trang, mô tả dài nhất chỉ ${longest} ký tự.`,
      needed: `Cần một sản phẩm có mô tả ≥${MIN_REVIEW_DESCRIPTION} ký tự — dưới mức đó thì bài chỉ có thể diễn giải lại tiêu đề.`,
    },
  }
}

/** Truc so sanh giua hai san pham, hoac `null` neu khong co gi so duoc. */
function comparableAxis(a: IdeaProduct, b: IdeaProduct): string | null {
  if (a.price !== undefined && b.price !== undefined) {
    const hi = Math.max(a.price, b.price)
    const lo = Math.min(a.price, b.price)
    if (hi > 0 && (hi - lo) / hi >= MIN_PRICE_GAP) {
      return `giá lệch ${Math.round(((hi - lo) / hi) * 100)}%`
    }
  }
  const sa = scanSpecs(a.title).specs
  const sb = scanSpecs(b.title).specs
  for (const unit of Object.keys(sa)) {
    if (sb[unit] !== undefined && sb[unit] !== sa[unit]) {
      return `${unit.toUpperCase()} khác nhau (${sa[unit]} vs ${sb[unit]})`
    }
  }
  return null
}

function offerVersus(groups: ProductGroup[], ctx: IdeaContext): Verdict {
  type Pair = { a: IdeaProduct; b: IdeaProduct; shared: number; axis: string }
  const pairs = new Map<string, Pair>()
  let nearMiss = 0

  for (const group of groups) {
    for (let i = 0; i < group.products.length; i++) {
      for (let j = i + 1; j < group.products.length; j++) {
        const a = group.products[i]
        const b = group.products[j]
        // >=2 token chung: mot token chung chi noi len ca hai deu la hang cua shop nay.
        if (categoryKeywords(group.keywords, ctx.storeName).length < MIN_CATEGORY_KEYWORDS) continue
        const key = [slugOf(a.url), slugOf(b.url)].sort().join('|')
        if (pairs.has(key)) continue
        const axis = comparableAxis(a, b)
        if (!axis) {
          nearMiss++
          continue
        }
        pairs.set(key, { a, b, shared: group.keywords.length, axis })
      }
    }
  }

  // ⚠️ Tie-break bang khoa cap chu khong de nguyen thu tu duyet. Cac cap trong cung
  // mot nhom co `shared` y het nhau, nen chi xep theo `shared` thi 4 cap duoc giu lai
  // phu thuoc vao THU TU DANH MUC tra ve — quet lai lan hai ra danh sach khac, va o
  // tich chon cua nguoi van hanh nhay sang y tuong khac.
  // ⚠️ Mot san pham chi duoc xuat hien trong DUNG MOT cap. Do that tren Frizzlife:
  // khong co rang buoc nay thi ca 4 cap de xuat deu la "M800 vs ...", vi M800 khop
  // truc so sanh voi moi may khac. Bon bai gan nhu trung nhau.
  const used = new Set<string>()
  const ideas = [...pairs.entries()]
    .sort(([ka, x], [kb, y]) => y.shared - x.shared || ka.localeCompare(kb))
    .map(([, pair]) => pair)
    .filter(({ a, b }) => {
      if (used.has(a.url) || used.has(b.url)) return false
      used.add(a.url)
      used.add(b.url)
      return true
    })
    .slice(0, CAP.versus)
    .map<ArticleIdea>(({ a, b, axis }) => ({
      template: 'versus',
      key: ideaKey('versus', [a, b]),
      workingTitle: `${shortName(a.title, ctx.storeName)} vs ${shortName(b.title, ctx.storeName)} (${ctx.year})`,
      why: `Cùng dòng và ${axis} — có thứ thật để so.`,
      keywords: keywordTokens(a.title).filter(t => keywordTokens(b.title).includes(t)),
      products: [a, b],
    }))

  if (ideas.length) return { ideas }
  if (nearMiss) {
    return {
      ideas: [],
      reject: {
        template: 'versus',
        reason: `Có ${nearMiss} cặp sản phẩm cùng dòng nhưng không cặp nào so được: chưa có giá của cả hai, và không thông số số học nào khác nhau.`,
        needed: 'Cào trang sản phẩm để lấy giá, hoặc chọn cặp có thông số (GPD, W, inch…) khác nhau.',
      },
    }
  }
  return {
    ideas: [],
    reject: {
      template: 'versus',
      reason: 'Không có hai sản phẩm nào chung đủ 2 từ khoá để coi là cùng dòng.',
      needed: 'Shop cần ít nhất 2 sản phẩm cùng loại.',
    },
  }
}

/**
 * Mot DONG san pham: >=3 ma model cung tien to chu cai (`pd600`, `pd800`, `pd1000`).
 * Chat hon `best-in-store` co chu dich — "so ca mot dong" la loi hua ve quan he giua
 * cac model, khong phai ve viec chung tinh co cung mot gian hang.
 */
function offerLineCompared(groups: ProductGroup[], ctx: IdeaContext): Verdict {
  type Member = { product: IdeaProduct; code: string }
  const lines = new Map<string, { prefix: string; members: Member[]; keywords: string[] }>()
  let biggestPartial = 0

  for (const group of groups) {
    const byPrefix = new Map<string, Member[]>()
    for (const p of group.products) {
      const code = ownModelCode(p.title)
      const prefix = code?.match(/^[a-z]+/)?.[0]
      if (!code || !prefix) continue
      const list = byPrefix.get(prefix)
      if (list) list.push({ product: p, code })
      else byPrefix.set(prefix, [{ product: p, code }])
    }
    for (const [prefix, members] of byPrefix) {
      // ⚠️ Dem MA KHAC NHAU, khong dem san pham. Mot dong that co nhieu model khac
      // nhau (PD600, PD800, PD1000); mot MA VAT LIEU thi lap lai y het. Do that tren
      // kyokuknives.com: 9 con dao cung thep **VG10** bi goi la "9 model cung dong
      // VG" — bai thi khong sai, nhung cau giai thich cho nguoi van hanh thi sai, va
      // cong kiem noi sai mot lan la mat gia tri o moi lan sau.
      const distinct = new Set(members.map(m => m.code)).size
      if (distinct < MIN_LINE_MEMBERS || members.length > MAX_GROUP_FOR_BEST) {
        if (distinct < MIN_LINE_MEMBERS) biggestPartial = Math.max(biggestPartial, distinct)
        continue
      }
      const key = members.map(m => m.product.url).sort().join('\n')
      if (!lines.has(key)) lines.set(key, { prefix, members, keywords: group.keywords })
    }
  }

  // ⚠️ Bo dong nao la TAP CON cua dong da nhan. Cung mot dong CB xuat hien qua hai
  // nhom token khac nhau (6 model va 5 model) — de nguyen thi hai trong ba suat
  // line-compared la hai bien the cua cung mot bai.
  const taken: Set<string>[] = []
  const ideas = [...lines.values()]
    .sort(
      (a, b) =>
        accessoryRatio(a.members.map(m => m.product)) - accessoryRatio(b.members.map(m => m.product)) ||
        b.members.length - a.members.length ||
        a.prefix.localeCompare(b.prefix)
    )
    .filter(({ members }) => {
      const urls = new Set(members.map(m => m.product.url))
      if (taken.some(prev => [...urls].every(u => prev.has(u)))) return false
      taken.push(urls)
      return true
    })
    .slice(0, CAP['line-compared'])
    .map<ArticleIdea>(({ prefix, members, keywords }) => {
      const products = members.map(m => m.product)
      // ⚠️ Tieu de liet ke MA MODEL THAT chu khong phai tien to `PD` do code suy ra.
      // Chu "PD" khong nam trong ten san pham nao — hau kiem cua Chang 3 doi moi tu
      // trong tieu de phai truy nguoc duoc ve du lieu that, va mot tien to tu che la
      // dung loai chu khong truy nguoc duoc.
      const codes = [...new Set(members.map(m => m.code.toUpperCase()))].sort().slice(0, 4)
      return {
        template: 'line-compared',
        key: ideaKey('line-compared', products),
        workingTitle: `${ctx.storeName} ${codes.join(' ')} ${keywordPhrase(keywords, ctx.storeName, 3)} Compared (${ctx.year})`.replace(/\s+/g, ' '),
        why: `${products.length} model cùng dòng ${prefix.toUpperCase()} trong danh mục của shop.`,
        keywords,
        products,
      }
    })

  if (ideas.length) return { ideas }
  return {
    ideas: [],
    reject: {
      template: 'line-compared',
      reason: biggestPartial
        ? `Dòng model đông nhất chỉ có ${biggestPartial} mã khác nhau (cần ≥${MIN_LINE_MEMBERS}).`
        : 'Không nhận ra dòng model nào trong tên sản phẩm của shop.',
      needed: `Cần ≥${MIN_LINE_MEMBERS} mã model khác nhau cùng tiền tố (PD600, PD800, PD1000…).`,
    },
  }
}

function isCategoryGroup(group: ProductGroup, ctx: IdeaContext): boolean {
  return (
    group.products.length >= MIN_GROUP_FOR_BEST &&
    group.products.length <= MAX_GROUP_FOR_BEST &&
    categoryKeywords(group.keywords, ctx.storeName).length >= MIN_CATEGORY_KEYWORDS
  )
}

/** Ty le san pham trong nhom tu mo ta bang mot san pham khac — cang thap cang la hang chinh. */
function accessoryRatio(products: IdeaProduct[]): number {
  return products.filter(p => mentionsCompatibility(p.title)).length / products.length
}

/**
 * Nhom hang CHINH len truoc nhom phu tung.
 *
 * ⚠️ Do that tren Frizzlife: xep theo so luong thi hai suat dau bi *"Best HF
 * Replacement Housing"* va *"Best Replacement Filter Inside"* chiem, con nhom dang
 * viet nhat — 10 he thong RO tankless — tut xuong thu ba. Lo hong noi dung cua site
 * la DINH pheu; xep phu tung len truoc la lap dung lai lo hong do.
 */
function byPrimaryFirst(a: ProductGroup, b: ProductGroup): number {
  return accessoryRatio(a.products) - accessoryRatio(b.products) || b.products.length - a.products.length
}

function offerBestInStore(groups: ProductGroup[], ctx: IdeaContext): Verdict {
  const qualified = groups.filter(g => isCategoryGroup(g, ctx)).sort(byPrimaryFirst)
  const ideas = qualified.slice(0, CAP['best-in-store']).map<ArticleIdea>(group => ({
    template: 'best-in-store',
    key: ideaKey('best-in-store', group.products),
    workingTitle: `Best ${keywordPhrase(group.keywords, ctx.storeName)} at ${ctx.storeName} (${ctx.year})`,
    why: `${group.products.length} sản phẩm so được trong shop. Lời hứa giới hạn trong đúng thứ shop này bán.`,
    keywords: group.keywords,
    products: group.products,
  }))

  if (ideas.length) return { ideas }
  const inRange = groups.filter(
    g => g.products.length >= MIN_GROUP_FOR_BEST && g.products.length <= MAX_GROUP_FOR_BEST
  )
  const biggest = groups[0]?.products.length ?? 0
  return {
    ideas: [],
    reject: {
      template: 'best-in-store',
      reason: inRange.length
        ? `Có ${inRange.length} nhóm đủ kích cỡ nhưng nhóm nào cũng chỉ chung đúng 1 từ khoá ngoài tên shop — quá mỏng để gọi là một loại hàng.`
        : biggest > MAX_GROUP_FOR_BEST
          ? `Nhóm nào cũng quá rộng (lớn nhất ${biggest} sản phẩm) — từ khoá chung quá chung chung để xếp "tốt nhất".`
          : biggest === 0
            // Khong co nhom nao het thi "nhom lon nhat co 0 san pham" la mot cau vo
            // nghia. Hay xay ra khi tieu de suy tu slug ma slug chi la ma SKU tran.
            ? 'Không có hai sản phẩm nào chung một từ khoá nào — tên sản phẩm quá ngắn hoặc chỉ là mã SKU.'
            : `Nhóm sản phẩm so được lớn nhất chỉ có ${biggest} sản phẩm (cần ≥${MIN_GROUP_FOR_BEST}).`,
      needed: `Cần một nhóm ${MIN_GROUP_FOR_BEST}–${MAX_GROUP_FOR_BEST} sản phẩm cùng loại, chung ≥${MIN_CATEGORY_KEYWORDS} từ khoá ngoài tên shop.`,
    },
  }
}

/**
 * Thuoc tinh chia duoc nhom: co o >=2 thanh vien nhung khong qua MOT NUA nhom.
 *
 * ⚠️ Nguong "khong qua mot nua" moi la phan quan trong. Chi doi "co o >=2 va vang o
 * >=1" thi tren Frizzlife no chon chu `cartridge` (9/11 san pham) va de ra *"Best
 * Replacement Filter Inside **for Cartridge** at Frizzlife"* — mot tieu de vo nghia,
 * vi tu do khong phai mot NHU CAU ma la ten cua chinh loai hang. Dac diem chia duoc
 * nguoi mua theo nhu cau bao gio cung la dac diem THIEU SO.
 */
function splitAttributes(group: ProductGroup): string[] {
  const count = new Map<string, number>()
  for (const p of group.products) {
    for (const t of keywordTokens(p.title)) {
      if (group.keywords.includes(t)) continue
      count.set(t, (count.get(t) ?? 0) + 1)
    }
  }
  const half = Math.floor(group.products.length / 2)
  return [...count.entries()]
    .filter(([, n]) => n >= 2 && n <= half)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t)
}

function offerBestFor(groups: ProductGroup[], ctx: IdeaContext): Verdict {
  const ideas: ArticleIdea[] = []
  for (const group of [...groups].sort(byPrimaryFirst)) {
    if (!isCategoryGroup(group, ctx)) continue
    const splits = splitAttributes(group)
    if (!splits.length) continue
    ideas.push({
      template: 'best-for',
      key: ideaKey('best-for', group.products),
      workingTitle: `Best ${keywordPhrase(group.keywords, ctx.storeName)} for ${titleCaseToken(splits[0])} at ${ctx.storeName} (${ctx.year})`,
      why: `${group.products.length} sản phẩm, chia được theo "${splits.slice(0, 3).join('", "')}".`,
      keywords: [...group.keywords, splits[0]],
      products: group.products,
    })
    if (ideas.length >= CAP['best-for']) break
  }

  if (ideas.length) return { ideas }
  return {
    ideas: [],
    reject: {
      template: 'best-for',
      reason: 'Không nhóm nào vừa đủ 3 sản phẩm vừa có thuộc tính chia được thành nhu cầu khác nhau.',
      needed: 'Cần một nhóm ≥3 sản phẩm mà vài sản phẩm có đặc điểm riêng (under-sink, countertop, alkaline…).',
    },
  }
}

/**
 * ⚠️ Mau gan nhu khong bao gio mo, va do la chu dich. *Best RO Filters 2026* la loi
 * hua ve CA THI TRUONG. Site chi ban mot hang trong nhom hang do thi bai nay dung
 * loai hua hao ma su co `/about` vua phai sua — 15 thuong hieu duoc nhac ten trong
 * khi khong co cai nao ton tai trong Sanity.
 *
 * Van phai HIEN ly do tu choi chu khong im lang: nguoi van hanh can biet mau nay ton
 * tai va mo bang cach nao.
 */
function offerCrossBrand(groups: ProductGroup[], ctx: IdeaContext): Verdict {
  const stores = ctx.categoryStoreCount ?? 1
  const group = groups.find(g => isCategoryGroup(g, ctx))
  if (stores >= 2 && group) {
    return {
      ideas: [
        {
          template: 'best-cross-brand',
          key: ideaKey('best-cross-brand', group.products),
          workingTitle: `Best ${keywordPhrase(group.keywords, ctx.storeName)} (${ctx.year})`,
          why: `${stores} store cùng nhóm hàng trong Sanity — đủ dữ liệu để so xuyên thương hiệu.`,
          keywords: group.keywords,
          products: group.products,
        },
      ],
    }
  }
  return {
    ideas: [],
    reject: {
      template: 'best-cross-brand',
      reason: `Chỉ có ${stores} store bán cùng nhóm hàng này. Tiêu đề "tốt nhất" không kèm tên shop là lời hứa về cả thị trường mà site chưa có dữ liệu để giữ.`,
      needed:
        'Cần một store thứ hai bán cùng loại sản phẩm. ⚠️ Không tính bằng trường "Danh mục" của store — nó chỉ có 10 giá trị rất rộng, máy lọc nước và ghế sofa đều là "home". Phải biết shop kia thật sự bán gì (kế hoạch: document storeCatalog, đợt sau).',
    },
  }
}

/**
 * So san pham TOI THIEU mot mau con dung duoc.
 *
 * Dung khi mot `scrapeProductPage` hong: bo san pham do di roi hoi lai cau nay. Bai
 * "tot nhat trong 4" viet tren 3 san pham va mot lo hong la bai noi doi ve chinh noi
 * dung cua no — thu khong ai kiem lai truoc khi dang.
 */
export function minProductsFor(template: TemplateId): number {
  if (template === 'review') return 1
  if (template === 'versus') return 2
  if (template === 'line-compared') return MIN_LINE_MEMBERS
  return MIN_GROUP_FOR_BEST
}

// ── Cong kiem ─────────────────────────────────────────────────────────

/** Thu tu hien: mau nhieu bang chung nhat len truoc. */
const TEMPLATE_ORDER: TemplateId[] = [
  'best-in-store',
  'line-compared',
  'versus',
  'best-for',
  'review',
  'best-cross-brand',
]

/**
 * Cong kiem. Tra ve ca mau MO lan mau BI TU CHOI kem ly do — im lang thi nguoi van
 * hanh khong phan biet duoc "shop nay khong hop" voi "tinh nang hong".
 */
export function availableTemplates(raw: IdeaProduct[], ctx: IdeaContext): IdeaScan {
  const { products, merged } = dedupeVariants(raw)
  const groups = groupCatalog(products)

  // ⚠️ Dong model duoc tim tren CA danh muc, khong chi ben trong tung nhom token.
  //
  // Do that: dan 4 URL Frizzlife vao o dan tay -> slug la `pd600-tam3`, `px600`,
  // `pd1000-n`, `pd800-n`, khong hai cai nao chung mot tu nao, nen khong co nhom nao
  // ra doi va dong PD **tang hinh** — 0 y tuong tren mot tap hoan toan so duoc. Vi
  // 17/28 shop suy tieu de tu slug, day khong phai truong hop hiem.
  //
  // An toan vi `ownModelCode` chi lay ma dau tien trong phan dinh danh: loi loc
  // "ASR611 ... for PD1200" mang ma `asr611`, khong lot vao dong PD.
  const lineGroups: ProductGroup[] = [...groups, { keywords: [], products }]

  const verdicts: Record<TemplateId, Verdict> = {
    review: offerReview(products, ctx),
    versus: offerVersus(groups, ctx),
    'line-compared': offerLineCompared(lineGroups, ctx),
    'best-in-store': offerBestInStore(groups, ctx),
    'best-for': offerBestFor(groups, ctx),
    'best-cross-brand': offerCrossBrand(groups, ctx),
  }

  const offered: ArticleIdea[] = []
  const rejected: RejectedIdea[] = []
  for (const template of TEMPLATE_ORDER) {
    const v = verdicts[template]
    offered.push(...v.ideas)
    if (v.reject) rejected.push(v.reject)
  }

  return { offered, rejected, productCount: products.length, variantsMerged: merged }
}
