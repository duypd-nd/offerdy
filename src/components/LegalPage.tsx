import type { LegalData } from '@/app/admin/_legal/actions'

export default function LegalPage({ data: d }: { data: Required<LegalData> }) {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '56px 24px 96px' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 'clamp(26px,4vw,36px)', fontWeight: 900, color: 'var(--navy)', letterSpacing: '-.6px', lineHeight: 1.15, textWrap: 'balance', marginBottom: 12 }}>
          {d.h1}
        </h1>
        {d.lastUpdated && (
          <div style={{ fontSize: 12, color: 'var(--light)', fontWeight: 500 }}>
            Last updated: {new Date(d.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        )}
        {d.intro && (
          <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.75, marginTop: 18, maxWidth: 620, borderLeft: '3px solid var(--green)', paddingLeft: 16 }}>
            {d.intro}
          </p>
        )}
      </div>

      {/* Sections */}
      {d.sections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {d.sections.map((sec, i) => (
            <section key={sec._key ?? i}>
              {sec.heading && (
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.2px', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  {sec.heading}
                </h2>
              )}
              {sec.body && (
                <div
                  style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8 }}
                  className="legal-body"
                  dangerouslySetInnerHTML={{ __html: sec.body }}
                />
              )}
            </section>
          ))}
        </div>
      )}

    </div>
  )
}
