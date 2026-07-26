import { unstable_cache } from 'next/cache'
import { isConfigured } from './client'
import { writeClient } from './writeClient'
import { deals as staticDeals, expiringDeals as staticExpiring } from '@/data/deals'
import { stores as staticStores } from '@/data/stores'
import { categories as staticCategories } from '@/data/categories'
import { reviews as staticReviews } from '@/data/reviews'
import { posts as staticPosts } from '@/data/posts'
import { defaultSiteSettings } from '@/data/siteSettings'
import { DEAL_CODE_START } from '@/lib/dealCode'
import { resolveOfferUrl } from '@/lib/affiliateUrl'
import { couponForDealUrl, type DealCoupon, type StoreHostRow } from '@/lib/dealStoreMatch'
import type { StoreHealthInput } from '@/lib/merchantHealth'

// ── Site Settings (from configGeneral + configSocial) ──────────
const CONFIG_QUERY = `{
  "general": *[_type == "configGeneral" && _id == "configGeneral"][0] {
    siteName, tagline, copyrightText,
    "logoUrl": logo.asset->url,
    navigation, footerColumns
  },
  "social": *[_type == "configSocial" && _id == "configSocial"][0] {
    facebook, twitter, instagram, youtube, linkedin, tiktok, pinterest, telegram
  }
}`

export async function getFaviconUrl(): Promise<string | null> {
  if (!isConfigured()) return null
  try {
    const data = await writeClient.fetch(`*[_type == "configGeneral" && _id == "configGeneral"][0]{ "faviconUrl": favicon.asset->url }`)
    return data?.faviconUrl ?? null
  } catch { return null }
}

const SOCIAL_ICON: Record<string, string> = {
  facebook: 'f', twitter: '𝕏', instagram: '◉',
  youtube: '▶', linkedin: 'in', tiktok: '♪', pinterest: '𝑃', telegram: '✈',
}
const SOCIAL_LABEL: Record<string, string> = {
  facebook: 'Facebook', twitter: 'X (Twitter)', instagram: 'Instagram',
  youtube: 'YouTube', linkedin: 'LinkedIn', tiktok: 'TikTok',
  pinterest: 'Pinterest', telegram: 'Telegram',
}

export async function getSiteSettings() {
  if (!isConfigured()) return defaultSiteSettings
  try {
    const { general, social } = await writeClient.fetch(CONFIG_QUERY)
    if (!general) return defaultSiteSettings

    const socialEntries = social
      ? Object.entries(social).filter(([, url]) => typeof url === 'string' && url)
      : []
    const socialMedia = socialEntries.length
      ? socialEntries.map(([key, url]) => ({
          platform: SOCIAL_LABEL[key] ?? key,
          url: url as string,
          icon: SOCIAL_ICON[key] ?? key[0].toUpperCase(),
        }))
      : defaultSiteSettings.socialMedia

    return {
      siteName: general.siteName ?? defaultSiteSettings.siteName,
      tagline: general.tagline ?? defaultSiteSettings.tagline,
      seoDescription: defaultSiteSettings.seoDescription,
      logoUrl: general.logoUrl ?? undefined,
      navigation: general.navigation?.length ? general.navigation : defaultSiteSettings.navigation,
      footerColumns: general.footerColumns?.length ? general.footerColumns : defaultSiteSettings.footerColumns,
      copyrightText: general.copyrightText ?? defaultSiteSettings.copyrightText,
      socialMedia,
    }
  } catch { return defaultSiteSettings }
}

// ── Deals ──────────────────────────────────────────────────────
const dealsQuery = (limit: number) => `*[_type == "deal"] | order(_createdAt desc)[0...${limit}] {
  "id": _id, title, store, emoji, imgClass, "imageUrl": image.asset->url,
  priceSale, priceOrig, discount, discountByAmount, verified, isExpiring, dealUrl, "slug": slug.current
}`

// `pinnedAt` chi duoc /links dung de dua deal vua dang bai len dau (sort o
// links/page.tsx, khong sort o day) — /deals co y giu nguyen thu tu moi-nhat-truoc.
const ALL_DEALS_QUERY = `*[_type == "deal"] | order(_createdAt desc) {
  "id": _id, code, pinnedAt,
  "shortLinkClicks": coalesce(shortLinkClicks, 0), "dealClicks": coalesce(dealClicks, 0),
  title, store, emoji, imgClass, "imageUrl": image.asset->url,
  priceSale, priceOrig, discount, discountByAmount, verified, isExpiring, expiresAt, dealUrl, "slug": slug.current,
  "category": category->{ name, emoji, "slug": slug.current }
}`

const EXPIRING_QUERY = `*[_type == "deal" && isExpiring == true && expiresAt > now()] | order(expiresAt asc)[0...7] {
  "id": _id, "name": title, "price": priceSale + " · was " + priceOrig, emoji,
  expiresAt, "imageUrl": image.asset->url
}`

export async function getDeals(limit = 10) {
  if (!isConfigured()) return staticDeals
  try {
    const data = await writeClient.fetch(dealsQuery(limit))
    return data ?? []   // configured: tra ket qua that ke ca rong (xem getStores)
  } catch { return [] }
}

// /deals doc thu SEARCHParams (?page=N) de phan trang bang URL that (SEO), nen ca trang
// bi Next.js coi la dynamic rendering hoan toan - unstable_cache o day chi cache PHAN
// GOI SANITY (khong phai ca trang), tranh goi Sanity moi luot xem trong khi van giu
// route dynamic. revalidatePath('/deals') trong admin/deals/actions.ts van invalidate
// dung cache nay (theo doc Next.js unstable_cache).
const getCachedAllDeals = unstable_cache(
  async () => writeClient.fetch(ALL_DEALS_QUERY),
  ['all-deals'],
  { revalidate: 60 }
)

