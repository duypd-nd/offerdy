import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { getAnthropicClient } from '@/lib/ai/anthropicClient'
import { HE_THONG, nguoiDung } from '@/lib/ai/prompts/imageJudge'
import type { DanhGiaAnh } from '@/lib/video/scoreImages'

/**
 * Cho Claude NHIN tung anh cua trang san pham va noi no thay gi.
 *
 * ── VI SAO CAN MOT MODEL O DAY ─────────────────────────────────────
 *
 * Da do that 38 anh cua 5 deal: khong tin hieu nao ngoai chinh diem anh phan
 * biet duoc mot anh doi thuc voi mot anh can canh vai co vong phong to. Kich
 * thuoc deu >= 800x800, ten file toan ma bam, ti le gan vuong het. Chi tiet o
 * dau `src/lib/video/scoreImages.ts`.
 *
 * ⚠️ Model chi MO TA. Quyet dinh bo anh nao nam o `scoreImages()` — ham thuan,
 * co test. Xem ly do o dau file do.
 */

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

const DanhGiaSchema = z.object({
  index: z.number(),
  nhieuChu: z.boolean(),
  toanCanh: z.boolean(),
  diem: z.number(),
  lyDo: z.string(),
})

const KetQuaSchema = z.object({
  anh: z.array(DanhGiaSchema),
})

/**
 * ⚠️ Tran so anh gui di. Mot trang san pham Shopify co the tra ve 30 anh; 30
 * tam anh trong mot request la tien that va do tre that, trong khi `buildSpec`
 * khong bao gio dung qua chung ay canh.
 */
const TOI_DA = 12

/** Anh nang hon muc nay thi bo qua — khong dang de doi lay mot dong nhan xet. */
const TOI_DA_BYTE = 5 * 1024 * 1024

const LOAI_HOP_LE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
type LoaiAnh = (typeof LOAI_HOP_LE)[number]

/**
 * Doan loai anh tu CHINH NOI DUNG tep, khong tin `content-type` cua may chu.
 *
 * ⚠️ Do that: CDN cua shop tra `application/octet-stream` cho file `.webp`, va
 * API tu choi mot media_type khong hop le. Bon byte dau thi khong noi doi.
 */
function loaiAnh(b: Buffer, contentType?: string | null): LoaiAnh | null {
  if (b.length > 12) {
    if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg'
    if (b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'image/png'
    if (b.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif'
    if (b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  }
  const ct = (contentType ?? '').split(';')[0].trim().toLowerCase()
  return (LOAI_HOP_LE as readonly string[]).includes(ct) ? (ct as LoaiAnh) : null
}

type AnhDaTai = { chiSoGoc: number; loai: LoaiAnh; data: string }

/**
 * Tai anh ve va ma hoa base64.
 *
 * ⚠️ TU TAI, KHONG gui URL cho API. Ban dau ham nay gui `{type:'url'}` cho gon,
 * va no hong ngay lan chay that thu hai: MOT anh khong tai duoc thi CA request
 * tra ve 400 "Unable to download the file" — mat toan bo nhan xet cua 8 anh
 * con lai, va vi ham nay nuot loi (xem duoi) nen khong ai biet gi ngoai viec
 * anh bong nhien thoi duoc cham. Tu tai thi mot anh chet chi lam mat mot anh.
 */
async function taiAnh(urls: string[]): Promise<AnhDaTai[]> {
  const ra = await Promise.all(urls.map(async (url, chiSoGoc): Promise<AnhDaTai | null> => {
    try {
      const r = await fetch(url)
      if (!r.ok) return null
      const b = Buffer.from(await r.arrayBuffer())
      if (!b.length || b.length > TOI_DA_BYTE) return null
      const loai = loaiAnh(b, r.headers.get('content-type'))
      return loai ? { chiSoGoc, loai, data: b.toString('base64') } : null
    } catch {
      return null
    }
  }))
  return ra.filter((x): x is AnhDaTai => x !== null)
}

const coTheThuLai = (err: unknown): boolean =>
  !!err && typeof err === 'object' && 'status' in err &&
  [429, 500, 502, 503, 529].includes((err as { status?: number }).status ?? 0)

export async function judgeImages(ten: string, anh: string[], lan = 1): Promise<DanhGiaAnh[] | null> {
  const canCham = anh.slice(0, TOI_DA)
  if (!canCham.length) return null

  try {
    const daTai = await taiAnh(canCham)
    // Duoi ba anh thi cham cung khong de lam gi: `scoreImages` giu toi thieu ba.
    if (daTai.length < 3) return null

    // ⚠️ Streaming + tu parse, KHONG dung `messages.parse` — cung ly do da ghi o
    // `generateVideoScript.ts`: `max_tokens` chan thinking + chu CONG LAI, va
    // `messages.parse` parse TRUOC khi doc duoc `stop_reason` nen hang rao "bi
    // cat" ben duoi se khong bao gio chay toi.
    const stream = getAnthropicClient().messages.stream({
      model: MODEL,
      max_tokens: 64000,
      system: HE_THONG,
      output_config: { format: zodOutputFormat(KetQuaSchema) },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: nguoiDung(ten, daTai.length) },
          // ⚠️ Chen mot dong chu truoc moi anh. Khong co no thi model phai dem
          // trong dau, va dem lech mot la MOI nhan xet lech mot anh — kieu sai
          // te nhat vi ket qua van trong hop le.
          ...daTai.flatMap((a, i) => ([
            { type: 'text' as const, text: `Image index ${i}:` },
            { type: 'image' as const, source: { type: 'base64' as const, media_type: a.loai, data: a.data } },
          ])),
        ],
      }],
    })
    const res = await stream.finalMessage()
    if (res.stop_reason === 'max_tokens') return null

    let json = ''
    for (const b of res.content) if (b.type === 'text') json += b.text
    if (!json) return null

    // ⚠️ Doi chi so ve LAI chi so trong mang goc. Model danh so theo nhung anh
    // ta THUC SU gui di; anh nao tai hong da bi bo giua chung, nen hai he so
    // lech nhau — va `scoreImages` doc theo mang goc.
    const ra: DanhGiaAnh[] = []
    for (const d of KetQuaSchema.parse(JSON.parse(json)).anh) {
      const goc = daTai[d.index]
      if (goc) ra.push({ ...d, index: goc.chiSoGoc })
    }
    return ra.length ? ra : null
  } catch (err) {
    if (coTheThuLai(err) && lan < 3) {
      await new Promise(r => setTimeout(r, lan * 1500))
      return judgeImages(ten, anh, lan + 1)
    }
    // ⚠️ NUOT LOI CO CHU DINH. Cham anh la buoc lam video DEP HON, khong phai
    // buoc lam video DUNG. Mot anh URL chet, mot lan 429, mot lan model tra ve
    // JSON lech — khong cai nao dang de nguoi van hanh khong dung duoc video.
    // `scoreImages(anh, null)` tra lai nguyen thu tu cu, va trang admin bao ro
    // la "chua cham duoc" — im lang thi duoc, nhung KHONG duoc im lang ma van
    // trong nhu da cham xong.
    return null
  }
}
