'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { searchableStores } from '@/data/stores'
import { searchableDeals } from '@/data/deals'
import { searchableCategories } from '@/data/categories'
import { searchableReviews } from '@/data/reviews'
import type { NavLink } from '@/data/siteSettings'
import { defaultSiteSettings } from '@/data/siteSettings'
import type { SearchableContent } from '@/sanity/queries'

type SearchItem = { name: string; sub: string; icon: string; url?: string }

const defaultSearchContent: SearchableContent = {
  deals: searchableDeals,
  stores: searchableStores,
  categories: searchableCategories,
  reviews: searchableReviews,
  posts: [],
}

const popular = ['AirPods Pro', 'Nike deals', 'MacBook Air', 'Samsung Galaxy', 'Amazon promo code', 'Dyson vacuum', 'iPhone 16', 'Apple Watch']

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(re)
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? <mark key={i}>{part}</mark> : part
      )}
    </>
  )
}

function ResultSection({ label, items, badge, badgeClass, query, onClose }: {
  label: string
  items: SearchItem[]
  badge: string
  badgeClass: string
  query: string
  onClose: () => void
}) {
  if (!items.length) return null
  return (
    <div className="sd-sec">
      <div className="sd-lbl">{label}</div>
      {items.slice(0, 4).map((item, i) => (
        item.url
          ? <Link key={i} href={item.url} className="sd-item sd-item-link" onClick={onClose}>
              <div className="sd-ico">{item.icon}</div>
              <div className="sd-info">
                <div className="sd-name"><Highlight text={item.name} query={query} /></div>
                <div className="sd-sub">{item.sub}</div>
              </div>
              <span className={`sd-badge ${badgeClass}`}>{badge}</span>
            </Link>
          : <div key={i} className="sd-item">
              <div className="sd-ico">{item.icon}</div>
              <div className="sd-info">
                <div className="sd-name"><Highlight text={item.name} query={query} /></div>
                <div className="sd-sub">{item.sub}</div>
              </div>
              <span className={`sd-badge ${badgeClass}`}>{badge}</span>
            </div>
      ))}
    </div>
  )
}

function Dropdown({ query, onChipClick, onClose, content }: {
  query: string
  onChipClick: (v: string) => void
  onClose: () => void
  content: SearchableContent
}) {
  const q = query.trim()
  if (!q) return null
  const lq = q.toLowerCase()
  const match = (arr: SearchItem[]) => arr.filter(d => d.name.toLowerCase().includes(lq))
  const ms = match(content.stores)
  const mc = match(content.categories)
  const md = match(content.deals)
  const mr = match(content.reviews)
  const mp = match(content.posts)
  if (!ms.length && !mc.length && !md.length && !mr.length && !mp.length) {
    return <div className="sd-empty">No results for &ldquo;<strong>{q}</strong>&rdquo; — try a brand or product name.</div>
  }
  return (
    <>
      <ResultSection label="Stores" items={ms} badge="Store" badgeClass="b-store" query={q} onClose={onClose} />
      <ResultSection label="Categories" items={mc} badge="Category" badgeClass="b-cat" query={q} onClose={onClose} />
      <ResultSection label="Deals" items={md} badge="Deal" badgeClass="b-deal" query={q} onClose={onClose} />
      <ResultSection label="Reviews & Comparisons" items={mr} badge="Review" badgeClass="b-rev" query={q} onClose={onClose} />
      <ResultSection label="Articles" items={mp} badge="Blog" badgeClass="b-blog" query={q} onClose={onClose} />
      <div className="sd-footer"><Link href={`/search?q=${encodeURIComponent(q)}`} onClick={onClose}>See all results for &ldquo;{q}&rdquo; →</Link></div>
    </>
  )
}

export function SearchBar({
  placeholder,
  variant = 'header',
  content = defaultSearchContent,
}: {
  placeholder: string
  variant?: 'header' | 'hero'
  content?: SearchableContent
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
    if (e.key === 'Enter' && query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`
    }
  }

  if (variant === 'hero') {
    return (
      <div ref={wrapperRef} className="hero-search-wrapper">
        <div className="hero-search">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            autoComplete="off"
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKey}
          />
          <button type="button">Find Deals →</button>
        </div>
        {open && (
          <div className="sd hero-sd" style={{ display: 'block' }}>
            <Dropdown query={query} onChipClick={v => setQuery(v)} onClose={() => setOpen(false)} content={content} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="search-wrapper">
      <div className="search-bar">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          autoComplete="off"
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
        />
        <button className="search-btn" type="button" aria-label="Search">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" />
          </svg>
        </button>
      </div>
      {open && (
        <div className="sd" style={{ display: 'block' }}>
          <Dropdown query={query} onChipClick={v => setQuery(v)} onClose={() => setOpen(false)} content={content} />
        </div>
      )}
    </div>
  )
}

export default function Header({
  navLinks = defaultSiteSettings.navigation,
  logoUrl,
  searchableContent,
}: {
  navLinks?: NavLink[]
  logoUrl?: string
  searchableContent?: SearchableContent
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const content = searchableContent ?? defaultSearchContent

  const isActive = (url: string) =>
    url === '/' ? pathname === '/' : pathname.startsWith(url)

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <Link href="/" className="logo">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" height={36} style={{ maxWidth: 140, objectFit: 'contain', borderRadius: 0 }} />
            ) : (
              <>
                <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                  <rect width="36" height="36" rx="8" fill="#22C55E" />
                  <path d="M8 12C8 10.343 9.343 9 11 9H19.5L28 17.5V27C28 28.657 26.657 30 25 30H11C9.343 30 8 28.657 8 27V12Z" fill="white" fillOpacity="0.18" stroke="white" strokeWidth="1.5" />
                  <circle cx="13.5" cy="14.5" r="2" fill="white" />
                  <path d="M19.5 9V17.5H28" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M12 21.5H17M12 24.5H21" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="logo-text"><span className="o">Offer</span><span className="dy">dy</span></span>
              </>
            )}
          </Link>
          <SearchBar placeholder="" variant="header" content={content} />
          <nav className="nav">
            {navLinks.map(link => (
              <Link key={link.url} href={link.url} className={isActive(link.url) ? 'active' : ''}>
                {link.label}
              </Link>
            ))}
          </nav>
          <button
            className={`hamburger${menuOpen ? ' open' : ''}`}
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(v => !v)}
          >
            <span /><span /><span />
          </button>
        </div>
      </header>
      <nav className={`mobile-nav${menuOpen ? ' open' : ''}`}>
        <div className="mobile-nav-inner">
          {navLinks.map(link => (
            <Link key={link.url} href={link.url} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
