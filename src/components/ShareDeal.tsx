'use client'

import { useState } from 'react'

/**
 * Chia se san pham. Chia se ra short link /d/<ma> chu khong phai URL slug day:
 * ngan hon nhieu khi dan vao tin nhan, va moi luot chia se cua khach tro thanh mot
 * so do duoc trong bao cao (/d/ co tracking, URL slug thi khong).
 *
 * Deal chua co ma thi roi ve URL slug — mat phan do luong, con hon la an nut.
 */
export default function ShareDeal({ code, slug, title, base }: {
  code?: number
  slug: string
  title: string
  // 'use client' nen khong tu hoi Sanity duoc — trang deal (server) truyen xuong.
  base: string
}) {
  const [copied, setCopied] = useState(false)
  const url = code ? `${base}/d/${code}` : `${base}/deals/${slug}`

  const copy = () => {
    navigator.clipboard.writeText(url)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      // clipboard API chi chay tren HTTPS/localhost — khong bao gio bao thanh cong gia
      .catch(() => window.prompt('Copy this link:', url))
  }

  const share = () => {
    // navigator.share mo bang chia se cua HE DIEU HANH (Messages, WhatsApp, Zalo...)
    // — chi co tren mobile va bat buoc phai goi tu cu cham cua nguoi dung.
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {})
    } else {
      copy()
    }
  }

  return (
    <div className="dd-share">
      <button type="button" onClick={share} className="dd-share-btn" aria-label={`Share ${title}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>
      <button type="button" onClick={copy} className="dd-share-btn" aria-label="Copy link to this deal">
        {copied ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy link
          </>
        )}
      </button>
      {code && <span className="dd-share-url">{url.replace('https://www.', '')}</span>}
    </div>
  )
}
