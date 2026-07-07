import { getSeoAuditData } from '@/sanity/queries'
import { auditStores, auditDeals, auditPosts, auditReviews } from '@/lib/seoAudit'
import SeoAuditAdmin from './SeoAuditAdmin'

export const dynamic = 'force-dynamic'

export default async function SeoAuditPage() {
  const data = await getSeoAuditData()
  const issues = [
    ...auditStores(data.stores),
    ...auditDeals(data.deals),
    ...auditPosts(data.posts),
    ...auditReviews(data.reviews),
  ]
  const totalEntities = data.stores.length + data.deals.length + data.posts.length + data.reviews.length

  return <SeoAuditAdmin issues={issues} totalEntities={totalEntities} />
}