export async function getAllDeals() {
  if (!isConfigured()) return staticDeals
  try {
    const data = await getCachedAllDeals()
    return data ?? []   // configured: tra ket qua that ke ca rong (xem getStores)
  } catch { return [] }
}

export async function getDealsByStore(storeName: string) {
  const allDeals = await getAllDeals()
  return allDeals.filter((d: { store?: string }) =>
    d.store?.toLowerCase().includes(storeName.toLowerCase())
  )
}

const DEAL_BY_SLUG_QUERY = `*[_type == "deal" && slug.current == $slug][0] {
  "id": _id, code, title, store, emoji, imgClass, "imageUrl": image.asset->url,
  priceSale, priceOrig, discount, discountByAmount, verified, isExpiring, expiresAt, dealUrl,
  "slug": slug.current,
  summary, prosAndCons{ pros, cons }, faq[]{ question, answer },
  metaTitle, metaDescription, _createdAt, _updatedAt,
  "relatedReview": relatedReview->{ title, "slug": slug.current }
}`

export async function getDealBySlug(slug: string) {
  if (!isConfigured()) return null
  try {
    return await writeClient.fetch(DEAL_BY_SLUG_QUERY, { slug })
  } catch { return null }
}

// ── Ma san pham (#1000+) ───────────────────────────────────────
// Dung cho ca hai short link: /d/1000 (-> trang deal) va /g/1000 (-> thang
// merchant). Chi lay 3 field can thiet, khong keo ca document.
export async function getDealRefByCode(
  code: number
): Promise<{ id: string; slug: string; dealUrl?: string } | null> {
  if (!isConfigured()) return null
  try {
    const ref = await writeClient.fetch<{ id: string; slug?: string; dealUrl?: string } | null>(
      `*[_type == "deal" && code == $code][0]{ "id": _id, "slug": slug.current, dealUrl }`,
      { code }
    )
    return ref?.slug ? { id: ref.id, slug: ref.slug, dealUrl: ref.dealUrl } : null
  } catch { return null }
}

/**
 * Du lieu de dung the OG cho bot doc link preview. Query rieng, KHONG gop vao
 * getDealRefByCode: duong cua nguoi that (redirect) chay moi luot bam, khong nen
 * keo them field chi bot moi can.
 */
export async function getDealPreviewByCode(code: number) {
  if (!isConfigured()) return null
  try {
    return await writeClient.fetch<{
      code: number; title: string; slug: string
      priceSale: string; priceOrig?: string; discount: number; discountByAmount?: boolean
      summary?: string; metaDescription?: string
    } | null>(
      `*[_type == "deal" && code == $code][0]{
        code, title, "slug": slug.current,
        priceSale, priceOrig, discount, discountByAmount, summary, metaDescription
      }`,
      { code }
    )
  } catch { return null }
}

/**
 * Ma ke tiep chua dung = max(code hien co) + 1.
 *
 * Co y KHONG dem so deal (count + START): deal bi xoa se lam ma tut lai va cap
 * trung cho deal khac — trong khi ma cu da nam trong caption bai dang mang xa hoi.
 * Ma chi tang, khong tai su dung.
 *
 * Ghi chu: hai lan tao deal chay that song song co the nhan cung mot ma (Sanity
 * khong co sequence). Chap nhan duoc vi admin la mot nguoi va importer chay tuan
 * tu; neu tuong lai co nhieu writer thi doi sang counter document + patch inc().
 */
export async function nextDealCode(): Promise<number> {
  const max = await writeClient.fetch<number | null>(
    `*[_type == "deal" && defined(code)] | order(code desc)[0].code`
  )
  return typeof max === 'number' ? max + 1 : DEAL_CODE_START
}

export async function getExpiringDeals() {
  if (!isConfigured()) return staticExpiring
  try {
    return await writeClient.fetch(EXPIRING_QUERY)
  } catch { return [] }
}

// ── Stores ─────────────────────────────────────────────────────
// Store moi nhat len truoc (dung chung cho /stores va Featured Stores ticker trang chu)
const STORES_QUERY = `*[_type == "store" && published != false] | order(_createdAt desc) {
  "id": _id, name, abbr, colorClass, "count": dealCount,
  "slug": slug.current, website, category, maxOffer,
  "imageUrl": image.asset->url
}`

const STORE_BY_SLUG_QUERY = `*[_type == "store" && slug.current == $slug && published != false][0] {
  "id": _id, name, abbr, colorClass, "count": dealCount,
  "slug": slug.current, website, affiliateLink, category, maxOffer,
  "imageUrl": image.asset->url,
  shortDescription, description,
  faq[]{ question, answer },
  prosAndCons{ pros, cons },
  events[]{ title, "date": date, description, discount, link },
  metaTitle, metaKeywords, metaDescription
}`

export async function getStores() {
  if (!isConfigured()) return staticStores
  try {
    const data = await writeClient.fetch(STORES_QUERY)
    // QUAN TRONG: khi Sanity DA cau hinh (production), tra dung ket qua ke ca RONG.
    // Truoc day 'data.length ? data : staticStores' khien site live hien 12 store
    // demo bia (Amazon/Nike/Apple...) moi khi du lieu that bi xoa/chua co — vi pham
    // nguyen tac "chi dung noi dung that". Static CHI cho local dev khong co Sanity
    // env (nhanh !isConfigured o tren). Loi fetch cung tra rong, khong tra demo.
    return data ?? []
  } catch { return [] }
}

