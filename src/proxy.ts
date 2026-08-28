import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySession, canAccess } from '@/lib/adminAuth'
import { attributionResponse } from '@/lib/proxyAttribution'

/**
 * HAI VIEC KHONG LIEN QUAN NHAU, CHUNG MOT FILE — vi Next 16 chi cho DUNG MOT
 * file proxy trong ca du an ("Both middleware file and proxy file are detected"
 * la loi build cung). Tach logic ra module roi nhap vao day la cach tai lieu Next
 * khuyen dung.
 *
 *   1. `/admin/*` va vai `/api/*`  -> cong gac dang nhap (phan duoi, khong doi)
 *   2. Moi trang cong khai con lai -> gan nguon cho quang cao / bai dang
 *
 * ⚠️ THU TU O DAY LA VAN DE AN NINH. Nhanh gan nguon phai nam SAU phep kiem
 * `laDuongDanCanGac()`, khong bao gio truoc. Dat nham thu tu thi mot request vao
 * /admin mang `?s=` se duoc tra loi som va **di vong qua toan bo cong gac**.
 */

/**
 * Chep dung danh sach trong `config.matcher` ben duoi — hai cho nay phai luon
 * khop nhau. Bo sot mot muc o day la mo mot lo hong o cong gac.
 *
 * `p === g || p.startsWith(g + '/')` la de khop dung ngu nghia `/admin/:path*`
 * cua Next: no khop CA `/admin` lan `/admin/...`. Dung `startsWith(g)` tran thi
 * `/adminx` cung lot vao (o day chi lam that chat hon, nhung van la sai y).
 */
const DUONG_DAN_CAN_GAC = ['/admin', '/api/import', '/api/check-links', '/api/ai/content']

function laDuongDanCanGac(pathname: string): boolean {
  return DUONG_DAN_CAN_GAC.some(g => pathname === g || pathname.startsWith(g + '/'))
}

/**
 * Cong gac cho khu quan tri.
 *
 * ⚠️ THAY CHO BASIC AUTH MOT TAI KHOAN (truoc 2026-08-20). Basic Auth khong the
 * co nhieu nguoi, khong co vai, va **khong dang xuat duoc** — trinh duyet giu
 * thong tin dang nhap cho toi khi dong het cua so.
 *
 * ⚠️ HAI LOP, VA MOI LOP LAM MOT VIEC KHAC NHAU:
 *   1. O day: chi kiem CHU KY cua cookie. Khong tra Sanity — proxy chay truoc
 *      MOI request vao /admin, va mot luot doc Sanity la ~350ms cong vao tung
 *      buoc bam chuot (tran vat ly da do 2026-08-02).
 *   2. `requireAdmin()` trong trang/hanh dong: doc Sanity that, nen tai khoan
 *      vua bi tat se bi tu choi ngay lan tai trang ke tiep.
 * Bo lop 2 thi mot tai khoan bi tat van dung duoc toi 8 tieng. Bo lop 1 thi moi
 * cu bam chuot cham them mot phan ba giay.
 *
 * 📌 Chan theo DUONG DAN chan duoc ca Server Action: Next goi Server Action bang
 * mot POST ve **chinh URL cua trang** dang mo. Nen khong the lach bang cach goi
 * thang endpoint, va khong phai sua 27 file action.
 */

const LOGIN_PATH = '/admin/login'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // ── Trang cong khai: khong gac, chi gan nguon ────────────────────────────
  // Nhanh nay o TRUOC phan gac vi no chi nhan nhung duong dan KHONG can gac —
  // dieu kien la phu dinh cua cong gac, nen no khong the nuot mot request le ra
  // phai bi chan. Moi thu khong thuoc `DUONG_DAN_CAN_GAC` deu roi vao day va
  // ket thuc o `NextResponse.next()`, khong bao gio di tiep xuong duoi.
  if (!laDuongDanCanGac(pathname)) {
    return attributionResponse(request) ?? NextResponse.next()
  }

  // Trang dang nhap phai mo cho nguoi chua co phien — neu khong thi khong ai
  // vao duoc, ke ca nguoi co tai khoan dung.
  //
  // ⚠️ VAN PHAI GAN HEADER duong dan. Thoat som ma khong gan thi layout khong
  // biet minh dang o trang dang nhap, no chay `requireAdmin()`, ham do day
  // nguoc ve /admin/login — **trang dang nhap chuyen huong toi chinh no**. Da
  // mac dung loi do 2026-08-20 va chi lo ra khi curl that.
  if (pathname === LOGIN_PATH) {
    return NextResponse.next({ request: { headers: withPathHeader(request) } })
  }

  const session = verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.AUTH_SECRET ?? '',
    Math.floor(Date.now() / 1000)
  )

  if (!session) return denied(request, 'unauthenticated')

  if (!canAccess(session.role, pathname, method)) return denied(request, 'forbidden')

  return NextResponse.next({ request: { headers: withPathHeader(request) } })
}

