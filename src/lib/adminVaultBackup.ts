import 'server-only'
import * as Sentry from '@sentry/nextjs'
import { writeClient } from '@/sanity/writeClient'
import { deriveBackupKey } from '@/lib/adminCrypto'
import { readVault } from '@/lib/adminVault'
import { buildBackup, sealBackup, verifyBackup, openBackup, type BackupPayload, type BackupSource } from '@/lib/adminBackup'
import { ADMIN_TIMEZONE } from '@/lib/adminDateTime'

/**
 * Noi cat ban sao trong Sanity: BAY o co dinh, moi thu trong tuan mot o.
 *
 * ⚠️ Vi sao bay o xoay vong chu khong phai moi lan mot tai lieu moi: tai lieu
 * moi thi khong ai don, mot nam sau la 365 tai lieu chua ban bam mat khau cu
 * nam rai trong mot dataset CONG KHAI. Bay o co dinh tu gioi han: o cua thu Hai
 * bi ghi de vao thu Hai tuan sau. Doi lai la chi giu duoc 7 ngay — du de phat
 * hien "co nguoi xoa kho" nhung khong du de quay ve mot thang truoc. Ban sao
 * dai han la viec cua `npm run vault:backup` ghi ra file va nguoi van hanh cat
 * di noi khac.
 *
 * ⚠️ Ban sao nam CUNG dataset voi ban goc, nen no KHONG chong duoc truong hop
 * mat ca du an Sanity. No chong hai dieu da nham toi: ai do xoa `adminVault`,
 * va mat `AUTH_PEPPER`. Cho truong hop thu ba, phai co file o may khac.
 */

const DOC_TYPE = 'adminVaultBackup'
const SLOTS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export function slotForDate(now: Date): string {
  // Cron chay 01:00 UTC = 08:00 gio VN. Chia o theo gio VN de "ban sao thu Ba"
  // dung la thu Ba ma nguoi van hanh nhin thay tren lich cua ho.
  const short = new Intl.DateTimeFormat('en-US', { timeZone: ADMIN_TIMEZONE, weekday: 'short' }).format(now).toLowerCase()
  return SLOTS.includes(short as (typeof SLOTS)[number]) ? short : 'mon'
}

const docId = (slot: string) => `${DOC_TYPE}.${slot}`

export type BackupRunResult =
  | { ok: true; slot: string; users: number; createdAt: string }
  | { ok: false; error: string }

/**
 * Doc kho -> dong goi -> niem phong -> MO LAI KIEM CHUNG -> ghi.
 *
 * Thu tu do la co chu dinh: khong ghi bat cu thu gi chua tu doc lai duoc.
 */
export async function runVaultBackup(source: BackupSource, now = new Date()): Promise<BackupRunResult> {
  const keyed = deriveBackupKey(process.env.AUTH_BACKUP_KEY, process.env.AUTH_PEPPER)
  if (!keyed.ok) return { ok: false, error: keyed.error }

  const vault = await readVault()
  if (vault.unreadable) {
    return { ok: false, error: 'Không đọc/giải mã được kho tài khoản — không ghi bản sao (xem AUTH_PEPPER và SANITY_API_TOKEN).' }
  }

  const built = buildBackup({
    users: vault.users,
    authPepper: process.env.AUTH_PEPPER,
    authSecret: process.env.AUTH_SECRET,
    source,
    now,
  })
  if (!built.ok) return { ok: false, error: built.error }

  const blob = sealBackup(built.payload, keyed.key)
  const checked = verifyBackup(blob, keyed.key, built.payload)
  if (!checked.ok) return { ok: false, error: `Bản sao vừa tạo không đọc lại được: ${checked.error}` }

  const slot = slotForDate(now)
  try {
    // createOrReplace: o cua thu nay bi thay hoan toan. Khong dung patch vi o co
    // the chua ton tai, va khong dung ifRevisionID vi o nay khong ai sua tay.
    await writeClient.createOrReplace({
      _id: docId(slot),
      _type: DOC_TYPE,
      slot,
      // Chi thoi diem de tran. Khong de so tai khoan hay bat cu gi khac: dataset
      // nay CONG KHAI, va "he thong nay co bao nhieu quan tri vien" la thong tin
      // khong can cho khong.
      createdAt: built.payload.createdAt,
      data: blob,
    })
  } catch (err) {
    return { ok: false, error: `Không ghi được vào Sanity: ${String(err).slice(0, 160)}` }
  }

  return { ok: true, slot, users: built.payload.users.length, createdAt: built.payload.createdAt }
}

