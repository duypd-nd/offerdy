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

  // ⚠️ KHONG cat bot danh sach. Do that 2026-08-22: gioi han `[0...120]` o day
  // cong voi `.slice(0, 60)` o client lam nguoi dung chi thay 60 trong 448 deal
  // — va khong co gi bao rang danh sach da bi cat. Moi dong chi vai truong, con
  // anh thi next/image tu tai tre khi cuon toi, nen 448 dong khong nang.
  const [deals, soThieuAnh] = await Promise.all([
    readClient.fetch<DealChon[]>(
      `*[_type == "deal" && defined(image) && defined(dealUrl)] | order(_createdAt desc){
        code, title, store, priceSale, priceOrig, discount,
        "imageUrl": image.asset->url + "?w=160&h=160&fit=crop&auto=format",
        "coDealUrl": defined(dealUrl)
      }`
    ),
    // Deal khong co anh thi khong dung video duoc. Dem chung ra de nguoi dung
    // biet vi sao danh sach it hon tong so deal, thay vi tu hoi.
    readClient.fetch<number>(`count(*[_type == "deal" && !defined(image)])`),
  ])

  return <VideoStudioClient deals={deals ?? []} soThieuAnh={soThieuAnh ?? 0} />
}
