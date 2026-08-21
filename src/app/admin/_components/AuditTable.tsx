import { actionLabel, type AuditRow } from '@/lib/adminAuditFormat'
import { formatAdminDateTime } from '@/lib/adminDateTime'
import { ROLE_LABEL, isRole } from '@/lib/adminAuth'

/**
 * Bang nhat ky thao tac — dung chung cho `/admin/audit` va bang gon tren `/admin`.
 *
 * ⚠️ Mot component duy nhat cho ca hai cho. Neu bang tren dashboard la mot ban
 * chep rieng thi mot ngay nao do no se hien khac voi trang day du, va nguoi doc
 * khong biet ben nao dung.
 *
 * Server Component, khong co JavaScript phia trinh duyet: day la mot bang chi
 * de doc.
 */

const th: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em',
}
const td: React.CSSProperties = { padding: '10px 16px', fontSize: 13, color: '#1e293b', verticalAlign: 'top' }

/** Mau theo muc do can chu y, khong theo loai — mat nguoi doc di tim viec dang lo. */
function tone(action: string): { bg: string; color: string } {
  if (action === 'login.fail') return { bg: '#fee2e2', color: '#991b1b' }
  if (action.endsWith('.delete') || action.endsWith('.bulkDelete')) return { bg: '#ffedd5', color: '#9a3412' }
  if (action.startsWith('user.')) return { bg: '#dbeafe', color: '#1e40af' }
  return { bg: '#f1f5f9', color: '#475569' }
}

function actorText(row: AuditRow): string {
  if (row.actorRole === 'system') return 'Hệ thống'
  if (row.actorEmail) return row.actorEmail
  // Tai khoan da bi xoa sau khi lam viec nay. Van phai hien duoc thu gi do —
  // mot dong nhat ky khong ten van la bang chung rang viec do da xay ra.
  if (row.actorId) return `${row.actorId.slice(0, 8)}… (đã xoá)`
  return 'Không rõ'
}

export default function AuditTable({ rows, compact = false }: { rows: AuditRow[]; compact?: boolean }) {
  return (
    <div className="adm-scroll-x" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={{ ...th, width: 150 }}>Thời gian</th>
            <th style={th}>Ai</th>
            <th style={{ ...th, width: 170 }}>Làm gì</th>
            {!compact && <th style={th}>Trên cái gì</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const t = tone(row.action)
            return (
              <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ ...td, color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {formatAdminDateTime(row.at)}
                </td>
                <td style={{ ...td, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {actorText(row)}
                  {isRole(row.actorRole) && (
                    <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>{ROLE_LABEL[row.actorRole]}</span>
                  )}
                </td>
                <td style={td}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99,
                    background: t.bg, color: t.color, whiteSpace: 'nowrap',
                  }}>
                    {actionLabel(row.action)}
                  </span>
                </td>
                {!compact && (
                  <td style={{ ...td, color: '#475569', maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.label ?? row.target ?? '—'}
                    {row.label && row.target && row.label !== row.target && (
                      <span style={{ fontSize: 11, color: '#cbd5e1', marginLeft: 8 }}>{row.target.slice(0, 40)}</span>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={compact ? 3 : 4} style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                Chưa có thao tác nào được ghi lại
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
