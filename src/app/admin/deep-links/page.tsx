import { writeClient } from '@/sanity/writeClient'
import DeepLinksClient from './DeepLinksClient'

export const dynamic = 'force-dynamic'

export type StoreRow = {
  id: string
  name: string
  website?: string
  slug?: string
  total: number
  withProductUrl: number
}

export default async function DeepLinksPage() {
  const stores = await writeClient.fetch<StoreRow[]>(
    `*[_type == "store" && count(*[_type == "offer" && store._ref == ^._id && active == true]) > 0] {
      "id": _id,
      name,
      website,
      "slug": slug.current,
      "total": count(*[_type == "offer" && store._ref == ^._id && active == true]),
      "withProductUrl": count(*[_type == "offer" && store._ref == ^._id && active == true && defined(productUrl)])
    } | order(withProductUrl asc, total desc)`
  )

  const total = stores.reduce((sum, s) => sum + s.total, 0)
  const done = stores.reduce((sum, s) => sum + s.withProductUrl, 0)

  return <DeepLinksClient stores={stores} totalOffers={total} doneOffers={done} />
}
