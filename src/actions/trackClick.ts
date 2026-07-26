'use server'

import { writeClient } from '@/sanity/writeClient'
import { readAttribution } from '@/lib/attribution'

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