export async function getStoreBySlug(slug: string) {
  // Static chi cho local dev khong co Sanity. Configured -> khong thay thi null
  // (trang goi notFound), KHONG tra store demo — vi du /stores/amazon se hien
  // chi tiet store gia neu con fallback.
  if (!isConfigured()) return staticStores.find(s => s.slug === slug) ?? null
  try {
    return await writeClient.fetch(STORE_BY_SLUG_QUERY, { slug }) ?? null
  } catch { return null }
}

// ── Ma coupon cho deal (khop qua domain cua dealUrl) ───────────
// Danh sach host + ma coupon cua 28 store. Nho nen keo het roi khop trong TS:
// GROQ khong tach duoc hostname cua URL, va 28 dong thi re hon han goi nhieu lan.
const STORE_HOSTS_QUERY = `*[_type == "store"]{
  "slug": slug.current, name, website, affiliateLink,
  "couponCode": *[_type == "offer" && store._ref == ^._id && active != false && defined(couponCode) && couponCode != ""]
    | order(coalesce(order, 9999) asc)[0].couponCode,
  "couponOfferText": *[_type == "offer" && store._ref == ^._id && active != false && defined(couponCode) && couponCode != ""]
    | order(coalesce(order, 9999) asc)[0].offerText
}`

const getCachedStoreHosts = unstable_cache(
  async () => writeClient.fetch<StoreHostRow[]>(STORE_HOSTS_QUERY),
  ['store-hosts'],
  { revalidate: 300 }
)

/**
 * Ma coupon that cua shop ma mot deal dan toi, hoac null.
 *
 * ⚠️ Day la ma cua CA SHOP, khong phai ma rieng cho san pham do — nhieu shop loai
 * tru hang dang giam gia khoi ma. Moi noi hien ma phai noi dung mucdo do ("shop
 * nay dang co ma X"), khong duoc hua ma ap dung cho san pham. Ma sai o buoc thanh
 * toan lam mat long tin nhieu hon la khong hien gi.
 */
export async function getDealCoupon(dealUrl?: string): Promise<DealCoupon | null> {
  if (!isConfigured() || !dealUrl) return null
  try {
    return couponForDealUrl(dealUrl, await getCachedStoreHosts() ?? [])
  } catch { return null }
}

/** Ma coupon noi bat cua mot store — cho the OG chia se mang xa hoi hien "CODE: X".
 *  Lay offer active dau tien (theo order) co couponCode. Null neu store khong co
 *  ma nao -> the OG an phan coupon di. Theo nguyen tac fallback: null khi rong/loi. */
export async function getStoreTopCoupon(slug: string): Promise<{ code: string; offerText?: string } | null> {
  if (!isConfigured()) return null
  try {
    const data = await writeClient.fetch(
      `*[_type == "offer" && store->slug.current == $slug && active != false && defined(couponCode)]
        | order(coalesce(order, 9999) asc)[0]{ "code": couponCode, offerText }`,
      { slug }
    )
    return data?.code ? data : null
  } catch { return null }
}

// ── Categories ─────────────────────────────────────────────────
const CATEGORIES_QUERY = `*[_type == "category"] | order(order asc) {
  "id": _id, name, emoji, "count": dealCount, colorClass,
  "slug": slug.current
}`

export async function getCategories() {
  if (!isConfigured()) return staticCategories
  try {
    const data = await writeClient.fetch(CATEGORIES_QUERY)
    return data ?? []   // configured: tra ket qua that ke ca rong (xem getStores)
  } catch { return [] }
}

// Map slug cua CATEGORY DOC -> gia tri enum trong store.category.
// Du an dang co 2 he thong danh muc song song: category doc (9 cai, slug kieu
// 'home--garden') va store.category (enum 10 gia tri, kieu 'home'). Bang nay la
// cau noi giua chung.
//
// !! Key phai la slug THAT cua category doc. Truoc day key ghi 'home'/'food'/
// 'tech'/'ai'/'kids' trong khi slug that la 'home--garden'/'food--health'/
// 'tech--gadgets'/'ai-tools'/'kids--baby' -> khong khop -> 4 trang category
// hien 0 store du trong DB co du lieu (25 store food, 9 store home...).
// Neu them category doc moi, nho them key o day.
//
// 'ai-tools' va 'kids--baby' CO Y de trong: khong co gia tri store.category nao
// tuong ung. Truoc day chung map sang 'general' — sai, vi 'general' dang co 180
// store, tuc se do toan bo store khong lien quan vao 2 trang do. Tha de rong
// (da co noindex xu ly) con hon hien sai.
const SLUG_TO_STORE_CAT: Record<string, string> = {
  'tech--gadgets': 'electronics',
  'fashion':       'fashion',
  'beauty':        'beauty',
  'home--garden':  'home',
  'food--health':  'food',
  'travel':        'travel',
  'sports':        'sports',
}

export async function getCategoryBySlug(slug: string) {
  // Static chi cho local dev. Configured -> khong thay thi null (khong tra category
  // demo). Truoc day sau try van fall-through ve staticCategories ke ca khi configured.
  if (!isConfigured()) return staticCategories.find(c => c.slug === slug || c.id === slug) ?? null
  try {
    return await writeClient.fetch(
      `*[_type == "category" && slug.current == $slug][0]{ "id": _id, name, emoji, "count": dealCount, colorClass, "slug": slug.current, description }`,
      { slug }
    ) ?? null
  } catch { return null }
}

