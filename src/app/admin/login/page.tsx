import type { Metadata } from 'next'
import { getSiteName } from '@/sanity/queries'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'
import { currentAdmin } from '@/lib/adminSession'
import { landingPath } from '@/lib/adminAuth'
import { missingAuthConfig } from '@/lib/adminConfig'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Đăng nhập — ${await getSiteName()} Admin`,
    // Trang dang nhap khong duoc vao chi muc tim kiem
    robots: { index: false, follow: false },
  }
}

export const dynamic = 'force-dynamic'

const NOTICE: Record<string, string> = {
  revoked: 'Tài khoản của bạn đã bị vô hiệu hoá hoặc thay đổi. Đăng nhập lại.',
  'session-ended': 'Mật khẩu hoặc quyền của bạn vừa được đổi, nên phiên cũ đã bị cắt. Đăng nhập lại.',
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
  //
  // ⚠️ Dung DUNG `currentAdmin()` — cung ham ma `requireAdmin()` dung. Cheo mot
  // dieu kien thoi (vi du quen kiem `sessionVersion`) la hai ben day nhau vo
  // tan: requireAdmin day ra day vi cookie mang so phien ban cu, con trang nay
  // thay tai khoan con song va day nguoc vao trong.
  const stillValid = await currentAdmin()
  if (stillValid) redirect(landingPath(stillValid.role))

  const siteName = await getSiteName()

  const missing = missingAuthConfig()

  return (
    <div className="lg-wrap">
      <div className="lg-card">
        <div className="lg-brand">
          {/* Ban MAU GOC — the dang nhap nen trang. Ban chu trang
              (`logo-offerdy-light.png`) danh cho thanh ben nen toi. */}
          <Image
            src="/logo-offerdy.png"
            // ⚠️ Chinh TEP ANH khong doi theo ten — doi ten website xong van phai
            // thay logo bang tay. Chu `alt` thi doi duoc, va no la thu may doc
            // man hinh va bo tim kiem thuc su doc.
            alt={siteName}
            width={480}
            height={124}
            className="lg-logo"
            // Anh lon nhat va duy nhat cua trang nay — de tai lazy thi chinh no
            // tro thanh do tre lon nhat ma nguoi dung nhin thay.
            priority
          />
          <h1 className="lg-title">Khu quản trị nội bộ</h1>
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
