'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Store } from '@/data/stores'

export default function StoresTicker({ stores }: { stores: Store[] }) {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const singleSetWidth = track.scrollWidth / 2
    const pixelsPerSecond = 40
    const duration = singleSetWidth / pixelsPerSecond
    track.style.animation = `slide-left ${duration}s linear infinite`
  }, [stores])

  const doubled = [...stores, ...stores]

  return (
    <div className="section" style={{ paddingBottom: 0 }}>
      <div className="section-header">
        <div>
          <div className="section-title">Featured Stores</div>
          <div className="section-sub">Active deals from the world&rsquo;s top brands</div>
        </div>
        <Link href="/stores" className="see-all">All stores →</Link>
      </div>
      <div className="stores-outer">
        <div className="stores-track" ref={trackRef}>
          {doubled.map((store, i) => (
            <Link
              key={i}
              href={`/stores/${store.slug ?? store.name.toLowerCase().replace(/\s+/g, '-')}`}
              className="store-card"
              aria-hidden={i >= stores.length ? 'true' : undefined}
            >
              <div className={`store-ticker-img ${store.imageUrl ? 'store-ticker-img--logo' : (store.colorClass ?? '')}`}>
                {store.imageUrl
                  // contain (khong phai cover) de khong cat mat logo — dong bo voi card /stores
                  ? <Image src={store.imageUrl} alt={store.name} fill sizes="72px" style={{ objectFit: 'contain' }} />
                  : <span style={{ fontFamily: 'var(--font-d),system-ui,sans-serif', fontSize: 16, fontWeight: 800, color: 'white' }}>{store.abbr}</span>
                }
              </div>
              <div className="store-name">{store.name}</div>
              <div className="store-count">{store.count}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
