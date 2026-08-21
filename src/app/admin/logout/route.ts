import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/lib/adminAuth'
import { recordAudit } from '@/lib/adminAudit'

/**
 * Dang xuat — mot Route Handler rieng, KHONG phai Server Action.
 *
 * ⚠️ VI SAO PHAI TACH RA: Server Action cua Next la mot POST ve chinh URL cua
 * trang dang mo. Ma vong chan phan quyen chan MOI POST doi voi vai chi-xem —
 * dung theo thiet ke, vi do la cach chan sua doi ma khong phai sua 27 file
 * action. Hau qua khong ai luong truoc: **vai chi-xem dang nhap duoc nhung
 * khong the dang xuat**. Nut bam nem loi 403 va React hien trang "Something
 * went wrong".
 *
 * Do that 2026-08-21, va no lo ra vi nguoi van hanh thu that — bo test dau-cuoi
 * cua chinh minh chi thu dang xuat voi vai Chu, nen 19/19 van xanh.
 *
 * Duong dan `/admin/logout` duoc `canAccess` cho qua voi MOI vai va moi phuong
 * thuc: dang xuat khong bao gio duoc phep phu thuoc vao quyen han.
 *
 * 📌 CSRF khong phai van de o day: cookie phien dat `SameSite=Lax`, nen mot POST
 * tu trang khac se khong kem cookie va lenh dang xuat thanh vo hai.
 */
export async function POST(request: NextRequest) {
  // Ghi TRUOC khi xoa cookie — sau do thi khong con biet ai vua di ra.
  await recordAudit({ action: 'logout' })

  const res = NextResponse.redirect(new URL('/admin/login', request.url), {
    // 303 chu khong phai 307: bat trinh duyet doi sang GET khi di theo. 307 giu
    // nguyen POST, nen trang dang nhap se nhan mot POST va bi chan.
    status: 303,
  })
  res.cookies.delete(SESSION_COOKIE)
  return res
}
