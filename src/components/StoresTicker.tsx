'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import type { Store } from '@/data/stores'

export default function StoresTicker({ stores }: { stores: Store[] }) {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.cssText += 'animation:slide-left 32s linear infinite!important;'
    }
  }, [])

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
              <div className={`store-ticker-img ${store.colorClass ?? ''}`}>
                {store.imageUrl
                  ? <img src={store.imageUrl} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
