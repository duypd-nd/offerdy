'use client'

import { useState } from 'react'
import type { LinkItem } from './page'

const BATCH_SIZE = 15

type CheckResult = { offerId: string; url: string; ok: boolean; status?: number; error?: string }

export default function LinkCheckerClient({ items }: { items: LinkItem[] }) {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [results, setResults] = useState<Map<string, CheckResult>>(new Map())

  async function runCheck() {
    setRunning(true)
    setResults(new Map())
    const totalBatches = Math.ceil(items.length / BATCH_SIZE)
    setProgress({ done: 0, total: totalBatches })

    for (let b = 0; b < totalBatches; b++) {
      const batch = items.slice(b * BATCH_SIZE, b * BATCH_SIZE + BATCH_SIZE)
      try {
        const res = await fetch('/api/check-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: batch.map(i => ({ offerId: i.offerId, url: i.link })) }),
        })
        const data = await res.json()
        if (Array.isArray(data.results)) {
          setResults(prev => {
            const next = new Map(prev)
            for (const r of data.results as CheckResult[]) next.set(r.offerId, r)
            return next
          })
        }
      } catch {
        // bo qua batch loi, tiep tuc batch tiep theo
      }
      setProgress({ done: b + 1, total: totalBatches })
    }
    setRunning(false)
  }

  const broken = items
    .map(item => ({ item, result: results.get(item.offerId) }))
    .filter((r): r is { item: LinkItem; result: CheckResult } => !!r.result && !r.result.ok)

  const checkedCount = results.size

  return (
    <div>
      <button
        onClick={runCheck}
        disabled={running}
        style={{
          padding: '10px 20px', background: running ? '#94a3b8' : '#22c55e', color: '#fff',
          border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 14,
          cursor: running ? 'not-allowed' : 'pointer', marginBottom: 20,
        }}
      >
        {running ? 'Đang quét...' : '🔍 Bắt đầu quét'}
      </button>

      {progress && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
            Đã quét {checkedCount}/{items.length} link {running ? `(batch ${progress.done}/${progress.total})` : '— hoàn tất'}
          </div>
          <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: '#22c55e', borderRadius: 3,
              width: `${(progress.done / progress.total) * 100}%`, transition: 'width .2s',
            }} />
          </div>
        </div>
      )}

      {checkedCount > 0 && (
        <div style={{
          background: broken.length > 0 ? '#fef2f2' : '#f0fdf4',
          border: `1.5px solid ${broken.length > 0 ? '#fecaca' : '#86efac'}`,
          borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 13, fontWeight: 700,
          color: broken.length > 0 ? '#dc2626' : '#16a34a',
        }}>
          {broken.length > 0 ? `❌ Tìm thấy ${broken.length} link hỏng` : '✅ Tất cả link đã quét đều hoạt động tốt'}
        </div>
      )}

      {broken.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Offer</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Lỗi</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Link</th>
              </tr>
            </thead>
            <tbody>
              {broken.map(({ item, result }) => (
                <tr key={item.offerId} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                    {item.title}
                    <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {item.storeName}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#dc2626', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {result.status ? `HTTP ${result.status}` : result.error}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>{item.link}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
