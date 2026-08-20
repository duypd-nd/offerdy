import { client as readClient } from '@/sanity/client'
import OfferAdmin from './OfferAdmin'
import { pageRange, parsePage, paramStr, totalPagesFor } from '@/lib/adminPagination'
import { BROKEN_LINK_GROQ } from '@/lib/checkOfferLink'

export const dynamic = 'force-dynamic'

const ADMIN_STORES_QUERY = `*[_type == "store" && published != false] | order(name asc) { _id, name }`

/**
 * Bo loc theo trang thai. Truoc day chi co active/inactive — nghia la moi cau hoi
 * that su can tra loi ("offer nao sap chet?", "offer nao thieu mo ta?") deu phai
 * lat tay qua 17 trang. Cac khoa duoi day chinh la cac the tren dashboard tro toi.
 */
const STATUS_CONDITION: Record<string, string> = {
  active: 'active == true',
  inactive: 'active != true',
  expired: 'active == true && defined(expiresAt) && expiresAt < now()',
  expiring: 'active == true && defined(expiresAt) && expiresAt >= now() && expiresAt <= $inSevenDays',
  // Dung CHUNG dinh nghia voi huy hieu tren bang dieu khien (BROKEN_LINK_GROQ):
  // the do dan thang toi day, nen hai dieu kien lech nhau la nguoi dung bam vao
  // con so 3 roi thay danh sach 5 dong.
  broken: `active == true && ${BROKEN_LINK_GROQ}`,
  nodesc: 'active == true && (!defined(description) || description == "")',
  // `verified == false` chu khong phai `!= true`: offer cu tao truoc khi co truong
  // nay khong he co `verified`, gop chung se bao dong ca tram muc chua tung sai.
  unverified: 'active == true && verified == false',
}

/**
 * `store->_createdAt desc` la thu tu mac dinh cu — giu nguyen de nguoi dung khong
 * mat cai da quen. `defined(expiresAt) desc` trong kieu sap "sap het han" de offer
 * KHONG co han khong tran len dau (GROQ xep null truoc gia tri).
 */
const SORT_ORDER: Record<string, string> = {
  newest: 'store->_createdAt desc',
  clicks: 'coalesce(clicks, 0) desc',
  expiring: 'defined(expiresAt) desc, expiresAt asc',
  title: 'title asc',
}

const PAGE_SIZES = [20, 50, 100]

function parseSize(value: string | string[] | undefined): number {
  const n = Number(paramStr(value))
  return PAGE_SIZES.includes(n) ? n : PAGE_SIZES[0]
}

export default async function AdminOffersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const sp = await searchParams
  const page = parsePage(sp.page)
  const size = parseSize(sp.size)
  const q = paramStr(sp.q)
  const store = paramStr(sp.store)
  const status = paramStr(sp.status)
  const sort = SORT_ORDER[paramStr(sp.sort)] ? paramStr(sp.sort) : 'newest'
  const from = paramStr(sp.from)
  const to = paramStr(sp.to)

  const conditions = ['_type == "offer"']
  const params: Record<string, unknown> = {}

  if (q) {
    // Tim ca ma giam gia va noi dung uu dai, khong chi tieu de: nguoi van hanh
    // thuong nho "SAVE20" chu khong nho ten offer da dat la gi.
    conditions.push('(title match $q || couponCode match $q || offerText match $q)')
    params.q = `*${q}*`
  }
  if (store) {
    conditions.push('store._ref == $store')
    params.store = store
  }
  if (STATUS_CONDITION[status]) {
    conditions.push(`(${STATUS_CONDITION[status]})`)
    if (status === 'expiring') {
      params.inSevenDays = new Date(new Date().getTime() + 7 * 86400000).toISOString()
    }
  }
  if (from) {
    conditions.push('_createdAt >= $from')
    params.from = `${from}T00:00:00.000Z`
  }
  if (to) {
    conditions.push('_createdAt <= $to')
    params.to = `${to}T23:59:59.999Z`
  }

  const filter = conditions.join(' && ')
  const { start, end } = pageRange(page, size)

  const LIST_QUERY = `*[${filter}] | order(${SORT_ORDER[sort]}) [${start}...${end}] {
    _id, title, active, "verified": coalesce(verified, true), "order": coalesce(order, 0),
    couponCode, link, offerText, description, expiresAt, _createdAt,
    "clicks": coalesce(clicks, 0),
    // Co canh bao tren dong dung CHINH dieu kien nay, khong tu suy lai tu
    // linkStatus o phia giao dien — de mot offer khong co link khong hien
    // "link hong" trong khi no khong co link nao de ma hong.
    "linkBroken": ${BROKEN_LINK_GROQ},
    "store": store->{ _id, name, "slug": slug.current }
  }`
  const COUNT_QUERY = `count(*[${filter}])`

  const [offers, total, stores] = await Promise.all([
    readClient.fetch(LIST_QUERY, params),
    readClient.fetch<number>(COUNT_QUERY, params),
    readClient.fetch(ADMIN_STORES_QUERY),
  ])

  return (
    <OfferAdmin
      offers={offers ?? []}
      stores={stores ?? []}
      page={page}
      pageSize={size}
      pageSizes={PAGE_SIZES}
      totalPages={totalPagesFor(total, size)}
      total={total}
      filters={{ q, store, status, sort, from, to }}
    />
  )
}
