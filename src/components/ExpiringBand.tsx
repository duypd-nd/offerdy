'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { ExpiringDeal } from '@/data/deals'

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const getSeconds = () => Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  const [secs, setSecs] = useState<number | null>(null)

  useEffect(() => {
    setSecs(getSeconds())
    const id = setInterval(() => setSecs(getSeconds()), 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  if (secs === null) return <span className="exp-time">--:--</span>

  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const display = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  return <span className="exp-time">{display}</span>
}

export default function ExpiringBand({ deals }: { deals: ExpiringDeal[] }) {
  return (
    <div className="expiring-band">
      <div className="expiring-inner">
        <div className="expiring-hdr">
          <div className="exp-title">⏰ Expiring Soon</div>
          <div className="exp-urgency">Limited time left</div>
        </div>
        <div className="expiring-scroll">
          {deals.map(deal => (
            <div key={deal.id} className="exp-card">
              <div className="exp-icon">
                {deal.imageUrl
                  ? <Image src={deal.imageUrl} alt={deal.name} fill sizes="72px" style={{ objectFit: 'cover' }} />
                  : deal.emoji}
              </div>
              <div className="exp-body">
                <div className="exp-info">
                  <div className="exp-name">{deal.name}</div>
                  <div className="exp-price">{deal.price}</div>
                </div>
                <div className="exp-timer">
                  <CountdownTimer expiresAt={deal.expiresAt} />
                  <div className="exp-tlbl">left</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
