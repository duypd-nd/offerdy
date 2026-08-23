'use server'

import { writeClient } from '@/sanity/writeClient'
import { describeAiError } from '@/lib/ai/describeAiError'
import {
  generateCaptions, fillPlaceholders,
  type CaptionAngle, type CaptionPlatform, type CaptionDealInput, type Persona,
} from '@/lib/ai/generateCaption'
import type { LinkStyle } from '@/lib/socialCaption'
import { getDealCoupon } from '@/sanity/queries'
import { scrapeProductPage } from '@/lib/ai/scrapeProductPage'
import { requireAdmin } from '@/lib/adminSession'

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
          code, title, priceSale, priceOrig, discount, discountByAmount, dealUrl,
          "slug": slug.current, "categoryName": category->name
        }`,
        { code: input.code }
      ),
      writeClient.fetch<Persona | null>(`*[_type == "configPersona"][0]{
        creatorName, bio, audience, contentPillars, toneNotes, avoidWords
      }`),
    ])
    if (!deal) return { ok: false, error: `Không tìm thấy deal #${input.code}` }

    // Ma coupon that cua shop deal nay dan toi (khop qua domain cua dealUrl).
    // Model chi duoc dat cho trong {coupon}; ma khong bao gio do model viet ra.
    const coupon = await getDealCoupon(deal.dealUrl)
    deal.couponCode = coupon?.code

    const proven = await fetchProvenCaptions(input.platform)
    const { variants, rejected } = await generateCaptions({
      deal,
      angle: input.angle,
      platform: input.platform,
      provenCaptions: proven,
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
    return { ok: false, error: describeAiError(e) }
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
          code, title, priceSale, priceOrig, discount, discountByAmount, dealUrl,
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

    const proven = await fetchProvenCaptions(input.platform)
    const items: WeekItem[] = []
    const skipped: string[] = []

    // Tuan tu chu khong song song: goi song song 7 lan de dinh rate limit cua
    // Anthropic, va mot loi 429 giua chung se lam hong ca me.
    for (let i = 0; i < deals.length; i++) {
      const deal = deals[i]
      const angle = WEEK_ANGLES[i % WEEK_ANGLES.length]
      const campaign = `${deal.code}-${input.platform.slice(0, 2)}${angle}`
      try {
        // Ma coupon cua tung shop — khac nhau theo deal, nen phai lay trong vong
        // lap chu khong mot lan ben ngoai. getDealCoupon dung cache 5 phut nen
        // 7 lan goi khong thanh 7 lan hoi Sanity.
        deal.couponCode = (await getDealCoupon(deal.dealUrl))?.code
        const { variants } = await generateCaptions({
          deal, angle, count: 1, persona: persona ?? {}, platform: input.platform,
          provenCaptions: proven,
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
        skipped.push(`#${deal.code} — ${describeAiError(e)}`)
      }
    }

    return { ok: true, items, skipped }
  } catch (e) {
    return { ok: false, error: describeAiError(e) }
  }
}

/**
 * Ghi lai caption admin THUC SU chon dung.
 *
 * Chi luu ban duoc chon, khong luu moi thu AI sinh ra: ban bi bo di khong noi len
 * dieu gi, va luu het se lam loang du lieu doi chieu voi so click sau nay.
 *
 * Khong bao gio throw ra ngoai — day la ghi nhat ky, hong thi cung khong duoc chan
 * viec admin copy caption di dang.
 */
export async function logCaptionUsed(input: {
  campaign: string
  dealCode: number
  angle: CaptionAngle
  platform: CaptionPlatform
  text: string
}): Promise<void> {
  try {
    await writeClient.create({
      _type: 'captionLog',
      campaign: input.campaign,
      dealCode: input.dealCode,
      angle: input.angle,
      platform: input.platform,
      text: input.text,
      usedAt: new Date().toISOString(),
    })
  } catch {
    // im lang co y — xem doc-comment
  }
}

/**
 * Caption da chung minh la an: doi chieu nhat ky voi luot bam sang merchant theo
 * dung nhan `?s=`.
 *
 * Nguong `MIN_CLICKS`: mot caption co 1 luot bam khong noi len gi ngoai may man.
 * Duoi nguong thi tra ve rong, va prompt se khong co phan vi du — dung hon la day
 * cho model bat chuoc nhieu.
 */
const MIN_CLICKS_TO_LEARN = 3

async function fetchProvenCaptions(platform: CaptionPlatform): Promise<{ text: string; clicks: number }[]> {
  try {
    const logs = await writeClient.fetch<{ campaign: string; text: string }[]>(
      `*[_type == "captionLog" && platform == $platform && defined(campaign)] | order(usedAt desc)[0...60]{ campaign, text }`,
      { platform }
    )
    if (!logs?.length) return []
    const clicks = await writeClient.fetch<{ campaign: string; n: number }[]>(
      `*[_type == "click" && kind == "affiliate" && defined(campaign)]
       { campaign } | { "campaign": campaign }`
    ).then((rows: { campaign: string }[]) => {
      const m = new Map<string, number>()
      for (const r of rows ?? []) m.set(r.campaign, (m.get(r.campaign) ?? 0) + 1)
      return [...m].map(([campaign, n]) => ({ campaign, n }))
    })
    const byCampaign = new Map(clicks.map(c => [c.campaign, c.n]))
    return logs
      .map(l => ({ text: l.text, clicks: byCampaign.get(l.campaign) ?? 0 }))
      .filter(l => l.clicks >= MIN_CLICKS_TO_LEARN)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 3)
  } catch {
    return []
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

// ── Bo anh san pham, KHONG goi AI ─────────────────────────────────
//
// ⚠️ VI SAO TACH KHOI DUONG CUA /admin/video: ben do `phanTichDeal()` goi
// `loadDealSpec()`, ma ham do goi Claude hai lan (viet loi doc + cham anh). Nen
// khi vi API can tien thi khong lay noi mot tam anh — trong khi viec lay anh
// von chang can AI ti nao: `scrapeProductPage()` la cheerio thuan.
//
// Duong nay chi lam dung mot viec: mo trang san pham, nhat anh ve, bo trung.
// Do la ly do no van chay khi Claude khong chay.

export type KetQuaLayAnh =
  | { ok: true; anh: string[]; nguon: string }
  | { ok: false; error: string }

export async function layAnhSanPham(dealCode: number): Promise<KetQuaLayAnh> {
  await requireAdmin()
  if (!Number.isInteger(dealCode)) return { ok: false, error: 'Mã deal không hợp lệ' }
  try {
    const deal = await writeClient.fetch<{ dealUrl?: string; anh?: string } | null>(
      `*[_type == "deal" && code == $code][0]{ dealUrl, "anh": image.asset->url }`,
      { code: dealCode }, { cache: 'no-store' },
    )
    if (!deal) return { ok: false, error: `Không tìm thấy deal #${dealCode}` }
    if (!deal.dealUrl) {
      return { ok: false, error: 'Deal này không có link sản phẩm nên chỉ có ảnh trong kho.' }
    }

    const r = await scrapeProductPage(deal.dealUrl)
    if ('error' in r) return { ok: false, error: `Không mở được trang sản phẩm: ${r.error}` }

    // Ảnh trong kho luôn đứng đầu — đó là ảnh người vận hành đã chọn. Cùng thứ
    // tự với /admin/video để hai trang không nói hai chuyện khác nhau.
    const cao = r.images ?? []
    const anh = deal.anh ? [deal.anh, ...cao.filter(a => a !== deal.anh)] : cao
    if (!anh.length) return { ok: false, error: 'Trang sản phẩm không có ảnh nào lấy được.' }
    return { ok: true, anh, nguon: deal.dealUrl }
  } catch (e) {
    // ⚠️ KHONG dung `describeAiError` o day: duong nay khong cham vao AI, va noi
    // "het tien API" cho mot loi mang la chi sai huong nguoi di sua.
    return { ok: false, error: String(e).slice(0, 200) }
  }
}
