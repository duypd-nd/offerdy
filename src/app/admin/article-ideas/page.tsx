import { client as readClient } from '@/sanity/client'
import ArticleIdeasClient from './ArticleIdeasClient'

export const dynamic = 'force-dynamic'

export type StoreRow = {
  id: string
  name: string
  website?: string
  slug?: string
  category?: string
  /** So bai viet da lay shop nay lam nguon — de biet shop nao con chua duoc khai thac. */
  posts: number
}

export default async function ArticleIdeasPage() {
  const stores = await readClient.fetch<StoreRow[]>(
    `*[_type == "store" && defined(website)] {
      "id": _id,
      name,
      website,
      "slug": slug.current,
      category,
      "posts": count(*[_type == "post" && sourceStore._ref == ^._id])
    } | order(posts asc, name asc)`
  )

  return <ArticleIdeasClient stores={stores} />
}
