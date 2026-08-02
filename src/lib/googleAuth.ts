/**
 * Xac thuc service account cua Google, dung chung cho MOI API cua Google trong
 * du an (GA4 Data API, Search Console API, va bat ky API nao them sau nay).
 *
 * Ky JWT truc tiep bang `node:crypto` — khong keo `google-auth-library` hay
 * `@google-analytics/data` chi de goi vai endpoint REST.
 *
 * ⚠️ VI SAO TEN BIEN VAN LA `GA4_*`: GA4 la API dau tien dung service account
 * nay, va nguoi van hanh da dat ba bien do tren Vercel roi. Doi ten se bat ho
 * khai lai — mot buoc thu cong nua cho khong duoc gi. Ba bien nay la danh tinh
 * Google DUNG CHUNG, khong rieng gi GA4.
 */
import { createSign } from 'node:crypto'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

/**
 * Bo dau nhay bao quanh neu co.
 *
 * `.env.local` di qua bo phan tich dotenv cua Next — no BOC dau nhay giup. Bang
 * bien moi truong cua Vercel thi khong: gia tri duoc luu nguyen van. Nen cung
 * mot chuoi `"-----BEGIN..."` dan vao hai noi cho ra hai ket qua khac nhau —
 * chay ngon o may minh, hong tren production, va thong bao loi (OpenSSL
 * "unsupported") khong he nhac gi den dau nhay.
 */
export function unquote(value?: string): string | undefined {
  const v = value?.trim()
  if (!v) return undefined
  return v.length >= 2 && ((v[0] === '"' && v.at(-1) === '"') || (v[0] === "'" && v.at(-1) === "'"))
    ? v.slice(1, -1)
    : v
}

export type ServiceAccount = { clientEmail: string; privateKey: string }

export function getServiceAccount(): ServiceAccount | null {
  const clientEmail = unquote(process.env.GA4_CLIENT_EMAIL)
  // Bien moi truong khong giu duoc xuong dong that: khoa rieng dan vao Vercel
  // luon o dang mot dong voi `\n` viet lieu. Khong doi lai thi OpenSSL bao
  // "unsupported" va loi trong nhu la sai khoa.
  const privateKey = unquote(process.env.GA4_PRIVATE_KEY)?.replace(/\\n/g, '\n').trim()
  if (!clientEmail || !privateKey) return null
  return { clientEmail, privateKey }
}

const b64url = (input: string | Buffer) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/**
 * Doi khoa rieng lay access token cho MOT pham vi cu the.
 *
 * `scope` la tham so chu khong phai hang so: GA4 can `analytics.readonly`, con
 * Search Console can `webmasters.readonly`. Mot token xin cho pham vi nay khong
 * dung duoc cho pham vi kia, va Google tra ve 403 chu khong noi ro thieu scope.
 *
 * Tra ve `null` khi that bai — noi goi quyet dinh hien gi, va khong duoc phep
 * nem loi vi cac o nay chi la mot phan cua trang admin.
 */
export async function getGoogleAccessToken(scope: string, now: Date): Promise<string | null> {
  const sa = getServiceAccount()
  if (!sa) return null

  const iat = Math.floor(now.getTime() / 1000)
  const unsigned = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: sa.clientEmail, scope, aud: TOKEN_URL, iat, exp: iat + 3600,
  }))}`

  try {
    const assertion = `${unsigned}.${b64url(createSign('RSA-SHA256').update(unsigned).sign(sa.privateKey))}`
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.access_token === 'string' ? data.access_token : null
  } catch {
    return null
  }
}
