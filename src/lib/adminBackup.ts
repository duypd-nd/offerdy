/**
 * Ban sao luu kho tai khoan quan tri: dong goi, niem phong, mo ra, kiem chung.
 *
 * File nay CO Y khong import Sanity va khong danh dau `server-only` — de test
 * chay duoc tren logic that. Phan doc/ghi Sanity nam o `adminVaultBackup.ts`.
 *
 * ── HAI DUONG MAT TRANG MA TINH NANG NAY DUNG DE CHAN ──────────────
 *
 * 1. Ai do xoa tai lieu `adminVault` trong Sanity Studio. No trong nhu rac vi
 *    noi dung da ma hoa — khong ten, khong mo ta, chi mot chuoi base64.
 * 2. Mat `AUTH_PEPPER`. Kho con nguyen ma vinh vien khong mo duoc.
 *
 * Duong 2 la ly do ban sao PHAI CHUA CHINH `AUTH_PEPPER` ben trong. Neu chi luu
 * danh sach tai khoan, khoi phuc xong se ra mot danh sach ma khong ai dang nhap
 * duoc: `passwordHash` da tron pepper cu, khong co pepper do thi moi mat khau
 * deu sai. Mot ban sao nhu vay la ban sao gia.
 *
 * ⚠️ HE QUA: FILE SAO LUU CO GIA TRI NGANG TOAN BO QUYEN QUAN TRI. No duoc ma
 * hoa bang `AUTH_BACKUP_KEY` — mot bi mat KHAC `AUTH_PEPPER` — nen no khong to
 * hon dieu ma ke doc duoc `AUTH_BACKUP_KEY` da co the lam. Nhung dung dat no o
 * cho cong khai, va dung commit vao git.
 */
import { encryptJson, decryptJson } from '@/lib/adminCrypto'
import type { StoredUser } from '@/lib/adminVault'

export const BACKUP_FORMAT = 'offerdy-admin-vault'
export const BACKUP_VERSION = 1

export type BackupSource = 'cli' | 'cron' | 'admin'

export type BackupPayload = {
  format: typeof BACKUP_FORMAT
  version: number
  createdAt: string
  source: BackupSource
  /** ⚠️ Chinh gia tri AUTH_PEPPER. Khong co no thi ban sao khong khoi phuc duoc dang nhap. */
  authPepper: string
  /** Khoa ky cookie. Mat no chi lam moi nguoi bi dang xuat, nen `null` khong phai loi nghiem trong. */
  authSecret: string | null
  users: StoredUser[]
}

export type BuildInput = {
  users: StoredUser[]
  authPepper: string | undefined
  authSecret: string | undefined
  source: BackupSource
  now: Date
}

export type BuildResult =
  | { ok: true; payload: BackupPayload }
  | { ok: false; error: string }

/**
 * ⚠️ TU CHOI SAO LUU MOT KHO RONG.
 *
 * Day la vong chan quan trong nhat trong ca file. Mot ban sao tu dong chay hang
 * dem ma gap kho rong (Sanity loi, token het han, giai ma hong) roi van ghi de
 * len o cua hom nay thi no **xoa ban sao tot bang mot ban sao rong** — dung im
 * lang, dung bao loi, va chi lo ra vao dung ngay can dung den. Khong ghi con
 * hon ghi rac; khong ghi thi con thay "sao luu gan nhat" cu di va bao dong.
 */
export function buildBackup(input: BuildInput): BuildResult {
  if (!input.authPepper) return { ok: false, error: 'Thiếu AUTH_PEPPER — không có gì để sao lưu.' }
  if (input.users.length === 0) {
    return { ok: false, error: 'Kho tài khoản rỗng hoặc không đọc được — từ chối ghi đè bản sao tốt bằng bản rỗng.' }
  }
  return {
    ok: true,
    payload: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: input.now.toISOString(),
      source: input.source,
      authPepper: input.authPepper,
      authSecret: input.authSecret ?? null,
      users: input.users,
    },
  }
}

