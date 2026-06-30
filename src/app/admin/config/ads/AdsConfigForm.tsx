'use client'

import { useState, useTransition } from 'react'
import { saveConfigDoc } from '../actions'

export default function AdsConfigForm({ initial }: { initial: Record<string, unknown> }) {
  const [enableAds, setEnableAds] = useState(initial.enableAds === true)
  const [googleAdsenseId, setGoogleAdsenseId] = useState(String(initial.googleAdsenseId ?? ''))
  const [headerBannerSlot, setHeaderBannerSlot] = useState(String(initial.headerBannerSlot ?? ''))
  const [inFeedSlot, setInFeedSlot] = useState(String(initial.inFeedSlot ?? ''))
  const [sidebarSlot, setSidebarSlot] = useState(String(initial.sidebarSlot ?? ''))
  const [articleSlot, setArticleSlot] = useState(String(initial.articleSlot ?? ''))
  const [googleTagManagerId, setGoogleTagManagerId] = useState(String(initial.googleTagManagerId ?? ''))
  const [facebookPixelId, setFacebookPixelId] = useState(String(initial.facebookPixelId ?? ''))
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      await saveConfigDoc('configAds', {
        enableAds,
        googleAdsenseId: googleAdsenseId || null,
        headerBannerSlot: headerBannerSlot || null,
        inFeedSlot: inFeedSlot || null,
        sidebarSlot: sidebarSlot || null,
        articleSlot: articleSlot || null,
        googleTagManagerId: googleTagManagerId || null,
        facebookPixelId: facebookPixelId || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="cfg-wrap">
      <div className="cfg-header">
        <a href="/admin/config" className="cfg-back">← Cấu hình</a>
        <h1 className="cfg-title">Cấu hình Quảng cáo</h1>
        <p className="cfg-subtitle">Google AdSense, Google Tag Manager, Facebook Pixel</p>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Bật/tắt quảng cáo</div>
        <label className="cfg-check-row">
          <input type="checkbox" checked={enableAds} onChange={e => setEnableAds(e.target.checked)} />
          <div>
            <div className="cfg-check-label">Bật quảng cáo</div>
            <div className="cfg-check-desc">Bật/tắt toàn bộ quảng cáo trên website</div>
          </div>
        </label>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Google AdSense</div>
        <label className="cfg-label">AdSense Publisher ID
          <span className="cfg-desc">VD: ca-pub-1234567890123456</span>
          <input className="cfg-input" value={googleAdsenseId} onChange={e => setGoogleAdsenseId(e.target.value)} placeholder="ca-pub-..." />
        </label>
        <div className="cfg-row">
          <label className="cfg-label">Slot Header Banner (728×90)
            <input className="cfg-input" value={headerBannerSlot} onChange={e => setHeaderBannerSlot(e.target.value)} placeholder="Ad Unit ID" />
          </label>
          <label className="cfg-label">Slot In-feed
            <input className="cfg-input" value={inFeedSlot} onChange={e => setInFeedSlot(e.target.value)} placeholder="Ad Unit ID" />
          </label>
        </div>
        <div className="cfg-row">
          <label className="cfg-label">Slot Sidebar (300×250)
            <input className="cfg-input" value={sidebarSlot} onChange={e => setSidebarSlot(e.target.value)} placeholder="Ad Unit ID" />
          </label>
          <label className="cfg-label">Slot Trong bài viết
            <input className="cfg-input" value={articleSlot} onChange={e => setArticleSlot(e.target.value)} placeholder="Ad Unit ID" />
          </label>
        </div>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Tracking & Analytics</div>
        <div className="cfg-row">
          <label className="cfg-label">Google Tag Manager ID
            <span className="cfg-desc">VD: GTM-XXXXXXX</span>
            <input className="cfg-input" value={googleTagManagerId} onChange={e => setGoogleTagManagerId(e.target.value)} placeholder="GTM-..." />
          </label>
          <label className="cfg-label">Facebook Pixel ID
            <input className="cfg-input" value={facebookPixelId} onChange={e => setFacebookPixelId(e.target.value)} placeholder="123456789..." />
          </label>
        </div>
      </div>

      <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="cfg-save-btn" onClick={handleSave} disabled={isPending}>{isPending ? 'Đang lưu...' : '💾 Lưu cấu hình'}</button>
        {saved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Đã lưu!</span>}
      </div>
    </div>
  )
}
