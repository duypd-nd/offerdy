import type { AITask, EnvLike, ProviderName } from './types'

/**
 * Nha cung cap nao, model nao, theo thu tu nao.
 *
 * ⚠️ THU TU MAC DINH LAY TU PHEP DO THAT, khong phai tu cam giac. Do 2026-08-27,
 * cung mot system prompt + prompt + schema that cua `generateOfferContent`, chi
 * doi model:
 *
 *   groq/qwen3.8-27b        581ms   khong bia
 *   groq/gpt-oss-20b        713ms   khong bia
 *   groq/gpt-oss-120b      1121ms   khong bia
 *   gemini-3.5-flash-lite  1428ms   khong bia
 *   gemini-3.6-flash       4302ms   khong bia
 *   openrouter/nemotron    6472ms   khong bia
 *   openrouter/dots-3     17578ms   khong bia
 *
 * 📌 Va mot ket qua **lat nguoc gia dinh**: o vong do dau tien toi dua OpenRouter
 * mot system prompt rut gon, no bia ra "hand-forged Japanese steel", "mirror
 * finish" — toi da suyt ket luan "model mien phi hay bia". Chay lai voi DUNG
 * system prompt cua du an thi **ca 8 model deu khong bia mot chu nao**. Thu chan
 * bia dat la CAI PROMPT, khong phai cai model. Dung doi prompt roi so hai lan chay.
 *
 * ⚠️ n=1 moi model. Du de chon thu tu mac dinh, KHONG du de ket luan chac. Vi the
 * thu tu nay doi duoc bang bien moi truong, khong ghi cung.
 */

export type CauHinhNha = {
  name: ProviderName
  model: string
  /** Khoa API, va khoa du phong de xoay vong khi het han muc free tier. */
  keys: string[]
}

/**
 * ⚠️ Ten model phai la ten **goi duoc**, khong phai ten `ListModels` tra ve.
 * Do 2026-08-27: `GET /v1beta/models` liet ke `gemini-2.5-flash` va
 * `gemini-2.5-flash-lite`, nhung `:generateContent` tra 404 cho ca hai —
 * "no longer available to new users". Chinh thong bao loi chi ra ten dung.
 * Danh sach model noi mot dang, lenh goi noi mot dang khac.
 */
const MODEL_MAC_DINH: Record<ProviderName, string> = {
  groq: 'openai/gpt-oss-20b',
  gemini: 'gemini-3.5-flash-lite',
  openrouter: 'nvidia/nemotron-3-super-120b-a12b:free',
  anthropic: 'claude-sonnet-5',
}

const THU_TU_MAC_DINH: ProviderName[] = ['groq', 'gemini', 'openrouter', 'anthropic']

const KHOA_ENV: Record<ProviderName, string[]> = {
  groq: ['GROQ_API_KEY', 'GROQ_API_KEY_2'],
  gemini: ['GEMINI_API_KEY', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3', 'GEMINI_API_KEY_4', 'GEMINI_API_KEY_5'],
  openrouter: ['OPENROUTER_API_KEY', 'OPENROUTER_API_KEY_2'],
  anthropic: ['ANTHROPIC_API_KEY'],
}

const TEN_HOP_LE = new Set<string>(THU_TU_MAC_DINH)

/**
 * Thu tu uu tien. `AI_PROVIDER_ORDER=groq,gemini,anthropic` de doi.
 * Ten khong hop le bi bo qua chu khong lam sap — mot o cau hinh go nham khong
 * duoc phep lam ca trang thoi sinh noi dung.
 */
export function thuTuNha(env: EnvLike = process.env): ProviderName[] {
  const raw = env.AI_PROVIDER_ORDER?.trim()
  if (!raw) return [...THU_TU_MAC_DINH]
  const ra = raw.split(',').map(s => s.trim().toLowerCase()).filter(s => TEN_HOP_LE.has(s)) as ProviderName[]
  return ra.length ? [...new Set(ra)] : [...THU_TU_MAC_DINH]
}

/**
 * Viec nao bat buoc dung nha nao. Mac dinh: khong ep gi ca.
 * `AI_TASK_PROVIDER_daily_report=anthropic` -> viec `daily-report` chi dung Claude.
 */
export function nhaEpChoViec(task: AITask, env: EnvLike = process.env): ProviderName | undefined {
  const khoa = `AI_TASK_PROVIDER_${task.replace(/-/g, '_')}`
  const v = env[khoa]?.trim().toLowerCase()
  return v && TEN_HOP_LE.has(v) ? (v as ProviderName) : undefined
}

export function modelCuaNha(p: ProviderName, env: EnvLike = process.env): string {
  const khoa = `AI_MODEL_${p.toUpperCase()}`
  return env[khoa]?.trim() || MODEL_MAC_DINH[p]
}

/**
 * Thoi han cho MOT lan goi mot nha, tinh ca luc doc than tra ve.
 * `AI_TIMEOUT_MS` chu yeu de test do duoc hang rao nay ma khong phai cho 30 giay.
 */
export function docTimeoutMs(env: EnvLike = process.env): number {
  const n = Number(env.AI_TIMEOUT_MS)
  return Number.isFinite(n) && n > 0 ? n : 30_000
}

/**
 * TEN cac bien moi truong cho khoa cua mot nha — **khong phai gia tri**.
 * Dung de bao "thieu khoa nao" ma khong lo ro khoa ra log/Sentry.
 */
export function tenBienKhoa(p: ProviderName): string[] {
  return [...KHOA_ENV[p]]
}

/** Moi khoa API con dung duoc cua mot nha, theo thu tu. Rong = nha do khong ton tai. */
export function khoaCuaNha(p: ProviderName, env: EnvLike = process.env): string[] {
  return KHOA_ENV[p].map(k => env[k]?.trim()).filter((v): v is string => Boolean(v))
}

export function cauHinhNha(p: ProviderName, env: EnvLike = process.env): CauHinhNha {
  return { name: p, model: modelCuaNha(p, env), keys: khoaCuaNha(p, env) }
}

export { MODEL_MAC_DINH, THU_TU_MAC_DINH }
