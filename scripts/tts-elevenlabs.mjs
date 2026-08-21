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

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${giong}`, {
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

  fs.mkdirSync(path.dirname(tepRa), { recursive: true })
  fs.writeFileSync(tepRa, Buffer.from(await r.arrayBuffer()))
  return tepRa
}

/** So ky tu mot kich ban se tieu — de biet TRUOC khi goi. */
export const demKyTu = cacCau => cacCau.reduce((n, c) => n + String(c ?? '').length, 0)
