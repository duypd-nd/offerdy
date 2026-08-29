'use server'

import { writeClient } from '@/sanity/writeClient'
import { readAttribution } from '@/lib/attribution'
import { hostKey } from '@/lib/dealStoreMatch'

// Nguon lay tu cookie do /d/ hoac /g/ dat (xem src/lib/attribution.ts). Nho no,
// mot click affiliate biet duoc no bat dau tu bai dang nao — neu khong thi chi
// dem duoc "co bao nhieu click", khong biet Instagram hay TikTok ra don.
async function attributionFields(): Promise<Record<string, unknown>> {
  const a = await readAttribution()
  if (!a) return {}
  return {
    source: a.source,
    ...(a.campaign ? { campaign: a.campaign } : {}),
    ...(a.entryCode ? { entryCode: a.entryCode } : {}),
  }
}

/**
 * Luc bam, offer nay dan toi trang san pham hay trang chu shop?
 *
 * Phai dong dau NGAY TAI THOI DIEM CLICK, khong the suy lai sau: `productUrl`
 * duoc them dan dan cho tung offer, nen hoi "offer nay co deep-link khong" vao
 * ngay mai se gan nhan sai cho moi click xay ra truoc khi link duoc them.
 *
 * Doc o server thay vi truyen tu component: nut Get Deal/Get Code nam o 4 noi
 * (trang store, /coupon-codes, /flash-sales, OfferCard) va mot noi quen truyen
 * prop se lam hong so lieu ma khong ai thay.
 */
async function isDeepLinked(offerId: string): Promise<boolean> {
  try {
    return await writeClient.fetch<boolean>(
      `defined(*[_type == "offer" && _id == $offerId][0].productUrl)`,
      { offerId }
    )
  } catch {
    return false
  }
}

export async function trackOfferClick(offerId: string): Promise<void> {
  const [attribution, deepLink] = await Promise.all([attributionFields(), isDeepLinked(offerId)])
  await Promise.all([
    writeClient.patch(offerId).setIfMissing({ clicks: 0 }).inc({ clicks: 1 }).commit(),
    // _weak: true - click logs should never block deleting the offer/store they reference
    writeClient.create({
      _type: 'click',
      offer: { _type: 'reference', _ref: offerId, _weak: true },
      deepLink,
      ...attribution,
    }),
  ])
}

export async function trackStoreClick(storeId: string): Promise<void> {
  const attribution = await attributionFields()
  await Promise.all([
    writeClient.patch(storeId).setIfMissing({ clicks: 0 }).inc({ clicks: 1 }).commit(),
    writeClient.create({
      _type: 'click',
      store: { _type: 'reference', _ref: storeId, _weak: true },
      ...attribution,
    }),
  ])
}

/**
 * Click "Get Deal" tren /deals/<slug>. Truoc day nut nay KHONG duoc dem gi ca:
 * deal khong co reference toi store/offer nen `AffiliateLink` khong co id nao de
 * truyen, va moi luot bam ra merchant tu trang deal bi mat trang.
 *
 * `kind: 'affiliate'` de phan biet ro voi `kind: 'shortlink'` (chi la mo trang
 * san pham). Ca hai deu nam trong bo loc `kind != "shortlink"` cua bao cao click.
 */
export async function trackDealClick(dealId: string): Promise<void> {
  const attribution = await attributionFields()
  await Promise.all([
    writeClient.patch(dealId).setIfMissing({ dealClicks: 0 }).inc({ dealClicks: 1 }).commit(),
    writeClient.create({
      _type: 'click',
      kind: 'affiliate',
      deal: { _type: 'reference', _ref: dealId, _weak: true },
      ...attribution,
    }),
  ])
}