export async function getStoresByCategory(slug: string) {
  const legacyValue = SLUG_TO_STORE_CAT[slug] ?? slug
  if (!isConfigured()) return []
  try {
    return await writeClient.fetch(
      `*[_type == "store" && (category == $slug || category == $legacy) && published != false] | order(name asc) {
        "id": _id, name, abbr, colorClass, "slug": slug.current,
        website, maxOffer, "imageUrl": image.asset->url, category
      }`,
      { slug, legacy: legacyValue }
    )
  } catch { return [] }
}

/** Tra ve slug cua nhung category doc THUC SU co it nhat 1 store.
 *  Dung cho sitemap: category rong thi khong nop cho Google (thin content),
 *  giong cach xu ly /comparisons. Trang category tu noindex rieng cua no.
 *  Loi fetch -> tra Set rong -> loai het category ra khoi sitemap: huong an toan,
 *  tha bo sot URL hop le con hon nop trang rong. */
export async function getCategorySlugsWithStores(): Promise<Set<string>> {
  if (!isConfigured()) return new Set()
  try {
    const data = await writeClient.fetch<{
      cats: { slug: string | null }[]
      used: (string | null)[]
    }>(`{
      "cats": *[_type == "category"]{ "slug": slug.current },
      "used": array::unique(*[_type == "store" && published != false].category)
    }`)
    const used = new Set((data?.used ?? []).filter(Boolean) as string[])
    return new Set(
      (data?.cats ?? [])
        .map(c => c.slug)
        .filter((s): s is string => !!s)
        // khop truc tiep (store tag dung slug) HOAC qua bang map sang enum cu
        .filter(s => used.has(s) || used.has(SLUG_TO_STORE_CAT[s] ?? ''))
    )
  } catch { return new Set() }
}

// ── Reviews ────────────────────────────────────────────────────
// PUBLISHED_FILTER: an bai co publishedAt trong tuong lai (lich dang bai) cho toi dung ngay
const PUBLISHED_FILTER = '(!defined(publishedAt) || publishedAt <= now())'

const REVIEWS_QUERY = `*[_type == "review" && ${PUBLISHED_FILTER}] | order(publishedAt desc) {
  "id": _id, title, excerpt, emoji, tag, stars, author,
  "date": publishedAt, imgBg,
  "slug": slug.current, "imageUrl": coalesce(image.asset->url, externalImageUrl)
}`

export async function getReviews() {
  if (!isConfigured()) return staticReviews
  try {
    const data = await writeClient.fetch(REVIEWS_QUERY)
    return data ?? []   // configured: tra ket qua that ke ca rong (xem getStores)
  } catch { return [] }
}

const REVIEW_BY_SLUG_QUERY = `*[_type == "review" && slug.current == $slug && ${PUBLISHED_FILTER}][0] {
  "id": _id, "slug": slug.current, title, excerpt, emoji, tag, stars, author,
  "date": publishedAt, "updatedAt": _updatedAt, imgBg, body, content, "imageUrl": coalesce(image.asset->url, externalImageUrl),
  faq, prosAndCons, metaTitle, metaDescription, productUrl, affiliateUrl, couponCode
}`

// ── Blog Posts ─────────────────────────────────────────────────
const POSTS_QUERY = `*[_type == "post" && ${PUBLISHED_FILTER}] | order(publishedAt desc) {
  "id": _id, "slug": slug.current, title, excerpt, category,
  author, "date": publishedAt, coverEmoji, coverBg, readTime,
  "imageUrl": coalesce(image.asset->url, externalImageUrl)
}`

const POST_BY_SLUG_QUERY = `*[_type == "post" && slug.current == $slug && ${PUBLISHED_FILTER}][0] {
  "id": _id, "slug": slug.current, title, excerpt, category,
  author, "date": publishedAt, "updatedAt": _updatedAt, coverEmoji, coverBg, readTime, body, content,
  "imageUrl": coalesce(image.asset->url, externalImageUrl)
}`

export async function getPosts() {
  if (!isConfigured()) return staticPosts
  try {
    const data = await writeClient.fetch(POSTS_QUERY)
    return data ?? []   // configured: tra ket qua that ke ca rong (xem getStores)
  } catch { return [] }
}

export async function getPostBySlug(slug: string) {
  if (!isConfigured()) return staticPosts.find(p => p.slug === slug) ?? null
  try {
    return await writeClient.fetch(POST_BY_SLUG_QUERY, { slug }) ?? null
  } catch { return null }
}

export async function getReviewBySlug(slug: string) {
  if (!isConfigured()) return staticReviews.find(r => r.slug === slug) ?? null
  try {
    return await writeClient.fetch(REVIEW_BY_SLUG_QUERY, { slug }) ?? null
  } catch { return null }
}

// ── Search suggestions moved to /api/search-suggest (live, fuzzy-matched) ──

// ── Offers ─────────────────────────────────────────────────────
export type Offer = {
  id: string
  title: string
  offerText: string
  couponCode?: string
  /** URL dich DA GIAI: trang san pham (kem ref) neu co, khong thi link store. */
  link: string
  /** Link trang san pham dang tran, giu lai de admin/debug doi chieu. */
  productUrl?: string
  /** Ket qua kiem tra link gan nhat — resolveOfferUrl dung de lui ve link shop. */
  linkStatus?: string
  description?: string
  usageTips?: string
  eligibilityNotes?: string
  expiresAt?: string
  active: boolean
  verified: boolean
  votesActive?: number
  votesExpired?: number
  store: {
    name: string
    abbr: string
    colorClass: string
    slug: string
    imageUrl?: string
    affiliateLink?: string
    website?: string
  }
}

