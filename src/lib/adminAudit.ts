import 'server-only'
import { cookies } from 'next/headers'
import { writeClient } from '@/sanity/writeClient'
import { readVault } from '@/lib/adminVault'
import { deriveKeys, encryptJson, decryptJson } from '@/lib/adminCrypto'
import { SESSION_COOKIE, verifySession } from '@/lib/adminAuth'
import {
  auditDay,
  type AuditEntry, type AuditRow, type AuditActor,
} from '@/lib/adminAuditFormat'

// Cho goi chi can nho MOT ten module. Phan thuan nam o file kia de test duoc
// ma khong can Next; day chi mo lai cua.
export {
  auditDay, actionLabel, SYSTEM_ACTOR,
  type AuditEntry, type AuditRow, type AuditActor, type AuditActorRole,
} from '@/lib/adminAuditFormat'

/**
 * Nhat ky thao tac quan tri — ai · luc nao · lam gi · tren ban ghi nao.
 *
 * Voi mot nguoi dung thi khong can. Voi ba vai va nhieu nguoi thi day CHINH LA
 * cai goi la "quan ly": truoc file nay, xoa mot offer / doi vai mot nguoi /
 * sua cau hinh deu khong de lai dau vet nao.
 *
 * ── BA QUYET DINH ─────────────────────────────────────────────────
 *
 * 1. **Moi muc duoc ma hoa RIENG LE roi noi vao mang.** Khong gom ca ngay thanh
 *    mot khoi ma hoa: lam vay thi moi lan ghi phai doc-sua-ghi ca ngay, va hai
 *    thao tac cung luc se xoa muc cua nhau. Ma hoa tung muc cho phep dung
 *    `append` cua Sanity — chi them, khong doc, khong mat.
 *
 * 2. **Mot tai lieu mot ngay** (`auditLog.2026-08-21`). Moi muc mot tai lieu thi
 *    mot nam se co hang chuc nghin tai lieu trong dataset; mot tai lieu cho tat
 *    ca thi mang phinh vo han. Chia theo ngay cung lam viec don cu don gian:
 *    xoa nguyen tai lieu qua han, khong phai loc trong mang.
 *
 * 3. **Ghi nhat ky HONG KHONG DUOC LAM HONG THAO TAC.** Nguoi dung bam Xoa thi
 *    viec xoa phai xong, ke ca khi khong ghi duoc nhat ky. Loi bao qua Sentry —
 *    im lang o day nghia la mot ngay nao do mo nhat ky ra va thay trong khong,
 *    ma khong biet no trong tu bao gio.
 *
 * ⚠️ Ma hoa bang chinh khoa cua kho tai khoan (`AUTH_PEPPER`): dataset la CONG
 * KHAI, ma nhat ky lai chua email va viec tung nguoi lam. Mat `AUTH_PEPPER` la
 * mat luon nhat ky — chap nhan duoc, vi nhat ky khong phai thu de khoi phuc he
 * thong.
 */

const DOC_TYPE = 'auditLog'
const RETENTION_DAYS = 90




function keys() {
  const master = process.env.AUTH_PEPPER
  return master ? deriveKeys(master) : null
}

const docId = (day: string) => `${DOC_TYPE}.${day}`

/**
 * Ai dang bam nut — doc TU COOKIE, khong tra Sanity.
 *
 * ⚠️ Co y khong goi `currentAdmin()`: ham do doc Sanity (~350ms) va se cong vao
 * MOI thao tac co ghi nhat ky. Cookie da mang `uid` + `role` va da duoc kiem
 * chu ky; con email thi tra o luc DOC nhat ky bang cach doi chieu voi kho. Ghi
 * email vao tung muc con lam nhat ky noi doi khi nguoi do doi email sau nay.
 */
async function actorFromCookie(): Promise<AuditActor> {
  try {
    const jar = await cookies()
    const s = verifySession(jar.get(SESSION_COOKIE)?.value, process.env.AUTH_SECRET ?? '', Math.floor(Date.now() / 1000))
    return s ? { id: s.uid, role: s.role } : { id: '', role: 'unknown' }
  } catch {
    return { id: '', role: 'unknown' }
  }
}

export type RecordInput = {
  action: string
  target?: string
  label?: string
  /** Bo qua cookie va ghi dich danh — dung cho cron va cho luc vua dang nhap. */
  actor?: AuditActor
  now?: Date
}

/**
 * Ghi mot muc. **Khong bao gio nem loi** — xem quyet dinh 3 o dau file.
 *
 * Tra ve `true`/`false` de cho nao muon biet thi biet, nhung hau het cho goi
 * deu co the lo di.
 */
