import { PROVIDER_TRA_PHI, type ProviderName, type EnvLike } from './types'

/**
 * Chan chi tieu cho nha cung cap TRA PHI.
 *
 * ⚠️ VI SAO CAN, va vi sao no la phan quan trong nhat cua ca bo router.
 *
 * Kich ban hong that su ton tien khong phai "Claude dat". No la: **ba nha mien
 * phi cung het quota trong mot dem**, roi mot vong sinh noi dung ca me lang le
 * roi het xuong Claude. Duoi tinh trang do, bo router — thu duoc them vao de
 * TIET KIEM — lai la thu bien mot su co han muc thanh mot hoa don.
 *
 * Nen: het mien phi thi phai **hoi han muc tra phi truoc**, va het han muc thi
 * **dung han**, chu khong phai "thoi cu chay".
 *
 * ⚠️ Bo dem nam trong bo nho tien trinh — xem chu thich cung y o `breaker.ts`.
 * No chan duoc mot vong chay ca me (dung nguy co that: 451 deal trong mot vong),
 * khong chan duoc tong cong ca ngay tren nhieu lan goi ham. Muon chan that ca
 * ngay thi phai co cho luu, va cho luu duy nhat o day la dataset CONG KHAI —
 * mot bo dem so lan goi thi khong bi mat, nhung day la viec cho sau.
 */

export type NganSach = {
  /** So lan goi nha tra phi toi da trong mot vong chay. 0 = cam han. */
  soLanToiDa: number
}

export const NGAN_SACH_MAC_DINH: NganSach = { soLanToiDa: 25 }

export function docNganSachTuEnv(env: EnvLike = process.env): NganSach {
  const raw = env.AI_PAID_MAX_CALLS
  if (raw === undefined || raw.trim() === '') return NGAN_SACH_MAC_DINH
  const n = Number(raw)
  // ⚠️ `Number('')` la 0 va `Number('abc')` la NaN — mot o cau hinh go nham
  // khong duoc phep bien thanh "cam han" hoac "khong gioi han".
  if (!Number.isFinite(n) || n < 0) return NGAN_SACH_MAC_DINH
  return { soLanToiDa: Math.floor(n) }
}

let daDung = 0

export function laTraPhi(p: ProviderName): boolean {
  return PROVIDER_TRA_PHI.includes(p)
}

/** Con duoc goi nha tra phi nua khong. */
export function conNganSach(ns: NganSach, dung = daDung): boolean {
  return dung < ns.soLanToiDa
}

export function ghiDaGoiTraPhi(): void {
  daDung += 1
}

export function soLanDaGoiTraPhi(): number {
  return daDung
}

/** Chi dung cho test. */
export function datLaiNganSach(): void {
  daDung = 0
}
