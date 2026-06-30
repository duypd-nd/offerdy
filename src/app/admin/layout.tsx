import type { Metadata } from 'next'
import AdminNav from './AdminNav'

export const metadata: Metadata = { title: 'Admin — Offerdy' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adm-root" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <AdminNav />
      <main className="adm-main">{children}</main>
    </div>
  )
}
