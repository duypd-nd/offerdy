'use server'

import { revalidatePath } from 'next/cache'
import { generateDailyReport } from '@/lib/ai/generateDailyReport'

/**
 * Tao lai bao cao AI ngay, khong cho cron.
 *
 * Ly do can nut nay: bao cao chay bang Vercel Cron va duoc bao ve bang
 * `CRON_SECRET` — chi Vercel goi duoc. Neu cron khong chay (sai/thieu secret, gioi
 * han goi dich vu, deploy chua kich hoat cron), bao cao dung yen VO THOI HAN va
 * KHONG co dau hieu bao loi o dau ca: cron nhan 401 roi im lang. Da xay ra that —
 * bao cao ket o 2026-07-07 suot 18 ngay, mo ta mot dataset 637 store trong khi
 * site chi con 28.
 *
 * Duong nay di qua Basic Auth cua /admin (proxy.ts) nen khong can CRON_SECRET, va
 * cung la duong thoat khi cron con hong.
 *
 * Toi: moi lan bam la mot luot goi Anthropic that (co tinh phi).
 */
export async function regenerateDailyReport(): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await generateDailyReport()
    revalidatePath('/admin/reports')
    return { ok: true }
  } catch (e) {
    // Tra loi ve UI thay vi nuot: loi o day thuong la het credit Anthropic hoac
    // thieu ANTHROPIC_API_KEY — chinh la thu can nhin thay de sua.
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
