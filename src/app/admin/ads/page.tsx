import { writeClient } from '@/sanity/writeClient'
import AdsClient, { type CampaignRow, type GiaDinh } from './AdsClient'

export const dynamic = 'force-dynamic'

/**
 * Theo doi chien dich Google Ads: da tieu bao nhieu, ra bao nhieu luot bam sang
 * merchant, va nen tang / giu / dung.
 *
 * ⚠️ TRANG NAY KHONG DIEU KHIEN GOOGLE, va do la thiet ke chu khong phai thieu
 * sot. Tran ngan sach va lenh tat phai nam BEN GOOGLE (Google Ads Script /
 * Automated Rules) de cron cua ta chet thi tran van giu. Mot cai nut o day ma
 * Google khong nghe se cho cam giac an toan gia — dung ho lon nhat cua du an nay.
 *
 * ⚠️ VA NO KHONG BIET LOI NHUAN. Don hang that nam ben GoAffPro. Thu do duoc chi
 * la CHI PHI cho mot LUOT BAM SANG MERCHANT. Xem `src/lib/adPerformance.ts`.
 */

/**
 * ⚠️ `writeClient` DE DOC, khong phai `client` — va ly do KHAC voi cac trang khac.
 *
 * Cac trang admin khac dung `client.withConfig({ useCdn: false })` de tranh cache
 * Sanity. O day nhu the VAN HONG, va hong IM LANG: hai loai tai lieu nay moi
 * tinh, va truy van KHONG kem token khong nhin thay chung.
 *
 * Do that 28/08/2026, cung mot endpoint `api.sanity.io`, chi khac header
 * Authorization:
 *
 *     adCampaign      khong token:   0   co token:   2   ⚠️
 *     adSpendEntry    khong token:   0   co token:   2   ⚠️
 *     click           khong token:  57   co token:  57
 *     captionLog      khong token:   3   co token:   3
 *     store           khong token: 107   co token: 107
 *
 * Nen chu thich trong `src/sanity/client.ts` ("dataset production la PUBLIC, doc
 * duoc khong can token") KHONG dung voi loai tai lieu moi. Va no tra ve MANG RONG
 * chu khong nem loi — trang hien "0 chien dich" y het nhu khi chua tao cai nao.
 * Da mat mot vong do de tim ra.
 *
 * `/admin/ad-planner` cung dung `writeClient` de doc, vi ly do khac (phai thay
 * thu vua ghi). O day nhan them mot ly do nua.
 */
const readClient = writeClient

const CAMPAIGN_QUERY = `*[_type == "adCampaign"] | order(status asc, name asc) {
  "id": _id, name, campaignTag, destinationType, status,
  dailyBudget, maxDailyBudget, startedAt, note,
  "storeName": destinationStore->name,
  "storeAllowsPaidTraffic": destinationStore->allowsPaidTraffic,
  "storeCommissionRate": destinationStore->commissionRate,
  "storeAvgOrderValue": destinationStore->avgOrderValue,
  "postTitle": destinationPost->title,
  "reviewTitle": destinationReview->title
}`

// Chi tieu gom theo chien dich. Gom o GROQ chu khong keo ca ban ghi ve roi cong
// o JS: so ban ghi tang moi ngay moi chien dich, va trang nay chay `force-dynamic`.
const SPEND_QUERY = `*[_type == "adSpendEntry"] {
  "tag": campaignTag, cost, adClicks, impressions, date
}`

/**
 * ⚠️ LUOT BAM SANG MERCHANT — dem tu tai lieu `click`, KHONG phai tu `adClicks`.
 *
 * Hai con so nay do hai thu khac han nhau va rat de lan:
 *   - `adClicks`  : Google bao co bao nhieu nguoi bam vao quang cao (vao site)
 *   - `click` doc : site tu dem co bao nhieu nguoi bam TIEP sang merchant
 * Lay nham cai dau se cho ra mot ty le chuyen doi dep gia tao va che mat dung
 * cai dang hong.
 *
 * `campaign` duoc ghi vao tai lieu `click` boi `trackClick.ts`, lay tu cookie do
 * `src/lib/proxyAttribution.ts` dat. Ca chuoi do phai thong thi con so nay moi
 * khac 0 — xem `tests/adAttribution.test.ts`.
 */
