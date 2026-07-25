'use server'

import { writeClient } from '@/sanity/writeClient'
import {
  generateCaptions, fillPlaceholders,
  type CaptionAngle, type CaptionPlatform, type CaptionDealInput, type Persona,
} from '@/lib/ai/generateCaption'
import type { LinkStyle } from '@/lib/socialCaption'

export type GeneratedCaption = { text: string; hashtags: string[]; suggestedTag: string }

/**
 * Sinh caption bang AI cho mot deal.
 *
 * Di qua server action nen duoc Basic Auth cua /admin (proxy.ts) bao ve — khong can
 * them route API va khong phai sua matcher.
 *
 * Khong co hang doi duyet nhu Store/Offer/Deal: caption la thu dung mot lan cho mot
 * bai dang cu the, admin sua ngay tai cho roi copy. Dua vao hang doi chi them mot
 * buoc cho doi vo nghia.
 */
export async function generateCaptionsForDeal(input: {
  code: number
  angle: CaptionAngle
  platform: CaptionPlatform
  count: number
  style: LinkStyle
  campaign?: string
}): Promise<{ ok: true; captions: GeneratedCaption[]; rejected: string[] } | { ok: false; error: string }> {
  try {
    const [deal, persona] = await Promise.all([
      writeClient.fetch<CaptionDealInput | null>(
        `*[_type == "deal" && code == $code][0]{
          code, title, priceSale, priceOrig, discount, discountByAmount,
          "slug": slug.current, "categoryName": category->name
        }`,
        { code: input.code }
      ),
      writeClient.fetch<Persona | null>(`*[_type == "configPersona"][0]{
        creatorName, bio, audience, contentPillars, toneNotes, avoidWords
      }`),
    ])
    if (!deal) return { ok: false, error: `Không tìm thấy deal #${input.code}` }

    const { variants, rejected } = await generateCaptions({
      deal,
      angle: input.angle,
      platform: input.platform,
      count: Math.min(Math.max(input.count, 1), 5),
      persona: persona ?? {},
    })

    const captions = variants.map((v, i) => ({
      // Cho trong duoc thay bang so THAT o day, sau khi da qua kiem tra an toan.
      text: fillPlaceholders(
        [v.hook, '', v.body, '', v.cta, '', v.hashtags.map(h => `#${h}`).join(' ')].join('\n'),
        deal,
        { style: input.style, campaign: input.campaign }
      ),
      hashtags: v.hashtags,
      // Nhan goi y de moi bien the do duoc rieng: dat vao o "Nhãn bài đăng" thi bao
      // cao se tach duoc goc nao ra click. Xem muc "Chuyen doi theo nguon".
      suggestedTag: `${input.code}-${input.platform.slice(0,2)}${input.angle}${i > 0 ? String.fromCharCode(97 + i) : ''}`,
    }))

    return { ok: true, captions, rejected }
  } catch (e) {
    // Tra loi ra UI: loi o day thuong la het credit Anthropic hoac thieu API key,
    // dung nhung thu can nhin thay de sua.
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
