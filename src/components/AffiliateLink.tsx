'use client'

import type { AnchorHTMLAttributes, MouseEvent } from 'react'

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}

type AffiliateLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  storeName?: string
  offerId?: string
}

export default function AffiliateLink({ href, storeName, offerId, onClick, ...rest }: AffiliateLinkProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'affiliate_click',
      affiliate_url: href,
      store_name: storeName,
      offer_id: offerId,
    })
    onClick?.(e)
  }

  return (
    <a href={href} target="_blank" rel="sponsored noopener noreferrer" onClick={handleClick} {...rest} />
  )
}
