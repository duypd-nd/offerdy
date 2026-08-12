'use client'

import type { ImageLoaderProps } from 'next/image'

// Loader anh cho next/image.
//
// Tai sao khong dung bo toi uu cua Vercel: goi Hobby co han muc bien doi anh, va
// 12/08/2026 han muc do can — moi /_next/image tren production tra ve
// 402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED, ca trang /deals mat sach anh.
// Anh cua site von da nam tren CDN cua Sanity, ma CDN do tu doi kich thuoc va
// dinh dang duoc, khong tinh vao han muc Vercel. Nen dua viec do cho Sanity.
//
// Doi lai: anh ngoai Sanity (externalImageUrl cua post/review, file trong
// /public) khong con duoc thu nho — tra nguyen ban. Chap nhan duoc vi so luong
// nho, va nguyen ban van hien thi dung, chi nang hon.
const SANITY_IMAGE_HOST = 'cdn.sanity.io'

export default function sanityImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // Duong dan noi bo (/logo.png) hoac data URI: khong parse duoc, tra nguyen ven.
  if (!src.startsWith('http://') && !src.startsWith('https://')) return src

  let url: URL
  try {
    url = new URL(src)
  } catch {
    return src
  }

  if (url.hostname !== SANITY_IMAGE_HOST) return src

  // Giu nguyen cac tham so cat anh (rect, crop, focal...) neu URL da co san;
  // chi de len ba tham so quyet dinh dung luong.
  url.searchParams.set('w', String(width))
  url.searchParams.set('q', String(quality ?? 75))
  url.searchParams.set('auto', 'format')
  // fit=max de Sanity khong phong to anh vuot qua kich thuoc goc.
  url.searchParams.set('fit', 'max')

  return url.href
}
