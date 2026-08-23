import fs from 'node:fs'
import path from 'node:path'
import type { Metadata } from 'next'
import { client } from '@/sanity/client'
import { requireAdmin } from '@/lib/adminSession'
import VideoStudioClient from './VideoStudioClient'

export const metadata: Metadata = { title: 'Tạo video — Offerdy Admin' }
export const dynamic = 'force-dynamic'

/**
 * ⚠️ `useCdn: false` — do that 2026-08-23: tick "co video" ghi xong, doc lai bang
 * CDN van tra ban CU nen tai lai trang thi dau BIEN MAT, trong nhu khong luu duoc.
 * `force-dynamic` khong cuu duoc: no bo cache cua Next, con day la cache cua Sanity.
 * Dung `withConfig` thay vi `writeClient` de duong doc nay khong can token ghi —
 * cung ly do da ghi o /admin/ai-review.
 */
const readClient = client.withConfig({ useCdn: false })

export type DealChon = {
  code: number
  title: string
  store?: string
  priceSale?: string
  priceOrig?: string
  discount?: number
  imageUrl?: string
  coDealUrl: boolean
  /** Thoi diem bam "Danh dau da dang" — cung o `lastPostedAt` ma /admin/social-kit dung. */
  daDangLuc?: string
  /** Nguoi van hanh tu tick "co video" — luu trong Sanity nen o dau cung dung. */
  coVideoTay?: string
  /** Tim thay tep `out/deal-<ma>-*.mp4` tren MAY NAY. Xem canh bao ben duoi. */
  coVideoTep: boolean
}

/**
 * Quet `out/` tim ma deal da dung video.
 *
 * ⚠️ Chi dung tren MAY CUC BO. `video-render.mjs` khong chay duoc tren Vercel
 * (ffmpeg), nen tren production thu muc nay rong va moi deal se hien "chua dung".
 * Vi vay dau "da dung" chi la goi y phu; dau THAT de biet viec da xong hay chua
 * la `lastPostedAt` — no nam trong Sanity nen o dau cung doc duoc.
 */
function maDaDungVideo(): Set<number> {
  const ra = new Set<number>()
  try {
    for (const ten of fs.readdirSync(path.join(process.cwd(), 'out'))) {
      const m = /^deal-(\d+)-.*\.mp4$/.exec(ten)
      if (m) ra.add(Number(m[1]))
    }
  } catch {
    // Khong co thu muc `out/` (production) — coi nhu chua dung cai nao.
  }
  return ra
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
    readClient.fetch<Omit<DealChon, 'coVideoTep'>[]>(
      `*[_type == "deal" && defined(image) && defined(dealUrl)] | order(_createdAt desc){
        code, title, store, priceSale, priceOrig, discount,
        "imageUrl": image.asset->url + "?w=160&h=160&fit=crop&auto=format",
        "coDealUrl": defined(dealUrl),
        "daDangLuc": lastPostedAt,
        "coVideoTay": videoMadeAt
      }`
    ),
    // Deal khong co anh thi khong dung video duoc. Dem chung ra de nguoi dung
    // biet vi sao danh sach it hon tong so deal, thay vi tu hoi.
    readClient.fetch<number>(`count(*[_type == "deal" && !defined(image)])`),
  ])

  const coTep = maDaDungVideo()
  const danhSach: DealChon[] = (deals ?? []).map(d => ({ ...d, coVideoTep: coTep.has(d.code) }))

  return <VideoStudioClient deals={danhSach} soThieuAnh={soThieuAnh ?? 0} />
}
