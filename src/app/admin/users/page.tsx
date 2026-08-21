import type { Metadata } from 'next'
import UsersAdmin from './UsersAdmin'
import { requireOwner, listAdminUsers } from '@/lib/adminSession'
import { vaultBackupStatus } from '@/lib/adminVaultBackup'

export const metadata: Metadata = { title: 'Người dùng — Offerdy Admin' }
export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  // Vong chan thu hai. `proxy.ts` da chan duong dan nay cho vai khac, nhung o
  // day doc Sanity that nen mot tai khoan vua bi ha quyen giua phien cung bi tu
  // choi ngay, khong doi cookie het han.
  const me = await requireOwner()
  const users = await listAdminUsers()

  // ⚠️ Trang thai sao luu hien ngay canh danh sach tai khoan — CO CHU DINH.
  // Day la trang duy nhat noi nguoi van hanh nghi ve tai khoan quan tri, nen la
  // cho duy nhat "ban sao gan nhat da 5 ngay" khong the bi bo qua.
  const backup = await vaultBackupStatus()

  return <UsersAdmin users={users} meId={me.id} backup={backup} />
}
