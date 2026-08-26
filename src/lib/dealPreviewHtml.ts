import { dealDiscountBadge } from './dealDiscountLabel'

export type PreviewDeal = {
  code: number
  title: string
  slug: string
  priceSale: string
  priceOrig?: string
  discount: number
  discountByAmount?: boolean
  summary?: string
  metaDescription?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * Trang HTML nho chi de BOT DOC LINK PREVIEW dung the OG (Messenger, Zalo, Slack,
 * Telegram, X...). Nguoi that van duoc redirect nhu binh thuong.
 *
 * Vi sao can:
 * - /g/<ma> redirect THANG ra merchant, nen bot preview di theo va lay the OG cua
 *   MERCHANT. Dan link vao Messenger se ra thuong hieu cua ho chu khong phai cua
 *   minh — mat ca nhan dien lan anh san pham/gia da dung cong lam.
 * - /d/<ma> thi bot co di theo redirect ve trang deal that (da kiem chung voi
 *   facebookexternalhit), nen the OG van dung. Tra HTML o day chi de bot ARE
 *   khong phai di them mot vong, va de nhung client KHONG di theo redirect
 *   (mot so trinh nhan tin) cung co the.
 *
 * Anh: dung thang route opengraph-image cua trang deal — no da co san layout
 * rieng cho deal (anh san pham to + gia + % giam, xem src/lib/ogTemplate.tsx).
 * URL that Next.js sinh ra co them query hash de bust cache, nhung ban khong kem
 * query van tra ve dung anh (da kiem chung: 200 image/png) — nen khong phai doan
 * chuoi hash.
 */
export function dealPreviewHtml(deal: PreviewDeal, opts: { target: string; siteName: string; base: string }): string {
  const badge = dealDiscountBadge(deal)
  const discount = `${badge.main}${badge.sub ? ` ${badge.sub}` : ''}`
  const title = `${deal.title} — ${discount}`
  const description = deal.metaDescription
    || deal.summary
    || `${deal.priceSale}${deal.priceOrig ? `, was ${deal.priceOrig}` : ''} — ${discount} on ${opts.siteName}.`
  const image = `${opts.base}/deals/${deal.slug}/opengraph-image`
  const canonical = `${opts.base}/deals/${deal.slug}`

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<!-- Trang nay chi ton tai cho bot preview; ban that de nguoi doc la ${escapeHtml(canonical)} -->
<meta name="robots" content="noindex,nofollow">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="${escapeHtml(opts.siteName)}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;padding:40px;text-align:center">
<h1 style="font-size:20px">${escapeHtml(deal.title)}</h1>
<p style="color:#555">${escapeHtml(discount)} — ${escapeHtml(deal.priceSale)}</p>
<!-- Khong dung meta refresh: mot so bot preview se di theo no va quay lai dung
     van de dang tranh. Nguoi that gan nhu khong bao gio thay trang nay (chi khi
     UA cua ho trung mau bot preview); cho ho mot link ro rang la du. -->
<p><a href="${escapeHtml(opts.target)}">Continue to the deal &rarr;</a></p>
</body>
</html>`
}
