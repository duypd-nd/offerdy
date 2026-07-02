'use client'

import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { trackOfferClick, trackStoreClick } from '@/actions/trackClick'

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}

type AffiliateLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  storeName?: string
  offerId?: string
  storeId?: string
}

export default function AffiliateLink({ href, storeName, offerId, storeId, onClick, ...rest }: AffiliateLinkProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'affiliate_click',
      affiliate_url: href,
      store_name: storeName,
      offer_id: offerId,
    })
    if (offerId) trackOfferClick(offerId).catch(() => {})
    else if (storeId) trackStoreClick(storeId).catch(() => {})
    onClick?.(e)
  }

  return (
    <a href={href} target="_blank" rel="sponsored noopener noreferrer" onClick={handleClick} {...rest} />
  )
}
