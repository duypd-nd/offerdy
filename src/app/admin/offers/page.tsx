import { writeClient } from '@/sanity/writeClient'
import OfferAdmin from './OfferAdmin'
import { pageRange, parsePage, paramStr, totalPagesFor } from '@/lib/adminPagination'

export const dynamic = 'force-dynamic'

const ADMIN_STORES_QUERY = `*[_type == "store" && published != false] | order(name asc) { _id, name }`

export default async function AdminOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const page = parsePage(sp.page)
  const q = paramStr(sp.q)
  const store = paramStr(sp.store)
  const status = paramStr(sp.status)
  const from = paramStr(sp.from)
  const to = paramStr(sp.to)

  const conditions = ['_type == "offer"']
  const params: Record<string, unknown> = {}

  if (q) {
    conditions.push('title match $q')
    params.q = `*${q}*`
  }
  if (store) {
    conditions.push('store._ref == $store')
    params.store = store
  }
  if (status === 'active') conditions.push('active == true')
  if (status === 'inactive') conditions.push('active != true')
  if (from) {
    conditions.push('_createdAt >= $from')
    params.from = `${from}T00:00:00.000Z`
  }
  if (to) {
    conditions.push('_createdAt <= $to')
    params.to = `${to}T23:59:59.999Z`
  }

  const filter = conditions.join(' && ')
  const { start, end } = pageRange(page)

  const LIST_QUERY = `*[${filter}] | order(store->_createdAt desc) [${start}...${end}] {
    _id, title, active, "verified": coalesce(verified, true), "order": coalesce(order, 0),
    couponCode, link, offerText, description, expiresAt, _createdAt,
    "store": store->{ _id, name, "slug": slug.current }
  }`
  const COUNT_QUERY = `count(*[${filter}])`

  const [offers, total, stores] = await Promise.all([
    writeClient.fetch(LIST_QUERY, params),
    writeClient.fetch<number>(COUNT_QUERY, params),
    writeClient.fetch(ADMIN_STORES_QUERY),
  ])

  return (
    <OfferAdmin
      offers={offers ?? []}
      stores={stores ?? []}
      page={page}
      totalPages={totalPagesFor(total)}
      total={total}
      filters={{ q, store, status, from, to }}
    />
  )
}
