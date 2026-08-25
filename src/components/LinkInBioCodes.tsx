'use client'

import { useState } from 'react'
import { copyText } from '@/lib/copyText'
import Link from 'next/link'
import AffiliateLink from '@/components/AffiliateLink'
import type { Offer } from '@/sanity/queries'

/**
 * Ma giam gia tren trang link-in-bio.
 *
 * Vi sao khoi nay phai o day: `/links` la trang duy nhat traffic Instagram/TikTok
 * do ve, ma MA COUPON la tai san manh nhat cho dung hai nen tang do — GoAffPro ghi
 * nhan don qua CA MA, nen khach dung ma la don ve minh KE CA KHI HO KHONG BAM LINK.
 * Truoc day ma chi nam sau mot chip nho dan tiep sang /coupon-codes, tuc them mot
 * lan bam giua nguoi xem va thu de ho mua.
 *
 * Bam vao ma = copy. Nut "Shop" di qua AffiliateLink nen van dem duoc click va van
 * mang `rel="sponsored"`.
 */

// Hien it thoi: khoi nay nam TREN luoi deal nen moi dong them la day deal xuong
// duoi man hinh. 3 dong vua du de thay day la mot muc that ma khong chiem het
// khung nhin dau tien. Ai muon xem het da co link sang /coupon-codes ngay duoi.
const PREVIEW_COUNT = 3

export default function LinkInBioCodes({ offers }: { offers: Offer[] }) {
  const [copied, setCopied] = useState<string | null>(null)

  if (offers.length === 0) return null

  // MOT dong moi shop. Du lieu that co shop mang 2 ma khac nhau (Frizzlife co
  // AQNCPYIX va OFFERDY), va tren mot trang chi hien 6 dong thi lap lai cung shop
  // lam mat cho cua shop khac — 6 dong nen la 6 thuong hieu khac nhau. Giu ban dau
  // tien nen thu tu do nguoi van hanh dat (`order`) van duoc ton trong.
  const seen = new Set<string>()
  const visible: Offer[] = []
  for (const offer of offers) {
    const key = offer.store?.slug ?? offer.store?.name ?? offer.id
    if (seen.has(key)) continue
    seen.add(key)
    visible.push(offer)
    if (visible.length >= PREVIEW_COUNT) break
  }

  const copy = (code: string) => {
    // Cho nay von DA bat loi dung — no la tien le cho 5 nut con lai. Nay di qua
    // `copyText()` de co them mot buoc du phong (`execCommand`) truoc khi phai
    // hoi nguoi dung: trong webview Instagram/TikTok, buoc do thuong cuu duoc.
    void copyText(code).then(ok => {
      if (!ok) { window.prompt('Copy code:', code); return }
      setCopied(code)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="lb-codes-wrap">
      <div className="lb-sec">
        <span className="lb-sec-t">Working codes</span>
        <span className="lb-sec-line" />
        <span className="lb-count">{offers.length}</span>
      </div>

      <div className="lb-codes">
        {visible.map(offer => (
          <div className="lb-code-row" key={offer.id}>
            <div className="lb-code-info">
              <div className="lb-code-store">{offer.store?.name}</div>
              <div className="lb-code-text">{offer.offerText || offer.title}</div>
            </div>
            <button
              type="button"
              className={`lb-code-chip${copied === offer.couponCode ? ' is-copied' : ''}`}
              onClick={() => offer.couponCode && copy(offer.couponCode)}
              aria-label={`Copy code ${offer.couponCode}`}
            >
              {copied === offer.couponCode ? 'Copied!' : offer.couponCode}
            </button>
            <AffiliateLink
              href={offer.link}
              storeName={offer.store?.name}
              offerId={offer.id}
              className="lb-code-go"
            >
              Shop
            </AffiliateLink>
          </div>
        ))}
      </div>

      {offers.length > PREVIEW_COUNT && (
        <Link href="/coupon-codes" className="lb-codes-all">
          All {offers.length} codes →
        </Link>
      )}
    </div>
  )
}
