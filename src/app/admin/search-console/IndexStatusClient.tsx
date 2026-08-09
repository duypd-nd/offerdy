'use client'

import { useState } from 'react'
import { inspectOneUrl } from './actions'
import { canonicalConflict, type UrlInspectResult } from '@/lib/urlInspection'

/**
 * "Google da thay trang nay chua" — bam nut moi chay.
 *
 * ⚠️ KHONG tu chay khi mo trang: URL Inspection co han ngach 2000 URL/ngay cho ca
 * site, va bao cao nay khong phai thu can tuoi tung phut. Nguoi van hanh bam khi
 * muon biet.
 *
 * Quet TUAN TU, moi URL mot lan goi server action — cung ly do da ghi o
 * `actions.ts`: mot action dai co the bi giet giua chung va mat sach. Tuan tu con
 * cho thay tien do that, va khong ban 12 request cung luc vao API cua Google.
 */

/** Nhan tieng Viet cho `coverageState` — giu nguyen van tieng Anh trong ngoac de tra cuu duoc. */
const COVERAGE_VI: Record<string, string> = {
  'Submitted and indexed': 'Đã nộp và đã vào chỉ mục',
  'Indexed, not submitted in sitemap': 'Đã vào chỉ mục (nhưng không có trong sitemap)',
  'Discovered - currently not indexed': 'Google biết URL nhưng CHƯA buồn bò tới',
  'Crawled - currently not indexed': 'Đã bò qua nhưng chưa cho vào chỉ mục',
  'URL is unknown to Google': 'Google CHƯA HỀ biết URL này tồn tại',
  'Duplicate without user-selected canonical': 'Bị coi là trùng lặp',
  'Page with redirect': 'Trang chuyển hướng',
  'Not found (404)': 'Không tìm thấy (404)',
  'Excluded by ‘noindex’ tag': 'Bị thẻ noindex chặn',
  'Blocked by robots.txt': 'Bị robots.txt chặn',
}

function verdictStyle(r: Extract<UrlInspectResult, { ok: true }>) {
  if (r.verdict === 'PASS') return { bg: '#f0fdf4', border: '#bbf7d0', fg: '#15803d', icon: '✓' }
  if (r.verdict === 'FAIL') return { bg: '#fef2f2', border: '#fecaca', fg: '#b91c1c', icon: '✕' }
  // NEUTRAL bao trum ca "chua biet URL" lan "biet ma chua bo" — deu la chua vao
  // chi muc, va deu la thu nguoi van hanh phai lam gi do.
  return { bg: '#fffbeb', border: '#fde68a', fg: '#b45309', icon: '•' }
}

/**
 * `checkedAt` di vao chu khong goi `Date.now()` tai cho: goi ham khong thuan trong
 * luc render la loi lint co that (react-hooks/purity). No cung dung nghia hon —
 * "cach day may ngay" phai tinh tu luc HOI Google, khong phai tu luc React ve lai.
 */
function daysAgo(iso: string, checkedAt: number): string {
  const d = Math.floor((checkedAt - new Date(iso).getTime()) / 86_400_000)
  if (d <= 0) return 'hôm nay'
  if (d === 1) return 'hôm qua'
  return `${d} ngày trước`
}

export default function IndexStatusClient({ urls }: { urls: string[] }) {
  const [results, setResults] = useState<UrlInspectResult[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [checkedAt, setCheckedAt] = useState<number | null>(null)

  async function run() {
    setResults([])
    setCheckedAt(Date.now()) // trong event handler — hop le
    setProgress({ done: 0, total: urls.length })
    const out: UrlInspectResult[] = []
    for (const [i, url] of urls.entries()) {
      setProgress({ done: i, total: urls.length })
      const r = await inspectOneUrl(url)
      out.push(r)
      setResults([...out])
      // Het han ngach thi dung han: chay tiep chi de thu ve 11 loi giong het nhau.
      if (!r.ok && r.error.includes('hạn ngạch')) break
    }
    setProgress(null)
  }

  const indexed = results.filter(r => r.ok && r.verdict === 'PASS').length
  const done = results.length > 0 && progress === null

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button className="oa-btn oa-btn-primary" onClick={run} disabled={progress !== null}>
          {progress ? `Đang hỏi Google ${progress.done + 1}/${progress.total}…` : done ? 'Kiểm tra lại' : 'Hỏi Google từng trang'}
        </button>
        {done && (
          <span style={{ fontSize: 12.5, color: '#64748b' }}>
            <b style={{ color: indexed > 0 ? '#15803d' : '#b45309' }}>{indexed}</b>/{results.length} trang đã vào chỉ mục
          </span>
        )}
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {results.map(r => {
            const path = r.url.replace(/^https?:\/\/[^/]+/, '') || '/'
            if (!r.ok) {
              return (
                <div key={r.url} style={{ border: '1px solid #fecaca', background: '#fef2f2', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a' }}>{path}</div>
                  <div style={{ fontSize: 11.5, color: '#b91c1c', marginTop: 2 }}>{r.error}</div>
                </div>
              )
            }
            const s = verdictStyle(r)
            return (
              <div key={r.url} style={{ border: `1px solid ${s.border}`, background: s.bg, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <span style={{ color: s.fg, fontWeight: 800 }}>{s.icon}</span>
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', textDecoration: 'none', maxWidth: '100%', overflowWrap: 'anywhere' }}>
                    {path}
                  </a>
                </div>
                <div style={{ fontSize: 11.5, color: s.fg, marginTop: 3, fontWeight: 600 }}>
                  {COVERAGE_VI[r.coverageState] ?? r.coverageState}
                  {COVERAGE_VI[r.coverageState] && (
                    <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {r.coverageState}</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                  Google bò qua:{' '}
                  {r.lastCrawlTime && checkedAt
                    ? <b style={{ color: '#64748b' }}>{daysAgo(r.lastCrawlTime, checkedAt)}</b>
                    : <b style={{ color: '#b45309' }}>chưa bao giờ</b>}
                  {r.sitemaps.length > 0 && <span> · có trong sitemap</span>}
                </div>
                {canonicalConflict(r.googleCanonical, r.userCanonical) && (
                  <div style={{ fontSize: 11, color: '#b91c1c', marginTop: 4 }}>
                    ⚠️ Google chọn canonical khác: <code>{r.googleCanonical}</code>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