const MERCHANT_CLICK_QUERY = `*[_type == "click" && defined(campaign)] { campaign, source }`

const CONFIG_QUERY = `*[_type == "configAds"][0] { estimatedOrderRate, fallbackEarningsPerOrder, tyGiaVndPerUsd }`

type SpendRaw = { tag?: string; cost?: number; adClicks?: number; impressions?: number; date?: string }
type ClickRaw = { campaign?: string; source?: string }

export default async function AdsPage() {
  const [campaigns, spend, clicks, cfg] = await Promise.all([
    readClient.fetch<Record<string, never>[]>(CAMPAIGN_QUERY),
    readClient.fetch<SpendRaw[]>(SPEND_QUERY),
    readClient.fetch<ClickRaw[]>(MERCHANT_CLICK_QUERY),
    readClient.fetch<{ estimatedOrderRate?: number; fallbackEarningsPerOrder?: number; tyGiaVndPerUsd?: number } | null>(CONFIG_QUERY),
  ]).catch(() => [[], [], [], null] as const)

  const spendByTag = new Map<string, { cost: number; adClicks: number; impressions: number; days: number }>()
  for (const s of spend ?? []) {
    if (!s.tag) continue
    const cur = spendByTag.get(s.tag) ?? { cost: 0, adClicks: 0, impressions: 0, days: 0 }
    cur.cost += s.cost ?? 0
    cur.adClicks += s.adClicks ?? 0
    cur.impressions += s.impressions ?? 0
    cur.days += 1
    spendByTag.set(s.tag, cur)
  }

  const clicksByTag = new Map<string, { total: number; tuQuangCao: number }>()
  for (const c of clicks ?? []) {
    if (!c.campaign) continue
    const cur = clicksByTag.get(c.campaign) ?? { total: 0, tuQuangCao: 0 }
    cur.total += 1
    // Tach rieng luot den tu Google Ads: mot nhan `?s=` co the duoc dung ca o bai
    // dang mang xa hoi lan o quang cao. Gop lai thi tien quang cao bi ghi cong
    // cua luot mien phi.
    if (c.source === 'google-ads') cur.tuQuangCao += 1
    clicksByTag.set(c.campaign, cur)
  }

  const rows: CampaignRow[] = (campaigns ?? []).map((c: Record<string, unknown>) => {
    const tag = (c.campaignTag as string) ?? ''
    const sp = spendByTag.get(tag)
    const cl = clicksByTag.get(tag)
    return {
      id: c.id as string,
      name: (c.name as string) ?? '(chưa đặt tên)',
      campaignTag: tag,
      destinationType: (c.destinationType as CampaignRow['destinationType']) ?? 'blog',
      destinationName:
        (c.storeName as string) ?? (c.postTitle as string) ?? (c.reviewTitle as string) ?? null,
      status: (c.status as CampaignRow['status']) ?? 'draft',
      dailyBudget: (c.dailyBudget as number) ?? null,
      maxDailyBudget: (c.maxDailyBudget as number) ?? null,
      note: (c.note as string) ?? null,
      storeAllowsPaidTraffic: (c.storeAllowsPaidTraffic as string) ?? null,
      storeCommissionRate: (c.storeCommissionRate as number) ?? null,
      storeAvgOrderValue: (c.storeAvgOrderValue as number) ?? null,
      cost: sp?.cost ?? 0,
      adClicks: sp?.adClicks ?? 0,
      impressions: sp?.impressions ?? 0,
      spendDays: sp?.days ?? 0,
      merchantClicks: cl?.total ?? 0,
      merchantClicksTuQuangCao: cl?.tuQuangCao ?? 0,
    }
  })

  const giaDinh: GiaDinh = {
    estimatedOrderRate: cfg?.estimatedOrderRate ?? null,
    fallbackEarningsPerOrder: cfg?.fallbackEarningsPerOrder ?? null,
    tyGiaVndPerUsd: cfg?.tyGiaVndPerUsd ?? null,
  }

  return <AdsClient rows={rows} giaDinh={giaDinh} />
}
