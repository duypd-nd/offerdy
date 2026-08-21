/**
 * Khoi phuc kho tai khoan quan tri tu mot ban sao.
 *
 *   npm run vault:restore -- --list
 *   npm run vault:restore -- --file backups/adminVault-....enc
 *   npm run vault:restore -- --slot tue            (o trong Sanity)
 *   npm run vault:restore -- --file ... --reveal-pepper
 *
 * ⚠️ MOT BAN SAO KHONG KHOI PHUC DUOC THI KHONG PHAI BAN SAO. Lenh nay ton tai
 * de duong khoi phuc duoc di thu TRUOC khi can den no that.
 *
 * Hai su co no xu ly, va chung can hai duong khac han nhau:
 *
 * A. Ai do xoa `adminVault`. AUTH_PEPPER van con -> chi can ghi lai danh sach
 *    tai khoan. Chay khong co co gi dac biet.
 *
 * B. Mat AUTH_PEPPER. Danh sach tai khoan doi lai vo nghia: `passwordHash` da
 *    tron pepper cu, khong co pepper do thi moi mat khau deu sai. Ban sao co
 *    chua pepper cu ben trong -> `--reveal-pepper` lay no ra, dat lai vao
 *    .env.local va Vercel, roi chay lai lenh nay khong co co.
 */
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import {
  root, ok, bad, warn, run, stop, loadEnv, deriveKeys, deriveBackupKey,
  encryptJson, decryptJson, openBackup, sanity, VAULT_DOC_ID, BACKUP_DOC_TYPE,
} from './_vault.mjs'

