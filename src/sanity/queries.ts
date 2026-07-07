import { unstable_cache } from 'next/cache'
import { isConfigured } from './client'
import { writeClient } from './writeClient'
import { deals as staticDeals, expiringDeals as staticExpiring } from '@/data/deals'
import { stores as staticStores } from '@/data/stores'
import { categories as staticCategories } from '@/data/categories'
import { reviews as staticReviews } from '@/data/reviews'
import { posts as staticPosts } from '@/data/posts'
import { defaultSiteSettings } from '@/data/siteSettings'
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

const ALL_DEALS_QUERY = `*[_type == "deal"] | order(_createdAt desc) {
  "id": _id, title, store, emoji, imgClass, "imageUrl": image.asset->url,
  priceSale, priceOrig, discount, discountByAmount, verified, isExpiring, expiresAt, dealUrl, "slug": slug.current
}`

const EXPIRING_QUERY = `*[_type == "deal" && isExpiring == true && expiresAt > now()] | order(expiresAt asc)[0...7] {
  "id": _id, "name": title, "price": priceSale + " · was " + priceOrig, emoji,
  expiresAt, "imageUrl": image.asset->url
}`

export async function getDeals(limit = 10) {
  if (!isConfigured()) return staticDeals
  try {
    const data = await writeClient.fetch(dealsQuery(limit))
    return data.length ? data : staticDeals
  } catch { return staticDeals }
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
    return data.length ? data : staticDeals
  } catch { return staticDeals }
}

export async function getDealsByStore(storeName: string) {
  const allDeals = await getAllDeals()
  return allDeals.filter((d: { store?: string }) =>
    d.store?.toLowerCase().includes(storeName.toLowerCase())
  )
}

const DEAL_BY_SLUG_QUERY = `*[_type == "deal" && slug.current == $slug][0] {
  "id": _id, title, store, emoji, imgClass, "imageUrl": image.asset->url,
  priceSale, priceOrig, discount, discountByAmount, verified, isExpiring, expiresAt, dealUrl,
  "slug": slug.current,
  summary, prosAndCons{ pros, cons }, faq[]{ question, answer },
  metaTitle, metaDescription, _createdAt, _updatedAt
}`

export async function getDealBySlug(slug: string) {
  if (!isConfigured()) return null
  try {
    return await writeClient.fetch(DEAL_BY_SLUG_QUERY, { slug })
  } catch { return null }
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
    return data.length ? data : staticStores
  } catch { return staticStores }
}

export async function getStoreBySlug(slug: string) {
  const fallback = staticStores.find(s => s.slug === slug) ?? null
  if (!isConfigured()) return fallback
  try {
    const data = await writeClient.fetch(STORE_BY_SLUG_QUERY, { slug })
    return data ?? fallback
  } catch { return fallback }
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
    return data.length ? data : staticCategories
  } catch { return staticCategories }
}

// map category slug → store.category value
const SLUG_TO_STORE_CAT: Record<string, string> = {
  tech: 'electronics', fashion: 'fashion', beauty: 'beauty',
  home: 'home', food: 'food', travel: 'travel',
  ai: 'general', sports: 'sports', kids: 'general',
}

export async function getCategoryBySlug(slug: string) {
  if (isConfigured()) {
    try {
      const data = await writeClient.fetch(
        `*[_type == "category" && slug.current == $slug][0]{ "id": _id, name, emoji, "count": dealCount, colorClass, "slug": slug.current, description }`,
        { slug }
      )
      if (data) return data
    } catch {}
  }
  return staticCategories.find(c => c.slug === slug || c.id === slug) ?? null
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
    return data.length ? data : staticReviews
  } catch { return staticReviews }
}

