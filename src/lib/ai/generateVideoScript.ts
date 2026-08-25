import { z } from 'zod'
import { fillSiteName } from '@/lib/siteNameToken'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { getAnthropicClient } from '@/lib/ai/anthropicClient'
import { HE_THONG, nguoiDung } from '@/lib/ai/prompts/videoScript'

/**
 * AI viet loi doc cho video san pham.
 *
 * ── VI SAO CAN ─────────────────────────────────────────────────────
 *
 * Ban dau loi doc la mau cau co dinh ("The set comes with everything you need"),
 * nen MOI san pham noi giong het nhau — mot cai tui va mot bo ly ruou nghe y
 * nhu nhau. Do la thu khien video vo dung: nguoi xem luot qua vi khong co gi
 * lien quan den chinh mon do ho dang nhin.
 *
 * ── LUAT KHONG DUOC PHA ────────────────────────────────────────────
 *
 * ⚠️ AI chi duoc dung so trong `suThatDaKiemChung`. Gia, % giam, ma coupon deu
 * do code tinh tu kho roi noi them vao SAU — khong nam trong tay model. Canh
 * "social proof" chi ton tai khi co diem danh gia THAT tu JSON-LD cua trang.
 *
 * Day khong phai than trong thua: du an nay tung hien "Save €5000" cho mot san
 * pham €199,99 vi mot bo doc gia sai, va co han mot luat "khong bia noi dung
 * marketing". Mot video doc len mot con so khong co that la thu te nhat trong
 * ca he thong — no di ra ngoai, khong sua lai duoc.
 */

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5'

const BeatSchema = z.object({
  type: z.enum(['hook', 'problem', 'product', 'benefit', 'socialProof']),
  /** Cau doc len. 8-20 tu. */
  voiceText: z.string(),
  /** 2-4 tu, IN HOA, doc duoc trong mot cai liec tren dien thoai. */
  overlayText: z.string(),
})

const ScriptSchema = z.object({
  beats: z.array(BeatSchema),
})

export type Beat = z.infer<typeof BeatSchema>

export type VideoScriptInput = {
  ten: string
  shop: string
  moTa?: string | null
  giayMucTieu: number
  suThatDaKiemChung: string[]
  rating?: number
  reviewCount?: number
}

const MAX_LAN = 3

function coTheThuLai(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const s = (err as { status?: number }).status
    if (s && [429, 500, 502, 503, 529].includes(s)) return true
  }
  if (err instanceof SyntaxError) return true
  if (err && typeof err === 'object' && 'issues' in err) return true // ZodError
  return false
}

/**
 * ⚠️ `siteName` la THAM SO chu khong phai mot lan doc Sanity ngay tai day.
 * Cac module trong `lib/ai/` duoc bo chay test nap bang Node THUAN — import
 * `@/sanity/queries` keo theo `next/cache` va lam vo 3 tep test (aiTells,
 * articleGuards, videoScriptGuard) vi `generateArticleContent` import gian tiep
 * qua `generateReviewContent`. Noi goi (server action / route) tu hoi ten.
 */
export async function generateVideoScript(input: VideoScriptInput, siteName: string, lan = 1): Promise<Beat[]> {
  try {
    // ⚠️ Streaming + tu parse, KHONG dung `messages.parse` — chep nguyen cach chua
    // cua `generateReviewContent.ts`:
    //   (1) `max_tokens` chan thinking + chu CONG LAI. Dat thap thi model dot sach
    //       ngan sach vao thinking roi bi cat, tra ve KHONG MOT CHU NAO. Tran cao
    //       khong ton them tien — chi tinh theo token that dung.
    //   (2) `messages.parse` parse TRUOC khi ta doc duoc `stop_reason`, nen hang
    //       rao "bi cat" ben duoi se khong bao gio chay toi.
    const stream = getAnthropicClient().messages.stream({
      model: MODEL,
      max_tokens: 64000,
      system: fillSiteName(HE_THONG, siteName),
      output_config: { format: zodOutputFormat(ScriptSchema) },
      messages: [{ role: 'user', content: nguoiDung(input) }],
    })
    const res = await stream.finalMessage()

    if (res.stop_reason === 'max_tokens') {
      throw new Error('Kich ban bi cat giua chung (stop_reason=max_tokens) — khong dung duoc')
    }
    let json = ''
    for (const b of res.content) if (b.type === 'text') json += b.text
    if (!json) throw new Error(`AI khong tra ve gi (stop_reason=${res.stop_reason})`)

    const beats = ScriptSchema.parse(JSON.parse(json)).beats
    kiemTraKichBan(beats, input)
    return beats
  } catch (err) {
    if (coTheThuLai(err) && lan < MAX_LAN) {
      await new Promise(r => setTimeout(r, lan * 1500))
      return generateVideoScript(input, siteName, lan + 1)
    }
    throw err
  }
}

/**
 * Hang rao chay TREN dau ra cua AI.
 *
 * ⚠️ Loi cung, khong phai canh bao. Mot cau bia so di ra video thi khong go lai
 * duoc — video da dang len TikTok roi. Tha dung lai va bat nguoi dung bam lai
 * mot lan.
 */
export function kiemTraKichBan(beats: Beat[], input: VideoScriptInput): void {
  const loi: string[] = []
  if (!beats.length) loi.push('Khong co nhip nao')

  const coDanhGia = input.rating !== undefined && input.reviewCount !== undefined
  if (!coDanhGia && beats.some(b => b.type === 'socialProof')) {
    loi.push('AI viet nhip social proof trong khi san pham KHONG co danh gia that')
  }

  for (const b of beats) {
    const t = b.voiceText.trim()
    if (!t) { loi.push(`Nhip ${b.type} khong co loi doc`); continue }

    // ⚠️ Bat MOI con so trong loi doc, roi doi chieu voi cac so co that. Model
    // duoc dan la khong duoc bia so, nhung "duoc dan" khong phai "khong xay ra".
    const soTrongCau = t.match(/\d+(?:[.,]\d+)?/g) ?? []
    if (soTrongCau.length) {
      const soThat = new Set<string>()
      for (const f of input.suThatDaKiemChung) for (const s of f.match(/\d+(?:[.,]\d+)?/g) ?? []) soThat.add(s)
      if (input.rating !== undefined) soThat.add(String(input.rating))
      if (input.reviewCount !== undefined) soThat.add(String(input.reviewCount))
      const bia = soTrongCau.filter(s => !soThat.has(s))
      if (bia.length) loi.push(`Nhip ${b.type} co so khong nam trong su that da kiem chung: ${bia.join(', ')} — "${t.slice(0, 70)}"`)
    }

    if (/\d+\s*%/.test(t) && !input.suThatDaKiemChung.some(f => /%/.test(f))) {
      loi.push(`Nhip ${b.type} noi ve phan tram trong khi khong co so giam gia nao`)
    }
    if (t.length > 200) loi.push(`Nhip ${b.type} dai qua (${t.length} ky tu)`)
    if (!b.overlayText.trim()) loi.push(`Nhip ${b.type} khong co chu tren man`)
  }

  if (loi.length) throw new Error('Kich ban AI khong dat:\n- ' + loi.join('\n- '))
}
