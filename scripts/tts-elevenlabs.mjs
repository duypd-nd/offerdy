/**
 * Giong doc ElevenLabs. Goi qua `scripts/tts.mjs`, dung goi thang — cua do co bo
 * nho dem, va bo dem la thu duy nhat dang giua chung ta voi viec dot han muc.
 *
 * ⚠️ KHOA CUA DU AN BI GIOI HAN QUYEN. Do that 2026-08-22:
 *   /v1/user/subscription -> 401 missing_permissions (user_read)
 *   /v1/voices/<id>       -> 401
 *   /v1/text-to-speech    -> 200, chay tot
 *
 * Nghia la **khong cach nao doc duoc con bao nhieu ky tu**. Khong co canh bao
 * "sap het", khong co bao cao. Het han muc thi bieu hien la mot loi HTTP giua
 * chung me. Nen: dem lai moi thu doc duoc, va tinh truoc so ky tu se tieu.
 */
import fs from 'node:fs'
import path from 'node:path'
import { loadEnv } from './_vault.mjs'

const MODEL = 'eleven_multilingual_v2'

export async function doc11(chu, tepRa, opts = {}) {
  const env = loadEnv()
  const key = env.ELEVENLABS_API_KEY
  const giong = opts.giong || env.ELEVENLABS_VOICE_ID
  if (!key) throw new Error('Thieu ELEVENLABS_API_KEY trong .env.local')
  if (!giong) throw new Error('Thieu ELEVENLABS_VOICE_ID (hoac tuy chon `giong`)')

  // ⚠️ `/with-timestamps` chu khong phai duong thuong: no tra ve THEM moc thoi
  // gian cua TUNG KY TU. Do la thu duy nhat cho phep phu de chay dung theo giong
  // doc — khong co no thi chi con cach chia deu so tu cho do dai, ma giong doc
  // khong doc deu: mot tu dai va mot tu ngan khong bao gio bang nhau.
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${giong}/with-timestamps`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: String(chu),
      model_id: opts.model ?? MODEL,
      voice_settings: {
        stability: opts.stability ?? 0.4,
        similarity_boost: opts.similarity ?? 0.75,
        // Nhanh hon mot chut so voi mac dinh: video ngan tren TikTok can nhip gap,
        // nhung day KHONG phai cho de day len 1.2 — nghe se thanh gap gap.
        speed: opts.speed ?? 1.04,
      },
    }),
  })

  if (!r.ok) {
    const than = (await r.text()).slice(0, 300)
    // Phan biet HET HAN MUC voi cac loi khac: hai truong hop nay doi hai cach xu
    // ly nguoc nhau — mot cai la doi thang sau, cai kia la sua code.
    if (r.status === 401 && /quota|credit/i.test(than)) {
      throw new Error(`ElevenLabs HET HAN MUC ky tu. Doi sang provider "sapi" hoac cho ky sau.\n${than}`)
    }
    throw new Error(`ElevenLabs HTTP ${r.status}: ${than}`)
  }

  const than = await r.json()
  if (!than?.audio_base64) throw new Error('ElevenLabs khong tra ve audio_base64')

  fs.mkdirSync(path.dirname(tepRa), { recursive: true })
  fs.writeFileSync(tepRa, Buffer.from(than.audio_base64, 'base64'))
  return { tep: tepRa, tu: gomTu(than.alignment ?? than.normalized_alignment) }
}

/**
 * Moc TUNG KY TU -> moc TUNG TU.
 *
 * ElevenLabs tra ve mang ky tu kem thoi diem bat dau/ket thuc cua moi ky tu.
 * Gom lai theo khoang trang: mot tu bat dau o ky tu dau tien cua no va ket thuc
 * o ky tu cuoi.
 *
 * ⚠️ Giu nguyen dau cau dinh vao tu ("price." chu khong phai "price" va "."):
 * chu hien tren man phai giong het cau viet, va mot dau cham dung mot minh giua
 * man hinh thi vo nghia.
 */
function gomTu(align) {
  const ky = align?.characters
  const dau = align?.character_start_times_seconds
  const het = align?.character_end_times_seconds
  if (!Array.isArray(ky) || !Array.isArray(dau) || !Array.isArray(het)) return null

  const tu = []
  let hienTai = null
  for (let i = 0; i < ky.length; i++) {
    const c = ky[i]
    if (/\s/.test(c)) { if (hienTai) { tu.push(hienTai); hienTai = null } continue }
    if (!hienTai) hienTai = { chu: c, dau: dau[i], het: het[i] }
    else { hienTai.chu += c; hienTai.het = het[i] }
  }
  if (hienTai) tu.push(hienTai)
  return tu.length ? tu : null
}

/** So ky tu mot kich ban se tieu — de biet TRUOC khi goi. */
export const demKyTu = cacCau => cacCau.reduce((n, c) => n + String(c ?? '').length, 0)