const REVIEW_BY_SLUG_QUERY = `*[_type == "review" && slug.current == $slug && ${PUBLISHED_FILTER}][0] {
  "id": _id, "slug": slug.current, title, excerpt, emoji, tag, stars, author,
  "date": publishedAt, "updatedAt": _updatedAt, imgBg, body, content, "imageUrl": coalesce(image.asset->url, externalImageUrl)
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
    return data.length ? data : staticPosts
  } catch { return staticPosts }
}

export async function getPostBySlug(slug: string) {
  const fallback = staticPosts.find(p => p.slug === slug) ?? null
  if (!isConfigured()) return fallback
  try {
    const data = await writeClient.fetch(POST_BY_SLUG_QUERY, { slug })
    return data ?? fallback
  } catch { return fallback }
}

export async function getReviewBySlug(slug: string) {
  const fallback = staticReviews.find(r => r.slug === slug) ?? null
  if (!isConfigured()) return fallback
  try {
    const data = await writeClient.fetch(REVIEW_BY_SLUG_QUERY, { slug })
    return data ?? fallback
  } catch { return fallback }
}

// ── Search suggestions moved to /api/search-suggest (live, fuzzy-matched) ──

// ── Offers ─────────────────────────────────────────────────────
export type Offer = {
  id: string
  title: string
  offerText: string
  couponCode?: string
  link: string
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
  }
}

const OFFERS_QUERY = `*[_type == "offer" && active == true] | order(_createdAt desc) {
  "id": _id,
  title,
  offerText,
  couponCode,
  "link": link,
  description,
  expiresAt,
  active,
  "votesActive": coalesce(votesActive, 0),
  "votesExpired": coalesce(votesExpired, 0),
  "store": store-> {
    name, abbr, colorClass,
    "slug": slug.current
  }
}`

const OFFERS_BY_STORE_QUERY = `*[_type == "offer" && active == true && store->slug.current == $storeSlug] | order(order desc, _createdAt desc) {
  "id": _id,
  title,
  offerText,
  couponCode,
  "link": link,
  description,
  usageTips,
  eligibilityNotes,
  expiresAt,
  active,
  "verified": coalesce(verified, true),
  "votesActive": coalesce(votesActive, 0),
  "votesExpired": coalesce(votesExpired, 0),
  "store": store-> {
    name, abbr, colorClass,
    "slug": slug.current
  }
}`

export async function getOffers(): Promise<Offer[]> {
  if (!isConfigured()) return []
  try {
    const data = await writeClient.fetch(OFFERS_QUERY)
    return data ?? []
  } catch { return [] }
}

export async function getOffersByStore(storeSlug: string): Promise<Offer[]> {
  if (!isConfigured()) return []
  try {
    const data = await writeClient.fetch(OFFERS_BY_STORE_QUERY, { storeSlug })
    return data ?? []
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
  description,
  expiresAt,
  active,
  "verified": coalesce(verified, true),
  "votesActive": coalesce(votesActive, 0),
  "votesExpired": coalesce(votesExpired, 0),
  "store": store-> {
    name, abbr, colorClass,
    "slug": slug.current,
    "imageUrl": image.asset->url
  }
}`

export async function getFlashSaleOffers(): Promise<Offer[]> {
  if (!isConfigured()) return []
  try {
    const data = await writeClient.fetch(FLASH_SALES_QUERY)
    return data ?? []
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
  description,
  expiresAt,
  active,
  "verified": coalesce(verified, true),
  "votesActive": coalesce(votesActive, 0),
  "votesExpired": coalesce(votesExpired, 0),
  "store": store-> {
    name, abbr, colorClass,
    "slug": slug.current,
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
    const data = await getCachedCouponOffers()
    return data ?? []
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
    return data?.length ? data : staticPosts.filter(p => p.category === 'Tips & Guides')
  } catch { return staticPosts.filter(p => p.category === 'Tips & Guides') }
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
}

const DAILY_REPORT_QUERY = `*[_type == "dailyReport"][0] {
  generatedAt, summary, recommendations, avgHealthScore,
  criticalStoreCount, brokenLinkCount, missingContentCount, openErrorCount, seoIssueCount,
  todayClicks, sevenDayClicks, needsAttentionCount, zeroClickStoreCount, model
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
}

const CLICK_ANALYTICS_QUERY = `{
  "offers": *[_type == "offer" && active == true] {
    title, "clicks": coalesce(clicks, 0), verified, expiresAt,
    "storeId": store._ref, "storeName": store->name
  },
  "stores": *[_type == "store" && published != false] {
    "id": _id, "directClicks": coalesce(clicks, 0)
  },
  "recentClicks": *[_type == "click" && _createdAt >= $thirtyDaysAgo]._createdAt
}`

export async function getClickAnalyticsSummary(): Promise<ClickAnalyticsSummary> {
  const empty: ClickAnalyticsSummary = {
    todayCount: 0, sevenDayCount: 0, thirtyDayCount: 0, allTimeCount: 0,
    topOffers: [], needsAttentionCount: 0, zeroClickStoreCount: 0,
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
    }>(CLICK_ANALYTICS_QUERY, { thirtyDaysAgo })

    const todayCount = data.recentClicks.filter(c => c >= startOfToday).length
    const sevenDayCount = data.recentClicks.filter(c => c >= sevenDaysAgo).length
    const thirtyDayCount = data.recentClicks.length
    const allTimeCount = data.offers.reduce((sum, o) => sum + o.clicks, 0) + data.stores.reduce((sum, s) => sum + s.directClicks, 0)

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

    return { todayCount, sevenDayCount, thirtyDayCount, allTimeCount, topOffers, needsAttentionCount, zeroClickStoreCount }
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
    "id": _id, title, "slug": slug.current, excerpt, "hasImage": defined(image)
  },
  "reviews": *[_type == "review" && (!defined(publishedAt) || publishedAt <= now())] {
    "id": _id, title, "slug": slug.current, excerpt, "hasImage": defined(image)
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
