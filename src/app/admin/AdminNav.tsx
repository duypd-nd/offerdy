'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

type NavItem = { href: string; label: string; icon: string }
type NavGroup = {
  key: string
  label: string
  color: string
  items: NavItem[]
  defaultOpen: boolean
}

const NAV: NavGroup[] = [
  {
    key: 'offers',
    label: 'Offers & Deals',
    color: '#f59e0b',
    defaultOpen: true,
    items: [
      { href: '/admin/stores',       label: 'Stores',        icon: '🏪' },
      { href: '/admin/ai-review',    label: 'AI Review Queue', icon: '🤖' },
      { href: '/admin/offers',       label: 'Tất cả Offers', icon: '🎁' },
      { href: '/admin/flash-sales',  label: 'Flash Sales',   icon: '⚡' },
      { href: '/admin/coupon-codes', label: 'Coupon Codes',  icon: '🏷️' },
      { href: '/admin/deals',        label: 'Deals',         icon: '💰' },
      { href: '/admin/categories',   label: 'Categories',    icon: '🗂️' },
      { href: '/admin/reports',      label: 'Báo cáo Click',  icon: '📊' },
      { href: '/admin/merchant-health', label: 'Merchant Health', icon: '❤️' },
      { href: '/admin/seo-audit',    label: 'SEO Audit',      icon: '🔎' },
      { href: '/admin/link-checker', label: 'Kiểm tra Link',  icon: '🔍' },
    ],
  },
  {
    key: 'blog',
    label: 'Blog & Bài viết',
    color: '#3b82f6',
    defaultOpen: true,
    items: [
      { href: '/admin/posts',       label: 'Tất cả Posts', icon: '📝' },
      { href: '/admin/comparisons', label: 'Comparisons',  icon: '⚖️' },
      { href: '/admin/tips-guides', label: 'Tips & Guides', icon: '📖' },
      { href: '/admin/reviews',     label: 'Reviews',       icon: '⭐' },
    ],
  },
  {
    key: 'pages',
    label: 'Trang web',
    color: '#10b981',
    defaultOpen: false,
    items: [
      { href: '/admin/pages',        label: 'Trang tĩnh',     icon: '📄' },
      { href: '/admin/about',        label: 'About Us',        icon: '👥' },
      { href: '/admin/contact',      label: 'Contact',         icon: '📧' },
      { href: '/admin/submit-deal',  label: 'Submit a Deal',   icon: '➕' },
      { href: '/admin/partner',      label: 'Partner with Us', icon: '🤝' },
    ],
  },
  {
    key: 'legal',
    label: 'Pháp lý',
    color: '#8b5cf6',
    defaultOpen: false,
    items: [
      { href: '/admin/terms',                label: 'Terms of Use',        icon: '📋' },
      { href: '/admin/privacy',              label: 'Privacy Policy',      icon: '🔒' },
      { href: '/admin/cookies',              label: 'Cookie Policy',       icon: '🍪' },
      { href: '/admin/affiliate-disclosure', label: 'Affiliate Disclosure', icon: '🔗' },
    ],
  },
  {
    key: 'config',
    label: 'Cấu hình',
    color: '#64748b',
    defaultOpen: false,
    items: [
      { href: '/admin/config/general', label: 'Cài đặt chung',     icon: '⚙️' },
      { href: '/admin/config/content', label: 'Nội dung mặc định', icon: '📋' },
      { href: '/admin/config/seo',     label: 'SEO',               icon: '🔍' },
      { href: '/admin/config/ads',     label: 'Quảng cáo',         icon: '📢' },
      { href: '/admin/config/author',  label: 'Tác giả',           icon: '👤' },
      { href: '/admin/config/social',  label: 'Mạng xã hội',       icon: '🌐' },
      { href: '/admin/import',         label: 'Import Excel',      icon: '📥' },
    ],
  },
]

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      style={{ flexShrink: 0, opacity: 0.5, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}
      width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function AdminNav() {
  const path = usePathname()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const g of NAV) {
      const hasActive = g.items.some(item => path.startsWith(item.href))
      init[g.key] = g.defaultOpen || hasActive
    }
    return init
  })

  const toggle = (key: string) =>
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <aside className="adm-sidebar">
      <Link href="/admin" className="adm-logo">
        Offerdy<span>Admin</span>
      </Link>

      <a href="/" target="_blank" rel="noopener noreferrer" className="adm-view-site">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
        Xem Website
      </a>

      <nav className="adm-nav">
        {NAV.map(group => {
          const isOpen = openGroups[group.key]
          const hasActive = group.items.some(item => path.startsWith(item.href))

          return (
            <div key={group.key} className="adm-nav-group">
              <button
                className="adm-group-btn"
                onClick={() => toggle(group.key)}
                aria-expanded={isOpen}
              >
                {/* color dot — reliable, no emoji */}
                <span
                  className="adm-group-dot"
                  style={{ background: hasActive ? group.color : 'rgba(255,255,255,.25)' }}
                />
                <span className={`adm-group-label${hasActive ? ' adm-group-label--active' : ''}`}
                  style={hasActive ? { color: group.color } : undefined}>
                  {group.label}
                </span>
                <Chevron open={isOpen} />
              </button>

              {isOpen && (
                <div className="adm-group-items">
                  {group.items.map(item => {
                    const active = path.startsWith(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`adm-link${active ? ' active' : ''}`}
                        style={active ? { borderLeftColor: group.color, color: group.color } : undefined}
                      >
                        <span className="adm-link-icon">{item.icon}</span>
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="adm-sidebar-footer">
        <a href="/" className="adm-back-link">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Về website
        </a>
        <a href="/studio" target="_blank" rel="noopener noreferrer" className="adm-back-link" style={{ marginTop: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Sanity Studio
        </a>
      </div>
    </aside>
  )
}
