'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { assignDealCodes, type AssignResult } from './actions'
import { DEAL_CODE_START } from '@/lib/dealCode'

export default function MigrateDealCodesClient({ missingCount, withCode }: {
  missingCount: number
  withCode: number
}) {
  const [result, setResult] = useState<AssignResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const run = () => startTransition(async () => setResult(await assignDealCodes()))

  return (
    <div className="adm-dash" style={{ maxWidth: 620 }}>
      <h1 className="adm-dash-title">Migrate: Mã sản phẩm</h1>

      <div style={{ background: '#fff', border: '1.5px solid #E4EAF2', borderRadius: 12, padding: '22px 26px', marginTop: 24 }}>
        <div style={{ fontSize: 13, color: '#4B5563', lineHeight: 1.85, marginBottom: 18 }}>
          Cấp mã sản phẩm cho deal chưa có. Mã bắt đầu từ <strong>#{DEAL_CODE_START}</strong>, tăng dần,
          deal cũ nhất lấy số nhỏ nhất. Dùng để nhắc sản phẩm trong caption Instagram/TikTok,
          tìm trên <Link href="/links" style={{ color: '#16A34A', fontWeight: 600 }}>/links</Link>,
          và short link <code style={{ background: '#F6F8FB', padding: '1px 5px', borderRadius: 4 }}>offerdy.com/d/1000</code>.
          <br />
          Deal đã có mã <strong>không bao giờ bị đổi</strong> — mã đã đăng lên mạng xã hội phải giữ vĩnh viễn.
          Chạy lại bất cứ lúc nào cũng an toàn.
        </div>

        <div style={{ display: 'flex', gap: 20, marginBottom: 20, fontSize: 13 }}>
          <div>
            <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Đã có mã</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#16A34A' }}>{withCode}</div>
          </div>
          <div>
            <div style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Chưa có mã</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: missingCount > 0 ? '#D97706' : '#9CA3AF' }}>{missingCount}</div>
          </div>
        </div>

        <button className="oa-btn oa-btn-green" onClick={run} disabled={isPending}>
          {isPending ? 'Đang cấp mã…' : missingCount > 0 ? `Cấp mã cho ${missingCount} deal` : 'Kiểm tra & cấp mã'}
        </button>
      </div>

      {result?.error && (
        <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 12, padding: '20px 26px', marginTop: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>Lỗi</div>
          <div style={{ fontSize: 13, color: '#B91C1C' }}>{result.error}</div>
        </div>
      )}

      {result && !result.error && (
        <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 12, padding: '22px 26px', marginTop: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#16A34A', marginBottom: 12 }}>
            {result.assigned.length > 0
              ? `Đã cấp mã cho ${result.assigned.length} deal`
              : 'Tất cả deal đã có mã — không có gì cần làm'}
          </div>

          {result.assigned.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #BBF7D0', borderRadius: 10, marginBottom: 18, maxHeight: 340, overflowY: 'auto' }}>
              {result.assigned.map(a => (
                <div key={a.code} style={{ display: 'flex', gap: 12, alignItems: 'baseline', padding: '7px 14px', fontSize: 13, borderBottom: '1px solid #F0FDF4' }}>
                  <strong style={{ color: '#16A34A', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>#{a.code}</strong>
                  <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="/links" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 700, background: '#16A34A', color: '#fff', padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>
              Xem trang /links →
            </a>
            <Link href="/admin/deals" style={{ fontSize: 13, fontWeight: 600, color: '#6B7694', padding: '8px 16px', borderRadius: 8, border: '1.5px solid #E4EAF2', textDecoration: 'none' }}>
              ← Quản lý Deal
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
