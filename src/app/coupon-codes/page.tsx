import type { Metadata } from 'next'
import Link from 'next/link'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import CouponCodesContent from './CouponCodesContent'
import { getSiteName, getCouponOffers, getSiteBase } from '@/sanity/queries'
import { couponsItemListJsonLd } from '@/lib/dealSchema'

export const revalidate = 60

const PAGE_SIZE = 20
const BASE_TITLE = 'Coupon Codes — Verified Promo Codes'
const BASE_DESCRIPTION = 'Find verified coupon codes and promo codes for hundreds of stores. Every code tested before going live.'

type PageProps = { searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const siteName = await getSiteName()
  const canonical = page > 1 ? `/coupon-codes?page=${page}` : '/coupon-codes'
  const title = page > 1 ? `Coupon Codes — Page ${page} | ${siteName}` : BASE_TITLE

  return {
    title,
    description: BASE_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      title,
      description: 'Browse all verified coupon codes grouped by store.',
      url: canonical,
      type: 'website',
    },
  }
}

export default async function CouponCodesPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams
  const offers = await getCouponOffers()
  const totalPages = Math.max(1, Math.ceil(offers.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number(pageParam) || 1), totalPages)
  const jsonLd = couponsItemListJsonLd(offers, await getSiteBase())

  return (
    <>
      <HeaderWrapper />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main>
        <div className="page-hero">
          <div className="page-hero-eyebrow">Coupon Codes</div>
          <h1 className="page-hero-title">🏷️ Verified Promo Codes</h1>
          {/*
            Cau cu: "Every code tested and verified before it goes live. Updated daily."
            Do la hai loi hua khong giu duoc — do 24/08: 71/98 ma co ma da duoc thu, va
            chung duoc thu ngay 03/08 va 05/08, khong phai hang ngay. Chinh du an nay da
            chot mot ranh gioi o src/lib/offerTrust.ts: goi ket qua cua cron la
            "code tested" la hua mot viec chua bao gio lam. Cau nay pham dung dieu do.
            Nay noi that va DAN NGUOI DOC TOI BANG CHUNG thay vi bat ho tin.
          */}
          <p className="page-hero-sub">
            We enter codes at the store checkout ourselves and publish the date we did it.{' '}
            <Link href="/how-we-test" className="page-hero-link">See the full test log</Link>
          </p>
        </div>
        <CouponCodesContent offers={offers} page={page} totalPages={totalPages} />
      </main>
      <Footer />
    </>
  )
}
