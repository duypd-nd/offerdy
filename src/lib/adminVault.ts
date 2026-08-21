import 'server-only'
import { writeClient } from '@/sanity/writeClient'
import { deriveKeys, encryptJson, decryptJson } from '@/lib/adminCrypto'
import type { AdminRole } from '@/lib/adminAuth'

/**
 * Kho tai khoan quan tri — MOT tai lieu Sanity duy nhat, noi dung da ma hoa.
 *
 * ⚠️ Vi sao mot tai lieu chu khong phai moi nguoi mot tai lieu: dataset la
 * public, nen du lieu phai ma hoa; ma da ma hoa thi GROQ khong loc theo email
 * duoc nua. Gom vao mot khoi la cach trung thuc nhat — doc mot lan, giai ma, roi
 * lam viec voi mang trong bo nho. Voi vai chuc tai khoan thi day khong phai van
 * de; neu mot ngay nao do co hang nghin nguoi thi phai doi sang kho khac han,
 * khong phai vun vat o day.
 *
 * ⚠️ GHI CO KIEM PHIEN BAN (`ifRevisionId`). Hai Chu sua cung luc ma ghi de mu
 * quang thi nguoi sau xoa mat viec cua nguoi truoc — o day nguoi sau nhan loi
 * va duoc bao tai lai trang.
 */

const DOC_ID = 'adminVault'
const DOC_TYPE = 'adminVault'

export type StoredUser = {
  id: string
  email: string
  name: string
  role: AdminRole
  active: boolean
  passwordHash: string
  createdAt: string
  lastLoginAt?: string
  /**
   * So phien ban phien dang nhap. Cookie mang so cu bi tu choi.
   *
   * ⚠️ `undefined` phai duoc doc la 0, khong phai loi: moi tai khoan tao truoc
   * 2026-08-21 deu khong co truong nay. Coi thieu la khac 0 se da HET moi nguoi
   * ra ngoai ngay lan deploy dau tien.
   */
  sessionVersion?: number
}

export type Vault = { users: StoredUser[]; rev: string | null }

function keys() {
  const master = process.env.AUTH_PEPPER
  if (!master) return null
  return deriveKeys(master)
}

export function vaultPepper(): string | null {
  return keys()?.pepper ?? null
}

/**
 * Doc va giai ma. Tra `users: []` khi chua co gi HOAC khong giai ma duoc —
 * nhung `rev` van phan biet hai truong hop do: `null` la chua co tai lieu.
 *
 * ⚠️ Khong tu tao lai kho khi giai ma that bai. Giai ma hong thuong nghia la sai
 * `AUTH_PEPPER`, va ghi de len no la **xoa vinh vien moi tai khoan** vi mot bien
 * moi truong dat nham.
 */
export async function readVault(): Promise<Vault & { unreadable: boolean }> {
  const k = keys()
  if (!k) return { users: [], rev: null, unreadable: false }
  let doc: { data?: string; _rev?: string } | null = null
  try {
    doc = await writeClient.fetch(`*[_id == $id][0]{ data, _rev }`, { id: DOC_ID })
  } catch {
    return { users: [], rev: null, unreadable: true }
  }
  if (!doc) return { users: [], rev: null, unreadable: false }
  const users = decryptJson<StoredUser[]>(doc.data, k.encKey)
  if (!users) return { users: [], rev: doc._rev ?? null, unreadable: true }
  return { users, rev: doc._rev ?? null, unreadable: false }
}

export type WriteResult = { ok: true } | { ok: false; error: string }

export async function writeVault(users: StoredUser[], rev: string | null): Promise<WriteResult> {
  const k = keys()
  if (!k) return { ok: false, error: 'Thiếu AUTH_PEPPER.' }
  const data = encryptJson(users, k.encKey)
  try {
    if (rev === null) {
      // `createIfNotExists` chu khong phai `create`: hai lan chay dau tien cung
      // luc thi lan sau khong lam hong lan truoc.
      await writeClient.createIfNotExists({ _id: DOC_ID, _type: DOC_TYPE, data })
      // createIfNotExists khong ghi de neu da co — dam bao noi dung dung
      await writeClient.patch(DOC_ID).set({ data }).commit()
    } else {
      await writeClient.patch(DOC_ID, { ifRevisionID: rev }).set({ data }).commit()
    }
    return { ok: true }
  } catch (err) {
    const msg = String(err)
    if (/revision/i.test(msg)) {
      return { ok: false, error: 'Có người khác vừa sửa danh sách người dùng. Tải lại trang rồi thử lại.' }
    }
    return { ok: false, error: `Không lưu được: ${msg.slice(0, 140)}` }
  }
}
