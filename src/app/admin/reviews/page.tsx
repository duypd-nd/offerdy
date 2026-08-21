import { client as readClient } from '@/sanity/client'
import ReviewAdmin from './ReviewAdmin'

export const dynamic = 'force-dynamic'

const QUERY = `*[_type == "review"] | order(publishedAt desc, _createdAt desc) {
  _id, title, "slug": slug.current, tag, author, publishedAt, excerpt, content,
  stars, imgBg, productName, productUrl, affiliateUrl, couponCode, faq, prosAndCons, metaTitle, metaDescription,
  "imageUrl": coalesce(image.asset->url, externalImageUrl), _createdAt
}`

// Host + link affiliate + ma coupon cua 28 store, de form tu gan ma tiep thi va
// tu dien ma giam gia theo domain cua link san pham. 28 dong nen truyen thang
// xuong client re hon goi API moi lan nguoi dung go.
const STORE_HOSTS_QUERY = `*[_type == "store"]{
  "slug": slug.current, name, website, affiliateLink,
  "couponCode": *[_type == "offer" && store._ref == ^._id && active != false && defined(couponCode) && couponCode != ""]
    | order(coalesce(order, 9999) asc)[0].couponCode
}`

export default async function AdminReviewsPage() {
  const [reviews, storeHosts] = await Promise.all([
    readClient.fetch(QUERY),
    readClient.fetch(STORE_HOSTS_QUERY),
  ])
  return <ReviewAdmin initialReviews={reviews ?? []} storeHosts={storeHosts ?? []} />
}
