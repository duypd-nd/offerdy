import { client as readClient } from '@/sanity/client'
import { writeClient } from '@/sanity/writeClient'
import { dealBelongsToStore } from '@/lib/dealStoreMatch'
import { parsePriceAmount } from '@/lib/priceAmount'
import { estimateAvgOrderValue, estimateDungDuocLamUSD } from '@/lib/adPlanner'
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
    // ⚠️ `writeClient` (khong qua CDN) cho store, KHONG phai `readClient`.
    //
    // Trang nay SUA bon truong ngay tren bang, nen no bat buoc phai thay thu vua
    // ghi xong. `readClient` di qua CDN cua Sanity va cache ~60s: do duoc bang
    // cach lai Chrome that — go 7 vao o hoa hong, bam Luu (Sanity nhan 7), tai lai
    // trang thi o hien TRONG. Nguoi van hanh se doc thanh "luu hong", go lai, va
    // con te hon: khong the xoa mot gia tri go nham vi o luon hien trong nen
    // khong co gi de "sua", nut Luu khong bao gio xuat hien.
    //
    // Dung luat da ghi o `src/sanity/queries.ts`: readClient cho trang cong khai,
    // writeClient khi bat buoc phai co du lieu vua ghi. Danh sach deal ben duoi
    // thi khong doi tu trang nay nen van dung readClient cho re.
    writeClient.fetch<{
      id: string; name: string; slug: string; website?: string; affiliateLink?: string
      commissionRate?: number; avgOrderValue?: number
      cookieWindowDays?: number; allowsPaidTraffic?: string
    }[]>(`*[_type == "store" && published != false] | order(name asc) {
      "id": _id, name, "slug": slug.current, website, affiliateLink,
      commissionRate, avgOrderValue, cookieWindowDays, allowsPaidTraffic
    }`),
    readClient.fetch<{ store?: string; dealUrl?: string; priceSale?: string }[]>(
      `*[_type == "deal"]{ store, dealUrl, priceSale }`
    ),
  ]).catch(() => [[], []] as const)

  const rows: PlannerStore[] = (stores ?? []).map(s => {
    // ⚠️ Truyen CHUOI gia, khong phai so da boc — `estimateAvgOrderValue` phai
    // nhin thay ky hieu tien te thi moi khong tron ₹ voi $. Ban cu boc so o day
    // roi truyen `number[]` chinh la cho lam mat don vi.
    const prices = (deals ?? [])
      .filter(d => dealBelongsToStore(d, s))
      .map(d => d.priceSale)
    const est = estimateAvgOrderValue(prices)
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      commissionRate: s.commissionRate ?? null,
      avgOrderValue: s.avgOrderValue ?? null,
      estimatedAov: est?.avg ?? null,
      estimatedFrom: est?.count ?? 0,
      estimatedSymbol: est?.symbol ?? null,
      estimatedSkipped: est?.skipped ?? 0,
      // Chi khi ky hieu la `$` thi con so uoc luong moi duoc dua vao `breakEven()`.
      estimatedUsable: estimateDungDuocLamUSD(est ?? null),
      cookieWindowDays: s.cookieWindowDays ?? null,
      allowsPaidTraffic: s.allowsPaidTraffic ?? 'unknown',
    }
  })

  return <AdPlannerClient stores={rows} />
}