await run(async () => {
  const env = loadEnv()
  const args = process.argv.slice(2)
  const flag = name => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] ?? null) : null }
  const has = name => args.includes(name)

  console.log('\nKhoi phuc kho tai khoan quan tri Offerdy\n')

  const keyed = deriveBackupKey(env.AUTH_BACKUP_KEY, env.AUTH_PEPPER)
  if (!keyed.ok) {
    bad(keyed.error)
    console.log('\n  Khong co AUTH_BACKUP_KEY thi khong mo duoc ban sao nao ca.\n')
    stop()
  }

  // --file khong can Sanity de doc ban sao, nen thieu bien Sanity chua phai loi.
  let db = null
  try { db = sanity(env) } catch { /* bao sau, dung cho can den */ }

  // ── --list: co nhung ban sao nao ────────────────────────────────
  if (has('--list')) {
    if (db) {
      const slots = await db.query(`*[_type == "${BACKUP_DOC_TYPE}"]{ slot, createdAt } | order(createdAt desc)`)
      if (!slots?.length) console.log('  Chua co ban sao nao trong Sanity.')
      else for (const s of slots) console.log(`  · ${String(s.slot).padEnd(4)} — ${s.createdAt}`)
    } else {
      warn('Thieu bien Sanity nen khong liet ke duoc o trong Sanity.')
    }

    const dir = path.join(root, 'backups')
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.enc')).sort().reverse() : []
    console.log(files.length ? `\n  File trong backups/ (${files.length}):` : '\n  Khong co file nao trong backups/.')
    for (const f of files.slice(0, 10)) console.log(`  · ${f}`)
    console.log()
    return
  }

  // ── Lay ban sao ─────────────────────────────────────────────────
  const file = flag('--file')
  const slot = flag('--slot')
  if (!file && !slot) {
    bad('Can --file <duong-dan> hoac --slot <mon|tue|...>. Dung --list de xem co gi.')
    stop()
  }

  let blob
  if (file) {
    const p = path.resolve(String(file))
    if (!fs.existsSync(p)) { bad(`Khong thay file: ${p}`); stop() }
    blob = fs.readFileSync(p, 'utf8').trim()
    ok(`Doc file: ${path.relative(root, p)}`)
  } else {
    if (!db) { bad('Thieu bien moi truong Sanity.'); stop() }
    const doc = await db.query(`*[_id == "${BACKUP_DOC_TYPE}.${slot}"][0]{ data }`)
    if (!doc) { bad(`Khong co ban sao o o "${slot}".`); stop() }
    blob = doc.data
    ok(`Doc o Sanity: ${BACKUP_DOC_TYPE}.${slot}`)
  }

  const opened = openBackup(blob, keyed.key)
  if (!opened.ok) { bad(opened.error); stop() }
  const backup = opened.payload
  ok('Giai ma duoc ban sao')

  console.log(`\n  Tao luc  : ${backup.createdAt} (${backup.source})`)
  console.log(`  Tai khoan: ${backup.users.length}`)
  for (const u of backup.users) console.log(`    · ${u.email} — ${u.role}${u.active ? '' : ' (da vo hieu hoa)'}`)
  console.log(`  AUTH_SECRET trong ban sao: ${backup.authSecret ? 'co' : 'KHONG'}`)

  // ── --reveal-pepper: duong thoat cho su co B ────────────────────
  if (has('--reveal-pepper')) {
    console.log('\n  ⚠️ IN BI MAT RA MAN HINH. Dam bao khong ai nhin, khong dang quay man hinh,')
    console.log('     va xoa doan nay khoi lich su terminal sau khi dung xong.\n')
    console.log(`  AUTH_PEPPER=${backup.authPepper}`)
    if (backup.authSecret) console.log(`  AUTH_SECRET=${backup.authSecret}`)
    console.log('\n  Dat hai gia tri nay vao .env.local VA vao Vercel, deploy lai,')
    console.log('  roi chay lai lenh nay KHONG co --reveal-pepper de ghi kho ve cho.\n')
    return
  }

  // ── Kiem pepper truoc khi ghi ───────────────────────────────────
  //
  // ⚠️ Ghi kho bang mot pepper KHAC pepper luc bam mat khau = tao ra mot kho ma
  // khong ai dang nhap duoc, va no trong y het mot kho lanh lan. Chan o day.
  if (!env.AUTH_PEPPER) {
    bad('Thieu AUTH_PEPPER trong moi truong.')
    console.log('\n  Chay lai voi --reveal-pepper de lay pepper tu chinh ban sao.\n')
    stop()
  }
  if (env.AUTH_PEPPER.trim() !== String(backup.authPepper).trim()) {
    bad('AUTH_PEPPER hien tai KHAC pepper trong ban sao.')
    console.log('\n  Ghi de bay gio se tao ra mot kho ma khong mat khau nao dung ca.')
    console.log('  Chay lai voi --reveal-pepper, dat dung gia tri cu, roi thu lai.\n')
    stop()
  }
  ok('AUTH_PEPPER khop voi ban sao')

  if (!db) { bad('Thieu bien moi truong Sanity — khong ghi duoc.'); stop() }

  // Cho nguoi van hanh nhin thay minh sap ghi de len cai gi.
  const { encKey } = deriveKeys(env.AUTH_PEPPER)
  const current = await db.query(`*[_id == "${VAULT_DOC_ID}"][0]{ data }`)
  if (current) {
    const now = decryptJson(current.data, encKey)
    if (now) warn(`Kho hien tai co ${now.length} tai khoan — se bi THAY hoan toan bang ${backup.users.length} tai khoan tren.`)
    else warn('Kho hien tai KHONG giai ma duoc — se bi thay hoan toan.')
  } else {
    ok('Chua co kho — se tao moi')
  }

  if (!has('--yes')) {
    if (!stdin.isTTY) {
      bad('Can xac nhan. Chay truc tiep trong terminal, hoac them --yes neu chac chan.')
      stop()
    }
    const rl = readline.createInterface({ input: stdin, output: stdout })
    const answer = (await rl.question('\n  Go GHI DE de xac nhan: ')).trim()
    rl.close()
    if (answer !== 'GHI DE') { bad('Da huy.'); stop() }
  }

  await db.mutate([{ createOrReplace: { _id: VAULT_DOC_ID, _type: 'adminVault', data: encryptJson(backup.users, encKey) } }])

  // Doc lai that su. "mutate khong nem loi" chua phai bang chung kho dung duoc:
  // neu buoc nay khong khop thi phai biet NGAY, khong phai luc dang nhap that bai.
  const after = decryptJson((await db.query(`*[_id == "${VAULT_DOC_ID}"][0]{ data }`))?.data, encKey)
  if (!after || after.length !== backup.users.length) {
    bad('Ghi xong nhung doc lai khong khop — kiem tra Sanity ngay.')
    stop()
  }

  ok(`Da khoi phuc ${after.length} tai khoan`)
  console.log('\n  Vao /admin/login thu dang nhap bang mot tai khoan trong danh sach tren.')
  console.log('  Neu AUTH_SECRET cung da doi thi moi nguoi phai dang nhap lai — binh thuong.\n')
})
