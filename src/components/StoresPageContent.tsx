'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Store } from '@/data/stores'

const PAGE_SIZE = 24

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'electronics', label: '📱 Electronics' },
  { value: 'fashion', label: '👗 Fashion' },
  { value: 'beauty', label: '💄 Beauty' },
  { value: 'home', label: '🏠 Home' },
  { value: 'sports', label: '🏃 Sports' },
  { value: 'food', label: '🍕 Food' },
  { value: 'travel', label: '✈️ Travel' },
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'general', label: '🛒 General' },
]

type StoreWithCount = Store & { count?: number }

export default function StoresPageContent({ stores }: { stores: StoreWithCount[] }) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('name')

  const filtered = useMemo(() => {
    let result = [...stores]
    if (category !== 'all') result = result.filter(s => s.category === category)
    if (search.trim()) result = result.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    if (sort === 'deals') result.sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    return result
  }, [stores, category, search, sort])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const goTo = (p: number) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const handleFilter = (cat: string) => { setCategory(cat); setPage(1) }
  const handleSearch = (v: string) => { setSearch(v); setPage(1) }

  return (
    <div className="section">
      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search stores..."
          style={{ padding: '8px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', flex: '1 1 180px', minWidth: 0 }}
        />
        <select
          value={sort}
          onChange={e => { setSort(e.target.value); setPage(1) }}
          style={{ padding: '8px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}
        >
          <option value="name">A–Z</option>
          <option value="deals">Most Deals</option>
        </select>
      </div>

      {/* Category chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => handleFilter(c.value)}
            style={{
              padding: '5px 13px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: category === c.value ? '1.5px solid var(--green)' : '1.5px solid #e5e7eb',
              background: category === c.value ? '#dcfce7' : '#fff',
              color: category === c.value ? '#16a34a' : '#374151',
              transition: 'all .15s',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 16, fontSize: 13, color: '#6b7280', fontWeight: 500 }}>
        {filtered.length} store{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== stores.length && ` (of ${stores.length})`}
        {totalPages > 1 && ` · page ${page}/${totalPages}`}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#9ca3af', fontSize: 15 }}>
          No stores match your search.
          <button
            onClick={() => { setSearch(''); setCategory('all') }}
            style={{ display: 'block', margin: '12px auto 0', color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="stores-page-grid">
          {paginated.map((store, i) => (
            <Link key={store.name + i} href={`/stores/${store.slug ?? store.name.toLowerCase().replace(/\s+/g, '-')}`} className="store-page-card">
              <div className={`store-page-sa ${store.colorClass ?? 'sa-default'}`}>
                {store.imageUrl
                  ? <img src={store.imageUrl} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : store.abbr
                }
              </div>
              <div className="store-page-info">
                <div className="store-page-name">{store.name}</div>
                {store.count ? (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{store.count} deals</div>
                ) : null}
                <span className="store-page-btn">View deals →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="deals-pagination">
          <button className="dpag-btn dpag-arrow" onClick={() => goTo(1)} disabled={page === 1}>«</button>
          <button className="dpag-btn dpag-arrow" onClick={() => goTo(page - 1)} disabled={page === 1}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | '...')[]>((acc, p, idx, arr) => {
              if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === '...'
                ? <span key={`e-${i}`} className="dpag-ellipsis">…</span>
                : <button key={p} className={`dpag-btn${page === p ? ' dpag-active' : ''}`} onClick={() => goTo(p as number)}>{p}</button>
            )
          }
          <button className="dpag-btn dpag-arrow" onClick={() => goTo(page + 1)} disabled={page === totalPages}>›</button>
          <button className="dpag-btn dpag-arrow" onClick={() => goTo(totalPages)} disabled={page === totalPages}>»</button>
        </div>
      )}
    </div>
  )
}
