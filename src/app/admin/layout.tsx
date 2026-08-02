import type { Metadata } from 'next'
import AdminNav from './AdminNav'
import { getAdminWorkQueue } from '@/lib/adminWorkQueue'

export const metadata: Metadata = { title: 'Admin — Offerdy' }

// Huy hieu tren thanh ben phai la so THAT tai thoi diem mo trang. Neu de Next
// dung ban tinh, huy hieu se dong bang o con so cua lan build va noi doi mot
// cach khong the phat hien.
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const queue = await getAdminWorkQueue(new Date())

  return (
    <div className="adm-root">
      <AdminNav
        badges={{
          '/admin/ai-review': queue.pendingTotal,
          '/admin/coupon-alerts': queue.pendingAlerts,
          '/admin/link-checker': queue.brokenLinks,
        }}
      />
      <main className="adm-main">{children}</main>
    </div>
  )
}
