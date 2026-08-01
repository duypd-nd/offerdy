import { client } from '@/sanity/client'
import CouponAlertsAdmin from './CouponAlertsAdmin'

export const dynamic = 'force-dynamic'

// Doc tuoi, khong qua CDN: sau khi xoa mot ban ghi roi bam F5, CDN con tra ban cu
// vai chuc giay va dong vua xoa hien lai nhu chua xoa — dung loi da gap o
// /admin/ai-review. Chi 1 request moi lan mo trang.
const readClient = client.withConfig({ useCdn: false })

const ALERTS_QUERY = `*[_type == "couponAlert"] | order(createdAt desc) {
  _id, email, storeName, createdAt, notifiedAt,
  "storeSlug": store->slug.current
}`

export default async function CouponAlertsPage() {
  const alerts = await readClient.fetch(ALERTS_QUERY)
  return <CouponAlertsAdmin initialAlerts={alerts ?? []} />
}