// Moi projection offer lay san `productUrl` + link/website cua store, roi di qua
// ham nay de `offer.link` LUON la URL dich cuoi cung. Lam o tang query thay vi
// tung component: cac trang offer (store, /coupon-codes, /flash-sales, JSON-LD)
// nho do dung chung mot ket qua, khong noi nao co the quen gan ma ref.
const OFFER_STORE_PROJECTION = `
    name, abbr, colorClass,
    "slug": slug.current,
    affiliateLink, website`

function resolveOfferLinks(rows: Offer[] | null | undefined): Offer[] {
  if (!rows) return []
  return rows.map(offer => ({
    ...offer,
    link: resolveOfferUrl(offer, offer.store ?? {}),
  }))
}

const OFFERS_QUERY = `*[_type == "offer" && active == true] | order(_createdAt desc) {
  "id": _id,
  title,
  offerText,
  couponCode,
  "link": link,
  productUrl,
  linkStatus,
  description,
  expiresAt,
  active,
  "votesActive": coalesce(votesActive, 0),
  "votesExpired": coalesce(votesExpired, 0),
  "store": store-> {${OFFER_STORE_PROJECTION}
  }
}`

const OFFERS_BY_STORE_QUERY = `*[_type == "offer" && active == true && store->slug.current == $storeSlug] | order(order desc, _createdAt desc) {
  "id": _id,
  title,
  offerText,
  couponCode,
  "link": link,
  productUrl,
  linkStatus,
  description,
  usageTips,
  eligibilityNotes,
  expiresAt,
  active,
  "verified": coalesce(verified, true),
  "votesActive": coalesce(votesActive, 0),
  "votesExpired": coalesce(votesExpired, 0),
  "store": store-> {${OFFER_STORE_PROJECTION}
  }
}`

export async function getOffers(): Promise<Offer[]> {
  if (!isConfigured()) return []
  try {
    return resolveOfferLinks(await writeClient.fetch(OFFERS_QUERY))
  } catch { return [] }
}

export async function getOffersByStore(storeSlug: string): Promise<Offer[]> {
  if (!isConfigured()) return []
  try {
    return resolveOfferLinks(await writeClient.fetch(OFFERS_BY_STORE_QUERY, { storeSlug }))
  } catch { return [] }
}

// ── Config Content (global how-to + FAQ) ───────────────────────
export type HowToStep = { title: string; description?: string }
export type FaqItem = { question: string; answer: string }

const CONFIG_CONTENT_QUERY = `*[_type == "configContent"][0] {
  defaultOfferDescription,
  howToSteps[]{ title, description },
  defaultFaqs[]{ question, answer },
  dealsPerPage, dealsGridColumns, reviewsGridColumns, blogGridColumns,
  showExpiringBand, showVerifiedBadge, showCategoryGrid,
  announcementBar, announcementBarUrl,
  articleDisclaimer, articleReviewedBy
}`

export type ContentConfig = {
  defaultOfferDescription?: string
  howToSteps?: HowToStep[]
  defaultFaqs?: FaqItem[]
  dealsPerPage?: number
  dealsGridColumns?: number
  reviewsGridColumns?: number
  blogGridColumns?: number
  showExpiringBand?: boolean
  showVerifiedBadge?: boolean
  showCategoryGrid?: boolean
  announcementBar?: string
  announcementBarUrl?: string
  articleDisclaimer?: string
  articleReviewedBy?: string
}

export async function getConfigContent(): Promise<ContentConfig> {
  if (!isConfigured()) return {}
  try {
    const data = await writeClient.fetch(CONFIG_CONTENT_QUERY)
    return data ?? {}
  } catch { return {} }
}

// ── Config: SEO ──────────────────────────────────────────────
const CONFIG_SEO_QUERY = `*[_type == "configSEO"][0] {
  titleTemplate, defaultTitle, defaultDescription,
  "defaultOgImageUrl": defaultOgImage.asset->url,
  keywords, googleSiteVerification, canonicalUrl, twitterCard
}`

export type SeoConfig = {
  titleTemplate?: string
  defaultTitle?: string
  defaultDescription?: string
  defaultOgImageUrl?: string
  keywords?: string[]
  googleSiteVerification?: string
  canonicalUrl?: string
  twitterCard?: string
}

export async function getConfigSeo(): Promise<SeoConfig> {
  if (!isConfigured()) return {}
  try {
    const data = await writeClient.fetch(CONFIG_SEO_QUERY)
    return data ?? {}
  } catch { return {} }
}

// ── Config: Author (fallback identity for posts/reviews) ────────
const CONFIG_AUTHOR_QUERY = `*[_type == "configAuthor"][0] {
  defaultName, role, "avatarUrl": avatar.asset->url, bio, email, twitterHandle, experienceBio, verificationProcess
}`

export type AuthorConfig = {
  defaultName?: string
  role?: string
  avatarUrl?: string
  bio?: string
  email?: string
  twitterHandle?: string
  experienceBio?: string
  verificationProcess?: string
}

export async function getConfigAuthor(): Promise<AuthorConfig> {
  if (!isConfigured()) return {}
  try {
    const data = await writeClient.fetch(CONFIG_AUTHOR_QUERY)
    return data ?? {}
  } catch { return {} }
}

