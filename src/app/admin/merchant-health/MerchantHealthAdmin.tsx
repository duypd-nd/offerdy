'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { computeStoreHealth, levelFor, HEALTH_LEVEL_COLOR, HEALTH_LEVEL_LABEL as LEVEL_LABEL, type HealthLevel, type StoreHealthInput } from '@/lib/merchantHealth'
import AdminPagination from '../_components/AdminPagination'
import { useAdminUrlState } from '../_components/useAdminUrlState'
import { useUrlPage } from '../_components/useUrlPage'

const LEVELS: HealthLevel[] = ['Excellent', 'Very Good', 'Healthy', 'Needs Improvement', 'Poor', 'Critical']
const PAGE_SIZE = 100

export default function MerchantHealthAdmin({ stores }: { stores: StoreHealthInput[] }) {
  const [levelFilter, setLevelFilter] = useState<'all' | HealthLevel>('all')
  const [search, setSearch] = useState('')
  const page = useUrlPage()
  const { setParams } = useAdminUrlState()

  const scored = useMemo(
    () => stores.map(s => ({ store: s, health: computeStoreHealth(s) })).sort((a, b) => a.health.overall - b.health.overall),
    [stores]
  )

  const filtered = scored.filter(({ store, health }) => {
    const matchLevel = levelFilter === 'all' || health.level === levelFilter
    const matchSearch = store.name.toLowerCase().includes(search.toLowerCase())
    return matchLevel && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const avgScore = scored.length ? Math.round(scored.reduce((sum, s) => sum + s.health.overall, 0) / scored.length) : 0
  const distribution = LEVELS.map(level => ({ level, count: scored.filter(s => s.health.level === level).length }))

  return (
    <div className="oa-wrap">
      <div className="oa-header">
        <div>
          <h1 className="oa-title">Merchant Health</h1>
          <div className="oa-breadcrumb">Home / Merchant Health ({stores.length} store)</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div className="oa-table-wrap" style={{ padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: HEALTH_LEVEL_COLOR[levelFor(avgScore)] }}>{avgScore}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>Điểm trung bình</div>
        </div>
        {distribution.map(({ level, count }) => (
          <button
            key={level}
            onClick={() => { setLevelFilter(levelFilter === level ? 'all' : level); setParams({}) }}
            className="oa-table-wrap"
            style={{ padding: 16, textAlign: 'center', cursor: 'pointer', border: levelFilter === level ? `2px solid ${HEALTH_LEVEL_COLOR[level]}` : undefined }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: HEALTH_LEVEL_COLOR[level] }}>{count}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{LEVEL_LABEL[level]}</div>
          </button>
        ))}
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input className="oa-search" placeholder="Tìm store..." value={search} onChange={e => { setSearch(e.target.value); setParams({}) }} />
          {levelFilter !== 'all' && (
            <button className="oa-btn" onClick={() => { setLevelFilter('all'); setParams({}) }}>✕ Bỏ lọc ({LEVEL_LABEL[levelFilter]})</button>
          )}
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th className="oa-th-num">#</th>
              <th>Store</th>
              <th>Điểm</th>
              <th>Content</th>
              <th>SEO</th>
              <th>Affiliate</th>
              <th>Freshness</th>
              <th>Vấn đề</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(({ store, health }, i) => (
              <tr key={store.id}>
                <td className="oa-td-num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{store.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{store.slug}</div>
                </td>
                <td>
                  <span style={{ fontWeight: 800, fontSize: 15, color: HEALTH_LEVEL_COLOR[health.level] }}>{health.overall}</span>
                  <div style={{ fontSize: 10, color: HEALTH_LEVEL_COLOR[health.level] }}>{LEVEL_LABEL[health.level]}</div>
                </td>
                <td style={{ fontSize: 12 }}>{health.categories.content}</td>
                <td style={{ fontSize: 12 }}>{health.categories.seo}</td>
                <td style={{ fontSize: 12 }}>{health.categories.affiliate}</td>
                <td style={{ fontSize: 12 }}>{health.categories.freshness}</td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 280 }}>
                    {health.issues.slice(0, 3).map((issue, idx) => (
                      <span key={idx} style={{ fontSize: 10, background: '#fef2f2', color: '#b91c1c', padding: '2px 8px', borderRadius: 99 }}>{issue}</span>
                    ))}
                    {health.issues.length > 3 && (
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>+{health.issues.length - 3}</span>
                    )}
                    {health.issues.length === 0 && <span style={{ fontSize: 11, color: '#16A34A' }}>Không có</span>}
                  </div>
                </td>
                <td>
                  <Link href="/admin/stores" className="oa-row-link" title="Quản lý store">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr><td colSpan={9} className="oa-empty">Không tìm thấy store nào</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">
          {filtered.length > 0
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} / ${filtered.length} store`
            : '0 store'}
        </div>
        <AdminPagination page={page} totalPages={totalPages} />
      </div>
    </div>
  )
}
