'use client'

import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { trackOfferClick, trackStoreClick, trackDealClick } from '@/actions/trackClick'

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
  dealId?: string
}

export default function AffiliateLink({ href, storeName, offerId, storeId, dealId, onClick, ...rest }: AffiliateLinkProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({
      event: 'affiliate_click',
      affiliate_url: href,
      store_name: storeName,
      offer_id: offerId,
      deal_id: dealId,
    })
    // Uu tien offer > store > deal: offer la don vi hep nhat, dem duoc no thi
    // suy ra store; deal la duong rieng (khong co reference toi store/offer nao).
    if (offerId) trackOfferClick(offerId).catch(() => {})
    else if (storeId) trackStoreClick(storeId).catch(() => {})
    else if (dealId) trackDealClick(dealId).catch(() => {})
    onClick?.(e)
  }

  return (
    <a href={href} target="_blank" rel="sponsored noopener noreferrer" onClick={handleClick} {...rest} />
  )
}
