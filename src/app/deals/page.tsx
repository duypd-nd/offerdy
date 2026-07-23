import type { Metadata } from 'next'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import DealsPageContent from '@/components/DealsPageContent'
import { getAllDeals } from '@/sanity/queries'
import type { Deal } from '@/data/deals'
import { dealsItemListJsonLd } from '@/lib/dealSchema'

export const revalidate = 60

const PAGE_SIZE = 20
const BASE_TITLE = "Today's Best Deals & Coupon Codes"
const BASE_DESCRIPTION = 'Browse hundreds of verified coupon codes and deals updated daily. Every code tested before going live — no expired coupons.'

type PageProps = { searchParams: Promise<{ page?: string; category?: string }> }

/** Dung chung cho generateMetadata va page de hai ben khong bao gio lech nhau. */
function buildCanonical(page: number, category?: string) {
  const qs = new URLSearchParams()
  if (category) qs.set('category', category)
  if (page > 1) qs.set('page', String(page))
  const q = qs.toString()
  return `https://www.offerdy.com/deals${q ? `?${q}` : ''}`
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { page: pageParam, category } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  // Ten danh muc lay tu chinh deal (khong query them) — neu slug khong khop deal
  // nao thi coi nhu khong loc, tranh title kieu "Deals in undefined".
  const allDeals = await getAllDeals()
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
      title: `${title} — Offerdy`,
      description,
      url: buildCanonical(page, catName ? category : undefined),
      type: 'website',
    },
  }
}

export default async function DealsPage({ searchParams }: PageProps) {
  const { page: pageParam, category } = await searchParams
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

  // Loc TRUOC roi moi phan trang — nguoc lai se ra trang rong khi loc.
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages)
  const deals = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const jsonLd = dealsItemListJsonLd(filtered)

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
          totalCount={filtered.length}
          categories={categories}
          activeCategory={activeCategory}
        />
      </main>
      <Footer />
    </>
  )
}
