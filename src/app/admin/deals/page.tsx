import { writeClient } from '@/sanity/writeClient'
import DealAdmin from './DealAdmin'

export const dynamic = 'force-dynamic'

const QUERY = `*[_type == "deal"] | order(coalesce(order, 9999) asc, _createdAt desc) {
  _id, title, "slug": slug.current,
  priceSale, priceOrig, discount, verified, isExpiring, expiresAt, dealUrl,
  "imageUrl": image.asset->url, _createdAt, _updatedAt, "order": coalesce(order, 9999),
  "relatedReview": relatedReview->{_id, title},
  "category": category->{_id, name, emoji}
}`

const REVIEWS_QUERY = `*[_type == "review"] | order(title asc) { _id, title }`
const CATEGORIES_QUERY = `*[_type == "category"] | order(coalesce(order, 9999) asc, name asc) { _id, name, emoji }`

export default async function AdminDealsPage() {
  const [deals, reviews, categories] = await Promise.all([
    writeClient.fetch(QUERY),
    writeClient.fetch(REVIEWS_QUERY),
    writeClient.fetch(CATEGORIES_QUERY),
  ])
  return <DealAdmin initialDeals={deals ?? []} allReviews={reviews ?? []} allCategories={categories ?? []} />
}
