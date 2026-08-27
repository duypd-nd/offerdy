import type { z } from 'zod'
import { AIProviderError, type AIProvider, type AIRequest, type AIResult, type EnvLike } from '../types'
import { schemaChoGemini } from '../jsonSchema'
import { cauHinhNha, docTimeoutMs } from '../registry'

/**
 * Gemini — hinh rieng, khong phai OpenAI-compatible.
 *
 * Ba khac biet da do that 2026-08-27:
 *   1. Xac thuc bang `?key=` tren URL (khoa dang `AQ.…` cua du an nay chay duoc
 *      voi dang nay), khong phai header Bearer.
 *   2. System prompt di trong `systemInstruction`, khong phai mot message role.
 *   3. Schema phai la tap con OpenAPI — xem `schemaChoGemini()`.
 *
 * ⚠️ `thinkingConfig: { thinkingBudget: 0 }` tra **HTTP 400** tren
 * `gemini-3.6-flash`: khong tat thinking duoc. Nen dung dat tran token sat sao
 * cho model co thinking — thinking an vao chung mot ngan sach.
 */


export function taoNhaGemini(env: EnvLike = process.env): AIProvider {
  return {
    name: 'gemini',
    isAvailable: () => cauHinhNha('gemini', env).keys.length > 0,
    model: () => cauHinhNha('gemini', env).model,

    async generate<T extends z.ZodType>(req: AIRequest<T>): Promise<AIResult<z.infer<T>>> {
      const { model, keys } = cauHinhNha('gemini', env)
      if (!keys.length) throw new AIProviderError('auth', 'gemini', 'gemini: khong co khoa API')

      let loiCuoi: AIProviderError | undefined
      for (const key of keys) {
        try {
          return await goiMot(key, model, req, env)
        } catch (e) {
          const err = e instanceof AIProviderError ? e : new AIProviderError('retryable', 'gemini', String(e))
          loiCuoi = err
          if (err.loai !== 'retryable' && err.loai !== 'auth') throw err
        }
      }
      throw loiCuoi ?? new AIProviderError('retryable', 'gemini', 'gemini: het khoa de thu')
    },
  }
}

async function goiMot<T extends z.ZodType>(
  key: string,
  model: string,
  req: AIRequest<T>,
  env: EnvLike,
): Promise<AIResult<z.infer<T>>> {
  const t0 = Date.now()
  const ac = new AbortController()
  // Cung ly do voi `openaiCompat.ts`: dong ho phai song den khi doc xong than.
  // O day loi chua kip lo ra vi Gemini khong tra header som nhu API sinh chu
  // dang stream — nhung do la may, khong phai thiet ke.
  const hetGio = setTimeout(() => ac.abort(), docTimeoutMs(env))

  let res: Response
  let raw: string
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        signal: ac.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: schemaChoGemini(req.schema),
            maxOutputTokens: req.maxTokens,
          },
        }),
      },
    )
    raw = await res.text()
  } catch (e) {
    throw new AIProviderError('retryable', 'gemini', `mang/timeout: ${String(e)}`)
  } finally {
    clearTimeout(hetGio)
  }

  if (!res.ok) {
    const loai = res.status === 401 || res.status === 403 ? 'auth' : 'retryable'
    throw new AIProviderError(loai, 'gemini', `HTTP ${res.status}: ${raw.slice(0, 200)}`, res.status)
  }

  let body: unknown
  try { body = JSON.parse(raw) } catch { throw new AIProviderError('invalid-output', 'gemini', 'than tra ve khong phai JSON') }

  const txt = docText(body)
  if (!txt) {
    // Khong co chu thuong la bi cat vi tran token (thinking an het) — dung ho
    // bay da tra gia voi Claude. Bao la `invalid-output` de router doi nha khac.
    throw new AIProviderError('invalid-output', 'gemini', `khong co text (finishReason=${docFinish(body)})`)
  }

  let doiTuong: unknown
  try { doiTuong = JSON.parse(txt) } catch { throw new AIProviderError('invalid-output', 'gemini', 'noi dung khong phai JSON (co the bi cat)') }
  const kq = req.schema.safeParse(doiTuong)
  if (!kq.success) throw new AIProviderError('invalid-output', 'gemini', `sai schema: ${JSON.stringify(kq.error.issues).slice(0, 200)}`)

  const u = docUsage(body)
  return {
    data: kq.data as z.infer<T>,
    provider: 'gemini',
    model,
    latencyMs: Date.now() - t0,
    inputTokens: u.prompt,
    outputTokens: u.candidates,
  }
}

type GeminiBody = {
  candidates?: { content?: { parts?: { text?: unknown }[] }; finishReason?: unknown }[]
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}

function docText(body: unknown): string | undefined {
  const c = (body as GeminiBody)?.candidates?.[0]?.content?.parts?.[0]?.text
  return typeof c === 'string' && c.trim() !== '' ? c : undefined
}

function docFinish(body: unknown): string {
  return String((body as GeminiBody)?.candidates?.[0]?.finishReason ?? 'khong ro')
}

function docUsage(body: unknown): { prompt?: number; candidates?: number } {
  const u = (body as GeminiBody)?.usageMetadata
  return { prompt: u?.promptTokenCount, candidates: u?.candidatesTokenCount }
}
