import type { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { getAnthropicClient } from '../../anthropicClient'
import { AIProviderError, type AIProvider, type AIRequest, type AIResult, type EnvLike } from '../types'
import { cauHinhNha } from '../registry'

/**
 * Claude — nha cuoi cung, va la nha DUY NHAT tinh tien.
 *
 * ⚠️ Adapter nay co y goi **y het** cach 5 generator dang goi truoc 27/08:
 * `messages.parse` + `zodOutputFormat` + doc `parsed_output`. Muc dich cua ca bo
 * router la them lua chon RE HON o phia truoc, khong phai doi cach goi Claude.
 * Neu doi luon cach goi thi khi co su co se khong con biet nguyen nhan nam o
 * router hay o chinh lan goi Claude.
 */

export function taoNhaAnthropic(env: EnvLike = process.env): AIProvider {
  return {
    name: 'anthropic',
    isAvailable: () => cauHinhNha('anthropic', env).keys.length > 0,
    model: () => cauHinhNha('anthropic', env).model,

    async generate<T extends z.ZodType>(req: AIRequest<T>): Promise<AIResult<z.infer<T>>> {
      const { model, keys } = cauHinhNha('anthropic', env)
      if (!keys.length) throw new AIProviderError('auth', 'anthropic', 'anthropic: khong co khoa API')

      const t0 = Date.now()
      try {
        const res = await getAnthropicClient().messages.parse({
          model,
          max_tokens: req.maxTokens,
          system: req.system,
          output_config: { format: zodOutputFormat(req.schema) },
          messages: [{ role: 'user', content: req.prompt }],
        })

        const parsed = res.parsed_output
        if (!parsed) {
          throw new AIProviderError('invalid-output', 'anthropic', `khong co parsed_output (stop_reason=${res.stop_reason})`)
        }
        return {
          data: parsed as z.infer<T>,
          provider: 'anthropic',
          model,
          latencyMs: Date.now() - t0,
          inputTokens: res.usage?.input_tokens,
          outputTokens: res.usage?.output_tokens,
        }
      } catch (e) {
        if (e instanceof AIProviderError) throw e
        throw new AIProviderError(phanLoai(e), 'anthropic', moTa(e), status(e))
      }
    },
  }
}

/**
 * ⚠️ Het credit KHONG phai loi tam thoi. Do that dem 26/08 tren production:
 * Anthropic tra **400** kem `"Your credit balance is too low"`. Coi no la
 * `retryable` thi ta se thu lai mot thu chac chan hong, con coi la `auth` thi
 * dung ngay — dung hon, va no cung la ly do bo router nay ra doi.
 */
function phanLoai(e: unknown): 'retryable' | 'auth' | 'invalid-output' {
  const s = status(e)
  const chu = moTa(e).toLowerCase()
  if (chu.includes('credit balance is too low')) return 'auth'
  if (s === 401 || s === 403) return 'auth'
  if (s === 429 || (typeof s === 'number' && s >= 500)) return 'retryable'
  if (chu.includes('timeout') || chu.includes('econn') || chu.includes('fetch failed')) return 'retryable'
  return 'invalid-output'
}

function status(e: unknown): number | undefined {
  const s = (e as { status?: unknown })?.status
  return typeof s === 'number' ? s : undefined
}

function moTa(e: unknown): string {
  if (e instanceof Error) return e.message
  return String(e)
}
