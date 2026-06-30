import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import './globals.css'

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

export const metadata: Metadata = {
  metadataBase: new URL('https://offerdy.com'),
  title: {
    default: 'Offerdy — Real Deals. Actually Verified.',
    template: '%s — Offerdy',
  },
  description: 'Every coupon code tested before it goes live. No expired codes, no checkout disappointments — ever.',
  keywords: ['coupon codes', 'promo codes', 'deals', 'discount codes', 'verified coupons'],
  openGraph: {
    type: 'website',
    siteName: 'Offerdy',
    title: 'Offerdy — Real Deals. Actually Verified.',
    description: 'Every coupon code tested before it goes live. No expired codes, no checkout disappointments — ever.',
    url: 'https://offerdy.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Offerdy — Real Deals. Actually Verified.',
    description: 'Every coupon code tested before it goes live. No expired codes, no checkout disappointments — ever.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://offerdy.com/#organization',
      name: 'Offerdy',
      url: 'https://offerdy.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://offerdy.com/icon',
        width: 32,
        height: 32,
      },
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://offerdy.com/#website',
      url: 'https://offerdy.com',
      name: 'Offerdy',
      publisher: { '@id': 'https://offerdy.com/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://offerdy.com/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakartaSans.variable} ${inter.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  )
}