/**
 * Click tren mot link mua hang NAM TRONG THAN BAI viet (blog / review).
 *
 * 🚨 VI SAO CAN, va vi sao no khong ton tai suot tu dau:
 *
 * Than bai duoc render bang `dangerouslySetInnerHTML` (blog/[slug]/page.tsx), va
 * cac nut mua la the `<a>` HTML THO do `postRender.ts` sinh ra — khong phai
 * component `AffiliateLink`. Khong co `onClick` nghia la KHONG co gi duoc dem:
 * khong tai lieu `click`, khong `dataLayer`, khong chuyen doi Google Ads.
 *
 * Do that 28/08/2026: vao dung URL quang cao (cookie gan nguon dat DUNG:
 * `google-ads|ads-fridge-58l`), bam mot trong hai link affiliate cua bai — so
 * tai lieu `click` mang nhan do van la **0**.
 *
 * Hau qua khong chi la "thieu so lieu": `/admin/ads` se thay chi phi tang ma 0
 * luot bam, roi phan quyet **"Nen dung"** theo nhanh Poisson. Phan quyet do SAI,
 * vi luot bam co the dang xay ra ma khong ai dem. May tu tin noi mot dieu no
 * khong biet — dung thu ca `chua-du-so-lieu` duoc dung de tranh.
 *
 * ⚠️ Khong co `offerId`/`dealId` de truyen: link trong than bai chi co URL
 * merchant. Suy ra store theo DOMAIN — cung nguyen tac `dealStoreMatch.ts`.
 * Khong khop store nao thi VAN ghi ban ghi click (nhan `?s=` moi la thu
 * `/admin/ads` can), chi la thieu tham chieu store.
 */
/**
 * ⚠️ Chi nhan duong dan cua BAI VIET, va gioi han chat.
 *
 * Gia tri nay do CLIENT gui len (`location.pathname`) nen phai coi la khong tin
 * duoc: chan do dai, va chi nhan hai tien to that su la bai viet. Khong loc thi
 * mot chuoi bat ky di thang vao Sanity va vao bao cao.
 *
 * Luu CHUOI chu khong phai reference: giai duong dan ra tai lieu can them mot
 * luot hoi Sanity (~350ms) NGAY TREN DUONG BAM cua khach — do tre o do truc tiep
 * lam mat don. Bao cao giai ten bai luc doc, luc do cham cung khong ai mat gi.
 */
function duongDanBaiSach(raw?: string): string | undefined {
  const p = String(raw ?? '').trim()
  if (!p || p.length > 200) return undefined
  return /^\/(blog|reviews)\/[A-Za-z0-9._~\-\/]+$/.test(p) ? p : undefined
}

export async function trackArticleLinkClick(url: string, articlePath?: string): Promise<void> {
  const target = hostKey(url)
  if (!target) return

  const attribution = await attributionFields()

  // Chi lay hai field can de khop host. Truy van gon vi ham nay chay tren duong
  // bam cua khach — cham o day la mat don hang.
  let storeId: string | null = null
  try {
    const stores = await writeClient.fetch<{ id: string; website?: string; affiliateLink?: string }[]>(
      `*[_type == "store" && (defined(website) || defined(affiliateLink))]{ "id": _id, website, affiliateLink }`,
      {}, { cache: 'no-store' }
    )
    storeId = stores.find(s => hostKey(s.website) === target || hostKey(s.affiliateLink) === target)?.id ?? null
  } catch { /* khong khop duoc store thi van ghi click — dung im lang o day */ }

  await writeClient.create({
    _type: 'click',
    kind: 'affiliate',
    // Ghi ca host de doi chieu duoc khi khong khop store nao.
    articleHost: target,
    // 🚨 BAI NAO ra luot bam — cau hoi dang gia nhat cua ca he do luong. Ban va
    // 28/08 dem duoc luot bam tu than bai nhung KHONG ghi bai nao, nen voi 65 bai
    // ta biet "co nguoi bam tu mot bai nao do" ma khong biet bai nao. Ma do dung
    // la thu quyet dinh viet tiep kieu gi.
    ...(duongDanBaiSach(articlePath) ? { articlePath: duongDanBaiSach(articlePath) } : {}),
    ...(storeId ? { store: { _type: 'reference', _ref: storeId, _weak: true } } : {}),
    ...attribution,
  })
}