export async function recordAudit(input: RecordInput): Promise<boolean> {
  const k = keys()
  if (!k) return false

  const now = input.now ?? new Date()
  const actor = input.actor ?? (await actorFromCookie())
  const entry: AuditEntry = {
    at: now.toISOString(),
    actorId: actor.id,
    actorRole: actor.role,
    action: input.action,
    ...(input.target ? { target: input.target } : {}),
    ...(input.label ? { label: input.label } : {}),
  }

  const day = auditDay(now)
  const id = docId(day)
  try {
    // Mot luot goi duy nhat: tao neu chua co, roi noi them. Tach thanh hai luot
    // thi thao tac dau tien cua moi ngay ton hai vong mang, va co mot khe hep
    // giua chung de hai thao tac cung luc dam nhau.
    //
    // ⚠️ `visibility: 'async'` — GHI XONG KHONG CO NGHIA LA DOC RA NGAY DUOC.
    // Do that 2026-08-21: doc lai ngay sau khi ghi tra ve 0 muc; doc lai sau
    // khoang mot vong mang nua thi day du. Doi lai la thao tac cua nguoi dung
    // (xoa mot offer chang han) khong phai cho Sanity danh chi muc xong. Danh
    // doi nay dung cho mot nhat ky, va cua so tre nho hon mot lan chuyen trang
    // — nhung dung ky vong doc lai ngay lap tuc trong cung mot request.
    await writeClient
      .transaction()
      .createIfNotExists({ _id: id, _type: DOC_TYPE, day, entries: [] })
      .patch(id, p => p.setIfMissing({ entries: [] }).append('entries', [encryptJson(entry, k.encKey)]))
      .commit({ visibility: 'async' })
    return true
  } catch {
    return false
  }
}


/**
 * Doc nhat ky `days` ngay gan nhat, moi nhat truoc.
 *
 * ⚠️ Muc nao khong giai ma duoc thi BO QUA, khong lam hong ca trang. Mot muc
 * hong (doi `AUTH_PEPPER` giua chung chang han) khong duoc phep che het phan
 * con lai cua nhat ky.
 */
export async function readAuditLog(days = 14, limit = 200, now = new Date()): Promise<AuditRow[]> {
  const k = keys()
  if (!k) return []

  const from = auditDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000))
  let docs: { day: string; entries?: string[] }[] = []
  try {
    docs = await writeClient.fetch(
      `*[_type == $t && day >= $from]{ day, entries } | order(day desc)`,
      { t: DOC_TYPE, from },
      { cache: 'no-store' },
    )
  } catch {
    return []
  }

  const rows: AuditEntry[] = []
  for (const d of docs) {
    for (const blob of d.entries ?? []) {
      const e = decryptJson<AuditEntry>(blob, k.encKey)
      if (e && typeof e.at === 'string' && typeof e.action === 'string') rows.push(e)
    }
  }
  rows.sort((a, b) => b.at.localeCompare(a.at))

  // Doi id -> email o day chu khong luu san trong tung muc: nguoi doi email thi
  // nhat ky cu hien ten moi, va khong co ban sao email nao nam rai trong log.
  const emails = new Map<string, string>()
  try {
    for (const u of (await readVault()).users) emails.set(u.id, u.email)
  } catch { /* khong doc duoc kho thi hien id, van hon la khong hien gi */ }

  return rows.slice(0, limit).map(e => ({ ...e, actorEmail: emails.get(e.actorId) ?? null }))
}

/**
 * Xoa nhat ky qua han. Chay trong cron hang dem, canh viec sao luu.
 *
 * Giu 90 ngay: du de tra loi "tuan truoc ai xoa cai do", khong du de bien mot
 * dataset cong khai thanh kho luu tru vinh vien ve thoi quen lam viec cua tung
 * nguoi.
 */
export async function pruneAuditLog(now = new Date()): Promise<{ deleted: number }> {
  const cutoff = auditDay(new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000))
  try {
    const old: { id: string }[] = await writeClient.fetch(
      `*[_type == $t && day < $cutoff]{ "id": _id }`,
      { t: DOC_TYPE, cutoff },
      { cache: 'no-store' },
    )
    if (!old.length) return { deleted: 0 }
    let tx = writeClient.transaction()
    for (const d of old) tx = tx.delete(d.id)
    await tx.commit({ visibility: 'async' })
    return { deleted: old.length }
  } catch {
    return { deleted: 0 }
  }
}

/**
 * Mot cai ten doc duoc cho tai lieu sap bi xoa.
 *
 * ⚠️ PHAI GOI TRUOC KHI XOA. Sau khi xoa thi khong con gi de doc, va mot dong
 * nhat ky ghi `offer.delete · a1b2c3d4` la thu vo dung sau mot thang — khong ai
 * nho id do la cai gi.
 *
 * Khong doc duoc ten thi tra `undefined` chu khong nem loi: nhat ky thieu ten
 * van hon la khong xoa duoc.
 */
export async function describeDoc(id: string): Promise<string | undefined> {
  try {
    const d = await writeClient.fetch<{ title?: string; name?: string; slug?: string } | null>(
      `*[_id == $id][0]{ title, name, "slug": slug.current }`,
      { id },
      { cache: 'no-store' },
    )
    const label = d?.title ?? d?.name ?? d?.slug
    return label ? String(label).slice(0, 120) : undefined
  } catch {
    return undefined
  }
}
