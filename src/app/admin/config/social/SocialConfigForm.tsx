'use client'

import { useState, useTransition } from 'react'
import { saveConfigDoc } from '../actions'

const SOCIALS = [
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/offerdy' },
  { key: 'twitter', label: 'X (Twitter)', placeholder: 'https://x.com/offerdy' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/offerdy' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@offerdy' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/offerdy' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@offerdy' },
  { key: 'pinterest', label: 'Pinterest', placeholder: 'https://pinterest.com/offerdy' },
  { key: 'telegram', label: 'Telegram', placeholder: 'https://t.me/offerdy' },
]

export default function SocialConfigForm({ initial }: { initial: Record<string, unknown> }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(SOCIALS.map(s => [s.key, String(initial[s.key] ?? '')]))
  )
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      const patch = Object.fromEntries(SOCIALS.map(s => [s.key, values[s.key] || undefined]))
      await saveConfigDoc('configSocial', patch)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="cfg-wrap">
      <div className="cfg-header">
        <a href="/admin/config" className="cfg-back">← Cấu hình</a>
        <h1 className="cfg-title">Mạng xã hội</h1>
        <p className="cfg-subtitle">Liên kết các kênh mạng xã hội của Offerdy</p>
      </div>

      <div className="cfg-section">
        <div className="cfg-section-title">Đường dẫn mạng xã hội</div>
        <div className="cfg-row">
          {SOCIALS.map(s => (
            <label key={s.key} className="cfg-label">{s.label}
              <input className="cfg-input" type="url" value={values[s.key]} onChange={e => setValues(prev => ({ ...prev, [s.key]: e.target.value }))} placeholder={s.placeholder} />
            </label>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="cfg-save-btn" onClick={handleSave} disabled={isPending}>{isPending ? 'Đang lưu...' : '💾 Lưu cấu hình'}</button>
        {saved && <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 600 }}>✓ Đã lưu!</span>}
      </div>
    </div>
  )
}
