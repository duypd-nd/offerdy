import { isConfigured } from './client'
import { writeClient } from './writeClient'
import { deals as staticDeals, expiringDeals as staticExpiring } from '@/data/deals'
import { stores as staticStores } from '@/data/stores'
import { categories as staticCategories } from '@/data/categories'
import { reviews as staticReviews } from '@/data/reviews'
import { posts as staticPosts } from '@/data/posts'
import { defaultSiteSettings } from '@/data/siteSettings'

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
  priceSale, priceOrig, discount, discountByAmount, verified, isExpiring, dealUrl, "slug": slug.current
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

export async function getAllDeals() {
  if (!isConfigured()) return staticDeals
  try {
    const data = await writeClient.fetch(ALL_DEALS_QUERY)
    return data.length ? data : staticDeals
  } catch { return staticDeals }
}

export async function getDealsByStore(storeName: string) {
  const allDeals = await getAllDeals()
  return allDeals.filter((d: { store?: string }) =>
    d.store?.toLowerCase().includes(storeName.toLowerCase())
  )
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
  "id": _id, title, excerpt, emoji, tag, stars,
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
  "id": _id, "slug": slug.current, title, excerpt, emoji, tag, stars,
  "date": publishedAt, imgBg, body, content, "imageUrl": coalesce(image.asset->url, externalImageUrl)
}`

// ── Blog Posts ─────────────────────────────────────────────────
const POSTS_QUERY = `*[_type == "post" && ${PUBLISHED_FILTER}] | order(publishedAt desc) {
  "id": _id, "slug": slug.current, title, excerpt, category,
  author, "date": publishedAt, coverEmoji, coverBg, readTime
}`

const POST_BY_SLUG_QUERY = `*[_type == "post" && slug.current == $slug && ${PUBLISHED_FILTER}][0] {
  "id": _id, "slug": slug.current, title, excerpt, category,
  author, "date": publishedAt, coverEmoji, coverBg, readTime, body
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
  dealsPerPage, dealsGridColumns, showExpiringBand, showVerifiedBadge, showCategoryGrid,
  announcementBar, announcementBarUrl,
  articleDisclaimer, articleReviewedBy
}`

export type ContentConfig = {
  defaultOfferDescription?: string
  howToSteps?: HowToStep[]
  defaultFaqs?: FaqItem[]
  dealsPerPage?: number
  dealsGridColumns?: number
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
const COUPON_OFFERS_QUERY = `*[_type == "offer" && active == true && defined(couponCode) && couponCode != ""] | order(order desc, _createdAt desc) {
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

export async function getCouponOffers(): Promise<Offer[]> {
  if (!isConfigured()) return []
  try {
    const data = await writeClient.fetch(COUPON_OFFERS_QUERY)
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
