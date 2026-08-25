import type { Metadata } from 'next'
import { getSiteName } from '@/sanity/queries'
import AdminNav from './AdminNav'
import { getAdminWorkQueue } from '@/lib/adminWorkQueue'
import { headers } from 'next/headers'
import { readSession, requireAdmin } from '@/lib/adminSession'

export async function generateMetadata(): Promise<Metadata> {
  return { title: `Admin — ${await getSiteName()}` }
}

// Huy hieu tren thanh ben phai la so THAT tai thoi diem mo trang. Neu de Next
// dung ban tinh, huy hieu se dong bang o con so cua lan build va noi doi mot
// cach khong the phat hien.
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Trang dang nhap ve tran, khong thanh ben, khong kiem gi.
  //
  // Layout long nhau cua Next luon ap cho moi trang con, ke ca `/admin/login`.
  // Khong co nhanh nay thi trang dang nhap se doi mot thanh dieu huong day link
  // ma nguoi chua dang nhap khong bam duoc cai nao. Duong dan den tu header do
  // `proxy.ts` gan — Server Component khong tu biet minh dang o trang nao.
  const pathname = (await headers()).get('x-admin-path') ?? ''
  if (pathname === '/admin/login' || !(await readSession())) return <>{children}</>

  // ⚠️ DAY LA VONG KIEM THAT SU, va no dat o layout co chu dich: layout chay cho
  // ca 44 trang admin, nen mot cho nay phu het — khong phai them `requireAdmin()`
  // vao 44 file va cham chac se quen mot cho.
  //
  // `proxy.ts` chi doc duoc chu ky cookie nen khong biet mot tai khoan vua bi
  // tat; ham duoi day doc Sanity that, nen nguoi do bi day ra ngay o lan tai
  // trang ke tiep chu khong phai doi het 8 tieng.
  const user = await requireAdmin()

  const [queue, siteName] = await Promise.all([getAdminWorkQueue(new Date()), getSiteName()])

  return (
    <div className="adm-root">
      <AdminNav
        siteName={siteName}
        role={user.role}
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