export function sealBackup(payload: BackupPayload, backupKey: Buffer): string {
  return encryptJson(payload, backupKey)
}

export type OpenResult =
  | { ok: true; payload: BackupPayload }
  | { ok: false; error: string }

/**
 * Mot ly do THAT BAI RIENG cho tung truong hop. "Khong mo duoc" chung chung buoc
 * nguoi dang cuu du lieu phai doan giua "sai khoa" va "file hong" — dung luc do
 * la luc te nhat de phai doan.
 */
export function openBackup(blob: string | undefined, backupKey: Buffer): OpenResult {
  if (!blob) return { ok: false, error: 'Bản sao rỗng.' }
  const raw = decryptJson<BackupPayload>(blob, backupKey)
  if (!raw) return { ok: false, error: 'Không giải mã được — gần như chắc chắn AUTH_BACKUP_KEY khác lúc tạo bản sao.' }
  if (raw.format !== BACKUP_FORMAT) return { ok: false, error: `Không phải bản sao kho tài khoản (format="${String(raw.format)}").` }
  // Phien ban MOI HON code hien tai: du lieu co the co truong ma code nay khong
  // hieu. Doc bua roi ghi lai la lam mat nhung truong do.
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    return { ok: false, error: `Bản sao thuộc phiên bản ${String(raw.version)}, code này chỉ đọc tới ${BACKUP_VERSION}. Cập nhật code trước.` }
  }
  if (!Array.isArray(raw.users) || raw.users.length === 0) return { ok: false, error: 'Bản sao không chứa tài khoản nào.' }
  if (!raw.authPepper) return { ok: false, error: 'Bản sao thiếu AUTH_PEPPER — khôi phục xong sẽ không ai đăng nhập được.' }
  return { ok: true, payload: raw }
}

/**
 * Mo lai ngay thu vua niem phong va so tung tai khoan.
 *
 * Mot ban sao chua bao gio doc thu chi la tin don. Buoc nay bat duoc sai khoa,
 * bat duoc loi ma hoa, va bat duoc ca truong hop ghi thieu — TRUOC khi bao
 * "da sao luu xong", chu khong phai sau nay khi can dung.
 */
export function verifyBackup(blob: string, backupKey: Buffer, expected: BackupPayload): OpenResult {
  const opened = openBackup(blob, backupKey)
  if (!opened.ok) return opened
  const a = opened.payload
  if (a.users.length !== expected.users.length) {
    return { ok: false, error: `Đọc lại thấy ${a.users.length} tài khoản, đáng lẽ ${expected.users.length}.` }
  }
  if (a.authPepper !== expected.authPepper) return { ok: false, error: 'Đọc lại thấy AUTH_PEPPER khác — bản sao hỏng.' }
  const ids = new Set(a.users.map(u => u.id))
  const missing = expected.users.filter(u => !ids.has(u.id))
  if (missing.length) return { ok: false, error: `Đọc lại thiếu ${missing.length} tài khoản.` }
  return { ok: true, payload: a }
}

/**
 * Mo ta ngan mot ban sao, KHONG lo bi mat.
 *
 * Duoc in ra truoc khi khoi phuc, de nguoi van hanh nhin thay minh sap ghi de
 * bang cai gi. Chi email/vai/thoi diem — khong ban bam, khong pepper.
 */
export function describeBackup(p: BackupPayload): string[] {
  return [
    `Tạo lúc : ${p.createdAt} (${p.source})`,
    `Tài khoản: ${p.users.length}`,
    ...p.users.map(u => `  · ${u.email} — ${u.role}${u.active ? '' : ' (đã vô hiệu hoá)'}`),
    `AUTH_SECRET trong bản sao: ${p.authSecret ? 'có' : 'KHÔNG'}`,
  ]
}