/**
 * Gan duong dan dang mo vao mot header de LAYOUT doc duoc.
 *
 * Vi sao can: `src/app/admin/layout.tsx` la cho duy nhat chay cho ca 44 trang
 * admin, nen dat vong kiem THAT (doc Sanity, tu choi tai khoan da bi tat) o do
 * la phu duoc het ma khong phai sua 44 file. Nhung layout la Server Component —
 * no khong biet duong dan hien tai, va `/admin/login` thi **khong duoc** kiem
 * (nguoi chua dang nhap moi vao day). Header nay la cach layout phan biet.
 */
function withPathHeader(request: NextRequest): Headers {
  const h = new Headers(request.headers)
  h.set('x-admin-path', request.nextUrl.pathname)
  return h
}

function denied(request: NextRequest, reason: 'unauthenticated' | 'forbidden') {
  const { pathname, search } = request.nextUrl
  const isApi = pathname.startsWith('/api/')

  // API tra ma loi that, khong chuyen huong: mot fetch() nhan ve trang HTML
  // dang nhap se bao "loi phan tich JSON" — khai sai hoan toan nguyen nhan.
  if (isApi) {
    return NextResponse.json(
      { error: reason === 'forbidden' ? 'Không đủ quyền' : 'Chưa đăng nhập' },
      { status: reason === 'forbidden' ? 403 : 401 }
    )
  }

  // Server Action la POST tu mot trang dang mo. Chuyen huong mot POST se lam
  // trinh duyet gui lai bang GET va nguoi dung mat du lieu vua nhap ma khong
  // hieu vi sao — tra ma loi de phia client hien thong bao dung.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new NextResponse(reason === 'forbidden' ? 'Không đủ quyền' : 'Phiên đăng nhập đã hết hạn', {
      status: reason === 'forbidden' ? 403 : 401,
    })
  }

  if (reason === 'forbidden') {
    return NextResponse.redirect(new URL('/admin?reason=forbidden', request.url))
  }

  // Nho lai noi dinh den de dang nhap xong quay ve dung cho
  const url = new URL(LOGIN_PATH, request.url)
  const wanted = `${pathname}${search}`
  if (wanted !== '/admin') url.searchParams.set('next', wanted)
  return NextResponse.redirect(url)
}

/**
 * ⚠️ Bon muc dau la CONG GAC — phai khop y nguyen `DUONG_DAN_CAN_GAC` o dau file.
 * Sua mot ben ma quen ben kia la mo lo hong.
 *
 * Muc cuoi la cho phep gan nguon chay tren trang cong khai. Loai tru:
 *   - `api`, `_next/*`, `favicon.ico`, `.*\..*` (file tinh) — khong phai trang dich
 *   - `studio` — Sanity Studio, khong phai trang cho khach
 *   - `d/`, `g/` — short link TU dat cookie voi logic day du hon (chung biet ca
 *     `entryCode`); de hai cho cung ghi mot cookie la tao cho lech
 *
 * 📌 Co the that chat hon bang `has: [{ type: 'query', key: 'gclid' }]` de proxy
 * chi chay khi URL that su mang tin hieu chien dich. Chua lam vi phai viet bon
 * muc rieng (`s`, `gclid`, `gbraid`, `wbraid` — `has` la VA chu khong phai HOAC),
 * va mot matcher sai se lam phep gan nguon im lang khong chay. Ban hien tai loc
 * ngay trong `attributionResponse()`, de kiem chung hon.
 */
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/import/:path*',
    '/api/check-links/:path*',
    '/api/ai/content/:path*',
    '/((?!api|_next/static|_next/image|studio|d/|g/|favicon.ico|.*\\..*).*)',
  ],
}
