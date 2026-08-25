import * as Sentry from '@sentry/nextjs'
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
   *
   * ⚠️ DO 2026-08-25: GIA DINH "no chet la lo ra ngay" DA BI BAC BO.
   *
   * Dau vet trong Sanity cho thay dung cai canh duoc luong truoc da xay ra, va
   * khong ai biet: `adminVaultBackup.mon` = 24/08 va `.tue` = 25/08 (ban sao
   * chay TRUOC, thanh cong ca hai dem) trong khi `dailyReport.generatedAt` van
   * dung o 23/08. Nghia la route CO chay dung lich ca hai dem, buoc bao cao AI
   * nem loi ca hai lan, va duong bao duy nhat luc do la mot Response 500 nam
   * trong Vercel Logs — noi khong ai mo ra xem.
   *
   * Bang "N ngay tuoi" o /admin/reports co that, nhung do la duong KEO: phai co
   * nguoi mo trang moi thay. Sentry la duong DAY, no chay thang vao the do
   * "Loi production chua xu ly" o /admin. Mot cron im lang thi thu can la duong
   * day.
   */
  const backup = await backupAndReport('cron').catch(err => ({ ok: false as const, error: String(err).slice(0, 160) }))

  // Ban sao luu hong la muc nghiem trong nhat trong ca route nay: kho tai khoan
  // chi co MOT tai lieu goc, va mat `AUTH_PEPPER` hay ai do xoa `adminVault` la
  // mat vinh vien. Truoc day no chi hien trong JSON tra ve.
  if (!backup.ok) {
    Sentry.captureMessage(`[cron daily-report] sao luu kho tai khoan THAT BAI: ${'error' in backup ? backup.error : 'khong ro'}`, {
      level: 'error',
      extra: { backup },
    })
  }

  // Don nhat ky qua 90 ngay. Khong co viec don thi mot dataset CONG KHAI se tu
  // bien thanh kho luu tru vinh vien ve thoi quen lam viec cua tung nguoi.
  const pruned = await pruneAuditLog().catch(() => ({ deleted: 0 }))

  try {
    const report = await generateDailyReport()
    return Response.json({ ok: true, backup, pruned, report })
  } catch (err) {
    // Bao qua Sentry chu khong chi tra 500. Cung khuon voi `ai-content-nightly`
    // ngay ben canh, vi cung mot ly do: console/Response chi vao Vercel Logs,
    // con Sentry thi da noi san vao getRecentSentryIssues() -> the do o /admin.
    //
    // Dat `fingerprint` co dinh de N dem hong lien tiep gop thanh MOT issue co
    // bo dem tang dan, thay vi N issue rieng le. Con so "hong 3 dem lien" la
    // thong tin, mot danh sach ba dong giong het nhau thi khong.
    Sentry.captureException(err, {
      level: 'error',
      fingerprint: ['cron-daily-report-failed'],
      extra: { backup, pruned, cron: 'daily-report' },
    })
    return Response.json({ ok: false, backup, pruned, error: String(err) }, { status: 500 })
  }
}
