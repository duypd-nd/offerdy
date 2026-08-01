'use client'

import { useState, useTransition } from 'react'
import { subscribeCouponAlert } from './actions'

function BellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

/**
 * Nut o sidebar trang store. Truoc day la <button> tran khong gan gi — bam vao
 * khong co phan hoi nao.
 *
 * Chu y ve cach dien dat: nut noi "khi co ma moi chung toi se luu email cua ban",
 * KHONG hua "se gui mail ngay". Du an chua co nha cung cap email nao, va hua mot
 * viec chua lam duoc la cach nhanh nhat de mat niem tin — nguoi dung se cho mot
 * la thu khong bao gio den.
 */
export default function CouponAlertForm({ storeId, storeName }: { storeId: string; storeName: string }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ kind: 'ok' | 'already' | 'error'; message: string } | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    startTransition(async () => {
      const result = await subscribeCouponAlert({ email, storeId, storeName })
      if (result.ok) {
        setStatus({
          kind: result.already ? 'already' : 'ok',
          message: result.already
            ? `You're already on the list for ${storeName}.`
            : `Saved. We'll keep ${storeName} deals for you.`,
        })
        setEmail('')
      } else {
        setStatus({ kind: 'error', message: result.error ?? 'Something went wrong.' })
      }
    })
  }

  if (!open) {
    return (
      <button className="sol-sb-alert" onClick={() => setOpen(true)}>
        <BellIcon /> Get Coupon Alert
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="coupon-alert-email" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--green-dark)', marginBottom: 6 }}>
        Email me when {storeName} has a new code
      </label>
      <input
        id="coupon-alert-email"
        type="email"
        required
        maxLength={254}
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={isPending}
        style={{
          width: '100%', height: 36, padding: '0 10px', fontSize: 13,
          border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', marginBottom: 6,
        }}
      />
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="submit" className="sol-sb-alert" style={{ flex: 1 }} disabled={isPending}>
          {isPending ? 'Saving...' : 'Notify me'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setStatus(null) }}
          disabled={isPending}
          style={{
            height: 36, padding: '0 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: 'white', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', color: '#6b7280',
          }}
        >
          Cancel
        </button>
      </div>

      {status && (
        <div
          role="status"
          style={{
            marginTop: 8, fontSize: 11, lineHeight: 1.5,
            color: status.kind === 'error' ? '#b91c1c' : 'var(--green-dark)',
          }}
        >
          {status.message}
        </div>
      )}
    </form>
  )
}
