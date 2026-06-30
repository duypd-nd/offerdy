'use client'

import { useState } from 'react'
import type { SubmitDealData } from '@/app/admin/submit-deal/actions'

type Step = { _key: string; title: string; desc: string }

export default function SubmitDealClient({ data: d }: { data: Required<SubmitDealData> }) {
  const [store, setStore]     = useState('')
  const [code, setCode]       = useState('')
  const [discount, setDiscount] = useState('')
  const [link, setLink]       = useState('')
  const [expiry, setExpiry]   = useState('')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [notes, setNotes]     = useState('')
  const [status, setStatus]   = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const inp: React.CSSProperties = { width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 13px', fontSize: 14, color: 'var(--navy)', fontFamily: 'inherit', outline: 'none' }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      if (d.formAction) {
        const res = await fetch(d.formAction, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ store, code, discount, link, expiry, name, email, notes }),
        })
        setStatus(res.ok ? 'sent' : 'error')
      } else {
        const body = `Store: ${store}\nCode: ${code}\nDiscount: ${discount}\nLink: ${link}\nExpiry: ${expiry}\n\nSubmitted by: ${name} (${email})\nNotes: ${notes}`
        window.location.href = `mailto:hello@offerdy.com?subject=Deal Submission: ${store}&body=${encodeURIComponent(body)}`
        setStatus('sent')
      }
    } catch { setStatus('error') }
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '60px 24px 96px' }}>
      {/* Hero */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--green-dark)', marginBottom: 18 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
        Submit a Deal
      </div>
      <h1 style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 900, color: 'var(--navy)', lineHeight: 1.12, letterSpacing: '-.7px', textWrap: 'balance', marginBottom: 14, maxWidth: 520 }}>{d.h1}</h1>
      <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.72, maxWidth: 520, marginBottom: 44 }}>{d.heroLead}</p>

      {/* How it works */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 44 }}>
        {(d.steps as Step[]).map((s, i) => (
          <div key={s._key} style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 12, padding: '20px 20px' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green-50)', border: '1.5px solid #BBF7D0', color: 'var(--green-dark)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{i + 1}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 5 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{s.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>
        {/* Form */}
        <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{d.formHeading}</div>
          <div style={{ padding: 22 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{d.formDesc}</p>
            {status === 'sent' ? (
              <div style={{ background: 'var(--green-50)', border: '1.5px solid #BBF7D0', borderRadius: 10, padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green-dark)', marginBottom: 6 }}>Thanks for the submission!</div>
                <div style={{ fontSize: 13, color: '#166534' }}>We'll verify it within 24 hours.</div>
                <button onClick={() => setStatus('idle')} style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Submit another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 5 }}>Store name <span style={{ color: '#EF4444' }}>*</span></label><input style={inp} value={store} onChange={e => setStore(e.target.value)} required placeholder="e.g. Nike" /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 5 }}>Coupon code</label><input style={inp} value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. SAVE20" /></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 5 }}>Discount amount</label><input style={inp} value={discount} onChange={e => setDiscount(e.target.value)} placeholder="e.g. 20% off, $10 off" /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 5 }}>Expiry date</label><input style={inp} type="date" value={expiry} onChange={e => setExpiry(e.target.value)} /></div>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 5 }}>Deal / product link <span style={{ color: '#EF4444' }}>*</span></label><input style={inp} value={link} onChange={e => setLink(e.target.value)} required placeholder="https://..." /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 5 }}>Your name</label><input style={inp} value={name} onChange={e => setName(e.target.value)} placeholder="Optional" /></div>
                  <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 5 }}>Your email</label><input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional" /></div>
                </div>
                <div><label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 5 }}>Additional notes</label><textarea style={{ ...inp, resize: 'vertical', minHeight: 80 }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything else we should know?" /></div>
                {status === 'error' && <div style={{ fontSize: 13, color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, padding: '9px 13px' }}>Something went wrong. Please try again.</div>}
                <button type="submit" disabled={status === 'sending'} style={{ background: 'var(--navy)', color: '#fff', fontSize: 14, fontWeight: 700, padding: '11px 24px', borderRadius: 9, border: 'none', cursor: 'pointer', alignSelf: 'flex-start', opacity: status === 'sending' ? .7 : 1 }}>
                  {status === 'sending' ? 'Submitting...' : 'Submit Deal →'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Guidelines */}
        <div style={{ background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)', marginBottom: 14 }}>Submission guidelines</div>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.guidelines.map((g, i) => (
              <li key={i} style={{ display: 'flex', gap: 10, fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--green-dark)', flexShrink: 0, marginTop: 1 }}>✓</span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
