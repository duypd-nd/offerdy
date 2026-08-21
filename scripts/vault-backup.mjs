/**
 * Xuat kho tai khoan quan tri ra MOT FILE MA HOA — `npm run vault:backup`
 *
 * Cron hang dem da ghi ban sao vao Sanity roi (xem src/lib/adminVaultBackup.ts),
 * nhung ban sao do nam CUNG dataset voi ban goc. Lenh nay la ban sao NGOAI HE
 * THONG: mot file de mang di cho khac. No la thu duy nhat song sot neu ca du an
 * Sanity bien mat.
 *
 * ⚠️ FILE SINH RA CO GIA TRI NGANG TOAN BO QUYEN QUAN TRI. No chua AUTH_PEPPER
 * va ban bam mat khau cua moi tai khoan, ma hoa bang AUTH_BACKUP_KEY. Cat no
 * nhu cat mat khau: dung commit, dung gui qua chat, dung de trong thu muc dong
 * bo cong khai.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import {
  root, ok, bad, warn, run, stop, loadEnv, deriveKeys, deriveBackupKey,
  encryptJson, decryptJson, openBackup, sanity, VAULT_DOC_ID,
  BACKUP_FORMAT, BACKUP_VERSION,
} from './_vault.mjs'

await run(async () => {
  const env = loadEnv()
  const args = process.argv.slice(2)
  const outArg = args.indexOf('--out')

  console.log('\nSao luu kho tai khoan quan tri Offerdy\n')

  // ── Cau hinh ────────────────────────────────────────────────────
  if (!env.AUTH_PEPPER) { bad('Thieu AUTH_PEPPER — khong doc duoc kho.'); stop() }

  const keyed = deriveBackupKey(env.AUTH_BACKUP_KEY, env.AUTH_PEPPER)
  if (!keyed.ok) {
    bad(keyed.error)
    console.log('\n  Sinh mot khoa moi bang:')
    console.log('    node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"')
    console.log('\n  Roi them vao .env.local VA vao Vercel:')
    console.log('    AUTH_BACKUP_KEY=<gia tri vua sinh>')
    console.log('\n  ⚠️ Khoa nay PHAI khac AUTH_PEPPER. Do la toan bo y nghia cua viec sao luu:')
    console.log('     mat mot khoa thi van con duong mo bang khoa kia.\n')
    stop()
  }
  ok('Da co AUTH_BACKUP_KEY hop le (khac AUTH_PEPPER)')

  // ── Doc kho ─────────────────────────────────────────────────────
  const { encKey } = deriveKeys(env.AUTH_PEPPER)
  const db = sanity(env)
  const doc = await db.query(`*[_id == "${VAULT_DOC_ID}"][0]{ data }`)
  if (!doc) { bad('Khong tim thay tai lieu adminVault — chua co kho tai khoan nao.'); stop() }

  const users = decryptJson(doc.data, encKey)
  if (!users) {
    bad('Kho ton tai nhung KHONG GIAI MA DUOC.')
    console.log('\n  Gan nhu chac chan AUTH_PEPPER hien tai khac voi luc tao kho.')
    console.log('  Khong sao luu duoc mot thu chua doc duoc — dung lai.\n')
    stop()
  }
  // ⚠️ Kho rong gan nhu luon la dau hieu co gi do sai, va ghi de mot ban sao tot
  // bang ban rong la cach im lang nhat de mat du lieu.
  if (users.length === 0) { bad('Kho rong — khong co gi de sao luu.'); stop() }
  ok(`Doc duoc ${users.length} tai khoan`)

  // ── Dong goi va niem phong ──────────────────────────────────────
  const payload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    source: 'cli',
    // ⚠️ CHINH AUTH_PEPPER. Khong co no, khoi phuc xong se ra mot danh sach tai
    // khoan ma khong ai dang nhap duoc: ban bam da tron pepper cu.
    authPepper: env.AUTH_PEPPER,
    authSecret: env.AUTH_SECRET ?? null,
    users,
  }
  const blob = encryptJson(payload, keyed.key)

  // Mot ban sao chua bao gio doc thu chi la tin don. Mo lai ngay, TRUOC khi ghi.
  const check = openBackup(blob, keyed.key)
  if (!check.ok) { bad(`Ban sao vua tao khong doc lai duoc: ${check.error}`); stop() }
  if (check.payload.users.length !== users.length) { bad('Doc lai thieu tai khoan — dung lai.'); stop() }
  ok('Mo lai kiem chung: dat')

  if (!payload.authSecret) warn('Khong thay AUTH_SECRET — khoi phuc xong moi nguoi se phai dang nhap lai.')

  // ── Ghi file ────────────────────────────────────────────────────
  const stamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date()).replace(' ', '-').replace(':', '')

  const outPath = outArg >= 0 && args[outArg + 1]
    ? path.resolve(args[outArg + 1])
    : path.join(root, 'backups', `adminVault-${stamp}.enc`)

  // ⚠️ Chan `--out` ghi vao trong repo ngoai thu muc backups/.
  //
  // Da suyt xay ra that: mot lan chay thu voi `--out .scratch/...` da dat mot
  // ban sao that vao dung thu muc ma git CO theo doi file .md. Chi can mot lan
  // `git add -A` la toan bo kho tai khoan len GitHub. Trong repo thi chi
  // backups/ duoc phep; ngoai repo (USB, o cung ngoai) thi tuy nguoi dung.
  const backupsDir = path.join(root, 'backups')
  const inRepo = !path.relative(root, outPath).startsWith('..')
  const inBackups = !path.relative(backupsDir, outPath).startsWith('..')
  if (inRepo && !inBackups) {
    bad(`Tu choi ghi vao trong repo: ${path.relative(root, outPath)}`)
    console.log('\n  File nay chua toan bo quyen quan tri. Trong repo thi chi backups/ duoc phep')
    console.log('  (da nam trong .gitignore). Muon mang di cho khac thi tro --out ra NGOAI repo:')
    console.log('    npm run vault:backup -- --out D:/sao-luu/adminVault.enc\n')
    stop()
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, blob + '\n', { mode: 0o600 })

  const fingerprint = createHash('sha256').update(blob).digest('hex').slice(0, 12)
  ok(`Da ghi: ${path.relative(root, outPath)} (${blob.length} byte, van tay ${fingerprint})`)

  console.log('\n  ⚠️ File nay = toan quyen quan tri. Ma hoa bang AUTH_BACKUP_KEY.')
  console.log('     Cat o cho KHAC may nay (o cung ngoai, kho mat khau, USB).')
  console.log('     Thu muc backups/ da nam trong .gitignore — dung dua no ra khoi do.')
  console.log('\n  Khoi phuc: npm run vault:restore -- --file <duong-dan>')
  console.log('  Neu mat AUTH_PEPPER: npm run vault:restore -- --file <duong-dan> --reveal-pepper\n')
})
