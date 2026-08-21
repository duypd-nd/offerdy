'use server'

import { writeClient } from '@/sanity/writeClient'
import { revalidatePath } from 'next/cache'
import { fetchProductCatalog, suggestProducts, meaningfulTokens } from '@/lib/productCatalog'
import { isLinkableOffer } from '@/lib/storeWideOffer'
import { validateProductUrl } from '@/lib/affiliateUrl'

export type OfferSuggestion = {
  offerId: string
  offerTitle: string
  /** Rong = khong tim duoc san pham nao khop du diem. */
  suggestions: { url: string; title: string; score: number }[]
  /** Offer noi ve ca shop ("10% Off On Your Order at X") — co tinh khong goi y. */
  storeWide: boolean
}

export type ExistingLink = { offerId: string; offerTitle: string; productUrl: string }

export type ScanResult =
  | {
      ok: true
      source: 'shopify' | 'sitemap'
      productCount: number
      offers: OfferSuggestion[]
      /** Offer da co link — de con duong go ra khi trang san pham chet/dan nham. */
      existing: ExistingLink[]
    }
  | { ok: false; error: string }

/**
 * Quet danh muc san pham cong khai cua mot store roi goi y URL cho tung offer
 * chua co `productUrl`.
 *
 * ⚠️ CHI DOC — khong ghi gi vao Sanity. Nguoi van hanh xem roi bam luu. Goi y sai
 * ma tu dong ghi thi se dan khach toi nham san pham, tra gia dat hon nhieu so
 * voi viec de ho tu bam them mot nut.
 */
export async function scanStoreCatalog(storeId: string): Promise<ScanResult> {
  const store = await writeClient.fetch<{
    name?: string
    website?: string
    offers: { id: string; title: string }[]
    existing: { id: string; title: string; productUrl: string }[]
  } | null>(
    `*[_type == "store" && _id == $storeId][0]{
      name,
      website,
      "offers": *[_type == "offer" && store._ref == ^._id && active == true && !defined(productUrl)]
        | order(_createdAt asc) { "id": _id, title },
      "existing": *[_type == "offer" && store._ref == ^._id && active == true && defined(productUrl)]
        | order(_createdAt asc) { "id": _id, title, productUrl }
    }`,
    { storeId }
  )

  if (!store) return { ok: false, error: 'Khong tim thay store' }
  if (!store.website) return { ok: false, error: 'Store chua co website nen khong biet quet o dau' }

  const catalog = await fetchProductCatalog(store.website)
  if (!catalog.ok) return { ok: false, error: catalog.error }

  return {
    ok: true,
    source: catalog.source,
    productCount: catalog.products.length,
    existing: store.existing.map(o => ({ offerId: o.id, offerTitle: o.title, productUrl: o.productUrl })),
    offers: store.offers.map(offer => ({
      offerId: offer.id,
      offerTitle: offer.title,
      // ⚠️ Ten shop phai bi loai truoc khi quyet dinh — xem chu thich cua
      // `meaningfulTokens`. Khong loai thi *"20% Off On Your Order at VisoOne Eyewear"*
      // khong bi coi la uu dai ca shop va nhan bon goi y 50% vo nghia.
      //
      // ⚠️ Nhung rieng dem tu KHONG DU. `isLinkableOffer` bat them cac cum "ap
      // cho ca don hang" bang nam thu tieng ("Kostenloser Versand",
      // "GRATIS VERZENDING", "Livraison Offerte", "30 DAYS RETURN"...). Phai
      // dung CHUNG ham voi `page.tsx`, neu khong bang quet va thanh tien do se
      // noi hai con so khac nhau tren cung mot man hinh.
      storeWide: !isLinkableOffer(offer.title, meaningfulTokens(offer.title, store.name).length),
      suggestions: suggestProducts(offer.title, catalog.products, { storeName: store.name }).map(s => ({
        url: s.url,
        title: s.title,
        score: s.score,
      })),
    })),
  }
}

/**
 * Ghi `productUrl` cho cac offer nguoi van hanh da duyet. Van di qua
 * `validateProductUrl` du URL den tu chinh sitemap cua shop: o nay cung nhan
 * URL go tay, va canh bao khac-domain la thu dang biet o ca hai duong.
 */
export async function saveProductUrls(
  entries: { offerId: string; productUrl: string }[]
): Promise<{ saved: number; errors: string[] }> {
  const errors: string[] = []
  let saved = 0

  for (const entry of entries) {
    const url = entry.productUrl.trim()
    if (!url) continue

    const store = await writeClient.fetch<{ affiliateLink?: string; website?: string } | null>(
      `*[_type == "offer" && _id == $offerId][0].store->{affiliateLink, website}`,
      { offerId: entry.offerId }
    )
    const checked = validateProductUrl(url, store ?? {})
    if (!checked.ok) {
      errors.push(`${entry.offerId}: ${checked.error}`)
      continue
    }
    if (checked.warning) errors.push(`${entry.offerId}: ${checked.warning}`)

    try {
      await writeClient.patch(entry.offerId).set({ productUrl: checked.value }).commit()
      saved++
    } catch (err) {
      errors.push(`${entry.offerId}: ${String(err)}`)
    }
  }

  if (saved) {
    revalidatePath('/admin/deep-links')
    revalidatePath('/admin/offers')
    revalidatePath('/stores/[slug]', 'page')
    revalidatePath('/coupon-codes')
    revalidatePath('/flash-sales')
  }
  return { saved, errors }
}

/** Go link san pham khoi mot offer (khi trang san pham chet hoac dan nham). */
export async function clearProductUrl(offerId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await writeClient.patch(offerId).unset(['productUrl']).commit()
    revalidatePath('/admin/deep-links')
    revalidatePath('/stores/[slug]', 'page')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