// ── Flash Sales (active offers expiring soon) ──────────────────
const FLASH_SALES_QUERY = `*[_type == "offer" && active == true && defined(expiresAt) && expiresAt > now()] | order(expiresAt asc) {
  "id": _id,
  title,
  offerText,
  couponCode,
  "link": link,
  productUrl,
  linkStatus,
  description,
  expiresAt,
  active,
  "verified": coalesce(verified, true),
  "votesActive": coalesce(votesActive, 0),
  "votesExpired": coalesce(votesExpired, 0),
  "store": store-> {${OFFER_STORE_PROJECTION},
    "imageUrl": image.asset->url
  }
}`

export async function getFlashSaleOffers(): Promise<Offer[]> {
  if (!isConfigured()) return []
  try {
    return resolveOfferLinks(await writeClient.fetch(FLASH_SALES_QUERY))
  } catch { return [] }
}

// ── Coupon Code Offers ─────────────────────────────────────────
// (!defined(expiresAt) || expiresAt >= now()) loai bo code da het han khoi trang
// listing chinh - hien thi code chet nhu con song la lua nguoi dung (xem
// WORKFLOW_EXPIRED_COUPONS.md "Never mislead users"). Store page van hien
// offer het han gan day o muc rieng "Recently Expired", chi trang listing
// nay (khong co per-offer detail page nen khong can giu lai cho SEO) moi loc bo.
const COUPON_OFFERS_QUERY = `*[_type == "offer" && active == true && defined(couponCode) && couponCode != "" && (!defined(expiresAt) || expiresAt >= now())] | order(order desc, _createdAt desc) {
  "id": _id,
  title,
  offerText,
  couponCode,
  "link": link,
  productUrl,
  linkStatus,
  description,
  expiresAt,
  active,
  "verified": coalesce(verified, true),
  "votesActive": coalesce(votesActive, 0),
  "votesExpired": coalesce(votesExpired, 0),
  "store": store-> {${OFFER_STORE_PROJECTION},
    "imageUrl": image.asset->url
  }
}`

// Cung ly do voi getAllDeals o tren: /coupon-codes cung dung ?page=N nen ca trang
// van dynamic, unstable_cache o day chi tranh goi Sanity lai moi luot xem.
const getCachedCouponOffers = unstable_cache(
  async () => writeClient.fetch(COUPON_OFFERS_QUERY),
  ['coupon-offers'],
  { revalidate: 60 }
)

export async function getCouponOffers(): Promise<Offer[]> {
  if (!isConfigured()) return []
  try {
    // Giai link SAU cache: unstable_cache giu nguyen ket qua tho tu Sanity, con
    // viec ghep ref la thuan tuy va re, khong can cache rieng.
    return resolveOfferLinks(await getCachedCouponOffers())
  } catch { return [] }
}

// ── Comparison Posts ───────────────────────────────────────────
const COMPARISON_POSTS_QUERY = `*[_type == "post" && category == "Comparison" && ${PUBLISHED_FILTER}] | order(publishedAt desc) {
  "id": _id, "slug": slug.current, title, excerpt, category,
  author, "date": publishedAt, coverEmoji, coverBg, readTime,
  "imageUrl": image.asset->url
}`

export async function getComparisonPosts() {
  if (!isConfigured()) return []
  try {
    const data = await writeClient.fetch(COMPARISON_POSTS_QUERY)
    return data ?? []
  } catch { return [] }
}

// ── Tips & Guides Posts ────────────────────────────────────────
const TIPS_GUIDES_QUERY = `*[_type == "post" && category == "Tips & Guides" && ${PUBLISHED_FILTER}] | order(publishedAt desc) {
  "id": _id, "slug": slug.current, title, excerpt, category,
  author, "date": publishedAt, coverEmoji, coverBg, readTime,
  "imageUrl": image.asset->url
}`

export async function getTipsGuidePosts() {
  if (!isConfigured()) return staticPosts.filter(p => p.category === 'Tips & Guides')
  try {
    const data = await writeClient.fetch(TIPS_GUIDES_QUERY)
    return data ?? []   // configured: tra ket qua that ke ca rong (xem getStores)
  } catch { return [] }
}

export async function getPageBySlug(slug: string) {
  if (!isConfigured()) return null
  try {
    return await writeClient.fetch(
      `*[_type == "page" && slug.current == $slug && published == true][0] {
        title, "slug": slug.current, excerpt, content,
        "imageUrl": image.asset->url, _updatedAt
      }`,
      { slug }
    )
  } catch { return null }
}

// ── Merchant Health (admin-only) ────────────────────────────────
const MERCHANT_HEALTH_QUERY = `*[_type == "store"] {
  "id": _id,
  name,
  "slug": slug.current,
  "hasImage": defined(image),
  "hasDescription": defined(description) && description != "",
  "faqCount": count(faq),
  "hasProsAndCons": count(prosAndCons.pros) > 0 && count(prosAndCons.cons) > 0,
  metaTitle,
  metaKeywords,
  metaDescription,
  "updatedAt": _updatedAt,
  "offerStats": {
    "total": count(*[_type == "offer" && references(^._id) && active == true]),
    "verified": count(*[_type == "offer" && references(^._id) && active == true && verified == true]),
    "linkOk": count(*[_type == "offer" && references(^._id) && active == true && linkStatus == "ok"]),
    "linkChecked": count(*[_type == "offer" && references(^._id) && active == true && defined(linkStatus) && linkStatus != "unchecked"])
  }
}`

