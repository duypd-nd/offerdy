import { writeClient } from '@/sanity/writeClient'
import StoreAdmin from './StoreAdmin'
import { pageRange, parsePage, paramStr, totalPagesFor } from '@/lib/adminPagination'

export const dynamic = 'force-dynamic'

const CATEGORIES_QUERY = `*[_type == "category"] | order(order asc) {
  "value": slug.current, "label": name, emoji
}`

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const page = parsePage(sp.page)
  const q = paramStr(sp.q)
  const category = paramStr(sp.category)
  const status = paramStr(sp.status)
  const from = paramStr(sp.from)
  const to = paramStr(sp.to)

  const conditions = ['_type == "store"']
  const params: Record<string, unknown> = {}

  if (q) {
    conditions.push('(name match $q || slug.current match $q)')
    params.q = `*${q}*`
  }
  if (category) {
    conditions.push('category == $category')
    params.category = category
  }
  if (status === 'active') conditions.push('published != false')
  if (status === 'inactive') conditions.push('published == false')
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

  const LIST_QUERY = `*[${filter}] | order(_createdAt desc) [${start}...${end}] {
    _id, name, "slug": slug.current, published, category,
    website, affiliateLink, maxOffer, abbr, shortDescription,
    "imageUrl": image.asset->url, _createdAt
  }`
  const COUNT_QUERY = `count(*[${filter}])`

  const [stores, total, categories] = await Promise.all([
    writeClient.fetch(LIST_QUERY, params),
    writeClient.fetch<number>(COUNT_QUERY, params),
    writeClient.fetch(CATEGORIES_QUERY).catch(() => []),
  ])

  return (
    <StoreAdmin
      stores={stores ?? []}
      categories={categories ?? []}
      page={page}
      totalPages={totalPagesFor(total)}
      total={total}
      filters={{ q, category, status, from, to }}
    />
  )
}
