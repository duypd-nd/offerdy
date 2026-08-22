import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { getAnthropicClient } from '@/lib/ai/anthropicClient'
import {
  HE_THONG, nguoiDung, HE_THONG_CHU, nguoiDungChu,
} from '@/lib/ai/prompts/transitionJudge'

/**
 * Cho Claude NHIN khung hinh cua mot video mau va noi no thay gi.
 *
 * ── VI SAO PHAI TACH LAM HAI BUOC ─────────────────────────────────
 *
 * Do nhip cat thi khong can model: `select='gt(scene,...)'` cua ffmpeg tra ve
 * thang moc giay, chinh xac toi khung hinh, khong ton mot dong token nao. Cai
 * ffmpeg KHONG noi duoc la hinh anh bien doi RA SAO trong khoang do — truot,
 * xoa man, hay vo pixel. Do la viec cua mat.
 *
 * ⚠️ Model chi MO TA. Viec dich mo ta sang ten `xfade` nam o `mapTransition()` —
 * ham thuan, co danh sach trang, co test. Cung mot luat da lap o `scoreImages()`.
 *
 * ⚠️ KHAC `judgeImages` o mot diem: ham do NUOT LOI co chu dinh, vi cham anh chi
 * la buoc lam video DEP HON. O day thi ca cong cu TON TAI de doc video mau, nen
 * that bai im lang la hong han — truyen `ngheLoi` vao de biet vi sao.
 */

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

/**
 * Khung gui di deu la JPEG do chinh ta rut ra bang ffmpeg — khong phai doan loai.
 *
 * ⚠️ TUNG LA PNG, VA NO LAM CHET CA REQUEST. Mot khung 640px dang PNG nang ~520KB;
 * 10 nhom x 8 khung = 80 anh ~42MB, qua base64 thanh ~56MB — vuot xa tran 32MB
 * cua API. Loi tra ve bi ham nay nuot mat nen bang so chi hien "khong doc duoc
 * hieu ung" ma khong ai biet tai sao. JPEG cung kich thuoc nang ~1/10.
 */
const LOAI_KHUNG = 'image/jpeg' as const

/**
 * Tran so nhom trong MOT request.
 *
 * Mot video TikTok 18 giay do that co 14 lan chuyen canh — cat o 10 thi bo sot
 * mot phan ba. Voi khung JPEG ~50KB thi 20 nhom x 8 khung van chi khoang 8MB,
 * thoai mai duoi tran 32MB. Cat o day va NOI RO da cat bao nhieu.
 */
const TOI_DA_NHOM = 20
const TOI_DA_KHUNG_CHU = 12

const ChuyenSchema = z.object({
  index: z.number(),
  moTa: z.string().describe('Mot cau tieng Viet duoi 14 tu, dung tu vung trong loi dan neu hop.'),
  chuChay: z.boolean().describe('Chu tren man co chuyen dong trong luc chuyen canh khong.'),
})

const ChuSchema = z.object({
  index: z.number(),
  coChu: z.boolean(),
  viTri: z.number().describe('Ti le tu DINH khung, 0..1'),
  cao: z.number().describe('Chieu cao mot dong chu, ti le so voi chieu cao khung'),
  kieu: z.string(),
  hoa: z.boolean(),
})

const KetQuaChuyen = z.object({ chuyen: z.array(ChuyenSchema) })
const KetQuaChu = z.object({ khung: z.array(ChuSchema) })

/**
 * Bao vi sao that bai.
 *
 * ⚠️ `judgeImages` nuot loi co chu dinh, vi cham anh chi la buoc lam video DEP
 * HON. O day thi khac: ca cong cu nay TON TAI de doc video mau, nen im lang la
 * hong han. Nguoi goi truyen vao mot ham de nghe ly do.
 */
export type NgheLoi = (ly: string) => void

export type NhomKhung = {
  /** Chi so lan chuyen canh trong video. */
  index: number
  /** Cac khung JPEG da ma hoa base64, theo dung thu tu thoi gian. */
  khung: string[]
}

export type MoTaChuyen = z.infer<typeof ChuyenSchema>
export type MoTaChu = z.infer<typeof ChuSchema>

const coTheThuLai = (err: unknown): boolean =>
  !!err && typeof err === 'object' && 'status' in err &&
  [429, 500, 502, 503, 529].includes((err as { status?: number }).status ?? 0)

const anhBase64 = (data: string) => ({
  type: 'image' as const,
  source: { type: 'base64' as const, media_type: LOAI_KHUNG, data },
})

