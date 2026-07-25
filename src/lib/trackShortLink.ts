import { writeClient } from '@/sanity/writeClient'
import type { ShortLinkSource } from './shortLinkSource'

/**
 * Ghi mot luot mo short link /d/<ma>.
 *
 * Hai ban ghi, giong y mo hinh click affiliate co san (`src/actions/trackClick.ts`):
 * - Bo dem tong tren deal (`shortLinkClicks`) — doc nhanh, khong phai quet log.
 * - Mot document `click` de con phan tich theo thoi gian/nguon. `kind: 'shortlink'`
 *   la thu de bao cao click affiliate LOC BO ban ghi nay ra: mo short link chua
 *   phai la click ra merchant, gop chung se lam phong so lieu doanh thu.
 *
 * `_weak: true` — log khong bao gio duoc chan viec xoa deal (bai hoc tu bug
 * strong-reference lam 275 store khong xoa duoc, xem PROJECT_CONTEXT).
 *
 * Khong bao gio throw: day la telemetry, loi ghi log khong duoc lam chet redirect.
 */
export async function trackShortLinkClick(input: {
  dealId: string
  code: number
  source: ShortLinkSource
  campaign?: string
}): Promise<void> {
  const { dealId, code, source, campaign } = input
  try {
    await Promise.all([
      writeClient.patch(dealId).setIfMissing({ shortLinkClicks: 0 }).inc({ shortLinkClicks: 1 }).commit(),
      writeClient.create({
        _type: 'click',
        kind: 'shortlink',
        deal: { _type: 'reference', _ref: dealId, _weak: true },
        code,
        source,
        ...(campaign ? { campaign } : {}),
      }),
    ])
  } catch {
    // im lang co y — xem doc-comment
  }
}

/**
 * Click ra merchant qua /g/<ma>. Ghi giong `trackDealClick` (server action dung
 * cho nut "Get Deal" tren trang deal) de hai duong cung do vao mot bo dem va mot
 * loai ban ghi — bao cao khong phai cong hai nguon so lieu khac nhau.
 */
export async function trackDealMerchantClick(input: {
  dealId: string
  code: number
  source: ShortLinkSource
  campaign?: string
}): Promise<void> {
  const { dealId, code, source, campaign } = input
  try {
    await Promise.all([
      writeClient.patch(dealId).setIfMissing({ dealClicks: 0 }).inc({ dealClicks: 1 }).commit(),
      writeClient.create({
        _type: 'click',
        kind: 'affiliate',
        deal: { _type: 'reference', _ref: dealId, _weak: true },
        entryCode: code,
        source,
        ...(campaign ? { campaign } : {}),
      }),
    ])
  } catch {
    // im lang co y — xem doc-comment
  }
}
