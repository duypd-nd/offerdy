import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import './globals.css'
import { getConfigSeo, getSiteSettings } from '@/sanity/queries'

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

const DEFAULT_TITLE = 'Offerdy — Real Deals. Actually Verified.'
const DEFAULT_DESCRIPTION = 'Every coupon code tested before it goes live. No expired codes, no checkout disappointments — ever.'
const DEFAULT_KEYWORDS = ['coupon codes', 'promo codes', 'deals', 'discount codes', 'verified coupons']

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getConfigSeo()
  const title = seo.defaultTitle || DEFAULT_TITLE
  const description = seo.defaultDescription || DEFAULT_DESCRIPTION
  const titleTemplate = seo.titleTemplate?.includes('%s') ? seo.titleTemplate : '%s — Offerdy'
  const twitterCard = seo.twitterCard === 'summary' ? 'summary' : 'summary_large_image'

  return {
    metadataBase: new URL('https://www.offerdy.com'),
    title: { default: title, template: titleTemplate },
    description,
    keywords: seo.keywords?.length ? seo.keywords : DEFAULT_KEYWORDS,
    openGraph: {
      type: 'website',
      siteName: 'Offerdy',
      title,
      description,
      url: 'https://www.offerdy.com',
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
  const settings = await getSiteSettings()
  const sameAs = (settings.socialMedia ?? [])
    .map(s => s.url)
    .filter(url => url && url !== '#' && url.startsWith('http'))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://www.offerdy.com/#organization',
        name: 'Offerdy',
        url: 'https://www.offerdy.com',
        logo: {
          '@type': 'ImageObject',
          url: 'https://www.offerdy.com/icon',
          width: 32,
          height: 32,
        },
        sameAs,
      },
      {
        '@type': 'WebSite',
        '@id': 'https://www.offerdy.com/#website',
        url: 'https://www.offerdy.com',
        name: 'Offerdy',
        publisher: { '@id': 'https://www.offerdy.com/#organization' },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://www.offerdy.com/search?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }

  return (
    <html lang="en" className={`${jakartaSans.variable} ${inter.variable}`}>
      <head>
        {/* Google Tag Manager */}
        <script dangerouslySetInnerHTML={{ __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-K3N8W8B8');` }} />
      </head>
      <body>
        {/* Google Tag Manager (noscript) */}
        <noscript dangerouslySetInnerHTML={{ __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K3N8W8B8" height="0" width="0" style="display:none;visibility:hidden"></iframe>` }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
