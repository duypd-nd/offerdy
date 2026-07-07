// Shared branded OG/social-image layout — reused by per-entity opengraph-image.tsx
// routes (stores/blog/reviews) so every page gets its own real-content share image
// instead of one generic sitewide graphic, while keeping visual branding consistent
// with the root src/app/opengraph-image.tsx fallback.

const GREEN = '#22C55E'
const GREEN_DARK = '#16A34A'
const NAVY = '#0B1420'

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

export function BrandedOgImage({ eyebrow, title, subtitle, logoUrl, initials }: {
  eyebrow?: string
  title: string
  subtitle?: string
  logoUrl?: string
  initials?: string
}) {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: `linear-gradient(135deg, ${NAVY} 0%, #0F1929 55%, #14243B 100%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px 72px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Soft ambient light — top-right, main highlight. "closest-side" sizing (not the
          default farthest-corner) means the 0-100% stops are measured against the box's
          own half-width, so the color reliably fades to fully transparent well before
          the box's straight edges — no hard rectangular seam like a default radial or
          a clipped filter:blur would produce. */}
      <div style={{
        position: 'absolute', top: -260, right: -260, width: 680, height: 680, display: 'flex',
        background: 'radial-gradient(circle closest-side, rgba(34,197,94,0.34) 0%, rgba(34,197,94,0.13) 45%, rgba(34,197,94,0) 85%)',
      }} />
      {/* Secondary glow — bottom-left, softer */}
      <div style={{
        position: 'absolute', bottom: -240, left: -220, width: 560, height: 560, display: 'flex',
        background: 'radial-gradient(circle closest-side, rgba(34,197,94,0.20) 0%, rgba(34,197,94,0.08) 45%, rgba(34,197,94,0) 85%)',
      }} />
      {/* Faint cool rim light — top-left, adds depth without competing */}
      <div style={{
        position: 'absolute', top: -200, left: -90, width: 440, height: 440, display: 'flex',
        background: 'radial-gradient(circle closest-side, rgba(120,180,255,0.06) 0%, rgba(120,180,255,0) 80%)',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} width={76} height={76} style={{ borderRadius: 18, objectFit: 'cover', background: '#fff', boxShadow: '0 12px 28px rgba(0,0,0,0.4)' }} alt="" />
        ) : initials ? (
          <div style={{
            width: 76, height: 76, borderRadius: 18,
            background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: NAVY,
            boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
          }}>
            {initials}
          </div>
        ) : null}
        {eyebrow && (
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '9px 20px', borderRadius: 999,
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.4)',
          }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: 2, display: 'flex' }}>
              {truncate(eyebrow, 40)}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{
          fontSize: 54, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-1.5px',
          textShadow: '0 6px 28px rgba(0,0,0,0.5)', display: 'flex',
        }}>
          {truncate(title, 90)}
        </div>
        {subtitle && (
          <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.72)', textShadow: '0 2px 12px rgba(0,0,0,0.35)', display: 'flex' }}>
            {truncate(subtitle, 100)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>Offer</span>
        <span style={{ fontSize: 28, fontWeight: 800, color: GREEN }}>dy</span>
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 5,
        background: `linear-gradient(90deg, transparent 0%, ${GREEN} 15%, ${GREEN} 85%, transparent 100%)`,
        boxShadow: `0 -8px 24px rgba(34,197,94,0.35)`,
        display: 'flex',
      }} />
    </div>
  )
}
