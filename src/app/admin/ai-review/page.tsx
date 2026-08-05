import { client } from '@/sanity/client'
import AiReviewAdmin from './AiReviewAdmin'

export const dynamic = 'force-dynamic'

// Hàng đợi duyệt phải đọc TƯƠI, không qua CDN. CDN mất tới vài chục giây mới
// thấy lượt ghi vừa xong, nên duyệt xong bấm F5 là mục vừa duyệt hiện lại như
// chưa duyệt — dễ khiến người dùng duyệt lại lần nữa hoặc tưởng lệnh ghi hỏng.
// Dùng withConfig thay vì writeClient để đường đọc này không cần token ghi.
const readClient = client.withConfig({ useCdn: false })

const PENDING_STORES_QUERY = `*[_type == "store" && aiReviewStatus == "pending"] | order(_createdAt desc) {
  _id, name, "slug": slug.current, shortDescription, aiDraft
}`

const PENDING_OFFERS_QUERY = `*[_type == "offer" && aiReviewStatus == "pending"] | order(_createdAt desc) {
  _id, title, offerText, "storeName": store->name, "storeSlug": store->slug.current, aiDraft
}`

const PENDING_DEALS_QUERY = `*[_type == "deal" && aiReviewStatus == "pending"] | order(_createdAt desc) {
  _id, title, store, "slug": slug.current, aiDraft
}`

const PENDING_ARTICLES_QUERY = `*[_type == "post" && aiReviewStatus == "pending"] | order(_createdAt desc) {
  _id, title, "slug": slug.current, category,
  "storeName": sourceStore->name,
  "productCount": count(articleProducts),
  aiDraft
}`

export default async function AiReviewPage() {
  const [stores, offers, deals, articles] = await Promise.all([
    readClient.fetch(PENDING_STORES_QUERY),
    readClient.fetch(PENDING_OFFERS_QUERY),
    readClient.fetch(PENDING_DEALS_QUERY),
    readClient.fetch(PENDING_ARTICLES_QUERY),
  ])
  return (
    <AiReviewAdmin
      initialStores={stores ?? []}
      initialOffers={offers ?? []}
      initialDeals={deals ?? []}
      initialArticles={articles ?? []}
    />
  )
}
