import { client as readClient } from '@/sanity/client'
import { dealBelongsToStore } from '@/lib/dealStoreMatch'
import { parsePriceAmount } from '@/lib/priceAmount'
import { estimateAvgOrderValue } from '@/lib/adPlanner'
import AdPlannerClient, { type PlannerStore } from './AdPlannerClient'

export const dynamic = 'force-dynamic'

/**
 * "Bo ra bao nhieu tien quang cao thi co cua lai" — tinh TRUOC khi tieu dong nao.
 *
 * Trang nay KHONG tra loi duoc "thang hay lo thuc te": doanh thu affiliate that
 * nam ben GoAffPro va site khong nhin thay (xem `/admin/reports`). No tra loi cau
 * hoi khac, tra loi duoc ngay hom nay va du de loai bot: *de hoa von thi bao
 * nhieu phan tram khach phai mua hang.* Ra 10% thi biet la khong nen chay, chua
 * ton dong nao.
 *
 * Gia tri don TB uoc luong tu chinh gia deal cua shop — 175/175 deal deu co gia,
 * nen khong bat nguoi van hanh go tay. Cung nguyen tac voi `dealStoreMatch.ts`:
 * suy ra duoc thi dung suy ra. O `avgOrderValue` trong Sanity de ghi de khi co so
 * that tu GoAffPro; so that luon thang so uoc luong.
 */
export default async function AdPlannerPage() {
  const [stores, deals] = await Promise.all([
    readClient.fetch<{
      name: string; slug: string; website?: string; affiliateLink?: string
      commissionRate?: number; avgOrderValue?: number
      cookieWindowDays?: number; allowsPaidTraffic?: string
    }[]>(`*[_type == "store" && published != false] | order(name asc) {
      name, "slug": slug.current, website, affiliateLink,
      commissionRate, avgOrderValue, cookieWindowDays, allowsPaidTraffic
    }`),
    readClient.fetch<{ store?: string; dealUrl?: string; priceSale?: string }[]>(
      `*[_type == "deal"]{ store, dealUrl, priceSale }`
    ),
  ]).catch(() => [[], []] as const)

  const rows: PlannerStore[] = (stores ?? []).map(s => {
    const prices = (deals ?? [])
      .filter(d => dealBelongsToStore(d, s))
      .map(d => parsePriceAmount(d.priceSale))
    const est = estimateAvgOrderValue(prices)
    return {
      name: s.name,
      slug: s.slug,
      commissionRate: s.commissionRate ?? null,
      avgOrderValue: s.avgOrderValue ?? null,
      estimatedAov: est?.avg ?? null,
      estimatedFrom: est?.count ?? 0,
      cookieWindowDays: s.cookieWindowDays ?? null,
      allowsPaidTraffic: s.allowsPaidTraffic ?? 'unknown',
    }
  })

  return <AdPlannerClient stores={rows} />
}
