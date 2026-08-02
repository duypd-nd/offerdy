import { getSeoAuditData, getConfigSeo } from '@/sanity/queries'
import { auditStores, auditDeals, auditPosts, auditReviews, titleSuffixLength } from '@/lib/seoAudit'
import SeoAuditAdmin from './SeoAuditAdmin'

export const dynamic = 'force-dynamic'

export default async function SeoAuditPage() {
  const [data, seoConfig] = await Promise.all([getSeoAuditData(), getConfigSeo()])
  // Phan co dinh cua `titleTemplate` duoc gan vao MOI tieu de, nen phai tinh vao
  // gioi han 60 ky tu — kiem moi do dai `metaTitle` se bo sot nguyen nhan lon nhat.
  const suffix = titleSuffixLength(seoConfig.titleTemplate)
  const issues = [
    ...auditStores(data.stores, suffix),
    ...auditDeals(data.deals, suffix),
    ...auditPosts(data.posts, suffix),
    ...auditReviews(data.reviews, suffix),
  ]
  const totalEntities = data.stores.length + data.deals.length + data.posts.length + data.reviews.length

  return <SeoAuditAdmin issues={issues} totalEntities={totalEntities} />
}
