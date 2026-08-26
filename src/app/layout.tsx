import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { getConfigSeo, getSiteName, getSiteSettings, getSiteBase } from '@/sanity/queries'
import { fillSiteName } from '@/lib/siteNameToken'

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-d',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-b',
  display: 'swap',
})

const DEFAULT_TAGLINE = 'Real Deals. Actually Verified.'
const DEFAULT_DESCRIPTION = 'Every coupon code tested before it goes live. No expired codes, no checkout disappointments — ever.'
const DEFAULT_KEYWORDS = ['coupon codes', 'promo codes', 'deals', 'discount codes', 'verified coupons']

export async function generateMetadata(): Promise<Metadata> {
  const [seo, siteName] = await Promise.all([getConfigSeo(), getSiteName()])
  // ⚠️ Ba o nay nam trong `configSEO`, KHONG phai `configGeneral` — va chung deu
  // co the mang ten thuong hieu. Cho o `{site}` chay qua day de doi ten mot lan
  // o *Cau hinh chung* la keo theo ca tieu de mac dinh lan mau tieu de.
  const n = (t: string) => fillSiteName(t, siteName)
  const title = n(seo.defaultTitle || `${siteName} — ${DEFAULT_TAGLINE}`)
  const description = n(seo.defaultDescription || DEFAULT_DESCRIPTION)
  const titleTemplate = seo.titleTemplate?.includes('%s') ? n(seo.titleTemplate) : `%s — ${siteName}`
  const twitterCard = seo.twitterCard === 'summary' ? 'summary' : 'summary_large_image'
  // O *Canonical URL* o `/admin/config/seo` cuoi cung cung di toi mot cho. Truoc
  // 26/08 no la mot O CHET: code doc gia tri ve roi khong dung, con goc dia chi
  // thi ghi cung ngay day — nen suot thoi gian o do mang gia tri sai
  // `https://.offerdy.com/`, trang van khai canonical dung, va sua o do khong doi
  // duoc gi. `siteBaseUrl()` loc gia tri hong (xem chu thich trong file do).
  // ⚠️ 27/08: doc qua `getSiteBase()` chu KHONG con `siteBaseUrl(seo.canonicalUrl)`.
  // `getConfigSeo()` di qua CDN Sanity (useCdn: true) nen o day con giu gia tri cu
  // toi ~60s (do 26/08: CDN mat ~106s) trong khi sitemap/robots/llms.txt da doi
  // ngay — dung "mot nguon su that ma hai duong doc" ma chu thich o duoi canh bao.
  const base = await getSiteBase()

  return {
    metadataBase: new URL(base),
    title: { default: title, template: titleTemplate },
    description,
    keywords: seo.keywords?.length ? seo.keywords : DEFAULT_KEYWORDS,
    openGraph: {
      type: 'website',
      siteName,
      // Thieu og:locale thi Facebook/LinkedIn tu DOAN ngon ngu tu chu trong the xem
      // truoc — doan sai thi hien nham font va nham huong doc. Khai thang ra re hon.
      // Khong khai hreflang o day: hreflang de chi cac BAN NGON NGU KHAC cua cung mot
      // trang. Site mot ngon ngu ma tu tro vao chinh minh thi khong noi gi voi Google.
      locale: 'en_US',
      title,
      description,
      url: base,
      // og:image khong khai bao o day - duoc Next.js tu dong lay tu file-convention
      // route opengraph-image.tsx (route nay tu doc configSeo.defaultOgImageUrl)
    },
    twitter: {
      card: twitterCard,
      title,
      description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
    },
    verification: seo.googleSiteVerification ? { google: seo.googleSiteVerification } : undefined,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, siteName, seo] = await Promise.all([getSiteSettings(), getSiteName(), getConfigSeo()])
  // Cung mot goc dia chi voi `generateMetadata` o tren. Neu de hai noi tu ghi
  // cung thi doi ten mien se lam du lieu co cau truc tro ve dia chi cu trong khi
  // the canonical da doi — dung ho loi "mot nguon su that ma hai duong doc" da
  // tra gia hom 25/08 voi `getSiteSettings()` va ten website.
  const base = await getSiteBase()
  const sameAs = (settings.socialMedia ?? [])
    .map(s => s.url)
    .filter(url => url && url !== '#' && url.startsWith('http'))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: siteName,
        url: base,
        logo: {
          '@type': 'ImageObject',
          url: `${base}/icon`,
          width: 32,
          height: 32,
        },
        sameAs,
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: base,
        name: siteName,
        publisher: { '@id': `${base}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${base}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }

  return (
    <html lang="en" className={`${jakartaSans.variable} ${inter.variable}`}>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript dangerouslySetInnerHTML={{ __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K3N8W8B8" height="0" width="0" style="display:none;visibility:hidden"></iframe>` }} />
        {/*
          Tat do luong cho chinh nguoi van hanh.

          Do ngay 2026-08-03: trong 765 luot xem trang (da bo /admin), **709 den tu
          Viet Nam** va rieng Nam Dinh la 279 — tuc phan lon "khach" la chinh nguoi
          quan tri duyet cac trang cong khai. Bo loc `/admin` khong bat duoc viec do.
          Hau qua: moi ty le tinh tren mau so nay deu sai, va sai theo huong lam
          site trong te hon thuc te o phia khach nuoc ngoai.

          `window['ga-disable-<ID>'] = true` la co che tu choi do luong CHINH THUC
          cua Google — dat truoc khi gtag chay thi GA4 khong gui bat ky su kien nao.
          Chon cach nay thay vi loc theo IP trong GA4: mang gia dinh o VN doi IP
          thuong xuyen, va khi IP doi thi bo loc IP hong mot cach IM LANG — so lieu
          lai ban ma khong co dau hieu gi.

          Bat/tat o /notrack. `beforeInteractive` de co nay duoc dat TRUOC GTM;
          dat sau thi vai su kien dau tien da kip gui di.
        */}
        <Script id="ga-optout" strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: `try{if(document.cookie.indexOf('ofd_notrack=1')>-1){window['ga-disable-G-0H313ZSF8K']=true}}catch(e){}` }}
        />
        {/* Google Tag Manager */}
        <Script
          id="gtm"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-K3N8W8B8');` }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
