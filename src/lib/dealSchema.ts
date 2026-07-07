const CURRENCY_BY_SYMBOL: Record<string, string> = { '$': 'USD', '€': 'EUR', '£': 'GBP', '₫': 'VND', '¥': 'JPY' }

export function parsePrice(str?: string): { amount: number; currency: string } | null {
  if (!str) return null
  const symbol = str.match(/^[^0-9]+/)?.[0]?.trim() ?? '$'
  const amount = parseFloat(str.replace(/[^0-9.]/g, ''))
  if (!Number.isFinite(amount)) return null
  return { amount, currency: CURRENCY_BY_SYMBOL[symbol] ?? 'USD' }
}

type SchemaDeal = {
  title: string
  store?: string
  imageUrl?: string
  priceSale?: string
  dealUrl?: string
  expiresAt?: string
  slug?: string
}

const BASE = 'https://www.offerdy.com'

export function dealsItemListJsonLd(deals: SchemaDeal[], limit = 100) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: deals.slice(0, limit).map((deal, i) => {
      const sale = parsePrice(deal.priceSale)
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Product',
          name: deal.title,
          image: deal.imageUrl,
          brand: deal.store ? { '@type': 'Brand', name: deal.store } : undefined,
          url: deal.dealUrl ?? `${BASE}/deals`,
          offers: {
            '@type': 'Offer',
            url: deal.dealUrl ?? `${BASE}/deals`,
            priceCurrency: sale?.currency ?? 'USD',
            price: sale?.amount,
            availability: 'https://schema.org/InStock',
            priceValidUntil: deal.expiresAt,
          },
        },
      }
    }),
  }
}

type SchemaCoupon = {
  title: string
  offerText?: string
  description?: string
  couponCode?: string
  link: string
  expiresAt?: string
  store: { name: string; slug: string }
}

export function couponsItemListJsonLd(offers: SchemaCoupon[], limit = 100) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: offers.slice(0, limit).map((offer, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Offer',
        name: offer.title,
        description: offer.description || offer.offerText,
        url: offer.link,
        seller: { '@type': 'Organization', name: offer.store.name, url: `${BASE}/stores/${offer.store.slug}` },
        validThrough: offer.expiresAt,
        availability: 'https://schema.org/InStock',
        ...(offer.couponCode ? { additionalProperty: { '@type': 'PropertyValue', name: 'couponCode', value: offer.couponCode } } : {}),
      },
    })),
  }
}
