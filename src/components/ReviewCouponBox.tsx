'use client'

import { useState } from 'react'

export default function ReviewCouponBox({ code, link }: { code: string; link?: string | null }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <aside className="rv-coupon" aria-label="Exclusive Offerdy discount code">
      <div className="rv-coupon-head">
        <p className="rv-coupon-eyebrow">Exclusive Deal from <span className="rv-coupon-brand">Offerdy</span></p>
        <h3 className="rv-coupon-heading">Save More on Your Order Today</h3>
        <p className="rv-coupon-sub">Use this exclusive Offerdy code at checkout for an extra discount.</p>
      </div>
      <div className="rv-coupon-row">
        <button type="button" className={`rv-coupon-code${copied ? ' is-copied' : ''}`} onClick={copy} aria-label="Copy coupon code">
          <span className="rv-coupon-copied">Copied!</span>
          <small>Code</small>{code}
        </button>
        {link && (
          <a className="rv-coupon-btn" href={link} target="_blank" rel="sponsored noopener noreferrer">
            Get Code &amp; Shop →
          </a>
        )}
      </div>
      <p className="rv-coupon-foot">
        Coupon courtesy of <a href="https://www.offerdy.com/" rel="noopener" target="_blank">Offerdy.com</a> · Apply code <strong>{code}</strong> at checkout.
      </p>
    </aside>
  )
}