export type BackupSlotInfo = { id: string; slot: string; createdAt: string | null }

export async function listVaultBackups(): Promise<BackupSlotInfo[]> {
  try {
    return await writeClient.fetch(
      `*[_type == $t]{ "id": _id, slot, createdAt } | order(createdAt desc)`,
      { t: DOC_TYPE },
      { cache: 'no-store' },
    )
  } catch {
    return []
  }
}

export type BackupStatus = {
  /** Da dat AUTH_BACKUP_KEY va no hop le chua */
  configured: boolean
  configError: string | null
  latestAt: string | null
  count: number
  /** Qua han khi ban sao gan nhat cu hon 48 tieng — cron chay hang ngay, tre 2 ngay la hong that. */
  stale: boolean
}

/**
 * Trang thai de hien tren `/admin/users`.
 *
 * ⚠️ Vi sao phai hien ra man hinh chu khong chi ghi log: du an nay da co ba cron
 * chet im lang suot 18 ngay ma dashboard van bao "Enabled". Mot ban sao luu hong
 * am tham thi con te hon nua — no chi lo ra dung luc can dung den. Mot dong chu
 * tren trang ma nguoi van hanh von da mo la thu duy nhat khong the bo qua.
 */
export async function vaultBackupStatus(now = new Date()): Promise<BackupStatus> {
  const keyed = deriveBackupKey(process.env.AUTH_BACKUP_KEY, process.env.AUTH_PEPPER)
  const slots = await listVaultBackups()
  const latestAt = slots.find(s => s.createdAt)?.createdAt ?? null
  const ageMs = latestAt ? now.getTime() - new Date(latestAt).getTime() : Infinity
  return {
    configured: keyed.ok,
    configError: keyed.ok ? null : keyed.error,
    latestAt,
    count: slots.length,
    stale: ageMs > 48 * 60 * 60 * 1000,
  }
}

/**
 * Doc mot o ban sao va giai ma — dung cho lenh khoi phuc va cho phep thu.
 */
export async function readVaultBackup(slot: string, backupKey: Buffer): Promise<{ ok: true; payload: BackupPayload } | { ok: false; error: string }> {
  let doc: { data?: string } | null = null
  try {
    doc = await writeClient.fetch(`*[_id == $id][0]{ data }`, { id: docId(slot) }, { cache: 'no-store' })
  } catch (err) {
    return { ok: false, error: `Không đọc được Sanity: ${String(err).slice(0, 160)}` }
  }
  if (!doc) return { ok: false, error: `Không có bản sao ở ô "${slot}".` }
  return openBackup(doc.data, backupKey)
}

/**
 * Chay ban sao va BAO LOI QUA SENTRY.
 *
 * Sentry chu khong phai console.error: `sentry.server.config.ts` khong bat
 * `captureConsoleIntegration`, nen console.error chi roi vao Vercel Logs — noi
 * khong ai mo ra xem hang ngay. Sentry thi da noi san vao AI Daily Report ->
 * /admin/reports, duong ong duy nhat nguoi van hanh thuc su doc moi sang.
 *
 * ⚠️ Thong bao gui di KHONG duoc chua bi mat. Moi chuoi loi tu `runVaultBackup`
 * chi noi ve cau hinh va so luong — khong bao gio chua khoa hay ban bam.
 */
export async function backupAndReport(source: BackupSource): Promise<BackupRunResult> {
  const result = await runVaultBackup(source)
  if (!result.ok) {
    Sentry.captureMessage(`[vault-backup] khong sao luu duoc: ${result.error}`, { level: 'error' })
  }
  return result
}
