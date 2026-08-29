/**
 * Doc mot tep loi (JSON soan tay) thanh TUNG TEP AM THANH rieng, de nhap vao CapCut.
 *
 * Vi sao khong dung `npm run video:spec`: no goi `generateVideoScript`, ma bo do
 * goi THANG Anthropic (co y — xem docs/AI_ROUTER.md muc "ba file streaming") va
 * credit dang het. Loi doc soan tay di duong nay thi khong phu thuoc AI nao ca.
 *
 * Chay:
 *   npm run tts:capcut -- <tep.json>                          -> edge-tts, giong Ava (mien phi)
 *   npm run tts:capcut -- <tep.json> --giong=en-US-BrianNeural
 *   npm run tts:capcut -- <tep.json> --11                     -> ElevenLabs (tinh tien)
 *   npm run tts:capcut -- <tep.json> --sapi                   -> duong lui, khong can mang
 *
 * ⚠️ PHAI co `--` sau ten lenh. Khong co no thi npm nuot co `--11` va script lang
 * le chay bang SAPI — ra tep .wav giong may trong khi ban tuong dang dung giong
 * that. Da mac dung loi do lan dau chay.
 *
 * Do that tren deal #1178, cung mot loi:
 *   SAPI        3.8 / 4.9 / 8.3 / 5.7  = 22.8s   <- dem khoang lang, HOOK 5 chu van 3.8s
 *   ElevenLabs  1.9 / 3.2 / 6.3 / 4.7  = 16.0s   <- vua khit khung 0-2 / 2-7 / 7-15
 * Voi video ngan thi khoang lang cua SAPI chiem phan lon HOOK.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from './_vault.mjs'
import { docThanhTep } from './tts.mjs'

Object.assign(process.env, loadEnv())

const TEP = process.argv[2]
// Nha cung cap giong. Mac dinh `edge` — mien phi, giong neural, khong can khoa.
// `--11` chi dung khi that su can giong tot nhat (ElevenLabs tinh tien theo ky tu).
// `--sapi` la duong lui khi edge-tts ngung chay (no la cua khong chinh thuc).
const NHA = process.argv.includes('--11') ? 'elevenlabs'
  : process.argv.includes('--sapi') ? 'sapi'
  : 'edge'
const GIONG = (process.argv.find(a => a.startsWith('--giong=')) ?? '').split('=')[1]
if (!TEP || !fs.existsSync(TEP)) {
  console.log('Dung: npm run tts:capcut -- <tep-loi.json> [--11|--sapi] [--giong=en-US-...]')
  process.exit(0)
}

const data = JSON.parse(fs.readFileSync(TEP, 'utf8'))
const RA = path.join('.scratch', 'tieng', String(data.deal ?? 'khong-ma'))
fs.mkdirSync(RA, { recursive: true })

console.log(`Deal #${data.deal} — ${data.canh.length} doan`)
const NHAN_NHA = {
  edge: `edge-tts · ${GIONG || 'en-US-AvaNeural'} (mien phi)`,
  elevenlabs: 'ElevenLabs (tinh tien theo ky tu)',
  sapi: 'SAPI Windows (mien phi, giong may)',
}
console.log(`Giong: ${NHAN_NHA[NHA]}\n`)

let moc = 0
for (let i = 0; i < data.canh.length; i++) {
  const c = data.canh[i]
  const { tep, giay, tuDem } = await docThanhTep(
    c.docLen,
    path.join(RA, `${i + 1}-${c.vai.toLowerCase().replace(/[^a-z]+/g, '-')}`),
    NHA === 'elevenlabs'
      ? { provider: 'elevenlabs', giong: GIONG || process.env.ELEVENLABS_VOICE_ID }
      : NHA === 'edge'
        ? { provider: 'edge', ...(GIONG ? { giong: GIONG } : {}) }
        : { provider: 'sapi' }
  )
  const batDau = moc
  moc += giay
  console.log(`${c.vai.padEnd(20)} ${fmt(batDau)} -> ${fmt(moc)}  (${giay.toFixed(1)}s)${tuDem ? '  [bo dem]' : ''}`)
  console.log(`  man hinh : ${c.hienTrenMan}`)
  console.log(`  doc      : ${c.docLen}`)
  console.log(`  tep      : ${tep}\n`)
}

console.log(`TONG THOI LUONG LOI DOC: ${fmt(moc)}`)
console.log(`Thu muc: ${path.resolve(RA)}`)
console.log('\n⚠️ Moc o tren la do dai TIENG, khong phai do dai video cua ban.')
console.log('   Trong CapCut cu dat moi doan vao dung canh hinh anh — loi doc bam theo')
console.log('   hinh moi la thu quan trong, khong phai bam theo con so nay.')

function fmt(s) {
  const m = Math.floor(s / 60)
  return `${m}:${(s % 60).toFixed(1).padStart(4, '0')}`
}
