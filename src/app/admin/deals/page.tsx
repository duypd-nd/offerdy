import { writeClient } from '@/sanity/writeClient'
import DealAdmin from './DealAdmin'

export const dynamic = 'force-dynamic'

const QUERY = `*[_type == "deal"] | order(coalesce(order, 9999) asc, _createdAt desc) {
  _id, code, pinnedAt,
  "shortLinkClicks": coalesce(shortLinkClicks, 0), "dealClicks": coalesce(dealClicks, 0),
  title, "slug": slug.current,
  priceSale, priceOrig, discount, verified, isExpiring, expiresAt, dealUrl,
  "imageUrl": image.asset->url, _createdAt, _updatedAt, "order": coalesce(order, 9999),
  "relatedReview": relatedReview->{_id, title},
  "category": category->{_id, name, emoji}
}`

const REVIEWS_QUERY = `*[_type == "review"] | order(title asc) { _id, title }`
const CATEGORIES_QUERY = `*[_type == "category"] | order(coalesce(order, 9999) asc, name asc) { _id, name, emoji }`

// Host + link affiliate cua 28 store, de o nhap link trong modal noi ngay duoc
// "se gan ?ref=... cua shop nao". Chi 28 dong nen truyen thang xuong client re hon
// han goi API moi lan nguoi dung go mot ky tu.
const STORE_HOSTS_QUERY = `*[_type == "store"]{
  "slug": slug.current, name, website, affiliateLink
}`

export default async function AdminDealsPage() {
  const [deals, reviews, categories, storeHosts] = await Promise.all([
    writeClient.fetch(QUERY),
    writeClient.fetch(REVIEWS_QUERY),
    writeClient.fetch(CATEGORIES_QUERY),
    writeClient.fetch(STORE_HOSTS_QUERY),
  ])
  return (
    <DealAdmin
      initialDeals={deals ?? []}
      allReviews={reviews ?? []}
      allCategories={categories ?? []}
      storeHosts={storeHosts ?? []}
    />
  )
}
