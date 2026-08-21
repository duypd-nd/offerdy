import { verifyCronRequest } from '@/lib/cronAuth'
import { backupAndReport } from '@/lib/adminVaultBackup'

/**
 * Sao luu kho tai khoan quan tri.
 *
 * ⚠️ DUONG NAY KHONG CO TRONG `vercel.json` — CO CHU DINH.
 *
 * Ban sao chay ghep vao cron `daily-report` (01:00 UTC) thay vi tu co lich
 * rieng. Ly do khong phai de tiet kiem: du an nay da co ba cron chet im lang
 * suot 18 ngay trong khi dashboard van bao "Enabled". Them mot cron thu tu la
 * them mot thu nua co the chet ma khong ai biet. Con `daily-report` thi sinh ra
 * mot bao cao ma nguoi van hanh THUC SU doc moi sang — no chet la lo ra ngay.
 *
 * Duong nay van ton tai de goi tay khi can (co CRON_SECRET), va de nang len
 * thanh cron rieng sau nay neu ban sao can chay day hon mot lan mot ngay.
 */
export async function GET(request: Request) {
  const auth = verifyCronRequest(request, 'vault-backup')
  if (!auth.ok) return auth.response

  const result = await backupAndReport('cron')
  return Response.json(result, { status: result.ok ? 200 : 500 })
}
