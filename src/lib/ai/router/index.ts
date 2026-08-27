import type { z } from 'zod'
import {
  AIProviderError,
  type AIProvider,
  type AIRequest,
  type AIResult,
  type ProviderName,
  type EnvLike,
} from './types'
import { nhaEpChoViec, tenBienKhoa, thuTuNha } from './registry'
import { dangNghi, ghiHong, ghiThanhCong } from './breaker'
import { conNganSach, docNganSachTuEnv, ghiDaGoiTraPhi, laTraPhi } from './budget'
import { taoNhaOpenAI } from './providers/openaiCompat'
import { taoNhaGemini } from './providers/gemini'
import { taoNhaAnthropic } from './providers/anthropic'

export * from './types'

/**
 * Bo dinh tuyen: thu nha re truoc, roi moi toi nha tinh tien.
 *
 * ⚠️ TINH CHAT QUAN TRONG NHAT: **khong co khoa mien phi thi hanh vi y het truoc
 * ngay 27/08.** Nha nao khong co khoa se `isAvailable() === false` va bi bo qua
 * lang le, nen router roi thang xuong Claude — dung cach 5 generator van chay
 * bay lau nay. Nho vay ban va nay kiem duoc ngay ca khi chua dang ky API nao.
 */

/**
 * ⚠️ Moi factory phai NHAN `env`, khong duoc tu doc `process.env`.
 * Do that 27/08: luc dau adapter tu doc `process.env`, nen `AI_MODEL_GROQ`
 * truyen vao `generateStructured(req, env)` **khong co tac dung gi** — mot co
 * cau hinh vo hieu trong im lang. Ca 20 test luc do van xanh, vi chung dung nha
 * GIA nen khong he cham vao phan doc cau hinh. Chi lan chay that moi lo ra.
 */
const KHO: Record<ProviderName, (env: EnvLike) => AIProvider> = {
  groq: env => taoNhaOpenAI('groq', env),
  gemini: env => taoNhaGemini(env),
  openrouter: env => taoNhaOpenAI('openrouter', env),
  anthropic: env => taoNhaAnthropic(env),
}

export type LogRouter = {
  task: string
  provider: ProviderName
  model: string
  ok: boolean
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
  loai?: string
  loi?: string
}

/** Nghe log de day sang Sentry/bao cao. Mac dinh in mot dong co cau truc. */
let nghe: (l: LogRouter) => void = l => {
  const phan = [
    `[ai] task=${l.task}`,
    `provider=${l.provider}`,
    `model=${l.model}`,
    `ok=${l.ok}`,
    `ms=${l.latencyMs}`,
    l.inputTokens !== undefined ? `in=${l.inputTokens}` : '',
    l.outputTokens !== undefined ? `out=${l.outputTokens}` : '',
    l.loai ? `loai=${l.loai}` : '',
    // ⚠️ Chi ghi thong bao loi. KHONG bao gio ghi prompt, noi dung sinh ra, hay khoa API.
    l.loi ? `loi=${JSON.stringify(l.loi.slice(0, 200))}` : '',
  ].filter(Boolean)
  console.log(phan.join(' '))
}

export function datBoNgheLog(f: (l: LogRouter) => void): void { nghe = f }

export class KhongCoNhaNaoError extends Error {
  constructor(readonly chiTiet: { provider: ProviderName; loai: string; loi: string }[]) {
    super(
      chiTiet.length
        ? `Moi nha cung cap AI deu hong: ${chiTiet.map(c => `${c.provider}(${c.loai})`).join(', ')}`
        : 'Khong co nha cung cap AI nao kha dung (thieu khoa API?)',
    )
    this.name = 'KhongCoNhaNaoError'
  }
}

/**
 * Sinh mot object dung schema. Thu lan luot theo thu tu uu tien.
 *
 * Chuyen nha khi: `retryable` (429/5xx/timeout), `auth` (khoa hong/het credit),
 * `invalid-output` (tra sai hinh hoac bi cat).
 * KHONG chuyen nha khi `fatal` — do la loi cua chinh ta, doi nha khong chua duoc.
 */
export async function generateStructured<T extends z.ZodType>(
  req: AIRequest<T>,
  env: EnvLike = process.env,
  // Chi test moi truyen `kho`: de thay nha that bang nha gia. Khong co no thi
  // moi phep thu fallback deu phai goi API that — cham, ton han muc, va ket qua
  // phu thuoc mang.
  kho: Partial<Record<ProviderName, (env: EnvLike) => AIProvider>> = KHO,
): Promise<AIResult<z.infer<T>>> {
  const ep = nhaEpChoViec(req.task, env)
  const thuTu = ep ? [ep] : thuTuNha(env)
  const nganSach = docNganSachTuEnv(env)
  const chiTiet: { provider: ProviderName; loai: string; loi: string }[] = []

  for (const ten of thuTu) {
    const tao = kho[ten]
    if (!tao) continue
    const nha = tao(env)
    // ⚠️ Nha thieu khoa van phai duoc GHI LAI, du no bi bo qua lang le. Do that
    // sang 27/08 tren production: cron chet voi thong diep `anthropic(auth)` —
    // dung MOT ten — nen no trong y het nhu site chi co mot nha cung cap, trong
    // khi su that la ba nha mien phi bi bo qua vi Vercel chua co khoa. Phai mo
    // code ra doc moi biet. Bo qua lang le thi dung; **bao cao** lang le thi khong.
    if (!nha.isAvailable()) {
      chiTiet.push({ provider: ten, loai: 'thieu-khoa', loi: `chua co ${tenBienKhoa(ten).join(' hoac ')}` })
      continue
    }

    if (dangNghi(ten)) {
      chiTiet.push({ provider: ten, loai: 'cau-dao', loi: 'dang nghi sau nhieu lan hong' })
      continue
    }

    // ⚠️ Hang rao ngan sach dat NGAY TRUOC lan goi tra phi, khong phai o dau ham:
    // no chi duoc chan khi ta thuc su sap tieu tien.
    if (laTraPhi(ten) && !conNganSach(nganSach)) {
      chiTiet.push({ provider: ten, loai: 'het-ngan-sach', loi: `da dung het ${nganSach.soLanToiDa} lan goi tra phi` })
      continue
    }

    const t0 = Date.now()
    try {
      if (laTraPhi(ten)) ghiDaGoiTraPhi()
      const kq = await nha.generate(req)
      ghiThanhCong(ten)
      nghe({
        task: req.task, provider: ten, model: kq.model, ok: true,
        latencyMs: kq.latencyMs, inputTokens: kq.inputTokens, outputTokens: kq.outputTokens,
      })
      return kq
    } catch (e) {
      const err = e instanceof AIProviderError ? e : new AIProviderError('retryable', ten, String(e))
      nghe({ task: req.task, provider: ten, model: nha.model(), ok: false, latencyMs: Date.now() - t0, loai: err.loai, loi: err.message })
      chiTiet.push({ provider: ten, loai: err.loai, loi: err.message })

      // `auth` la thieu/hong cau hinh, khong phai nha do dang chap chon — dem no
      // vao cau dao se lam mot khoa go nham trong nhu mot su co tam thoi.
      if (err.loai !== 'auth') ghiHong(ten)
      if (err.loai === 'fatal') throw err
    }
  }

  throw new KhongCoNhaNaoError(chiTiet)
}
