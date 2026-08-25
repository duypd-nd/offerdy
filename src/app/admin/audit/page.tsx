import type { Metadata } from 'next'
import { getSiteName } from '@/sanity/queries'
import AuditTable from '../_components/AuditTable'
import { requireOwner } from '@/lib/adminSession'
import { readAuditLog } from '@/lib/adminAudit'

export async function generateMetadata(): Promise<Metadata> {
  return { title: `Nhật ký thao tác — ${await getSiteName()} Admin` }
}
export const dynamic = 'force-dynamic'

/**
 * Nhat ky thao tac — CHI CHU xem duoc.
 *
 * ⚠️ Vong chan thu hai. `canAccess()` da chan duong dan `/admin/audit` cho vai
 * khac, nhung o day doc Sanity that nen mot tai khoan vua bi ha quyen giua phien
 * bi tu choi ngay, khong doi cookie het han.
 *
 * Vi sao chi Chu: nhat ky la ho so ve viec lam cua tung nguoi. Bien tap doc duoc
 * ho so cua nhau la mot thu khac han voi "ai cung thay minh lam gi".
 */
export default async function AuditPage() {
  await requireOwner()
  const rows = await readAuditLog(30, 300)

  return (
    <div className="adm-page" style={{ maxWidth: 1100 }}>
      <header className="adm-head">
        <div>
          <h1>Nhật ký thao tác</h1>
          <p className="adm-sub">
            {rows.length ? `${rows.length} thao tác trong 30 ngày gần nhất` : '30 ngày gần nhất'}
          </p>
        </div>
      </header>

      <p className="usr-hint">
        Ghi lại đăng nhập, quản lý người dùng và mọi thao tác xoá. Nội dung được mã hoá trong Sanity
        và <b>tự xoá sau 90 ngày</b> — nhật ký để trả lời &ldquo;tuần trước ai xoá cái đó&rdquo;,
        không phải để lưu trữ vĩnh viễn thói quen làm việc của từng người.
      </p>

      <AuditTable rows={rows} />
    </div>
  )
}
