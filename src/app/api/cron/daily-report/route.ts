import { generateDailyReport } from '@/lib/ai/generateDailyReport'
import { verifyCronRequest } from '@/lib/cronAuth'
import { backupAndReport } from '@/lib/adminVaultBackup'
import { pruneAuditLog } from '@/lib/adminAudit'

export async function GET(request: Request) {
  const auth = verifyCronRequest(request, 'daily-report')
  if (!auth.ok) return auth.response

  /**
   * ⚠️ SAO LUU KHO TAI KHOAN CHAY GHEP O DAY, TRUOC BAO CAO.
   *
   * Vi sao khong cho no mot cron rieng: ba cron cua du an nay tung chet im lang
   * suot 18 ngay ma dashboard van bao "Enabled". Cron thu tu la thu tu co the
   * chet ma khong ai biet. `daily-report` thi sinh ra bao cao ma nguoi van hanh
   * doc moi sang — no chet la lo ra ngay.
   *
   * Chay TRUOC, va trong try/catch rieng: bao cao AI la phan de hong nhat o day
   * (goi model, het han muc, timeout), va no hong thi khong duoc keo theo ban
   * sao luu. Ket qua di kem trong response de con nhin thay tu Vercel Logs.
   */
  const backup = await backupAndReport('cron').catch(err => ({ ok: false as const, error: String(err).slice(0, 160) }))

  // Don nhat ky qua 90 ngay. Khong co viec don thi mot dataset CONG KHAI se tu
  // bien thanh kho luu tru vinh vien ve thoi quen lam viec cua tung nguoi.
  const pruned = await pruneAuditLog().catch(() => ({ deleted: 0 }))

  try {
    const report = await generateDailyReport()
    return Response.json({ ok: true, backup, pruned, report })
  } catch (err) {
    return Response.json({ ok: false, backup, pruned, error: String(err) }, { status: 500 })
  }
}
