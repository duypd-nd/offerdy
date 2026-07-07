import { writeClient } from '@/sanity/writeClient'
import CouponCodesAdmin from './CouponCodesAdmin'
import { pageRange, parsePage, paramStr, totalPagesFor } from '@/lib/adminPagination'

export const dynamic = 'force-dynamic'

const STORES_QUERY = `*[_type == "store" && published != false] | order(name asc) { _id, name }`

export default async function AdminCouponCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const page = parsePage(sp.page)
  const q = paramStr(sp.q)
  const store = paramStr(sp.store)

  const conditions = ['_type == "offer"', 'defined(couponCode)', 'couponCode != ""']
  const params: Record<string, unknown> = {}

  if (q) {
    conditions.push('(title match $q || couponCode match $q || store->name match $q)')
    params.q = `*${q}*`
  }
  if (store) {
    conditions.push('store._ref == $store')
    params.store = store
  }

  const filter = conditions.join(' && ')
  const { start, end } = pageRange(page)

  const LIST_QUERY = `*[${filter}] | order(_createdAt desc) [${start}...${end}] {
    _id, title, offerText, couponCode, "link": link, description, expiresAt, active, verified, _createdAt,
    "store": store->{ _id, name, "slug": slug.current }
  }`
  const COUNT_QUERY = `count(*[${filter}])`

  const [offers, total, stores] = await Promise.all([
    writeClient.fetch(LIST_QUERY, params),
    writeClient.fetch<number>(COUNT_QUERY, params),
    writeClient.fetch(STORES_QUERY),
  ])

  return (
    <CouponCodesAdmin
      offers={offers ?? []}
      stores={stores ?? []}
      page={page}
      totalPages={totalPagesFor(total)}
      total={total}
      filters={{ q, store }}
    />
  )
}
