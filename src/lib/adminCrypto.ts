/**
 * Ma hoa kho tai khoan quan tri.
 *
 * ⚠️ VI SAO PHAI MA HOA THAY VI CHI BAM MAT KHAU: dataset `production` cua Sanity
 * o che do **public** — do 2026-08-20, goi API khong kem token van tra ve moi
 * tai lieu. Dataset **rieng tu** la tinh nang tra phi, goi hien tai khong co.
 *
 * Neu chi bam mat khau roi de tran, thi email, ten, vai va ban bam cua moi quan
 * tri vien deu cong khai — mot danh sach san de nham vao. Ma hoa ca khoi thi
 * nguoi la van tai duoc tai lieu do nhung chi thay chuoi rac.
 *
 * MOT khoa chu (`AUTH_PEPPER`) sinh ra HAI khoa con bang HKDF, moi khoa mot
 * viec: tron vao mat khau truoc khi bam, va ma hoa khoi du lieu. Dung chung mot
 * khoa cho hai viec la thu nen tranh; con bat nguoi van hanh giu ba bi mat rieng
 * thi de nham hon la an toan hon.
 *
 * ⚠️ MAT `AUTH_PEPPER` LA MAT TAT CA TAI KHOAN. Khong co duong khoi phuc — do la
 * cai gia cua viec khong co noi cat bi mat that su.
 */
import { hkdfSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'

const ALG = 'aes-256-gcm'
const IV_LEN = 12   // GCM chuan dung 96 bit
const TAG_LEN = 16
const VERSION = 'v1'

export type DerivedKeys = { pepper: string; encKey: Buffer }

/**
 * HKDF voi hai nhan `info` khac nhau -> hai khoa doc lap ve mat mat ma. Doi mot
 * nhan sau nay se sinh khoa khac va lam hong du lieu cu, nen chung la hang so.
 */
export function deriveKeys(master: string): DerivedKeys {
  if (!master) throw new Error('AUTH_PEPPER trống — từ chối dẫn xuất khoá')
  const salt = 'offerdy-admin-v1'
  const pepper = Buffer.from(hkdfSync('sha256', master, salt, 'password-pepper', 32)).toString('base64url')
  const encKey = Buffer.from(hkdfSync('sha256', master, salt, 'vault-encryption', 32))
  return { pepper, encKey }
}

/**
 * `v1.<iv>.<tag>.<ciphertext>`, tat ca base64url.
 *
 * Co so hieu phien ban ngay dau vi doi thuat toan ma khong co no la phai doan
 * dinh dang cu — va luc do thi du lieu cu khong doc duoc nua.
 */
export function encryptJson(value: unknown, encKey: Buffer): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALG, encKey, iv)
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), body.toString('base64url')].join('.')
}

/**
 * Tra `null` cho MOI truong hop khong doc duoc — sai khoa, bi sua doi, hong dinh
 * dang. GCM tu phat hien noi dung bi doi: `final()` nem loi khi the xac thuc
 * khong khop, nen khong ai sua duoc mot ban ghi de tu nang minh len vai Chu.
 */
export function decryptJson<T>(payload: string | undefined, encKey: Buffer): T | null {
  if (!payload) return null
  const parts = payload.split('.')
  if (parts.length !== 4 || parts[0] !== VERSION) return null
  try {
    const iv = Buffer.from(parts[1], 'base64url')
    const tag = Buffer.from(parts[2], 'base64url')
    const body = Buffer.from(parts[3], 'base64url')
    if (iv.length !== IV_LEN || tag.length !== TAG_LEN) return null
    const decipher = createDecipheriv(ALG, encKey, iv)
    decipher.setAuthTag(tag)
    const out = Buffer.concat([decipher.update(body), decipher.final()])
    return JSON.parse(out.toString('utf8')) as T
  } catch { return null }
}
