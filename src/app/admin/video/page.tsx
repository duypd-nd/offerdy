import type { Metadata } from 'next'
import { client as readClient } from '@/sanity/client'
import { requireAdmin } from '@/lib/adminSession'
import VideoStudioClient from './VideoStudioClient'

export const metadata: Metadata = { title: 'Tạo video — Offerdy Admin' }
export const dynamic = 'force-dynamic'

export type DealChon = {
  code: number
  title: string
  store?: string
  priceSale?: string
  priceOrig?: string
  discount?: number
  imageUrl?: string
  coDealUrl: boolean
}

/**
 * Tạo video sản phẩm từ một deal có sẵn.
 *
 * Chỉ liệt kê deal **có link sản phẩm** — không có link thì chỉ lấy được một ảnh
 * trong kho, và video một ảnh thì nhìn như ảnh tĩnh chứ không phải video.
 */
export default async function VideoPage() {
  await requireAdmin()

  const deals = await readClient.fetch<DealChon[]>(
    `*[_type == "deal" && defined(image) && defined(dealUrl)] | order(_createdAt desc)[0...120]{
      code, title, store, priceSale, priceOrig, discount,
      "imageUrl": image.asset->url + "?w=160&h=160&fit=crop&auto=format",
      "coDealUrl": defined(dealUrl)
    }`
  )

  return <VideoStudioClient deals={deals ?? []} />
}
