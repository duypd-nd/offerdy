/**
 * Tao tai khoan quan tri — `node scripts/create-admin.mjs`
 *
 * Vi sao phai co lenh nay: he thong moi khong co tai khoan nao, ma trang
 * `/admin/users` lai doi phai dang nhap bang mot tai khoan Chu. Do la mot canh
 * cua khoa tu ben trong. Lenh nay la chia khoa duy nhat mo no lan dau.
 *
 * Sau khi da co mot Chu, moi tai khoan tiep theo nen tao tren `/admin/users` —
 * o do co kiem tra quyen, con lenh nay thi khong.
 *
 * ⚠️ Thuat toan ma hoa nam trong `scripts/_vault.mjs` va phai KHOP TUNG BIT voi
 * src/lib/adminCrypto.ts. Rieng phan bam mat khau duoi day phai khop voi
 * src/lib/adminAuth.ts. Doi mot ben ma quen ben kia la kho khong mo duoc nua.
 *
 * ⚠️ KHONG IN MAT KHAU ra man hinh hay ghi vao file nao.
 */
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { createHmac, scryptSync, randomBytes, randomUUID } from 'node:crypto'
import {
  ok, bad, run, stop, loadEnv, deriveKeys, encryptJson, decryptJson, sanity, VAULT_DOC_ID,
} from './_vault.mjs'

await run(async () => {
  const env = loadEnv()

  console.log('\nTao tai khoan quan tri Offerdy\n')

  if (!env.AUTH_PEPPER) {
    bad('Thieu bien moi truong: AUTH_PEPPER')
    console.log('\n  Sinh AUTH_SECRET / AUTH_PEPPER bang:')
    console.log('    node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"\n')
    stop()
  }

  let db
  try { db = sanity(env) } catch (e) { bad(e.message); stop() }
  ok('Da co du bien moi truong')

  const { pepper, encKey } = deriveKeys(env.AUTH_PEPPER)

  // ── Y HET src/lib/adminAuth.ts ──────────────────────────────────
  const SCRYPT_N = 32768, SCRYPT_r = 8, SCRYPT_p = 1, KEY_LEN = 64
  const MAXMEM = 128 * SCRYPT_N * SCRYPT_r * 2
  const hashPassword = pw => {
    const salt = randomBytes(16)
    const h = scryptSync(createHmac('sha256', pepper).update(pw, 'utf8').digest(), salt, KEY_LEN,
      { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p, maxmem: MAXMEM })
    return `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt.toString('base64url')}$${h.toString('base64url')}`
  }

  // ── Doc kho hien co ─────────────────────────────────────────────
  const doc = await db.query(`*[_id == "${VAULT_DOC_ID}"][0]{ data, _rev }`)

  let users = []
  let rev = null
  if (doc) {
    rev = doc._rev ?? null
    const decoded = decryptJson(doc.data, encKey)
    if (decoded === null) {
      // ⚠️ Ghi de len kho khong giai ma duoc = XOA VINH VIEN moi tai khoan, chi
      // vi mot bien moi truong dat nham. Dung lai, khong doan.
      bad('Kho tai khoan da ton tai nhung KHONG GIAI MA DUOC.')
      console.log('\n  Gan nhu chac chan la AUTH_PEPPER khac voi luc tao kho.')
      console.log('  Dat lai dung gia tri cu roi chay lai. KHONG ghi de — lam vay la mat sach tai khoan.')
      console.log('  Neu da co ban sao luu: npm run vault:restore -- --list\n')
      stop()
    }
    users = decoded
    ok(`Kho hien co ${users.length} tai khoan`)
  } else {
    ok('Chua co kho — se tao moi')
  }

  // Lenh nay hoi mat khau nen bat buoc phai co ban phim that. Khong co TTY thi
  // readline doc EOF va Node bao "unsettled top-level await" — mot thong bao
  // khong lien quan gi den nguyen nhan.
  if (!stdin.isTTY) {
    bad('Lenh nay can chay truc tiep trong terminal (co ban phim).')
    console.log('\n  Dung `node scripts/create-admin.mjs`, khong dan qua ong dan hay chay trong CI.\n')
    stop()
  }

  // ⚠️ Ban sao cua MIN_PASSWORD_LENGTH trong src/lib/adminAuth.ts. File .mjs
  // khong import duoc hang tu TypeScript, nen doi mot ben phai doi ca ben kia.
  const MIN_PASSWORD_LENGTH = 10

  const rl = readline.createInterface({ input: stdin, output: stdout })
  const email = (await rl.question('  Email        : ')).trim().toLowerCase()
  const name = (await rl.question('  Ten hien thi : ')).trim()
  const password = (await rl.question(`  Mat khau (>= ${MIN_PASSWORD_LENGTH} ky tu): `)).trim()
  rl.close()

  if (!email.includes('@')) { bad('Email khong hop le'); stop() }
  if (!name) { bad('Chua nhap ten'); stop() }
  if (password.length < MIN_PASSWORD_LENGTH) { bad(`Mat khau phai tu ${MIN_PASSWORD_LENGTH} ky tu tro len`); stop() }
  if (users.some(u => u.email.toLowerCase() === email)) { bad(`Da co tai khoan voi email ${email}`); stop() }

  users.push({
    id: randomUUID(), email, name, role: 'owner', active: true,
    passwordHash: hashPassword(password), createdAt: new Date().toISOString(),
  })

  const data = encryptJson(users, encKey)
  const mutations = rev
    ? [{ patch: { id: VAULT_DOC_ID, ifRevisionID: rev, set: { data } } }]
    : [{ createOrReplace: { _id: VAULT_DOC_ID, _type: 'adminVault', data } }]

  try {
    await db.mutate(mutations)
  } catch (e) { bad(`Khong luu duoc: ${e.message}`); stop() }

  ok(`Da tao tai khoan Chu: ${email}`)
  console.log('\n  Vao /admin/login de dang nhap.')
  console.log('  Cac tai khoan sau nen tao o /admin/users, khong dung lenh nay nua.\n')
  console.log('  ⚠️ Tai lieu "adminVault" nam trong dataset CONG KHAI nhung noi dung da ma hoa.')
  console.log('     Nguoi la tai duoc no nhung chi thay chuoi rac. Dung bao gio doi AUTH_PEPPER')
  console.log('     neu khong muon mat het tai khoan.')
  console.log('\n  Sao luu ngay: npm run vault:backup\n')
})
