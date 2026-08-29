/**
 * Giong doc bang edge-tts — giong neural cua Microsoft, MIEN PHI, khong can khoa.
 *
 * ── VI SAO THEM CAI NAY (2026-08-29) ──────────────────────────────
 *
 * ElevenLabs bi huy goi. Ba lua chon con lai, do that tren cung mot cau
 * ("Blue light glasses. Fifteen dollars."):
 *
 *   ElevenLabs   1.9s   giong that nhat — nhung tinh tien
 *   edge-tts     3.3s   giong neural, mien phi, khong khoa   <- chon cai nay
 *   SAPI         3.8s   mien phi, nhung la giong may doc, va dem khoang lang
 *
 * `--rate` keo edge ve gan ElevenLabs: +15% -> 2.86s, +25% -> 2.64s. Video ngan
 * thuong doc nhanh hon binh thuong, nen mac dinh o day la +15%.
 *
 * ⚠️ edge-tts la CUA KHONG CHINH THUC vao dich vu doc cua Microsoft. No co the
 * ngung chay bat cu luc nao ma khong bao truoc, va do KHONG phai loi cua code
 * nay. Khi do: `tts-sapi.mjs` van chay (khong mang, khong han muc, khong the
 * hong vi mot dich vu ben ngoai doi y) — do dung la ly do SAPI duoc viet truoc.
 *
 * ⚠️ Doi tieng Python. Chua cai thi bao dung cach fix, dung de nguoi dung doc
 * mot vet loi Python khong ro nghia:  pip install edge-tts
 *
 * ⚠️ Chu truyen qua --text tren dong lenh se hong voi dau nhay va ky tu $. Dung
 * `--file` — cung bai hoc da ghi o `tts-sapi.mjs`.
 *
 * Giong hop khan gia tre My (doc tu `python -m edge_tts --list-voices`):
 *   en-US-AvaNeural     nu, Expressive / Caring / Friendly     <- mac dinh
 *   en-US-EmmaNeural    nu, Cheerful / Clear / Conversational
 *   en-US-BrianNeural   nam, Approachable / Casual / Sincere
 *   en-US-AndrewNeural  nam, Warm / Confident / Authentic
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

export const GIONG_MAC_DINH = 'en-US-AvaNeural'
const RATE_MAC_DINH = '+15%'

/** Danh sach giong en-US, doc tu chinh edge-tts. */
export function danhSachGiongEdge() {
  return new Promise((res, rej) => {
    const ps = spawn('python', ['-m', 'edge_tts', '--list-voices'], { stdio: ['ignore', 'pipe', 'pipe'] })
    let ra = ''
    ps.stdout.on('data', d => { ra += d })
    ps.on('error', rej)
    ps.on('close', () => res(
      ra.split(/\r?\n/).filter(l => l.startsWith('en-US-')).map(l => l.trim().split(/\s{2,}/)[0])
    ))
  })
}

/**
 * Doc `chu` thanh tep mp3. Tra ve `{ tep }` — do dai do `tts.mjs` tu do bang
 * ffprobe, giong het duong SAPI, de mot cho duy nhat quyet dinh do dai.
 */
export async function docEdge(chu, tepRa, opts = {}) {
  const giong = opts.giong || GIONG_MAC_DINH
  // `rate` o day la chuoi kieu "+15%", khong phai so — khac y nghia voi `rate`
  // cua SAPI (mot so nguyen -10..10). Hai nha, hai thang do; dung quy doi cheo.
  const rate = opts.rate ?? RATE_MAC_DINH

  fs.mkdirSync(path.dirname(tepRa), { recursive: true })

  // ⚠️ Chu qua FILE chu khong qua dong lenh: loi doc co dau nhay, ky tu $ va
  // xuong dong. Nhet thang vao dong lenh la hong, hoac te hon la chay nham gi do.
  const tepChu = tepRa.replace(/\.\w+$/, '') + '.txt'
  fs.writeFileSync(tepChu, chu, 'utf8')

  await new Promise((res, rej) => {
    const ps = spawn('python', [
      '-m', 'edge_tts',
      '--voice', giong,
      '--rate', String(rate),
      '--file', tepChu,
      '--write-media', tepRa,
    ], { stdio: ['ignore', 'ignore', 'pipe'] })
    let loi = ''
    ps.stderr.on('data', d => { loi += d })
    ps.on('error', e => rej(new Error(
      `Khong chay duoc edge-tts (${e.message}). Cai bang:  pip install edge-tts`
    )))
    ps.on('close', ma => {
      fs.rmSync(tepChu, { force: true })
      if (ma === 0 && fs.existsSync(tepRa)) return res()
      if (/No module named/i.test(loi)) {
        return rej(new Error('Chua cai edge-tts. Chay:  pip install edge-tts'))
      }
      rej(new Error(`edge-tts loi (ma ${ma}): ${loi.trim().slice(0, 300)}`))
    })
  })

  return { tep: tepRa }
}
