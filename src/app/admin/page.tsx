import { writeClient } from '@/sanity/writeClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// ── SVG icon components ─────────────────────────────────────────
const I = {
  store: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  offer: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
    </svg>
  ),
  flash: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  coupon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  deal: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>
    </svg>
  ),
  category: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  post: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  compare: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
    </svg>
  ),
  guide: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  review: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  page: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  seo: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  ads: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l19-9-9 19-2-8-8-2z"/>
    </svg>
  ),
  author: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  social: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  download: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
}

const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  store:  { label: 'Store',  color: '#2563eb', bg: '#eff6ff' },
  deal:   { label: 'Deal',   color: '#d97706', bg: '#fffbeb' },
  post:   { label: 'Post',   color: '#0891b2', bg: '#ecfeff' },
  review: { label: 'Review', color: '#d97706', bg: '#fffbeb' },
  offer:  { label: 'Offer',  color: '#7c3aed', bg: '#f5f3ff' },
  page:   { label: 'Page',   color: '#059669', bg: '#ecfdf5' },
}
const TYPE_HREF: Record<string, string> = {
  store: '/admin/stores', deal: '/admin/deals', post: '/admin/posts',
  review: '/admin/reviews', offer: '/admin/offers', page: '/admin/pages',
}

export default async function AdminDashboard() {
  const [
    stores, offers, flashSales, couponCodes, deals, categories,
    allPosts, comparisons, tipsGuides, reviews, pages, recent,
  ] = await Promise.all([
    writeClient.fetch<number>(`count(*[_type == "store" && published != false])`),
    writeClient.fetch<number>(`count(*[_type == "offer" && active == true])`),
    writeClient.fetch<number>(`count(*[_type == "offer" && active == true && defined(expiresAt) && expiresAt > now()])`),
    writeClient.fetch<number>(`count(*[_type == "offer" && active == true && defined(couponCode) && couponCode != ""])`),
    writeClient.fetch<number>(`count(*[_type == "deal"])`),
    writeClient.fetch<number>(`count(*[_type == "category"])`),
    writeClient.fetch<number>(`count(*[_type == "post"])`),
    writeClient.fetch<number>(`count(*[_type == "post" && category == "Comparison"])`),
    writeClient.fetch<number>(`count(*[_type == "post" && category == "Tips & Guides"])`),
    writeClient.fetch<number>(`count(*[_type == "review"])`),
    writeClient.fetch<number>(`count(*[_type == "page"])`),
    writeClient.fetch<{ _type: string; _updatedAt: string; name: string; slug?: string }[]>(
      `*[_type in ["store","deal","post","review","offer","page"]] | order(_updatedAt desc)[0...10] {
        _type, _updatedAt, "name": coalesce(title, name), "slug": slug.current
      }`
    ),
  ])

  return (
    <div style={{ padding: '32px 28px', maxWidth: 1200 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>Quản lý toàn bộ nội dung Offerdy</p>
      </div>

      {/* ── Offers & Deals ── */}
      <DashSection dot="#f59e0b" label="Offers &amp; Deals">
        <StatGrid>
          <StatCard href="/admin/stores"       icon={I.store}    label="Stores"        count={stores}     color="#2563eb" bg="#eff6ff" />
          <StatCard href="/admin/offers"       icon={I.offer}    label="Active Offers" count={offers}     color="#7c3aed" bg="#f5f3ff" />
          <StatCard href="/admin/flash-sales"  icon={I.flash}    label="Flash Sales"   count={flashSales} color="#dc2626" bg="#fef2f2" sub="đang hết hạn" />
          <StatCard href="/admin/coupon-codes" icon={I.coupon}   label="Coupon Codes"  count={couponCodes} color="#d97706" bg="#fffbeb" />
          <StatCard href="/admin/deals"        icon={I.deal}     label="Deals"         count={deals}      color="#0891b2" bg="#ecfeff" />
          <StatCard href="/admin/categories"   icon={I.category} label="Categories"    count={categories} color="#db2777" bg="#fdf2f8" />
        </StatGrid>
      </DashSection>

      {/* ── Blog & Bài viết ── */}
      <DashSection dot="#3b82f6" label="Blog &amp; Bài viết">
        <StatGrid>
          <StatCard href="/admin/posts"       icon={I.post}    label="Tất cả Posts"  count={allPosts}    color="#0891b2" bg="#ecfeff" />
          <StatCard href="/admin/comparisons" icon={I.compare} label="Comparisons"   count={comparisons} color="#4f46e5" bg="#eef2ff" />
          <StatCard href="/admin/tips-guides" icon={I.guide}   label="Tips & Guides" count={tipsGuides}  color="#059669" bg="#ecfdf5" />
          <StatCard href="/admin/reviews"     icon={I.review}  label="Reviews"       count={reviews}     color="#d97706" bg="#fffbeb" />
          <StatCard href="/admin/pages"       icon={I.page}    label="Trang tĩnh"    count={pages}       color="#64748b" bg="#f8fafc" />
        </StatGrid>
      </DashSection>

      {/* ── Cấu hình ── */}
      <DashSection dot="#64748b" label="Cấu hình">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {[
            { href: '/admin/config/general', icon: I.settings, label: 'Cài đặt chung' },
            { href: '/admin/config/content', icon: I.post,     label: 'Nội dung' },
            { href: '/admin/config/seo',     icon: I.seo,      label: 'SEO' },
            { href: '/admin/config/ads',     icon: I.ads,      label: 'Quảng cáo' },
            { href: '/admin/config/author',  icon: I.author,   label: 'Tác giả' },
            { href: '/admin/config/social',  icon: I.social,   label: 'Mạng xã hội' },
            { href: '/admin/import',         icon: I.download, label: 'Import Excel' },
          ].map(c => (
            <Link key={c.href} href={c.href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
              padding: '10px 14px', textDecoration: 'none', color: '#374151',
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#f1f5f9', color: '#64748b',
              }}>
                {c.icon}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</span>
            </Link>
          ))}
        </div>
      </DashSection>

      {/* ── Recent activity ── */}
      <DashSection label="Cập nhật gần đây" clock>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>Tên</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', width: 90 }}>Loại</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em', width: 150 }}>Thời gian</th>
                <th style={{ width: 80, padding: '10px 16px' }}></th>
              </tr>
            </thead>
            <tbody>
              {recent.map((item, i) => {
                const badge = TYPE_BADGE[item._type]
                return (
                  <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: '#1e293b', fontWeight: 500, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name ?? '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {badge && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
                          {badge.label}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {new Date(item._updatedAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      {TYPE_HREF[item._type] && (
                        <Link href={TYPE_HREF[item._type]} style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textDecoration: 'none' }}>
                          Quản lý
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                    Chưa có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashSection>

    </div>
  )
}

// ── Shared layout components ──────────────────────────────────────

function DashSection({ dot, label, clock, children }: {
  dot?: string; label: string; clock?: boolean; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {dot && (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
        )}
        {clock && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        )}
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: '#475569' }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

function StatGrid({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
      {children}
    </div>
  )
}

function StatCard({ href, icon, label, sub, count, color, bg }: {
  href: string; icon: React.ReactNode; label: string; sub?: string
  count: number; color: string; bg: string
}) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      padding: '14px 18px', textDecoration: 'none',
    }}>
      <span style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: bg, color: color,
      }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 24, fontWeight: 800, lineHeight: 1, color }}>{count}</span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginTop: 2 }}>{label}</span>
        {sub && <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{sub}</span>}
      </span>
    </Link>
  )
}
