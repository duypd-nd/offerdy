import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { readSession, getAdminUser } from '@/lib/adminSession'
import { landingPath } from '@/lib/adminAuth'
import { missingAuthConfig } from '@/sanity/adminClient'

export const metadata: Metadata = {
  title: 'Đăng nhập — Offerdy Admin',
  // Trang dang nhap khong duoc vao chi muc tim kiem
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

const NOTICE: Record<string, string> = {
  revoked: 'Tài khoản của bạn đã bị vô hiệu hoá hoặc thay đổi. Đăng nhập lại.',
  expired: 'Phiên đăng nhập đã hết hạn.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>
}) {
  const sp = await searchParams

  // Da dang nhap that roi ma vao lai trang nay thi dua thang vao trong.
  //
  // ⚠️ PHAI KIEM LAI VOI SANITY, khong duoc tin moi chu ky cookie. Neu chi kiem
  // chu ky: mot nguoi co cookie con han nhung tai khoan da bi xoa/tat se bi
  // `requireAdmin()` day ra day, roi trang nay thay chu ky hop le va day nguoc
  // vao trong — **vong lap chuyen huong vo tan**, va nguoi dung khong con duong
  // nao dang nhap lai. Mot truy van nho o day dap tat ca lop lap do.
  const session = await readSession()
  if (session) {
    const stillValid = await getAdminUser(session.uid)
    if (stillValid) redirect(landingPath(stillValid.role))
  }

  const missing = missingAuthConfig()

  return (
    <div className="lg-wrap">
      <div className="lg-card">
        <div className="lg-brand">
          <span className="lg-mark">O</span>
          <div>
            <h1 className="lg-title">Offerdy Admin</h1>
            <p className="lg-sub">Khu quản trị nội bộ</p>
          </div>
        </div>

        {missing.length > 0 ? (
          <div className="lg-setup">
            <p className="lg-setup-title">Chưa cấu hình xong</p>
            <p>Thiếu biến môi trường:</p>
            <ul>{missing.map(m => <li key={m}><code>{m}</code></li>)}</ul>
            <p className="lg-setup-hint">
              Đặt chúng trên Vercel (và <code>.env.local</code> khi chạy máy mình), rồi tải lại trang.
            </p>
          </div>
        ) : (
          <LoginForm next={sp.next ?? ''} notice={sp.reason ? NOTICE[sp.reason] : undefined} />
        )}
      </div>
    </div>
  )
}
