'use client'

import { useEffect } from 'react'
import { trackArticleLinkClick } from '@/actions/trackClick'

/**
 * Dem luot bam sang merchant tu cac link NAM TRONG THAN BAI viet (blog/review).
 *
 * 🚨 VAN DE NO GIAI (do 28/08/2026): than bai render bang
 * `dangerouslySetInnerHTML`, va nut mua la the `<a>` HTML tho tu `postRender.ts`
 * — khong phai `AffiliateLink`. Khong `onClick` nghia la khong gi duoc dem:
 * khong tai lieu `click`, khong `dataLayer`, khong chuyen doi Google Ads.
 *
 * Do that: vao dung URL quang cao (cookie gan nguon dat DUNG —
 * `google-ads|ads-fridge-58l`), bam mot trong hai link affiliate cua bai; so tai
 * lieu `click` mang nhan do van la **0**.
 *
 * Hau qua khong chi la "thieu so lieu": `/admin/ads` se thay chi phi tang ma 0
 * luot bam, roi phan quyet **"Nen dung"** theo nhanh Poisson. Phan quyet do SAI
 * — luot bam co the dang xay ra ma khong ai dem.
 *
 * ⚠️ COMPONENT NAY KHONG VE GI (`return null`) va khong boc quanh noi dung nao.
 * Co y: `.article-body` co 18 quy tac CSS, va chen them mot `<div>` vao giua la
 * rui ro vo bo cuc 42 bai dang chay tot de doi lay khong gi ca. Nghe o
 * `document` roi loc bang `closest('.article-body')` cho cung ket qua ma khong
 * dung mot byte DOM nao.
 *
 * ⚠️ Nghe UY QUYEN chu khong gan handler tung the `<a>`: than bai la HTML dong,
 * gan tay thi phai quet lai moi lan noi dung doi.
 *
 * ⚠️ KHONG goi `preventDefault`. Nguoi ta bam de DI MUA HANG; giu ho lai cho mot
 * luot ghi Sanity (~350ms) la truc tiep lam mat don. Ghi chay nen va de dieu
 * huong xay ra binh thuong — link co `target="_blank"` nen trang nay van song,
 * request khong bi huy giua chung.
 */
export default function ArticleLinkTracker() {
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const a = (e.target as HTMLElement | null)?.closest?.('a')
      if (!a || !a.closest('.article-body')) return

      // `rel` thuong la "nofollow sponsored noopener" nen phai tach theo khoang
      // trang. Dung `includes('sponsored')` tren ca chuoi se khop ca mot rel bia
      // nhu "unsponsored".
      const rel = (a.getAttribute('rel') ?? '').toLowerCase().split(/\s+/)
      if (!rel.includes('sponsored')) return

      const href = a.getAttribute('href')
      if (!href || !/^https?:\/\//i.test(href)) return

      // GTM doc su kien nay (WORKFLOW_GOOGLE_ADS.md, buoc 5b). Dung DUNG TEN
      // `affiliate_click` nhu `AffiliateLink.tsx`: hai duong khac nhau nhung cung
      // mot su kien, de MOT trigger GTM phu duoc ca hai.
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({ event: 'affiliate_click', affiliate_url: href, from: 'article_body' })

      trackArticleLinkClick(href).catch(() => {})
    }

    // `capture: true` de bat duoc ca khi mot handler khac goi stopPropagation.
    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])

  return null
}
