'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { canAccess, ROLE_LABEL, type AdminRole } from '@/lib/adminAuth'

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
      { href: '/admin/social-kit',   label: 'Soạn bài đăng',  icon: '📣' },
      { href: '/admin/reports',      label: 'Báo cáo Click',  icon: '📊' },
      { href: '/admin/ad-planner',   label: 'Tính quảng cáo', icon: '🧮' },
      { href: '/admin/merchant-health', label: 'Merchant Health', icon: '❤️' },
      { href: '/admin/search-console', label: 'Search Console', icon: '🔦' },
      { href: '/admin/seo-audit',    label: 'SEO Audit',      icon: '🔎' },
      { href: '/admin/link-checker', label: 'Kiểm tra Link',  icon: '🔍' },
      { href: '/admin/coupon-tests', label: 'Thử mã',         icon: '🧪' },
      { href: '/admin/deep-links',   label: 'Link sản phẩm',  icon: '🎯' },
      { href: '/admin/coupon-alerts', label: 'Đăng ký nhận mã', icon: '🔔' },
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
      { href: '/admin/article-ideas', label: 'Ý tưởng bài viết', icon: '💡' },
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
      { href: '/admin/config/persona', label: 'Giọng kênh (AI)',   icon: '🗣️' },
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

/**
 * So viec dang cho tren tung muc menu. Chi hien khi > 0 — mot huy hieu "0" khong
 * mang thong tin gi ma van hut mat, lam nhung con so THAT kho nhan ra hon.
 */
function Badge({ count, tone }: { count: number; tone: 'amber' | 'red' }) {
  if (count <= 0) return null
  return (
    <span className={`adm-badge adm-badge--${tone}`} aria-label={`${count} mục cần xử lý`}>
      {count > 99 ? '99+' : count}
    </span>
  )
}

// Muc nao la "co viec cho ban" va viec do gap toi dau. Link hong lam mat click
// that su nen la mau do; hang doi duyet va nguoi dang ky cho la mau ho phach.
const BADGE_TONE: Record<string, 'amber' | 'red'> = {
  '/admin/ai-review': 'amber',
  '/admin/coupon-alerts': 'amber',
  '/admin/link-checker': 'red',
}

export default function AdminNav({ badges = {}, role }: { badges?: Record<string, number>; role: AdminRole }) {
  const path = usePathname()

  // Thanh dieu huong chi hien nhung gi vai nay VAO DUOC — dung chung ham
  // `canAccess` voi proxy.ts, khong viet lai dieu kien lan thu hai.
  //
  // ⚠️ Day la chuyen GIAO DIEN, khong phai vong chan bao mat. Vong chan that
  // nam o proxy.ts, chan ca GET lan POST cua Server Action. Giau link chi de
  // nguoi dung khong bam vao thu chac chan se bi tu choi.
  const nav = NAV
    .map(g => ({ ...g, items: g.items.filter(i => canAccess(role, i.href, 'GET')) }))
    .filter(g => g.items.length > 0)

  // Duoi 900px thanh ben thanh ngan keo. Dong lai bang chinh cu bam vao link
  // (xem `closeDrawer` duoi day) chu khong bang useEffect theo `path`: dat
  // setState trong effect la thu ESLint cua du an nay chan, va o day khong can
  // — dieu huong trong admin luon bat dau bang mot cu bam trong menu.
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = () => setDrawerOpen(false)
  const totalBadge = Object.values(badges).reduce((sum, n) => sum + (n ?? 0), 0)

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const g of nav) {
      const hasActive = g.items.some(item => path.startsWith(item.href))
      init[g.key] = g.defaultOpen || hasActive
    }
    return init
  })

  const toggle = (key: string) =>
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }))

  return (
    <>
      {/* Chi hien duoi 900px (xem globals.css) — o do thanh ben da thanh ngan keo
          nen phai co mot cho de mo no ra. */}
      <div className="adm-topbar">
        <button className="adm-burger" onClick={() => setDrawerOpen(true)} aria-label="Mở menu quản trị" aria-expanded={drawerOpen}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
        <Link href="/admin" className="adm-topbar-logo" onClick={closeDrawer}>
          Offerdy<span>Admin</span>
        </Link>
        {/* Huy hieu tong: menu dong lai khong duoc phep giau het viec dang cho */}
        <Badge count={totalBadge} tone="amber" />
      </div>

      {drawerOpen && <button className="adm-scrim" onClick={closeDrawer} aria-label="Đóng menu" />}

      <aside className={`adm-sidebar${drawerOpen ? ' adm-sidebar--open' : ''}`}>
      <Link href="/admin" className="adm-logo" onClick={closeDrawer}>
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
        {nav.map(group => {
          const isOpen = openGroups[group.key]
          const hasActive = group.items.some(item => path.startsWith(item.href))
          // Nhom dong lai van phai to cao viec ben trong, khong thi gap lai la
          // giau mat — dung cai ma huy hieu sinh ra de chong.
          const groupCount = group.items.reduce((sum, item) => sum + (badges[item.href] ?? 0), 0)

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
                {!isOpen && <Badge count={groupCount} tone="amber" />}
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
                        onClick={closeDrawer}
                      >
                        <span className="adm-link-icon">{item.icon}</span>
                        <span className="adm-link-label">{item.label}</span>
                        <Badge count={badges[item.href] ?? 0} tone={BADGE_TONE[item.href] ?? 'amber'} />
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
        {/* Vai hien ra ngoai co chu dich: nguoi dung phai biet minh dang o quyen
            nao, neu khong thi mot muc bi an se giong het mot loi giao dien. */}
        <div className="adm-whoami">
          <span className="adm-role-pill">{ROLE_LABEL[role]}</span>
          {/* POST thang toi Route Handler, KHONG dung Server Action: Server
              Action goi ve chinh URL trang dang mo, ma vai chi-xem bi chan moi
              POST — nen ho se khong the dang xuat. Xem app/admin/logout/route.ts */}
          <form action="/admin/logout" method="post">
            <button type="submit" className="adm-logout">Đăng xuất</button>
          </form>
        </div>

        {canAccess(role, '/admin/users', 'GET') && (
          <Link href="/admin/users" className="adm-back-link" onClick={closeDrawer} style={{ marginBottom: 8 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            </svg>
            Người dùng
          </Link>
        )}

        {canAccess(role, '/admin/audit', 'GET') && (
          <Link href="/admin/audit" className="adm-back-link" onClick={closeDrawer} style={{ marginBottom: 8 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Nhật ký
          </Link>
        )}

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
    </>
  )
}
