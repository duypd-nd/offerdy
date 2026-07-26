import { writeClient } from '@/sanity/writeClient'
import SocialKitClient from './SocialKitClient'

export const dynamic = 'force-dynamic'

// Chi deal DA CO MA moi dung duoc o day: ca caption, short link va QR deu dua tren
// ma. Deal thieu ma -> chay /admin/migrate/deal-codes truoc.
const QUERY = `*[_type == "deal" && defined(code)] | order(code desc) {
  code, title, priceSale, priceOrig, discount, discountByAmount,
  "slug": slug.current, "imageUrl": image.asset->url,
  "categoryName": category->name,
  "shortLinkClicks": coalesce(shortLinkClicks, 0),
  "dealClicks": coalesce(dealClicks, 0)
}`

const MISSING_CODE_QUERY = `count(*[_type == "deal" && !defined(code)])`

export default async function SocialKitPage({ searchParams }: {
  searchParams: Promise<{ code?: string }>
}) {
  const [deals, missingCode, params] = await Promise.all([
    writeClient.fetch(QUERY),
    writeClient.fetch<number>(MISSING_CODE_QUERY),
    searchParams,
  ])
  // `?code=` de nut 📣 tren /admin/deals nhay thang sang day voi deal da chon san —
  // them deal roi dang bai la mot chuoi lam lien nhau, truoc day phai tim lai ma.
  const initialCode = Number(params?.code)
  return (
    <SocialKitClient
      deals={deals ?? []}
      missingCode={missingCode ?? 0}
      initialCode={Number.isFinite(initialCode) && initialCode > 0 ? initialCode : undefined}
    />
  )
}
