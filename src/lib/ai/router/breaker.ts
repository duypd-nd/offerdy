import type { ProviderName } from './types'

/**
 * Cau dao: mot nha cung cap hong lien tuc thi thoi goi no mot luc.
 *
 * ⚠️ VI SAO CAN, cu the o day: free tier tinh theo **so request**, khong phai
 * theo request thanh cong. Do that 2026-08-27: `z-ai/glm-5.2:free` tra 429
 * "temporarily rate-limited upstream". Neu moi lan sinh noi dung deu nem mot
 * request vao nha dang 429 truoc khi roi xuong nha sau, ta dot han muc mien phi
 * vao dung nhung lan goi chac chan that bai.
 *
 * ⚠️ TRANG THAI NAM TRONG BO NHO TIEN TRINH. Tren Vercel moi lan goi ham co the
 * la mot tien trinh khac, nen cau dao chi che duoc trong MOT lan chay (vi du:
 * mot vong sinh noi dung ca me 40 offer). Do la co y: dua trang thai nay vao
 * Sanity nghia la ghi vao dataset CONG KHAI, va no khong dang.
 */

export type TrangThaiCauDao = {
  hongLienTiep: number
  moLaiLuc: number
}

const NGUONG_HONG = 3
/** Nghi 60 giay. Du de qua mot cua so rate limit ngan, khong du de mat ca luot chay. */
const NGHI_MS = 60_000

const bang = new Map<ProviderName, TrangThaiCauDao>()

/** Nha nay dang bi nghi khong. `now` truyen vao de test khong phai cho that. */
export function dangNghi(p: ProviderName, now = Date.now()): boolean {
  const t = bang.get(p)
  return t !== undefined && t.moLaiLuc > now
}

export function ghiHong(p: ProviderName, now = Date.now()): void {
  const t = bang.get(p) ?? { hongLienTiep: 0, moLaiLuc: 0 }
  t.hongLienTiep += 1
  if (t.hongLienTiep >= NGUONG_HONG) {
    t.moLaiLuc = now + NGHI_MS
    // Dat lai bo dem: het gio nghi thi nha do duoc ba lan thu moi, khong phai
    // hong MOT lan la nghi tiep 60 giay vinh vien.
    t.hongLienTiep = 0
  }
  bang.set(p, t)
}

export function ghiThanhCong(p: ProviderName): void {
  bang.delete(p)
}

/** Chi dung cho test. */
export function xoaHetCauDao(): void {
  bang.clear()
}

export function xemCauDao(): ReadonlyMap<ProviderName, TrangThaiCauDao> {
  return bang
}

export const CAU_DAO_NGUONG_HONG = NGUONG_HONG
export const CAU_DAO_NGHI_MS = NGHI_MS
