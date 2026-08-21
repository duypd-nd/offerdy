/**
 * Phan dung chung cho cac lenh lam viec voi kho tai khoan quan tri.
 *
 * ⚠️ VI SAO FILE NAY TON TAI: thuat toan ma hoa o day phai KHOP TUNG BIT voi
 * `src/lib/adminCrypto.ts`. File .mjs khong import duoc TypeScript qua alias
 * `@/`, nen ban sao la khong tranh khoi — nhung MOT ban sao thi con kiem soat
 * duoc, ba ban sao (create-admin, vault-backup, vault-restore) thi chac chan se
 * lech nhau. Gop het vao day.
 *
 * Doi bat cu hang so nao duoi day ma quen doi `src/lib/adminCrypto.ts` la kho
 * khong mo duoc nua.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hkdfSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const ok = m => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
export const bad = m => console.log(`  \x1b[31m✗\x1b[0m ${m}`)
export const warn = m => console.log(`  \x1b[33m!\x1b[0m ${m}`)

/** Doc .env.local roi de process.env de len — bien that cua may luon thang. */
export function loadEnv() {
  const file = path.join(root, '.env.local')
  const out = {}
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line.trim() || line.trim().startsWith('#')) continue
      const i = line.indexOf('=')
      if (i < 0) continue
      const key = line.slice(0, i).trim()
      const raw = line.slice(i + 1).trim()
      let val = raw
      if (raw.startsWith('"')) { try { val = JSON.parse(raw) } catch { val = raw.slice(1, -1) } }
      else if (raw.startsWith("'")) val = raw.slice(1, -1)
      out[key] = val
    }
  }
  return { ...out, ...process.env }
}

// ── Y HET src/lib/adminCrypto.ts ──────────────────────────────────
const SALT = 'offerdy-admin-v1'
const BACKUP_SALT = 'offerdy-admin-backup-v1'
export const MIN_BACKUP_KEY_LENGTH = 32

export function deriveKeys(master) {
  if (!master) throw new Error('AUTH_PEPPER trong')
  return {
    pepper: Buffer.from(hkdfSync('sha256', master, SALT, 'password-pepper', 32)).toString('base64url'),
    encKey: Buffer.from(hkdfSync('sha256', master, SALT, 'vault-encryption', 32)),
  }
}

/** ⚠️ Khoa ban sao PHAI khac AUTH_PEPPER — xem chu thich trong src/lib/adminCrypto.ts. */
export function deriveBackupKey(master, authPepper) {
  if (!master) return { ok: false, error: 'Thieu AUTH_BACKUP_KEY.' }
  if (master.trim().length < MIN_BACKUP_KEY_LENGTH) {
    return { ok: false, error: `AUTH_BACKUP_KEY phai dai it nhat ${MIN_BACKUP_KEY_LENGTH} ky tu.` }
  }
  if (authPepper && master.trim() === authPepper.trim()) {
    return { ok: false, error: 'AUTH_BACKUP_KEY trung AUTH_PEPPER — ban sao se chet cung ban goc. Dat gia tri khac.' }
  }
  return { ok: true, key: Buffer.from(hkdfSync('sha256', master.trim(), BACKUP_SALT, 'vault-backup-encryption', 32)) }
}

