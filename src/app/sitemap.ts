import type { MetadataRoute } from 'next'
import { client as readClient } from '@/sanity/client'
import { getCategorySlugsWithStores } from '@/sanity/queries'

const BASE = 'https://www.offerdy.com'

/**
 * ⚠️ KHONG DUOC BO DONG NAY, VA KHONG DUOC DOI NO VE `revalidate`.
 *
 * `sitemap.ts` la mot Route Handler **duoc cache mac dinh** — khong khai bao gi
 * thi Next sinh no MOT LAN luc build roi dong bang vinh vien. Do duoc ngay
 * 2026-08-04: sitemap production van la anh chup cua lan deploy cuoi (~26/07),
 * nen **22 trong 23 bai review viet ngay 03/08 chua bao gio duoc bao cho
 * Google**, trong khi no van moi Google vao 14 trang store da bi xoa.
 *
 * Lan do 2026-08-04 chua `revalidate = 3600`. **LAN DO 2026-08-20 cho thay ban
 * va do KHONG chay**, va bang chung khong the choi cai duoc:
 *
 *   - Cac URL trang tinh dung `lastModified: new Date()`. Tren production chung
 *     mang `2026-08-12T18:04:57Z` — dung 2 phut sau commit `7b38f06`
 *     (18:02:41Z), tuc **thoi diem build**. Khong mot URL nao mang ngay hom nay.
 *     `new Date()` khong phai loi goi mang, khong qua cache nao — no dong bang
 *     nghia la **than ham chua chay lai lan nao suot 8 ngay**.
 *   - 27 store nhap luc 18:34Z ngay 12/08 (32 phut SAU lan deploy) vang mat khoi
 *     sitemap, trong khi trang `/stores` — ISR binh thuong — co du chung.
 *   - Goi kem chuoi pha cache (`?cb=...`) van `x-vercel-cache: HIT`, noi dung y het.
 *
 * Vi sao doi sang `force-dynamic` chu khong phai chi va them
 * `revalidatePath('/sitemap.xml')` vao duong nhap lieu: co che ISR o route nay
 * **da hong hai lan** (04/08, roi 20/08) va lan nay khong giai thich duoc bang
 * gi. Va mot co che da thua hai lan la dat cuoc lai. `force-dynamic` khong
 * co cai gi de om — moi lan Google hoi la mot lan doc that.
 *
 * Chi phi da can: 8 truy van Sanity moi request, VA CHUNG DI QUA CDN CUA SANITY
 * (`readClient`, `useCdn: true`) nen **khong tinh vao han muc "API Requests"** —
 * chinh la ly do noi lo "ai do goi lien tuc /sitemap.xml" trong ban ghi 04/08
 * khong con dung. Google doc sitemap khoang mot lan moi ngay.
 *
 * 📌 CACH KIEM SAU KHI DEPLOY (mot lenh, khong doan): tai
 * `https://www.offerdy.com/sitemap.xml` hai lan cach nhau vai giay va doc
 * `<lastmod>` cua URL trang chu — no phai la **thoi diem hien tai va khac nhau
 * giua hai lan**. Con dung yen la ban va lai hong.
 */
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let stores: { slug: string; _updatedAt: string }[] = []
  let posts: { slug: string; _updatedAt: string }[] = []
  let reviews: { slug: string; _updatedAt: string }[] = []
  let pages: { slug: string; _updatedAt: string }[] = []
  let categories: { slug: string; _updatedAt: string }[] = []
  // Dem rieng bai Comparison de quyet dinh co dua /comparisons vao sitemap khong.
  // Neu fetch loi -> giu 0 -> loai URL ra, dung huong an toan: tha bo sot mot URL
  // hop le (Google se crawl lai) con hon nop mot trang rong cho Google index.
  let comparisonCount = 0
  // Dem offer dang chay ma sap het han — cung ly do voi comparisonCount.
  // Do 2026-08-04: 0/303 offer co `expiresAt`, nghia la /flash-sales RONG hoan toan
  // trong khi sitemap van moi Google vao voi priority 0.9 + changeFrequency hourly.
  // Moi gio mot lan bao Google "trang nay vua doi" roi dan no toi mot trang khong co
  // gi la dung thu tin hieu can tranh nhat luc dang phuc hoi tu 93% hien thi roi vao
  // 404. Khi nao co offer that co expiresAt thi URL tu quay lai sitemap.
  let flashSaleCount = 0
  // Dem rieng bai Tips & Guides. `/blog` thi dung thang `posts.length` ben duoi
  // vi no liet ke moi bai; `/tips-guides` loc theo category nen phai dem rieng.
  let tipsGuidesCount = 0
  // Chi nop category doc nao thuc su co store. Cung ly do voi /comparisons.
  let categoriesWithStores: Set<string> = new Set()

  try {
    ;[stores, posts, reviews, pages, categories, comparisonCount, flashSaleCount, tipsGuidesCount] = await Promise.all([
      readClient.fetch(`*[_type == "store" && published != false]{ "slug": slug.current, _updatedAt }`),
      readClient.fetch(`*[_type == "post" && defined(publishedAt) && publishedAt <= now() && aiReviewStatus != "pending"]{ "slug": slug.current, _updatedAt }`),
      readClient.fetch(`*[_type == "review" && (!defined(publishedAt) || publishedAt <= now())]{ "slug": slug.current, _updatedAt }`),
      readClient.fetch(`*[_type == "page" && published != false]{ "slug": slug.current, _updatedAt }`),
      readClient.fetch(`*[_type == "category"]{ "slug": slug.current, _updatedAt }`),
      // ⚠️ KHONG co truy van deal o day, va do la CO Y — xem khoi chu thich
      // "451 trang deal" o cuoi ham truoc khi them lai.
      // Cung dieu kien loc voi COMPARISON_POSTS_QUERY trong src/sanity/queries.ts —
      // hai cho phai khop nhau, neu doi filter o do thi doi ca o day.
      readClient.fetch(`count(*[_type == "post" && category == "Comparison" && (!defined(publishedAt) || publishedAt <= now()) && aiReviewStatus != "pending"])`),
      // Cung dieu kien loc voi FLASH_SALES_QUERY trong src/sanity/queries.ts —
      // hai cho phai khop nhau, neu doi filter o do thi doi ca o day.
      readClient.fetch(`count(*[_type == "offer" && active == true && defined(expiresAt) && expiresAt > now()])`),
      // Cung dieu kien loc voi TIPS_GUIDES_QUERY trong src/sanity/queries.ts —
      // hai cho phai khop nhau, neu doi filter o do thi doi ca o day.
      readClient.fetch(`count(*[_type == "post" && category == "Tips & Guides" && (!defined(publishedAt) || publishedAt <= now()) && aiReviewStatus != "pending"])`),
    ])
  } catch {}

  categoriesWithStores = await getCategorySlugsWithStores()

  const now = new Date()
  const statics: MetadataRoute.Sitemap = [
    { url: BASE,                            lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/stores`,                lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/deals`,                 lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    ...(flashSaleCount > 0
      ? [{ url: `${BASE}/flash-sales`, lastModified: now, changeFrequency: 'hourly' as const, priority: 0.9 }]
      : []),
    { url: `${BASE}/coupon-codes`,          lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${BASE}/reviews`,               lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    // `/blog` va `/tips-guides` chi vao sitemap khi con bai de liet ke. Ngay
    // 2026-08-04 da xoa 6 bai chung chung cuoi cung -> ca hai trang deu rong, va
    // nop mot trang rong cho Google la dung thu vua sua cho /flash-sales.
    ...(posts.length > 0
      ? [{ url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }]
      : []),
    ...(comparisonCount > 0
      ? [{ url: `${BASE}/comparisons`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }]
      : []),
    ...(tipsGuidesCount > 0
      ? [{ url: `${BASE}/tips-guides`, lastModified: now, changeFrequency: 'weekly' as const, priority: 0.7 }]
      : []),
    { url: `${BASE}/categories`,            lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    // Uu tien 0.6 chu khong phai 0.3 nhu cac trang thong tin khac: day la trang
    // duy nhat tren site chua thong tin TRUC TIEP khong noi nao khac co, va no
    // link toi 67 trang store (giup ca chuyen link noi bo).
    { url: `${BASE}/how-we-test`,           lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${BASE}/about`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/author`,                lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/contact`,               lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/submit-deal`,           lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/partner`,               lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/terms`,                 lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/privacy`,               lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/cookies`,               lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${BASE}/affiliate-disclosure`,  lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ]

  return [
    ...statics,
    ...stores.filter(s => s.slug).map(s => ({
      url: `${BASE}/stores/${s.slug}`,
      lastModified: s._updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...posts.filter(p => p.slug).map(p => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: p._updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...reviews.filter(r => r.slug).map(r => ({
      url: `${BASE}/reviews/${r.slug}`,
      lastModified: r._updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...pages.filter(p => p.slug).map(p => ({
      url: `${BASE}/${p.slug}`,
      lastModified: p._updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    ...categories.filter(c => c.slug && categoriesWithStores.has(c.slug)).map(c => ({
      url: `${BASE}/categories/${c.slug}`,
      lastModified: c._updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    // ── 451 trang deal KHONG vao sitemap (quyet dinh 2026-08-20) ────────────
    //
    // ⚠️ Day la mot QUYET DINH da can nhac, khong phai cho bi quen. Doc het
    // truoc khi them lai.
    //
    // So do trong 90 ngay (2026-05-21 -> 08-18, GSC):
    //   - 451 URL deal = **73% toan bo sitemap**
    //   - trong 90 ngay chi **6 trang** tung xuat hien tren Google
    //   - **16 luot hien thi** — 0,5% cua site — va **0 luot bam**
    // Doi chieu: 65 trang noi dung that (42 bai blog + 23 review) thi
    // **CHUA MOT TRANG NAO tung duoc Google bo** (URL Inspection 20/08: 6/6 bai
    // blog, 3/3 review lay mau deu `chua tung duoc bo`). Google ghe site khoang
    // 2 lan/thang. Nop 451 URL chua bao gio kiem duoc mot luot bam, trong khi
    // 65 trang dang cho, la tu pha loang lan ghe hiem hoi do.
    //
    // Cung mot phep suy nghi da dung san trong ham nay: `/flash-sales` bi loai
    // khi khong co offer sap het han, `/tips-guides` bi loai khi khong con bai,
    // category khong co store thi bi loai. Luat chung la **dung moi Google vao
    // trang khong dang mot luot bo**. Deal la truong hop lon nhat cua luat do.
    //
    // 📌 Bo khoi sitemap **KHONG phai** `noindex`, cung khong xoa trang. Trang
    // deal van song, van tra 200, van duoc link tu `/deals` va tu trang store —
    // Google van bo toi duoc neu no muon. Chi la ta khong con chu dong doi nua.
    // `/deals` (trang dau moi) van nam trong sitemap voi priority 0.9.
    //
    // 📌 Deal con la thu CHONG THAY DOI NHANH (deal het han, deal moi vao moi
    // tuan). Mot sitemap phan lon la URL mau doi day Google toi ket luan sitemap
    // nay khong dang tin — dung dieu can tranh nhat luc dang cho duoc bo lai.
    //
    // 📌 CACH DAO NGUOC neu phep do sau nay noi khac: them lai mot dong
    // `readClient.fetch('*[_type == "deal"]{ "slug": slug.current, _updatedAt }')`
    // vao `Promise.all` (dung thu tu destructuring!) va mot khoi map o day.
    // Moc de so: truoc khi cat, sitemap co **648 URL**; sau khi cat con **197**.
  ]
}
