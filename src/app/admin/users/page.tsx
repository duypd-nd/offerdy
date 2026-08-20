import type { Metadata } from 'next'
import UsersAdmin from './UsersAdmin'
import { requireOwner, listAdminUsers } from '@/lib/adminSession'

export const metadata: Metadata = { title: 'Người dùng — Offerdy Admin' }
export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  // Vong chan thu hai. `proxy.ts` da chan duong dan nay cho vai khac, nhung o
  // day doc Sanity that nen mot tai khoan vua bi ha quyen giua phien cung bi tu
  // choi ngay, khong doi cookie het han.
  const me = await requireOwner()
  const users = await listAdminUsers()

  return <UsersAdmin users={users} meId={me.id} />
}
