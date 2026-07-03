'use client'

import { useState } from 'react'
import type { ContactData } from './page'

const s = {
  page: { maxWidth: 780, margin: '0 auto', padding: '60px 24px 96px' } as React.CSSProperties,
  eyebrow: { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: '.09em', textTransform: 'uppercase' as const, color: 'var(--green-dark)', marginBottom: 18 } as React.CSSProperties,
  dot: { width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 } as React.CSSProperties,
  h1: { fontSize: 'clamp(28px,5vw,42px)', fontWeight: 900, color: 'var(--navy)', lineHeight: 1.1, letterSpacing: '-.8px', textWrap: 'balance' as const, marginBottom: 14, maxWidth: 520 } as React.CSSProperties,
  lead: { fontSize: 17, color: 'var(--muted)', lineHeight: 1.72, maxWidth: 520, marginBottom: 48 } as React.CSSProperties,
  grid: { display: 'grid', gap: 32, alignItems: 'start' } as React.CSSProperties,
  card: { background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,25,41,.04)' } as React.CSSProperties,
  cardHead: { padding: '16px 22px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--navy)' } as React.CSSProperties,
  cardBody: { padding: '22px' } as React.CSSProperties,
}

function InfoItem({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--green-50)', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--light)', marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--navy)' }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

export default function ContactPageClient({ data: d }: { data: ContactData }) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus]   = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    try {
      if (d.formAction) {
        const res = await fetch(d.formAction, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ name, email, subject, message }),
        })
        if (res.ok) { setStatus('sent'); setName(''); setEmail(''); setSubject(''); setMessage('') }
        else setStatus('error')
      } else {
        window.location.href = `mailto:${d.email}?subject=${encodeURIComponent(subject || 'Message from Offerdy')}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`)}`
        setStatus('sent')
      }
    } catch {
      setStatus('error')
    }
  }

  const inp: React.CSSProperties = { width: '100%', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '10px 13px', fontSize: 14, color: 'var(--navy)', fontFamily: 'inherit', outline: 'none' }

  return (
    <div style={s.page}>
      {/* Hero */}
      <div style={s.eyebrow}><span style={s.dot} />Contact</div>
      <h1 style={s.h1}>{d.h1}</h1>
      <p style={s.lead}>{d.heroLead}</p>

      <div className="contact-grid" style={s.grid}>
        {/* Left — form */}
        <div>
          <div style={s.card}>
            <div style={s.cardHead}>{d.formHeading}</div>
            <div style={s.cardBody}>
              <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{d.formDesc}</p>

              {status === 'sent' ? (
                <div style={{ background: 'var(--green-50)', border: '1.5px solid #BBF7D0', borderRadius: 10, padding: '20px 22px', textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--green-dark)', marginBottom: 6 }}>Message sent!</div>
                  <div style={{ fontSize: 13, color: '#166534' }}>{d.responseTime}</div>
                  <button onClick={() => setStatus('idle')} style={{ marginTop: 14, fontSize: 13, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Send another message</button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="contact-form-row" style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 5 }}>Your name <span style={{ color: '#EF4444' }}>*</span></label>
                      <input style={inp} value={name} onChange={e => setName(e.target.value)} required placeholder="Jane Smith" />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 5 }}>Email address <span style={{ color: '#EF4444' }}>*</span></label>
                      <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="jane@example.com" />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 5 }}>Subject</label>
                    <input style={inp} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Broken coupon code / Store suggestion / Other" />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)', display: 'block', marginBottom: 5 }}>Message <span style={{ color: '#EF4444' }}>*</span></label>
                    <textarea style={{ ...inp, resize: 'vertical', minHeight: 130 }} value={message} onChange={e => setMessage(e.target.value)} required placeholder="Tell us what's on your mind..." />
                  </div>
                  {status === 'error' && (
                    <div style={{ fontSize: 13, color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 7, padding: '9px 13px' }}>
                      Something went wrong. Try emailing us directly at <a href={`mailto:${d.email}`} style={{ color: '#EF4444', fontWeight: 600 }}>{d.email}</a>.
                    </div>
                  )}
                  <button type="submit" disabled={status === 'sending'} style={{ background: 'var(--navy)', color: '#fff', fontSize: 14, fontWeight: 700, padding: '11px 24px', borderRadius: 9, border: 'none', cursor: status === 'sending' ? 'wait' : 'pointer', alignSelf: 'flex-start', opacity: status === 'sending' ? .7 : 1 }}>
                    {status === 'sending' ? 'Sending...' : 'Send message →'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Right — info + quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={s.card}>
            <div style={s.cardHead}>Contact info</div>
            <div style={{ padding: '8px 22px 18px' }}>
              <InfoItem
                icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                label="Email"
                value={d.email}
                sub={d.responseTime}
              />
              {d.phone && (
                <InfoItem
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
                  label="Phone"
                  value={d.phone}
                />
              )}
              {d.address && (
                <InfoItem
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>}
                  label="Location"
                  value={d.address}
                />
              )}
              <div style={{ paddingTop: 16 }}>
                <a href={`mailto:${d.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--green-50)', color: 'var(--green-dark)', border: '1.5px solid #BBF7D0', fontSize: 13, fontWeight: 700, padding: '9px 18px', borderRadius: 8, textDecoration: 'none', width: '100%', justifyContent: 'center' }}>
                  Email us directly →
                </a>
              </div>
            </div>
          </div>

          <div style={{ ...s.card, padding: '18px 22px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 12 }}>Quick links</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { href: '/deals',   label: 'Browse active deals' },
                { href: '/stores',  label: 'Explore all stores' },
                { href: '/reviews', label: 'Read store reviews' },
                { href: '/about',   label: 'About Offerdy' },
              ].map(l => (
                <a key={l.href} href={l.href} style={{ fontSize: 13, color: 'var(--navy)', fontWeight: 500, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  {l.label}
                  <span style={{ color: 'var(--light)', fontSize: 12 }}>›</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      {d.showFaq && d.faqItems.length > 0 && (
        <section style={{ marginTop: 56 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.35px', textWrap: 'balance', marginBottom: 22 }}>{d.faqHeading}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, background: 'var(--white)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,25,41,.04)' }}>
            {d.faqItems.map((item, i) => (
              <div key={item._key} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)', lineHeight: 1.4 }}>{item.question}</span>
                  <span style={{ color: 'var(--light)', fontSize: 18, flexShrink: 0, transition: 'transform .2s', transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 24px 18px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
