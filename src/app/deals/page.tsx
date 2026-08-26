import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import DealsPageContent from '@/components/DealsPageContent'
import { getSiteName, getAllDeals, getSiteBase } from '@/sanity/queries'
import type { Deal } from '@/data/deals'
import { dealsItemListJsonLd } from '@/lib/dealSchema'
import { parsePriceAmount } from '@/lib/priceAmount'

export const revalidate = 60

const PAGE_SIZE = 20
const BASE_TITLE = "Today's Best Deals & Coupon Codes"
const BASE_DESCRIPTION = 'Browse hundreds of verified coupon codes and deals updated daily. Every code tested before going live — no expired coupons.'

type PageProps = { searchParams: Promise<{ page?: string; category?: string; sort?: string }> }

/** Dung chung cho generateMetadata va page de hai ben khong bao gio lech nhau. */
function buildCanonical(page: number, category?: string) {
  const qs = new URLSearchParams()
  if (category) qs.set('category', category)
  if (page > 1) qs.set('page', String(page))
  const q = qs.toString()
  return `/deals${q ? `?${q}` : ''}`
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { page: pageParam, category } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  // Ten danh muc lay tu chinh deal (khong query them) — neu slug khong khop deal
  // nao thi coi nhu khong loc, tranh title kieu "Deals in undefined".
  const [allDeals, siteName] = await Promise.all([getAllDeals(), getSiteName()])
  const catName = category
    ? allDeals.find((d: Deal) => d.category?.slug === category)?.category?.name
    : undefined

  const base = catName ? `${catName} Deals & Coupon Codes` : BASE_TITLE
  const title = page > 1 ? `${base} — Page ${page}` : base
  const description = catName
    ? `Verified ${catName.toLowerCase()} deals and coupon codes, updated daily. Every code tested before going live.`
    : BASE_DESCRIPTION

  return {
    title,
    description,
    alternates: { canonical: buildCanonical(page, catName ? category : undefined) },
    // Slug la rac (khong khop danh muc nao) -> khong cho index de tranh sinh vo han
    // URL rong duoc index. Danh muc that van index binh thuong.
    ...(category && !catName && { robots: { index: false, follow: true } }),
    openGraph: {
      title: `${title} — ${siteName}`,
      description,
      url: buildCanonical(page, catName ? category : undefined),
      type: 'website',
    },
  }
}

export default async function DealsPage({ searchParams }: PageProps) {
  const { page: pageParam, category, sort } = await searchParams
  const allDeals = await getAllDeals()

  // Chi dung nhung danh muc THUC SU co deal — khong render tab rong.
  // Deal chua phan loai khong tao tab nao, nhung van nam trong tab "All".
  type DealCategory = NonNullable<Deal['category']>
  const categories: DealCategory[] = Array.from(
    new Map<string, DealCategory>(
      (allDeals as Deal[])
        .filter(d => d.category?.slug)
        .map(d => [d.category!.slug, d.category!] as const)
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name))

  const activeCategory = category && categories.some(c => c.slug === category) ? category : undefined
  const filtered = activeCategory
    ? allDeals.filter((d: Deal) => d.category?.slug === activeCategory)
    : allDeals

  // Sap xep TRUOC khi phan trang, neu khong thi moi trang chi duoc sap trong
  // pham vi 24 deal cua chinh no. Gia la chuoi co ky hieu tien te (",499.00")
  // nen phai boc so ra; khong boc duoc thi day xuong cuoi thay vi doan bua.
  //
  // ⚠️ `parsePriceAmount` chu khong tu boc so: mot deal "€199,99" tung duoc doc thanh
  // 19999 va bi day xuong tan cuoi danh sach sap theo gia.
  const priceNum = (v?: string) => parsePriceAmount(v) ?? Number.POSITIVE_INFINITY
  const activeSort = sort === 'discount' || sort === 'price' ? sort : undefined
  const sorted = activeSort === 'discount'
    ? [...filtered].sort((a: Deal, b: Deal) => (b.discount ?? 0) - (a.discount ?? 0))
    : activeSort === 'price'
    ? [...filtered].sort((a: Deal, b: Deal) => priceNum(a.priceSale) - priceNum(b.priceSale))
    : filtered

  // Loc TRUOC roi moi phan trang — nguoc lai se ra trang rong khi loc.
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages)
  const deals = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const jsonLd = dealsItemListJsonLd(filtered, await getSiteBase())

  return (
    <>
      <HeaderWrapper />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <div className="page-hero">
          <div className="page-hero-eyebrow">Deals</div>
          <h1 className="page-hero-title">Today&rsquo;s Best Deals</h1>
          <p className="page-hero-sub">Every coupon verified before it goes live. Updated daily.</p>
        </div>
        <DealsPageContent
          deals={deals}
          page={page}
          totalPages={totalPages}
          totalCount={sorted.length}
          categories={categories}
          activeCategory={activeCategory}
          activeSort={activeSort}
        />
      </main>
      <Footer />
    </>
  )
}
