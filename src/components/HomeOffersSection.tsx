import OfferCard from './OfferCard'
import type { Offer } from '@/sanity/queries'

export default function HomeOffersSection({ offers }: { offers: Offer[] }) {
  if (!offers.length) return null

  return (
    <section className="offers-section">
      <div className="offers-section-inner">
        <div className="section-header">
          <div>
            <div className="section-title">🎁 Active Offers &amp; Coupons</div>
            <div className="section-sub">{offers.length} verified offer{offers.length !== 1 ? 's' : ''} · updated daily</div>
          </div>
        </div>
        <div className="offers-grid">
          {offers.slice(0, 6).map(offer => (
            <OfferCard key={offer.id} offer={offer} />
          ))}
        </div>
      </div>
    </section>
  )
}
