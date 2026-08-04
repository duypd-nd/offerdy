'use client'

import { useMemo, useState, useTransition } from 'react'
import type { TestItem } from './page'
import { saveCodeTest, clearCodeTest } from './actions'
import { fmtDayUtc } from '@/lib/offerTrust'
import { NOTE_PHRASES, hasPhrase, togglePhrase } from '@/lib/couponTestNote'

type Result = 'worked' | 'partial' | 'rejected'

const RESULTS: { value: Result; label: string; color: string; bg: string; border: string }[] = [
  { value: 'worked',   label: '✅ Áp được',        color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
  { value: 'partial',  label: '⚠️ Có điều kiện',   color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  { value: 'rejected', label: '❌ Bị từ chối',      color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
]

/**
 * Man hinh "cay" de thu tung ma o quay thanh toan.
 *
 * ⚠️ Danh sach PHANG, khong gom nhom theo shop — quyet dinh nay dua tren du lieu
 * that chu khong theo linh cam. Do ngay 2026-08-04: 71 offer co ma nam tren **67
 * shop**, tuc 65 shop chi co dung MOT ma. Gom nhom se de ra 67 tieu de cho 71
 * dong, chi lam dai trang chu khong gom duoc viec gi.
 *
 * Va con so dang chu y hon: chi co **7 ma khac nhau**, rieng `OFFERDY` dung o 63
 * shop. Nen viec that o day khong phai "thu 71 ma" ma la "thu MOT ma o 63 quay
 * thanh toan khac nhau" — va ket qua se khac nhau theo tung shop, do moi la thu
 * dang ghi lai.
 *
 * Chua thu thi noi len dau, de mo trang ra la thay ngay viec con lai.
 */
export default function CouponTestsClient({ items }: { items: TestItem[] }) {
  const [rows, setRows] = useState(items)
  const [onlyUntested, setOnlyUntested] = useState(false)

  const visible = useMemo(() => {
    const list = onlyUntested ? rows.filter(r => !r.codeTestedAt) : rows
    return [...list].sort(
      (a, b) =>
        Number(!!a.codeTestedAt) - Number(!!b.codeTestedAt) ||
        (a.storeName ?? '').localeCompare(b.storeName ?? ''),
    )
  }, [rows, onlyUntested])

  const tested = rows.filter(r => r.codeTestedAt).length
  const pct = rows.length ? Math.round((tested / rows.length) * 100) : 0

  function patchRow(offerId: string, patch: Partial<TestItem>) {
    setRows(prev => prev.map(r => (r.offerId === offerId ? { ...r, ...patch } : r)))
  }

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Đã thử <b style={{ color: '#0f172a' }}>{tested}</b>/{rows.length} mã ({pct}%)
          </div>
          <label style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyUntested} onChange={e => setOnlyUntested(e.target.checked)} />
            Chỉ hiện mã chưa thử
          </label>
        </div>
        <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#22c55e', borderRadius: 3, width: `${pct}%`, transition: 'width .2s' }} />
        </div>
      </div>

      {visible.length === 0 ? (
        <div style={{ fontSize: 13, color: '#64748b', padding: '24px 0' }}>
          {onlyUntested ? '🎉 Không còn mã nào chưa thử.' : 'Chưa có offer nào mang mã giảm giá.'}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          {visible.map(row => (
            <TestRow key={row.offerId} row={row} onPatch={patchRow} />
          ))}
        </div>
      )}
    </div>
  )
}

function TestRow({ row, onPatch }: { row: TestItem; onPatch: (id: string, patch: Partial<TestItem>) => void }) {
  const [note, setNote] = useState(row.codeTestNote ?? '')
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  const testedOn = fmtDayUtc(row.codeTestedAt)

  function record(result: Result) {
    setError('')
    startTransition(async () => {
      try {
        await saveCodeTest(row.offerId, { result, note })
        // Ngay hien ra ngay tu dong ho MAY KHACH chi de phan hoi tuc thi; ban ghi
        // that do may chu dat. Hai cai lech nhau vai giay, khong anh huong gi.
        onPatch(row.offerId, {
          codeTestedAt: new Date().toISOString(),
          codeTestResult: result,
          codeTestNote: note.trim() || undefined,
        })
      } catch {
        setError('Không lưu được — thử lại.')
      }
    })
  }

  function reset() {
    setError('')
    startTransition(async () => {
      try {
        await clearCodeTest(row.offerId)
        setNote('')
        onPatch(row.offerId, { codeTestedAt: undefined, codeTestResult: undefined, codeTestNote: undefined })
      } catch {
        setError('Không xoá được — thử lại.')
      }
    })
  }

  const current = RESULTS.find(r => r.value === row.codeTestResult)

  return (
    <div style={{ padding: '14px 16px', borderTop: '1px solid #f1f5f9', opacity: isPending ? 0.6 : 1 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(row.couponCode)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
          }}
          title="Chép mã"
          style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 13, fontWeight: 700, letterSpacing: .5,
            padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
            background: copied ? '#dcfce7' : '#f1f5f9', border: `1px dashed ${copied ? '#86efac' : '#cbd5e1'}`,
            color: copied ? '#15803d' : '#0f172a',
          }}
        >
          {copied ? '✓ đã chép' : row.couponCode}
        </button>

        <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500, flex: '1 1 220px', minWidth: 0 }}>
          {/* Ten shop dat truoc tieu de: danh sach phang nen day la thu duy nhat
              cho biet dang mo quay thanh toan cua ai. */}
          <b style={{ color: '#0f172a' }}>{row.storeName ?? '(không rõ shop)'}</b>
          <span style={{ color: '#94a3b8', fontWeight: 400 }}> · {row.title}</span>
        </div>

        {row.testUrl && (
          <a href={row.testUrl} target="_blank" rel="noopener noreferrer"
             style={{ fontSize: 12, color: '#2563eb', whiteSpace: 'nowrap' }}>
            mở giỏ hàng ↗
          </a>
        )}

        {testedOn && (
          <span style={{
            fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', padding: '3px 8px', borderRadius: 5,
            color: current?.color ?? '#64748b', background: current?.bg ?? '#f1f5f9',
            border: `1px solid ${current?.border ?? '#e2e8f0'}`,
          }}>
            {current?.label ?? 'đã thử'} · {testedOn}
          </span>
        )}
      </div>

      {/*
        Cau mau: duong tat de khoi go tay, KHONG phai cau tra loi.
        - Khong cai nao chon san, va bam nut ket qua khong tu dien gi ca.
        - Bo trong van luu duoc — mot cau bia con te hon khong co cau nao.
        - Trang thai "dang chon" doc THANG tu chuoi ghi chu, khong giu state rieng,
          nen go tay xoa mot cum thi cai chip tuong ung tu tat theo.
      */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 2 }}>quan sát:</span>
        {NOTE_PHRASES.map(p => {
          const on = hasPhrase(note, p)
          return (
            <button
              key={p}
              type="button"
              onClick={() => setNote(n => togglePhrase(n, p))}
              disabled={isPending}
              style={{
                fontSize: 11, padding: '4px 9px', borderRadius: 999, whiteSpace: 'nowrap',
                cursor: isPending ? 'not-allowed' : 'pointer',
                color: on ? '#0f172a' : '#64748b',
                background: on ? '#e0f2fe' : '#fff',
                border: `1px solid ${on ? '#7dd3fc' : '#e2e8f0'}`,
                fontWeight: on ? 600 : 400,
              }}
            >
              {on ? '✓ ' : '+ '}{p}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          /* Vi du bang TIENG ANH: cau nay in ra trang store cho nguoi mua doc, khong
             phai ghi chu noi bo. Placeholder cu vo tinh goi y bang tieng Viet. */
          placeholder="Hiện công khai (tiếng Anh) — vd: 10% off applied at checkout, no minimum order required"
          style={{
            flex: '1 1 320px', minWidth: 0, fontSize: 13, padding: '7px 10px',
            border: '1px solid #e2e8f0', borderRadius: 8, color: '#0f172a',
          }}
        />
        {RESULTS.map(r => (
          <button
            key={r.value}
            onClick={() => record(r.value)}
            disabled={isPending}
            style={{
              fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8, whiteSpace: 'nowrap',
              cursor: isPending ? 'not-allowed' : 'pointer',
              color: r.color, background: r.bg, border: `1px solid ${r.border}`,
            }}
          >
            {r.label}
          </button>
        ))}
        {testedOn && (
          <button onClick={reset} disabled={isPending} title="Xoá kết quả, đưa về chưa thử"
                  style={{ fontSize: 12, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', color: '#64748b', background: '#fff', border: '1px solid #e2e8f0' }}>
            gỡ
          </button>
        )}
      </div>

      {error && <div style={{ marginTop: 6, fontSize: 12, color: '#dc2626' }}>{error}</div>}
    </div>
  )
}
