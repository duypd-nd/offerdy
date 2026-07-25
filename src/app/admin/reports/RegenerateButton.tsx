'use client'

import { useState, useTransition } from 'react'
import { regenerateDailyReport } from './actions'

export default function RegenerateButton({ stale }: { stale: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const run = () => {
    if (!confirm('Tạo lại báo cáo AI ngay? Mỗi lần bấm là một lượt gọi Anthropic có tính phí.')) return
    setError('')
    startTransition(async () => {
      const res = await regenerateDailyReport()
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <>
      <button
        onClick={run}
        disabled={isPending}
        style={{
          fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 7,
          border: `1px solid ${stale ? '#f59e0b' : '#86efac'}`,
          background: stale ? '#fff' : 'transparent',
          color: stale ? '#b45309' : '#166534',
          opacity: isPending ? 0.6 : 1, whiteSpace: 'nowrap',
        }}
      >
        {isPending ? 'Đang tạo…' : 'Tạo lại ngay'}
      </button>
      {error && (
        <div style={{ width: '100%', marginTop: 8, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12, color: '#b91c1c', lineHeight: 1.6 }}>
          <strong>Không tạo được báo cáo:</strong> {error}
        </div>
      )}
    </>
  )
}