// 4 count() subqueries per store — at 361+ stores that's 1000+ full offer-collection
// scans per page load with no cache. Same unstable_cache pattern as getAllDeals/
// getCouponOffers above; admin-only pages, 60s staleness is a non-issue here.
const getCachedMerchantHealthData = unstable_cache(
  async () => writeClient.fetch<StoreHealthInput[]>(MERCHANT_HEALTH_QUERY),
  ['merchant-health'],
  { revalidate: 60 }
)

export async function getMerchantHealthData(): Promise<StoreHealthInput[]> {
  if (!isConfigured()) return []
  try {
    const data = await getCachedMerchantHealthData()
    return data ?? []
  } catch { return [] }
}

// ── Daily Report (AI) ────────────────────────────────────────────
export type DailyReport = {
  generatedAt?: string
  summary?: string
  recommendations?: string[]
  avgHealthScore?: number
  criticalStoreCount?: number
  brokenLinkCount?: number
  missingContentCount?: number
  openErrorCount?: number
  seoIssueCount?: number
  todayClicks?: number
  sevenDayClicks?: number
  needsAttentionCount?: number
  zeroClickStoreCount?: number
  model?: string
  /** 'cron' = chay tu dong theo lich; 'admin' = bam nut "Tao lai ngay". */
  triggeredBy?: string
}

const DAILY_REPORT_QUERY = `*[_type == "dailyReport"][0] {
  generatedAt, summary, recommendations, avgHealthScore,
  criticalStoreCount, brokenLinkCount, missingContentCount, openErrorCount, seoIssueCount,
  todayClicks, sevenDayClicks, needsAttentionCount, zeroClickStoreCount, model, triggeredBy
}`

export async function getLatestDailyReport(): Promise<DailyReport | null> {
  if (!isConfigured()) return null
  try {
    return await writeClient.fetch(DAILY_REPORT_QUERY)
  } catch { return null }
}

// ── Click Analytics (AI Analytics Engine) ───────────────────────
export type ClickAnalyticsSummary = {
  todayCount: number
  sevenDayCount: number
  thirtyDayCount: number
  allTimeCount: number
  topOffers: { title: string; storeName?: string; clicks: number }[]
  needsAttentionCount: number
  zeroClickStoreCount: number
  // ── Short link /d/ + /g/ (phat hanh mang xa hoi) ──
  shortLinkThirtyDay: number
  shortLinkAllTime: number
  dealMerchantAllTime: number
  /** Xem vs bam-sang-merchant theo tung nguon, 30 ngay. Cot tra loi "kenh nao ra don". */
  sourceBreakdown: { source: string; views: number; clicks: number }[]
  topShortLinkDeals: { code?: number; title: string; opens: number; merchantClicks: number }[]
  // ── Deep link (offer.productUrl) ──
  /**
   * ⚠️ Day la TY TRONG CLICK, khong phai ty le chuyen doi. Chuyen doi that xay ra
   * ben GoAffPro va site khong nhin thay; offer cung khong co so luot hien thi de
   * lam mau so. Con so nay chi tra loi "bao nhieu phan click di qua trang san
   * pham", va chi co nghia khi dat cung mot so offer duoc phu.
   */
  deepLinkClicks: number
  shallowLinkClicks: number
  /** Do phu hien tai: bao nhieu offer dang co link san pham. */
  offersWithProductUrl: number
  /** Offer co the deep-link (khong tinh uu dai toan shop chua the nhan biet o day). */
  offersTotal: number
}

const CLICK_ANALYTICS_QUERY = `{
  "offers": *[_type == "offer" && active == true] {
    title, "clicks": coalesce(clicks, 0), verified, expiresAt,
    "storeId": store._ref, "storeName": store->name
  },
  "stores": *[_type == "store" && published != false] {
    "id": _id, "directClicks": coalesce(clicks, 0)
  },
  "recentClicks": *[_type == "click" && kind != "shortlink" && _createdAt >= $thirtyDaysAgo]._createdAt,
  "deepLinkClicks": count(*[_type == "click" && kind != "shortlink" && deepLink == true]),
  "shallowLinkClicks": count(*[_type == "click" && kind != "shortlink" && deepLink == false]),
  "offersWithProductUrl": count(*[_type == "offer" && active == true && defined(productUrl)]),
  "offersTotal": count(*[_type == "offer" && active == true]),
  "allTimeClicks": count(*[_type == "click" && kind != "shortlink"]),
  "shortLinkClicks": *[_type == "click" && kind == "shortlink" && _createdAt >= $thirtyDaysAgo]{ source },
  "attributedClicks": *[_type == "click" && kind != "shortlink" && defined(source) && _createdAt >= $thirtyDaysAgo]{ source },
  "shortLinkDeals": *[_type == "deal" && (shortLinkClicks > 0 || dealClicks > 0)] | order(coalesce(shortLinkClicks, 0) desc) {
    code, title, "opens": coalesce(shortLinkClicks, 0), "merchantClicks": coalesce(dealClicks, 0)
  }
}`

