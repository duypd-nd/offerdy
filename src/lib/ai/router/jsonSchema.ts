import { z } from 'zod'

/**
 * Doi schema Zod sang JSON Schema cho tung nha cung cap.
 *
 * Zod 4 co san `z.toJSONSchema()` — khong can them thu vien nao. Dau ra giu ca
 * `.describe()` cua tung truong, va do la thu quyet dinh chat luong: bo mo ta di
 * thi model doan y nghia truong theo ten bien.
 */

/** Hinh JSON Schema toi thieu ma ta thuc su dung o day. */
export type JsonSchemaObject = {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
  additionalProperties?: boolean
  $schema?: string
}

/**
 * Dang OpenAI-compatible (Groq, OpenRouter). Do that 2026-08-27: dau ra tho cua
 * `z.toJSONSchema()` **dung nguyen** duoc voi `strict: true` — ca 6 model thu deu
 * tra dung hinh. Khong phai cat got gi.
 */
export function schemaChoOpenAI(schema: z.ZodType): JsonSchemaObject {
  return z.toJSONSchema(schema) as JsonSchemaObject
}

/**
 * Dang Gemini. Gemini nhan mot **tap con cua OpenAPI 3.0**, khong phai JSON
 * Schema day du — `$schema` va `additionalProperties` lam no tra 400.
 *
 * ⚠️ Phai don o CA hai tang: goc va tung thuoc tinh. Bo sot o tang trong thi loi
 * hien ra o goc va rat de doc nham thanh "schema qua phuc tap".
 */
export function schemaChoGemini(schema: z.ZodType): Record<string, unknown> {
  return donGemini(z.toJSONSchema(schema) as Record<string, unknown>)
}

const KHOA_GEMINI_KHONG_HIEU = ['$schema', 'additionalProperties', 'const', 'examples', 'default'] as const

function donGemini(node: unknown): Record<string, unknown> {
  if (Array.isArray(node)) {
    return node.map(donGemini) as unknown as Record<string, unknown>
  }
  if (node === null || typeof node !== 'object') {
    return node as Record<string, unknown>
  }
  const ra: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if ((KHOA_GEMINI_KHONG_HIEU as readonly string[]).includes(k)) continue
    ra[k] = v !== null && typeof v === 'object' ? donGemini(v) : v
  }
  return ra
}
