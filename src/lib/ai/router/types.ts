import type { z } from 'zod'

/**
 * Bo dinh tuyen nha cung cap AI — kieu dung chung.
 *
 * ⚠️ VI SAO CHI CO **MOT** KIEU GOI (`structured`), khong phai `generate()` tong quat.
 *
 * Doc 11 diem goi Anthropic dang co trong `src/lib/ai/` truoc khi thiet ke (2026-08-27).
 * Chung chia lam HAI khuon, va hai khuon do KHONG the gop:
 *
 *   A. `messages.parse` + `zodOutputFormat`  — 5 file: offer, deal, store, caption,
 *      daily-report. Viec ngan, tra ve mot object co schema.
 *
 *   B. `messages.stream` + `finalMessage()` + tu parse — 6 file: article, review,
 *      video script, judgeImages... Chu thich trong chinh cac file do ghi ro ly do,
 *      va ca hai deu la bay da tra gia:
 *        (1) `max_tokens` chan **thinking + chu cong lai**; do that: 3/3 lan chay o
 *            12000 tra ve 12.000 token thinking va KHONG MOT CHU NAO.
 *        (2) `messages.parse` parse TRUOC khi doc duoc `stop_reason`, nen hang rao
 *            chan bai bi cat thanh code chet.
 *
 * Gemini/Groq khong co `stop_reason` cung ngu nghia, khong co ngan sach thinking
 * tuong duong. Bat khuon B chay qua mot `AIProvider.generate()` chung la lam bay
 * hai hang rao tren — im lang. Nen router nay **chi phuc vu khuon A**, va khuon B
 * giu nguyen Claude. Do la gioi han co chu y, khong phai lam do dang.
 */

/** Loai viec. Quyet dinh nha cung cap nao duoc uu tien. */
export type AITask =
  | 'offer-content'
  | 'deal-content'
  | 'store-content'
  | 'caption'
  | 'daily-report'

/** Nha cung cap. Ten nay cung la khoa dung trong bien moi truong. */
export type ProviderName = 'gemini' | 'groq' | 'openrouter' | 'anthropic'

/** Nha cung cap nao tinh tien that. Budget guard chi chan nhung cai nay. */
export const PROVIDER_TRA_PHI: readonly ProviderName[] = ['anthropic']

export type AIRequest<T extends z.ZodType> = {
  task: AITask
  /** Schema Zod — vua de ep nha cung cap tra dung hinh, vua de kiem lai dau ra. */
  schema: T
  system: string
  prompt: string
  maxTokens: number
  /** Chi de ghi log/truy vet, khong bao gio la bi mat. */
  metadata?: Record<string, string | number | undefined>
}

export type AIResult<T> = {
  data: T
  provider: ProviderName
  model: string
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
}

/**
 * Vi sao mot lan goi hong. Router **chi chuyen nha cung cap khac** voi
 * `retryable`. Cac loai con lai la loi cua chinh minh — doi nha cung cap khong
 * chua duoc gi, chi tieu them han muc va che mat loi that.
 */
export type LoaiLoi =
  /** 429, het quota, 5xx, timeout, mang loi -> nen thu nha cung cap khac */
  | 'retryable'
  /** thieu/sai khoa API -> nha cung cap nay coi nhu khong ton tai */
  | 'auth'
  /** tra ve khong dung schema -> thu nha cung cap khac MOT lan, roi thoi */
  | 'invalid-output'
  /** loi cua ta: prompt hong, schema hong -> dung han, dung fallback */
  | 'fatal'

export class AIProviderError extends Error {
  constructor(
    readonly loai: LoaiLoi,
    readonly provider: ProviderName,
    message: string,
    readonly status?: number,
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}

export interface AIProvider {
  readonly name: ProviderName
  /** Co khoa API khong. Khong co khoa = khong ton tai, khong phai loi. */
  isAvailable(): boolean
  /** Ten model dang dung — de ghi log va hien o admin. */
  model(): string
  generate<T extends z.ZodType>(req: AIRequest<T>): Promise<AIResult<z.infer<T>>>
}

/** Chi can doc bien moi truong. `NodeJS.ProcessEnv` bat buoc `NODE_ENV` nen test
 *  khong dung mot env gia toi gian duoc — ma env gia toi gian moi la thu lam test
 *  doc duoc. */
export type EnvLike = Record<string, string | undefined>
