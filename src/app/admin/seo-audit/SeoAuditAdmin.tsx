'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { issueLabel, type SeoIssue, type SeoIssueType } from '@/lib/seoAudit'
import AdminPagination from '../_components/AdminPagination'
import { useAdminUrlState } from '../_components/useAdminUrlState'
import { useUrlPage } from '../_components/useUrlPage'

const PAGE_SIZE = 50

const SEVERITY_COLOR: Record<SeoIssue['severity'], string> = {
  high: '#dc2626',
  medium: '#d97706',
  low: '#9ca3af',
}

const SEVERITY_LABEL: Record<SeoIssue['severity'], string> = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
}

const ENTITY_LABEL: Record<SeoIssue['entityType'], string> = {
  store: 'Store',
  deal: 'Deal',
  post: 'Post',
  review: 'Review',
}

export default function SeoAuditAdmin({ issues, totalEntities }: { issues: SeoIssue[]; totalEntities: number }) {
  const [typeFilter, setTypeFilter] = useState<'all' | SeoIssueType>('all')
  const [entityFilter, setEntityFilter] = useState<'all' | SeoIssue['entityType']>('all')
  const [search, setSearch] = useState('')
  const page = useUrlPage()
  const { setParams } = useAdminUrlState()

  const byType = useMemo(() => {
    const map = new Map<SeoIssueType, number>()
    for (const issue of issues) map.set(issue.type, (map.get(issue.type) ?? 0) + 1)
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [issues])

  const filtered = issues.filter(i => {
    const matchType = typeFilter === 'all' || i.type === typeFilter
    const matchEntity = entityFilter === 'all' || i.entityType === entityFilter
    const matchSearch = i.entityName.toLowerCase().includes(search.toLowerCase())
    return matchType && matchEntity && matchSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="oa-wrap">
      <div className="oa-header">
        <div>
          <h1 className="oa-title">SEO Audit</h1>
          <div className="oa-breadcrumb">Home / SEO Audit ({totalEntities} entity, {issues.length} vấn đề)</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {byType.map(([type, count]) => (
          <button
            key={type}
            onClick={() => { setTypeFilter(typeFilter === type ? 'all' : type); setParams({}) }}
            className="oa-table-wrap"
            style={{ padding: 14, textAlign: 'left', cursor: 'pointer', border: typeFilter === type ? '2px solid #16A34A' : undefined }}
          >
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{count}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{issueLabel(type)}</div>
          </button>
        ))}
        {issues.length === 0 && (
          <div className="oa-table-wrap" style={{ padding: 14, gridColumn: '1 / -1', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
            ✓ Không phát hiện vấn đề SEO nào
          </div>
        )}
      </div>

      <div className="oa-toolbar">
        <div className="oa-filters">
          <input className="oa-search" placeholder="Tìm tên..." value={search} onChange={e => { setSearch(e.target.value); setParams({}) }} />
          <select className="oa-select" value={entityFilter} onChange={e => { setEntityFilter(e.target.value as 'all' | SeoIssue['entityType']); setParams({}) }}>
            <option value="all">Tất cả loại</option>
            <option value="store">Store</option>
            <option value="deal">Deal</option>
            <option value="post">Post</option>
            <option value="review">Review</option>
          </select>
          {typeFilter !== 'all' && (
            <button className="oa-btn" onClick={() => { setTypeFilter('all'); setParams({}) }}>✕ Bỏ lọc ({issueLabel(typeFilter)})</button>
          )}
        </div>
      </div>

      <div className="oa-table-wrap">
        <table className="oa-table">
          <thead>
            <tr>
              <th className="oa-th-num">#</th>
              <th>Tên</th>
              <th>Loại</th>
              <th>Vấn đề</th>
              <th>Mức độ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((issue, i) => (
              <tr key={`${issue.type}-${issue.entityId}-${i}`}>
                <td className="oa-td-num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                <td style={{ fontWeight: 600 }}>{issue.entityName}</td>
                <td style={{ fontSize: 13 }}>{ENTITY_LABEL[issue.entityType]}</td>
                <td style={{ fontSize: 13 }}>{issueLabel(issue.type)}</td>
                <td>
                  <span style={{ fontSize: 11, fontWeight: 700, color: SEVERITY_COLOR[issue.severity] }}>
                    {SEVERITY_LABEL[issue.severity]}
                  </span>
                </td>
                <td>
                  <Link href={issue.adminHref} className="oa-row-link" title="Sửa">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}
            {paginated.length === 0 && issues.length > 0 && (
              <tr><td colSpan={6} className="oa-empty">Không tìm thấy vấn đề nào khớp bộ lọc</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="oa-footer">
        <div className="oa-count">
          {filtered.length > 0
            ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} / ${filtered.length} vấn đề`
            : '0 vấn đề'}
        </div>
        <AdminPagination page={page} totalPages={totalPages} />
      </div>
    </div>
  )
}