export async function getClickAnalyticsSummary(): Promise<ClickAnalyticsSummary> {
  const empty: ClickAnalyticsSummary = {
    todayCount: 0, sevenDayCount: 0, thirtyDayCount: 0, allTimeCount: 0,
    topOffers: [], needsAttentionCount: 0, zeroClickStoreCount: 0,
    shortLinkThirtyDay: 0, shortLinkAllTime: 0, dealMerchantAllTime: 0,
    sourceBreakdown: [], topShortLinkDeals: [],
    deepLinkClicks: 0, shallowLinkClicks: 0, offersWithProductUrl: 0, offersTotal: 0,
  }
  if (!isConfigured()) return empty
  try {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

    const data = await writeClient.fetch<{
      offers: { title: string; clicks: number; verified?: boolean; expiresAt?: string; storeId?: string; storeName?: string }[]
      stores: { id: string; directClicks: number }[]
      recentClicks: string[]
      allTimeClicks: number
      shortLinkClicks: { source?: string }[]
      attributedClicks: { source?: string }[]
      shortLinkDeals: { code?: number; title: string; opens: number; merchantClicks: number }[]
      deepLinkClicks: number
      shallowLinkClicks: number
      offersWithProductUrl: number
      offersTotal: number
    }>(CLICK_ANALYTICS_QUERY, { thirtyDaysAgo })

    const todayCount = data.recentClicks.filter(c => c >= startOfToday).length
    const sevenDayCount = data.recentClicks.filter(c => c >= sevenDaysAgo).length
    const thirtyDayCount = data.recentClicks.length
    // Dem tu click log, KHONG cong bo dem tren offer/store: bo dem bi xoa cung
    // document, nen sau khi don store cu thi "tat ca thoi gian" tut xuong duoi ca
    // "30 ngay qua". Xem giai thich day du o src/app/admin/reports/page.tsx.
    const allTimeCount = data.allTimeClicks ?? 0

    const topOffers = [...data.offers]
      .filter(o => o.clicks > 0)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 3)
      .map(o => ({ title: o.title, storeName: o.storeName, clicks: o.clicks }))

    const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - now.getTime()) / 86400000)
    const needsAttentionCount = data.offers.filter(o =>
      o.clicks > 0 && (o.verified === false || (o.expiresAt && daysUntil(o.expiresAt) <= 7))
    ).length

    const storeClickTotals = new Map<string, number>()
    for (const s of data.stores) storeClickTotals.set(s.id, s.directClicks)
    for (const o of data.offers) {
      if (!o.storeId) continue
      storeClickTotals.set(o.storeId, (storeClickTotals.get(o.storeId) ?? 0) + o.clicks)
    }
    const zeroClickStoreCount = [...storeClickTotals.values()].filter(c => c === 0).length

    // ── Short link ──
    const shortLinkAllTime = data.shortLinkDeals.reduce((sum, d) => sum + d.opens, 0)
    const dealMerchantAllTime = data.shortLinkDeals.reduce((sum, d) => sum + d.merchantClicks, 0)

    const views = new Map<string, number>()
    for (const c of data.shortLinkClicks) {
      const s = c.source ?? 'other'
      views.set(s, (views.get(s) ?? 0) + 1)
    }
    const attributed = new Map<string, number>()
    for (const c of data.attributedClicks) {
      const s = c.source ?? 'other'
      attributed.set(s, (attributed.get(s) ?? 0) + 1)
    }
    const sourceBreakdown = [...new Set([...views.keys(), ...attributed.keys()])]
      .map(source => ({ source, views: views.get(source) ?? 0, clicks: attributed.get(source) ?? 0 }))
      .sort((a, b) => b.clicks - a.clicks || b.views - a.views)

    return {
      todayCount, sevenDayCount, thirtyDayCount, allTimeCount, topOffers,
      needsAttentionCount, zeroClickStoreCount,
      shortLinkThirtyDay: data.shortLinkClicks.length,
      shortLinkAllTime,
      dealMerchantAllTime,
      sourceBreakdown,
      topShortLinkDeals: data.shortLinkDeals.slice(0, 5),
      deepLinkClicks: data.deepLinkClicks ?? 0,
      shallowLinkClicks: data.shallowLinkClicks ?? 0,
      offersWithProductUrl: data.offersWithProductUrl ?? 0,
      offersTotal: data.offersTotal ?? 0,
    }
  } catch { return empty }
}

// ── SEO Audit ──────────────────────────────────────────────────
const SEO_AUDIT_QUERY = `{
  "stores": *[_type == "store" && published != false] {
    "id": _id, name, "slug": slug.current, metaTitle, metaDescription,
    "faqCount": count(faq), "hasImage": defined(image)
  },
  "deals": *[_type == "deal"] {
    "id": _id, title, "slug": slug.current, metaTitle, metaDescription,
    "faqCount": count(faq), "hasImage": defined(image)
  },
  "posts": *[_type == "post" && defined(publishedAt) && publishedAt <= now()] {
    "id": _id, title, "slug": slug.current, excerpt, "hasImage": defined(image) || defined(externalImageUrl)
  },
  "reviews": *[_type == "review" && (!defined(publishedAt) || publishedAt <= now())] {
    "id": _id, title, "slug": slug.current, excerpt, "hasImage": defined(image) || defined(externalImageUrl)
  }
}`

export type SeoAuditData = {
  stores: import('@/lib/seoAudit').StoreSeoInput[]
  deals: import('@/lib/seoAudit').DealSeoInput[]
  posts: import('@/lib/seoAudit').PostSeoInput[]
  reviews: import('@/lib/seoAudit').ReviewSeoInput[]
}

const getCachedSeoAuditData = unstable_cache(
  async () => writeClient.fetch<SeoAuditData>(SEO_AUDIT_QUERY),
  ['seo-audit'],
  { revalidate: 60 }
)

export async function getSeoAuditData(): Promise<SeoAuditData> {
  const empty = { stores: [], deals: [], posts: [], reviews: [] }
  if (!isConfigured()) return empty
  try {
    return (await getCachedSeoAuditData()) ?? empty
  } catch { return empty }
}