export function encryptJson(value, key) {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([c.update(JSON.stringify(value), 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), body.toString('base64url')].join('.')
}

export function decryptJson(payload, key) {
  if (!payload) return null
  const p = payload.split('.')
  if (p.length !== 4 || p[0] !== 'v1') return null
  try {
    const d = createDecipheriv('aes-256-gcm', key, Buffer.from(p[1], 'base64url'))
    d.setAuthTag(Buffer.from(p[2], 'base64url'))
    return JSON.parse(Buffer.concat([d.update(Buffer.from(p[3], 'base64url')), d.final()]).toString('utf8'))
  } catch { return null }
}

// ── Y HET src/lib/adminBackup.ts ──────────────────────────────────
export const BACKUP_FORMAT = 'offerdy-admin-vault'
export const BACKUP_VERSION = 1

/** ⚠️ Cac ly do tu choi o day khop voi `openBackup()` ben TypeScript. */
export function openBackup(blob, key) {
  if (!blob) return { ok: false, error: 'Ban sao rong.' }
  const raw = decryptJson(blob, key)
  if (!raw) return { ok: false, error: 'Khong giai ma duoc — gan nhu chac chan AUTH_BACKUP_KEY khac luc tao ban sao.' }
  if (raw.format !== BACKUP_FORMAT) return { ok: false, error: `Khong phai ban sao kho tai khoan (format="${raw.format}").` }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    return { ok: false, error: `Ban sao thuoc phien ban ${raw.version}, lenh nay chi doc toi ${BACKUP_VERSION}.` }
  }
  if (!Array.isArray(raw.users) || raw.users.length === 0) return { ok: false, error: 'Ban sao khong chua tai khoan nao.' }
  if (!raw.authPepper) return { ok: false, error: 'Ban sao thieu AUTH_PEPPER — khoi phuc xong se khong ai dang nhap duoc.' }
  return { ok: true, payload: raw }
}

// ── Sanity ────────────────────────────────────────────────────────
const API = '2024-01-01'

export function sanity(env) {
  const need = ['NEXT_PUBLIC_SANITY_PROJECT_ID', 'NEXT_PUBLIC_SANITY_DATASET', 'SANITY_API_TOKEN']
  const missing = need.filter(k => !env[k])
  if (missing.length) throw new Error(`Thieu bien moi truong: ${missing.join(', ')}`)
  const pid = env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const ds = env.NEXT_PUBLIC_SANITY_DATASET
  const headers = { Authorization: `Bearer ${env.SANITY_API_TOKEN}`, 'Content-Type': 'application/json' }
  return {
    async query(groq) {
      const r = await fetch(`https://${pid}.api.sanity.io/v${API}/data/query/${ds}?query=${encodeURIComponent(groq)}`, { headers })
      if (!r.ok) throw new Error(`Sanity tra HTTP ${r.status}`)
      return (await r.json()).result
    },
    async mutate(mutations) {
      const r = await fetch(`https://${pid}.api.sanity.io/v${API}/data/mutate/${ds}`, {
        method: 'POST', headers, body: JSON.stringify({ mutations }),
      })
      if (!r.ok) throw new Error(`Sanity tra HTTP ${r.status}: ${JSON.stringify(await r.json()).slice(0, 220)}`)
      return r.json()
    },
  }
}

export const VAULT_DOC_ID = 'adminVault'
export const BACKUP_DOC_TYPE = 'adminVaultBackup'

/**
 * Loi thoat dung chung cho cac lenh — THAY CHO `process.exit()`.
 *
 * ⚠️ Do tren Windows + Node 24: goi `process.exit()` SAU khi da `fetch()` lam
 * Node sap voi `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` va tra
 * ma thoat 127. Thong bao loi van in ra truoc do, nhung nguoi dung nhin thay
 * them mot dong sap khong lien quan, va moi thu doc ma thoat deu hieu sai.
 * Ket thuc tu nhien thi sach va cung chi mat ~0,5 giay — undici khong giu vong
 * lap su kien.
 *
 * Nen: dat `process.exitCode` roi de ham ket thuc, khong ep tien trinh chet.
 */
class Abort extends Error {
  constructor(code) { super('abort'); this.isAbort = true; this.code = code }
}

/** Dung lenh voi ma thoat cho truoc. Dung sau khi da in ly do bang `bad()`. */
export function stop(code = 1) { throw new Abort(code) }

export async function run(main) {
  try {
    await main()
  } catch (e) {
    if (e?.isAbort) { process.exitCode = e.code; return }
    bad(String(e?.stack ?? e))
    process.exitCode = 1
  }
}
