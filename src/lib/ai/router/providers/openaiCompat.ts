import type { z } from 'zod'
import { AIProviderError, type AIProvider, type AIRequest, type AIResult, type EnvLike, type ProviderName } from '../types'
import { schemaChoOpenAI } from '../jsonSchema'
import { cauHinhNha } from '../registry'

/**
 * Groq va OpenRouter dung CHUNG mot hinh (OpenAI chat completions), nen chung
 * mot adapter. Do that 2026-08-27: dau ra tho cua `z.toJSONSchema()` dung nguyen
 * duoc voi `response_format: { type: 'json_schema', strict: true }` — ca
 * gpt-oss-20b, gpt-oss-120b, qwen3.8-27b va 3 model mien phi cua OpenRouter deu
 * tra dung hinh, khong phai cat got schema.
 */

type CauHinhOAI = {
  name: ProviderName
  url: string
  /** Header rieng — OpenRouter khuyen khai bao ung dung goi. */
  headerThem?: Record<string, string>
}

const NHA: Record<'groq' | 'openrouter', CauHinhOAI> = {
  groq: { name: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions' },
  openrouter: {
    name: 'openrouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    headerThem: { 'HTTP-Referer': 'https://www.offerdy.com', 'X-Title': 'Offerdy' },
  },
}

const TIMEOUT_MS = 30_000

export function taoNhaOpenAI(ten: 'groq' | 'openrouter', env: EnvLike = process.env): AIProvider {
  const cfg = NHA[ten]
  return {
    name: cfg.name,
    isAvailable: () => cauHinhNha(cfg.name, env).keys.length > 0,
    model: () => cauHinhNha(cfg.name, env).model,

    async generate<T extends z.ZodType>(req: AIRequest<T>): Promise<AIResult<z.infer<T>>> {
      const { model, keys } = cauHinhNha(cfg.name, env)
      if (!keys.length) throw new AIProviderError('auth', cfg.name, `${cfg.name}: khong co khoa API`)

      let loiCuoi: AIProviderError | undefined
      // Xoay vong khoa: free tier tinh han muc theo TUNG khoa, nen khoa thu hai
      // la mot nguon han muc that su khac, khong phai ban sao du phong.
      for (const key of keys) {
        try {
          return await goiMot(cfg, key, model, req)
        } catch (e) {
          const err = e instanceof AIProviderError ? e : new AIProviderError('retryable', cfg.name, String(e))
          loiCuoi = err
          // Chi doi sang khoa khac khi ly do LA han muc/xac thuc cua chinh khoa do.
          if (err.loai !== 'retryable' && err.loai !== 'auth') throw err
        }
      }
      throw loiCuoi ?? new AIProviderError('retryable', cfg.name, `${cfg.name}: het khoa de thu`)
    },
  }
}

async function goiMot<T extends z.ZodType>(
  cfg: CauHinhOAI,
  key: string,
  model: string,
  req: AIRequest<T>,
): Promise<AIResult<z.infer<T>>> {
  const t0 = Date.now()
  const ac = new AbortController()
  const hetGio = setTimeout(() => ac.abort(), TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(cfg.url, {
      method: 'POST',
      signal: ac.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        ...cfg.headerThem,
      },
      body: JSON.stringify({
        model,
        max_tokens: req.maxTokens,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: req.task.replace(/-/g, '_'), strict: true, schema: schemaChoOpenAI(req.schema) },
        },
      }),
    })
  } catch (e) {
    throw new AIProviderError('retryable', cfg.name, `mang/timeout: ${String(e)}`)
  } finally {
    clearTimeout(hetGio)
  }

  const raw = await res.text()
  if (!res.ok) {
    // 401/403 la khoa hong -> thu khoa khac cung nha. 429/5xx -> tam thoi.
    const loai = res.status === 401 || res.status === 403 ? 'auth' : 'retryable'
    throw new AIProviderError(loai, cfg.name, `HTTP ${res.status}: ${raw.slice(0, 200)}`, res.status)
  }

  let body: unknown
  try { body = JSON.parse(raw) } catch { throw new AIProviderError('invalid-output', cfg.name, 'than tra ve khong phai JSON') }

  const noiDung = docNoiDung(body)
  if (!noiDung) throw new AIProviderError('invalid-output', cfg.name, `khong co content: ${raw.slice(0, 200)}`)

  // ⚠️ Luon kiem lai bang chinh schema Zod. `strict: true` KHONG bao dam — do
  // 2026-08-27 co mot lan `gemini-3.6-flash` tra JSON cut giua chung. Doc dau ra
  // ma khong kiem la dung ho loi "bao thanh cong ma van hong".
  let doiTuong: unknown
  try { doiTuong = JSON.parse(noiDung) } catch { throw new AIProviderError('invalid-output', cfg.name, 'noi dung khong phai JSON (co the bi cat)') }
  const kq = req.schema.safeParse(doiTuong)
  if (!kq.success) throw new AIProviderError('invalid-output', cfg.name, `sai schema: ${JSON.stringify(kq.error.issues).slice(0, 200)}`)

  const usage = docUsage(body)
  return {
    data: kq.data as z.infer<T>,
    provider: cfg.name,
    model,
    latencyMs: Date.now() - t0,
    inputTokens: usage.prompt,
    outputTokens: usage.completion,
  }
}

function docNoiDung(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined
  const choices = (body as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return undefined
  const msg = (choices[0] as { message?: { content?: unknown } }).message
  return typeof msg?.content === 'string' ? msg.content : undefined
}

function docUsage(body: unknown): { prompt?: number; completion?: number } {
  if (typeof body !== 'object' || body === null) return {}
  const u = (body as { usage?: { prompt_tokens?: number; completion_tokens?: number } }).usage
  return { prompt: u?.prompt_tokens, completion: u?.completion_tokens }
}
