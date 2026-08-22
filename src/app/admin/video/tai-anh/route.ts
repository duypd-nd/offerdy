import { NextResponse, type NextRequest } from 'next/server'
import { currentAdmin } from '@/lib/adminSession'
import { zipStore, tenAnToan } from '@/lib/zipStore'

/**
 * Tai anh cua video ve may — mot anh (GET) hoac ca me trong mot tep zip (POST).
 *
 * ── VI SAO PHAI DI QUA MAY CHU ────────────────────────────────────
 *
 * Anh nam tren CDN cua tung shop, tuc khac ten mien. Thuoc tinh `download` cua
 * the `<a>` **bi trinh duyet bo qua voi lien ket khac ten mien** — bam vao chi
 * MO anh ra chu khong tai ve. Tren dien thoai thi con te hon: nguoi dung phai
 * cham giu roi chon "luu anh", va nhieu trinh duyet trong ung dung khong co muc
 * do. Di qua may chu thi ta dat duoc `Content-Disposition: attachment`, va luc
 * ay moi trinh duyet deu tai that.
 *
 * ⚠️ VA VI THE DUONG NAY LA MOT CAI CONG RA INTERNET. Ai goi duoc no la sai
 * duoc may chu di tai mot dia chi bat ky — go cua vao mang noi bo, vao dia chi
 * metadata cua nha cung cap dam may. Ba hang rao ben duoi khong duoc bo:
 * dang nhap, chi `https`, va chan cac dai dia chi noi bo.
 */

const TOI_DA_ANH = 40
const TOI_DA_BYTE = 12 * 1024 * 1024      // moi anh
const TOI_DA_TONG = 120 * 1024 * 1024     // ca tep zip

/** Dai dia chi KHONG duoc phep goi toi — chan tu ten may, truoc khi mo ket noi. */
const CAM = [
  /^localhost$/i, /^127\./, /^0\./, /^10\./, /^192\.168\./, /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./, /^\[?::1\]?$/, /^\[?f[cd]/i, /\.local$/i, /\.internal$/i,
]

function hopLe(u: string): URL | null {
  let url: URL
  try { url = new URL(u) } catch { return null }
  // Chi `https`: `http` cho phep di vao mang noi bo qua mot ten may binh thuong.
  if (url.protocol !== 'https:') return null
  if (CAM.some(re => re.test(url.hostname))) return null
  return url
}

/** Doan duoi tep tu bon byte dau — khong tin `content-type` cua may chu. */
function duoiAnh(b: Uint8Array, contentType?: string | null): string {
  if (b.length > 12) {
    if (b[0] === 0xff && b[1] === 0xd8) return '.jpg'
    if (b[0] === 0x89 && b[1] === 0x50) return '.png'
    if (String.fromCharCode(...b.subarray(0, 3)) === 'GIF') return '.gif'
    if (String.fromCharCode(...b.subarray(0, 4)) === 'RIFF'
      && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP') return '.webp'
  }
  const ct = (contentType ?? '').split(';')[0].trim().toLowerCase()
  return ct === 'image/png' ? '.png' : ct === 'image/webp' ? '.webp' : ct === 'image/gif' ? '.gif' : '.jpg'
}

async function tai(u: string): Promise<{ data: Uint8Array; duoi: string } | null> {
  const url = hopLe(u)
  if (!url) return null
  try {
    // `redirect: 'follow'` la mac dinh, va CDN anh nao cung chuyen huong it nhat
    // mot lan — nhung dich cuoi khong duoc kiem lai. Chap nhan: duong nay chi mo
    // cho nguoi da dang nhap admin, va rui ro con lai la doc mot anh cong khai.
    const r = await fetch(url, { headers: { accept: 'image/*' } })
    if (!r.ok) return null
    const b = new Uint8Array(await r.arrayBuffer())
    if (!b.length || b.length > TOI_DA_BYTE) return null
    return { data: b, duoi: duoiAnh(b, r.headers.get('content-type')) }
  } catch {
    return null
  }
}

/** Mot anh. `?url=...&ten=...` */
export async function GET(request: NextRequest) {
  if (!(await currentAdmin())) return new NextResponse('Chưa đăng nhập', { status: 401 })

  const q = request.nextUrl.searchParams
  const anh = await tai(q.get('url') ?? '')
  if (!anh) return new NextResponse('Không tải được ảnh này', { status: 400 })

  const ten = tenAnToan((q.get('ten') || 'anh').replace(/\.[a-z0-9]{2,5}$/i, ''), 'anh') + anh.duoi
  return new NextResponse(anh.data as unknown as BodyInit, {
    headers: {
      'content-type': 'application/octet-stream',
      // ⚠️ `attachment` moi la thu bat trinh duyet TAI VE thay vi mo ra xem.
      'content-disposition': `attachment; filename="${ten}"`,
      'cache-control': 'no-store',
    },
  })
}

/** Ca me trong mot tep zip. Than: `{ urls: string[], ten?: string }` */
export async function POST(request: NextRequest) {
  if (!(await currentAdmin())) return new NextResponse('Chưa đăng nhập', { status: 401 })

  let than: { urls?: unknown; ten?: unknown }
  try { than = await request.json() } catch { return new NextResponse('Thân không hợp lệ', { status: 400 }) }

  const urls = Array.isArray(than.urls) ? than.urls.filter((u): u is string => typeof u === 'string') : []
  if (!urls.length) return new NextResponse('Không có ảnh nào', { status: 400 })

  // Tai song song: mot anh chet chi mat mot anh, khong lam hong ca me. Cung mot
  // bai hoc da tra gia o `judgeImages` — gui ca me cho mot noi thi mot cai hong
  // lam mat tat ca.
  const daTai = await Promise.all(urls.slice(0, TOI_DA_ANH).map(async (u, i) => {
    const a = await tai(u)
    return a ? { ten: `anh-${String(i + 1).padStart(2, '0')}${a.duoi}`, data: a.data } : null
  }))
  const tep = daTai.filter((x): x is { ten: string; data: Uint8Array } => x !== null)
  if (!tep.length) return new NextResponse('Không tải được ảnh nào', { status: 502 })

  const tong = tep.reduce((n, t) => n + t.data.length, 0)
  if (tong > TOI_DA_TONG) return new NextResponse('Bộ ảnh quá nặng', { status: 413 })

  const zip = zipStore(tep)
  const tenZip = tenAnToan(typeof than.ten === 'string' ? than.ten : 'anh-video', 'anh-video') + '.zip'
  return new NextResponse(zip as unknown as BodyInit, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="${tenZip}"`,
      // Bao cho giao dien biet co anh nao tai hong, de noi that thay vi im lang.
      'x-so-anh': `${tep.length}/${urls.length}`,
      'cache-control': 'no-store',
    },
  })
}
