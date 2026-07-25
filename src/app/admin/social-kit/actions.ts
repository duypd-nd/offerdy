'use server'

import { writeClient } from '@/sanity/writeClient'
import {
  generateCaptions, fillPlaceholders,
  type CaptionAngle, type CaptionPlatform, type CaptionDealInput, type Persona,
} from '@/lib/ai/generateCaption'
import type { LinkStyle } from '@/lib/socialCaption'

export type GeneratedCaption = { text: string; hashtags: string[]; suggestedTag: string }

export type WeekItem = {
  code: number
  title: string
  imageUrl?: string
  angle: CaptionAngle
  caption: string
  suggestedTag: string
  imageUrlFeed: string
  shortUrl: string
}

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

// Xoay vong goc cho ca tuan. Bay bai lien tiep cung mot goc thi feed doc rat don
// dieu — va quan trong hon la khong so sanh duoc goc nao hieu qua, vi khong co gi
// de so. Xoay het luot roi lap lai.
const WEEK_ANGLES: CaptionAngle[] = ['price', 'problem', 'whofor', 'compare', 'question']

/**
 * Soan ca tuan trong mot phien: N deal -> N caption + nhan + link + anh.
 *
 * Nut that cua mot nguoi lam mot minh la THOI GIAN ngoi soan, khong phai chat luong
 * tung caption. Gop lai mot lan giu nguyen so lan goi AI nhung bo duoc chi phi
 * chuyen ngu canh giua cac lan.
 *
 * Uu tien deal LAU CHUA DANG nhat (`lastPostedAt` cu nhat truoc, chua tung dang thi
 * len dau) — khong phai deal moi nhap gan nhat. Nho vay ca danh muc duoc luan phien
 * thay vi vai san pham bi dang di dang lai.
 */
export async function generateWeekPlan(input: {
  count: number
  platform: CaptionPlatform
  style: LinkStyle
}): Promise<{ ok: true; items: WeekItem[]; skipped: string[] } | { ok: false; error: string }> {
  try {
    const count = Math.min(Math.max(input.count, 1), 7)
    const [deals, persona] = await Promise.all([
      writeClient.fetch<(CaptionDealInput & { imageUrl?: string })[]>(
        `*[_type == "deal" && defined(code)]
         | order(coalesce(lastPostedAt, "1970-01-01") asc, code desc)[0...$count]{
          code, title, priceSale, priceOrig, discount, discountByAmount,
          "slug": slug.current, "categoryName": category->name,
          "imageUrl": image.asset->url
        }`,
        { count }
      ),
      writeClient.fetch<Persona | null>(`*[_type == "configPersona"][0]{
        creatorName, bio, audience, contentPillars, toneNotes, avoidWords
      }`),
    ])
    if (!deals?.length) return { ok: false, error: 'Chưa có deal nào có mã' }

    const items: WeekItem[] = []
    const skipped: string[] = []

    // Tuan tu chu khong song song: goi song song 7 lan de dinh rate limit cua
    // Anthropic, va mot loi 429 giua chung se lam hong ca me.
    for (let i = 0; i < deals.length; i++) {
      const deal = deals[i]
      const angle = WEEK_ANGLES[i % WEEK_ANGLES.length]
      const campaign = `${deal.code}-${input.platform.slice(0, 2)}${angle}`
      try {
        const { variants } = await generateCaptions({
          deal, angle, count: 1, persona: persona ?? {}, platform: input.platform,
        })
        const v = variants[0]
        if (!v) { skipped.push(`#${deal.code} — không có bản nào qua kiểm tra`); continue }
        items.push({
          code: deal.code,
          title: deal.title,
          imageUrl: deal.imageUrl,
          angle,
          caption: fillPlaceholders(
            [v.hook, '', v.body, '', v.cta, '', v.hashtags.map(h => `#${h}`).join(' ')].join('\n'),
            deal,
            { style: input.style, campaign }
          ),
          suggestedTag: campaign,
          imageUrlFeed: `/admin/social-kit/image/${deal.code}?format=feed`,
          shortUrl: `https://www.offerdy.com/${input.style === 'go' ? 'g' : 'd'}/${deal.code}?s=${campaign}`,
        })
      } catch (e) {
        // Mot deal hong khong duoc lam hong ca tuan — ghi lai roi di tiep.
        skipped.push(`#${deal.code} — ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    return { ok: true, items, skipped }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Danh dau da soan bai cho cac deal nay, de lan sau uu tien deal khac. */
export async function markDealsPosted(codes: number[]): Promise<{ ok: boolean }> {
  try {
    const ids = await writeClient.fetch<string[]>(
      `*[_type == "deal" && code in $codes]._id`, { codes }
    )
    const now = new Date().toISOString()
    await Promise.all(ids.map(id => writeClient.patch(id).set({ lastPostedAt: now }).commit()))
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