/** Doc JSON tu mot cau tra loi da stream xong. `null` neu bi cat hoac rong. */
async function docKetQua(stream: ReturnType<ReturnType<typeof getAnthropicClient>['messages']['stream']>): Promise<string | null> {
  const res = await stream.finalMessage()
  // ⚠️ `max_tokens` chan thinking + chu CONG LAI. Bi cat thi JSON hong nua chung,
  // va `messages.parse` se parse TRUOC khi doc duoc `stop_reason` nen hang rao
  // nay phai nam o day. Cung ly do da ghi o `generateVideoScript.ts`.
  if (res.stop_reason === 'max_tokens') return null
  let json = ''
  for (const b of res.content) if (b.type === 'text') json += b.text
  return json || null
}

/**
 * Nhin cac nhom khung hinh quanh diem cat -> mo ta bang loi.
 *
 * Tra `null` khi khong doc duoc — nguoi goi PHAI coi do la "chua doc duoc" chu
 * khong phai "khong co hieu ung nao".
 */
export async function judgeTransitions(nhom: NhomKhung[], ngheLoi?: NgheLoi, lan = 1): Promise<MoTaChuyen[] | null> {
  const canXem = nhom.slice(0, TOI_DA_NHOM)
  if (!canXem.length) { ngheLoi?.('khong co nhom khung nao'); return null }
  if (nhom.length > TOI_DA_NHOM) ngheLoi?.(`chi xem ${TOI_DA_NHOM}/${nhom.length} lan chuyen — phan con lai chua duoc doc`)
  const khungMoiNhom = canXem[0].khung.length

  try {
    const stream = getAnthropicClient().messages.stream({
      model: MODEL,
      max_tokens: 64000,
      system: HE_THONG,
      output_config: { format: zodOutputFormat(KetQuaChuyen) },
      messages: [{
        role: 'user',
        content: [
          { type: 'text' as const, text: nguoiDung(canXem.length, khungMoiNhom) },
          // ⚠️ Mot dong chu truoc MOI khung, ghi ca chi so nhom lan vi tri trong
          // nhom. Thieu no thi model phai dem trong dau qua hang chuc anh giong
          // nhau, va lech mot la moi mo ta gan sai mot lan chuyen canh — kieu sai
          // te nhat vi ket qua van trong hop le.
          ...canXem.flatMap((g, i) => g.khung.flatMap((data, k) => ([
            { type: 'text' as const, text: `Transition ${i}, frame ${k + 1}/${g.khung.length}:` },
            anhBase64(data),
          ]))),
        ],
      }],
    })

    const json = await docKetQua(stream)
    if (!json) { ngheLoi?.('cau tra loi rong hoac bi cat vi max_tokens'); return null }

    const ra: MoTaChuyen[] = []
    for (const d of KetQuaChuyen.parse(JSON.parse(json)).chuyen) {
      // Doi chi so ve LAI chi so that trong video — model danh so theo nhung nhom
      // ta thuc su gui di, ma danh sach do da bi cat o `TOI_DA_NHOM`.
      const goc = canXem[d.index]
      if (goc) ra.push({ ...d, index: goc.index })
    }
    return ra.length ? ra : null
  } catch (err) {
    if (coTheThuLai(err) && lan < 3) {
      await new Promise(r => setTimeout(r, lan * 1500))
      return judgeTransitions(nhom, ngheLoi, lan + 1)
    }
    ngheLoi?.(err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300))
    return null
  }
}

/** Nhin khung giua canh -> kieu chu va vi tri chu, tinh theo ti le khung hinh. */
export async function judgeTextStyle(khung: string[], ngheLoi?: NgheLoi, lan = 1): Promise<MoTaChu[] | null> {
  const canXem = khung.slice(0, TOI_DA_KHUNG_CHU)
  if (!canXem.length) { ngheLoi?.('khong co khung nao'); return null }

  try {
    const stream = getAnthropicClient().messages.stream({
      model: MODEL,
      max_tokens: 64000,
      system: HE_THONG_CHU,
      output_config: { format: zodOutputFormat(KetQuaChu) },
      messages: [{
        role: 'user',
        content: [
          { type: 'text' as const, text: nguoiDungChu(canXem.length) },
          ...canXem.flatMap((data, i) => ([
            { type: 'text' as const, text: `Frame index ${i}:` },
            anhBase64(data),
          ])),
        ],
      }],
    })

    const json = await docKetQua(stream)
    if (!json) { ngheLoi?.('cau tra loi rong hoac bi cat vi max_tokens'); return null }
    const ra = KetQuaChu.parse(JSON.parse(json)).khung
    return ra.length ? ra : null
  } catch (err) {
    if (coTheThuLai(err) && lan < 3) {
      await new Promise(r => setTimeout(r, lan * 1500))
      return judgeTextStyle(khung, ngheLoi, lan + 1)
    }
    ngheLoi?.(err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300))
    return null
  }
}
