import { ImageResponse } from 'next/og'
import { writeClient } from '@/sanity/writeClient'
import { SocialPostImage, SOCIAL_FORMATS, type SocialFormat } from '@/lib/ogTemplate'
import { dealDiscountBadge } from '@/lib/dealDiscountLabel'
import { parseDealCode } from '@/lib/dealCode'

/**
 * Anh san sang dang cho mot deal — 1080x1350 (feed) hoac 1080x1920 (story/reel).
 *
 * Dung lai chinh ky thuat da co cho anh OG (`next/og` + `src/lib/ogTemplate.tsx`):
 * khong goi AI, khong ton phi, khong them dich vu nao. Chi khac layout va ti le —
 * OG la 1200x630 ngang, feed va story deu doc.
 *
 * Nam duoi /admin nen da co Basic Auth cua proxy.ts bao ve; trinh duyet dang dang
 * nhap admin nen the <a download> tai duoc thang, khong can xu ly auth rieng.
 */
export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  const parsed = parseDealCode(code)
  if (parsed === null) return new Response('Mã không hợp lệ', { status: 400 })

  const fmt = new URL(request.url).searchParams.get('format')
  const format: SocialFormat = fmt === 'story' ? 'story' : 'feed'

  const deal = await writeClient.fetch<{
    code: number; title: string; priceSale: string; priceOrig?: string
    discount: number; discountByAmount?: boolean; imageUrl?: string
  } | null>(
    `*[_type == "deal" && code == $code][0]{
      code, title, priceSale, priceOrig, discount, discountByAmount,
      "imageUrl": image.asset->url
    }`,
    { code: parsed }
  )
  if (!deal) return new Response(`Không tìm thấy deal #${parsed}`, { status: 404 })

  const badge = dealDiscountBadge(deal)

  return new ImageResponse(
    (
      <SocialPostImage
        format={format}
        title={deal.title}
        priceSale={deal.priceSale}
        priceOrig={deal.priceOrig}
        badgeMain={badge.main}
        badgeSub={badge.sub}
        imageUrl={deal.imageUrl}
        code={deal.code}
      />
    ),
    { ...SOCIAL_FORMATS[format] }
  )
}
