import { client as readClient } from '@/sanity/client'
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
// `slug` de doi chieu voi `store.category` (cung la slug) khi tu chon danh muc
// theo shop trong DealAdmin.
const CATEGORIES_QUERY = `*[_type == "category"] | order(coalesce(order, 9999) asc, name asc) { _id, name, emoji, "slug": slug.current }`

// Host + link affiliate cua 28 store, de o nhap link trong modal noi ngay duoc
// "se gan ?ref=... cua shop nao". Chi 28 dong nen truyen thang xuong client re hon
// han goi API moi lan nguoi dung go mot ky tu.
const STORE_HOSTS_QUERY = `*[_type == "store"]{
  "slug": slug.current, name, website, affiliateLink,
  "couponCode": *[_type == "offer" && store._ref == ^._id && active != false && defined(couponCode) && couponCode != ""]
    | order(coalesce(order, 9999) asc)[0].couponCode
}`

export default async function AdminDealsPage() {
  const [deals, reviews, categories, storeHosts] = await Promise.all([
    readClient.fetch(QUERY),
    readClient.fetch(REVIEWS_QUERY),
    readClient.fetch(CATEGORIES_QUERY),
    readClient.fetch(STORE_HOSTS_QUERY),
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
