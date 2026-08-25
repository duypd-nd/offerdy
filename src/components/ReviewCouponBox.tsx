'use client'

import { useState } from 'react'
import { copyText } from '@/lib/copyText'

/**
 * Hop hien ma coupon. Dung o hai noi voi hai cach noi KHAC NHAU, va khac biet do
 * la co y:
 *
 * - Trang review: ma da duoc gan tay cho dung bai review do -> noi chac chan.
 * - Trang deal: ma duoc suy ra tu SHOP ma deal dan toi (xem src/lib/dealStoreMatch.ts),
 *   la ma TOAN SHOP chu khong phai ma rieng cho san pham. Nhieu shop loai tru hang
 *   dang giam gia khoi ma, nen loi van phai noi dung muc do biet: "shop nay dang
 *   co ma X, thu o buoc thanh toan". Hua ma ap dung roi khach bi tu choi luc tra
 *   tien thi mat long tin nhieu hon la khong hien gi.
 */
export default function ReviewCouponBox({
  code,
  link,
  eyebrow,
  heading,
  sub,
  note,
  siteName,
}: {
  code: string
  link?: string | null
  eyebrow?: React.ReactNode
  heading?: string
  sub?: string
  note?: string
  /**
   * Ten website, do trang cha truyen xuong. Component nay la 'use client' nen
   * khong tu hoi Sanity duoc — moi noi goi phai `await getSiteName()` roi day vao.
   */
  siteName: string
}) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void copyText(code).then(ok => {
      if (!ok) { window.prompt('Copy code:', code); return }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <aside className="rv-coupon" aria-label="Discount code">
      <div className="rv-coupon-head">
        <p className="rv-coupon-eyebrow">
          {eyebrow ?? <>Exclusive Deal from <span className="rv-coupon-brand">{siteName}</span></>}
        </p>
        <h3 className="rv-coupon-heading">{heading ?? 'Save More on Your Order Today'}</h3>
        <p className="rv-coupon-sub">{sub ?? `Use this exclusive ${siteName} code at checkout for an extra discount.`}</p>
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
        {note ?? (
          <>
            Coupon courtesy of <a href="https://www.offerdy.com/" rel="noopener" target="_blank">Offerdy.com</a> · Apply code <strong>{code}</strong> at checkout.
          </>
        )}
      </p>
    </aside>
  )
}
