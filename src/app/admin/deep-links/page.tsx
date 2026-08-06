import { client as readClient } from '@/sanity/client'
import { meaningfulTokens } from '@/lib/productMatch'
import DeepLinksClient from './DeepLinksClient'

export const dynamic = 'force-dynamic'

export type StoreRow = {
  id: string
  name: string
  website?: string
  slug?: string
  /** Offer active cua shop. */
  total: number
  withProductUrl: number
  /**
   * Offer CO THE tro toi mot san pham — tuc `total` tru di cac uu dai ap cho ca shop.
   * Day moi la mau so that; xem chu thich trong `DeepLinksPage`.
   */
  linkable: number
}

/**
 * ⚠️ Mau so phai la offer CO THE tro san pham, khong phai tong so offer.
 *
 * Do that: 180 offer chua co link, nhung **114 trong so do la uu dai ap cho ca shop**
 * ("20% Off On Your Order at X", "Free shipping on All orders") — chung khong co san
 * pham cu the de tro toi, va bo qua chung la DUNG. Dem chung vao mau so thi thanh tien
 * do doi mot con so **khong bao gio dat duoc**, va nguoi van hanh duoi mot dich khong
 * ton tai. Cung benh voi "500+ stores" tren `/about` khi site chi co 80.
 */
export default async function DeepLinksPage() {
  const raw = await readClient.fetch<(Omit<StoreRow, 'linkable'> & { missingTitles: string[] })[]>(
    `*[_type == "store" && count(*[_type == "offer" && store._ref == ^._id && active == true]) > 0] {
      "id": _id,
      name,
      website,
      "slug": slug.current,
      "total": count(*[_type == "offer" && store._ref == ^._id && active == true]),
      "withProductUrl": count(*[_type == "offer" && store._ref == ^._id && active == true && defined(productUrl)]),
      "missingTitles": *[_type == "offer" && store._ref == ^._id && active == true && !defined(productUrl)].title
    } | order(withProductUrl asc, total desc)`
  )

  const stores: StoreRow[] = raw.map(s => ({
    id: s.id,
    name: s.name,
    website: s.website,
    slug: s.slug,
    total: s.total,
    withProductUrl: s.withProductUrl,
    // Offer da co link thi tinh la tro duoc — nguoi van hanh da quyet dinh roi.
    linkable:
      s.withProductUrl +
      (s.missingTitles ?? []).filter(t => meaningfulTokens(t, s.name).length >= 2).length,
  }))

  const linkable = stores.reduce((sum, s) => sum + s.linkable, 0)
  const done = stores.reduce((sum, s) => sum + s.withProductUrl, 0)
  const storeWide = stores.reduce((sum, s) => sum + (s.total - s.linkable), 0)

  return <DeepLinksClient stores={stores} linkableOffers={linkable} doneOffers={done} storeWideOffers={storeWide} />
}
