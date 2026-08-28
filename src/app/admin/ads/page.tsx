import { writeClient } from '@/sanity/writeClient'
import { dealBelongsToStore, hostKey } from '@/lib/dealStoreMatch'
import { estimateAvgOrderValue, estimateDungDuocLamUSD } from '@/lib/adPlanner'
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
  "reviewTitle": destinationReview->title,
  // URL san pham trong bai — de suy ra store lay so kinh te khi chien dich tro toi
  // mot BAI VIET chu khong phai mot store. Xem kinhTeTuBaiViet() ben duoi.
  // (khong dat backtick trong chu thich nay: no nam GIUA mot template literal va
  //  se dong chuoi giua chung — luat 6 cua du an, da mac 5 lan)
  "urlSanPham": coalesce(destinationPost->articleProducts[].url, destinationReview->articleProducts[].url)
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

/**
 * ⚠️ Store de lay SO KINH TE cho chien dich tro toi mot BAI VIET.
 *
 * Lo hong da gap 28/08: user khai `commissionRate: 11` cho Bodegacooler, nhung
 * chien dich tro toi mot bai BLOG nen `destinationStore` la null — con so do khong
 * chay toi dau ca, va trang van dung so mac dinh. Bai viet thi ro rang la viet ve
 * san pham cua mot shop cu the.
 *
 * Suy ra theo DOMAIN cua URL san pham trong bai — cung nguyen tac `dealStoreMatch.ts`
 * ("suy ra duoc thi dung suy ra"), va cung cach `trackArticleLinkClick` tim store.
 * Bai co san pham cua nhieu shop thi lay shop DONG NHAT.
 *
 * `destinationStore` khai tay van THANG: no la lua chon co y cua nguoi van hanh.
 */
const STORE_KINH_TE_QUERY = `*[_type == "store" && (defined(website) || defined(affiliateLink))]{
  "slug": slug.current, name, website, affiliateLink, commissionRate, avgOrderValue, allowsPaidTraffic
}`

/**
 * ⚠️ Gia tri don TB phai UOC LUONG duoc, y het `/admin/ad-planner`.
 *
 * Lo hong da gap 28/08: user khai `commissionRate: 11` cho Bodegacooler va de
 * `avgOrderValue` trong — vi o ad-planner con so $520 hien san duoi dang GOI Y,
 * duoc uoc luong LUC RENDER tu 41 deal cua shop chu khong luu vao store. Trang nay
 * doc thang `destinationStore->avgOrderValue` nen thay `null`, va moi phan quyet
 * dung lai o "chua du so lieu" du da co du hai nua thong tin.
 *
 * Dung lai dung `estimateAvgOrderValue` + `estimateDungDuocLamUSD` — khong viet
 * phep uoc luong thu hai. Ban thu hai la cho de lech, va cho lech o day la mot
 * nguong hoa von sai.
 */
const DEAL_GIA_QUERY = `*[_type == "deal"]{ store, dealUrl, priceSale }`

type StoreKinhTe = {
  slug?: string; name: string; website?: string; affiliateLink?: string
  commissionRate?: number; avgOrderValue?: number; allowsPaidTraffic?: string
}

function kinhTeTuBaiViet(urls: string[] | undefined, stores: readonly StoreKinhTe[]): StoreKinhTe | null {
  if (!urls?.length) return null
  const dem = new Map<string, number>()
  for (const u of urls) {
    const h = hostKey(u)
    if (h) dem.set(h, (dem.get(h) ?? 0) + 1)
  }
  let host: string | null = null, nhieuNhat = 0
  for (const [h, n] of dem) if (n > nhieuNhat) { host = h; nhieuNhat = n }
  if (!host) return null
  return stores.find(s => hostKey(s.website) === host || hostKey(s.affiliateLink) === host) ?? null
}

type SpendRaw = { tag?: string; cost?: number; adClicks?: number; impressions?: number; date?: string }
type ClickRaw = { campaign?: string; source?: string }

export default async function AdsPage() {
  const [campaigns, spend, clicks, cfg, storesKinhTe, deals] = await Promise.all([
    readClient.fetch<Record<string, never>[]>(CAMPAIGN_QUERY),
    readClient.fetch<SpendRaw[]>(SPEND_QUERY),
    readClient.fetch<ClickRaw[]>(MERCHANT_CLICK_QUERY),
    readClient.fetch<{ estimatedOrderRate?: number; fallbackEarningsPerOrder?: number; tyGiaVndPerUsd?: number } | null>(CONFIG_QUERY),
    readClient.fetch<StoreKinhTe[]>(STORE_KINH_TE_QUERY),
    readClient.fetch<{ store?: string; dealUrl?: string; priceSale?: string }[]>(DEAL_GIA_QUERY),
  ]).catch(() => [[], [], [], null, [], []] as const)

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
    const suyRa = kinhTeTuBaiViet(c.urlSanPham as string[] | undefined, storesKinhTe ?? [])

    // So khai tay THANG. Khong co thi uoc luong tu chinh gia deal cua shop do —
    // va CHI dung khi uoc luong ra USD (₹1257 doc thanh $1257 la loi da song 18
    // ngay, xem `estimateDungDuocLamUSD`).
    const storeCho = (c.storeName as string) ?? suyRa?.name ?? null
    let aovUocLuong: number | null = null
    if (storeCho) {
      const s = (storesKinhTe ?? []).find(x => x.name === storeCho)
      if (s) {
        const est = estimateAvgOrderValue(
          (deals ?? []).filter(d => dealBelongsToStore(d, { name: s.name, website: s.website, affiliateLink: s.affiliateLink }))
            .map(d => d.priceSale)
        )
        if (estimateDungDuocLamUSD(est)) aovUocLuong = est!.avg
      }
    }
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
      // So khai tay o chinh chien dich THANG; khong co thi suy tu bai viet.
      storeAllowsPaidTraffic: (c.storeAllowsPaidTraffic as string) ?? suyRa?.allowsPaidTraffic ?? null,
      storeCommissionRate: (c.storeCommissionRate as number) ?? suyRa?.commissionRate ?? null,
      storeAvgOrderValue: (c.storeAvgOrderValue as number) ?? suyRa?.avgOrderValue ?? aovUocLuong,
      aovLaUocLuong: (c.storeAvgOrderValue as number) == null && suyRa?.avgOrderValue == null && aovUocLuong != null,
      storeKinhTeTuBai: c.destinationStore == null && suyRa != null ? suyRa.name : null,
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
