import { writeClient } from '@/sanity/writeClient'
import dns from 'dns/promises'
import { isIP } from 'net'

const DEFAULT_UA = 'Mozilla/5.0 (compatible; OfferdyBot/1.0; +https://www.offerdy.com)'

function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip)
  if (version === 4) {
    const [a, b] = ip.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 169 && b === 254) return true // link-local, gom ca cloud metadata 169.254.169.254
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
    if (a >= 224) return true // multicast/reserved
    return false
  }
  if (version === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower === '::') return true
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true // fe80::/10
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true // fc00::/7
    if (lower.startsWith('::ffff:')) {
      const v4 = lower.slice(7)
      if (isIP(v4) === 4) return isPrivateOrReservedIp(v4)
    }
    return false
  }
  return true // hostname khong resolve duoc thanh IP hop le -> coi la khong an toan
}

export async function checkUrlSafety(rawUrl: string): Promise<string | null> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return `URL khong hop le: "${rawUrl}"`
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `Protocol khong duoc phep: "${parsed.protocol}"`
  }
  if (parsed.hostname.toLowerCase() === 'localhost') {
    return 'Khong duoc phep tro toi localhost'
  }

  try {
    const records = await dns.lookup(parsed.hostname, { all: true })
    if (records.length === 0) return `Khong resolve duoc DNS cho "${parsed.hostname}"`
    if (records.some((r) => isPrivateOrReservedIp(r.address))) {
      return `Dia chi IP noi bo/khong an toan cho "${parsed.hostname}"`
    }
    return null
  } catch {
    return `Khong resolve duoc DNS cho "${parsed.hostname}"`
  }
}

type FetchSafelyResult = { res: Response } | { error: string }

export async function fetchSafely(url: string, opts: {
  maxRedirects?: number
  timeoutMs?: number
  maxBytes?: number
  accept?: string
} = {}): Promise<FetchSafelyResult> {
  const { maxRedirects = 5, timeoutMs = 10_000, maxBytes, accept } = opts
  let currentUrl = url
  for (let i = 0; i <= maxRedirects; i++) {
    const unsafeReason = await checkUrlSafety(currentUrl)
    if (unsafeReason) return { error: unsafeReason }
    let res: Response
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      res = await fetch(currentUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': DEFAULT_UA,
          ...(accept ? { Accept: accept } : {}),
        },
      })
    } catch (err) {
      return { error: `Khong ket noi duoc toi "${currentUrl}": ${String(err)}` }
    } finally {
      clearTimeout(timer)
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) return { error: `Redirect tu "${currentUrl}" thieu header Location` }
      currentUrl = new URL(location, currentUrl).toString()
      continue
    }
    if (maxBytes) {
      const len = res.headers.get('content-length')
      if (len && Number(len) > maxBytes) {
        return { error: `Noi dung tai "${currentUrl}" qua lon (>${maxBytes} bytes)` }
      }
    }
    return { res }
  }
  return { error: `Qua nhieu redirect (>${maxRedirects}) bat dau tu "${url}"` }
}

type SanityImageDoc = { _type: 'image'; asset: { _type: 'reference'; _ref: string } }
type UploadImageResult = { image: SanityImageDoc; url: string } | { error: string }

export async function uploadImageFromUrl(url: string): Promise<UploadImageResult> {
  const fetched = await fetchSafely(url, { maxBytes: 15 * 1024 * 1024 })
  if ('error' in fetched) return fetched
  const { res } = fetched
  if (!res.ok) return { error: `HTTP ${res.status} khi tai "${url}"` }
  try {
    const blob = await res.blob()
    const filename = url.split('/').pop()?.split('?')[0] || 'image.png'
    const asset = await writeClient.assets.upload('image', blob, {
      filename,
      contentType: blob.type || 'image/png',
    })
    return {
      image: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } },
      url: asset.url,
    }
  } catch (err) {
    return { error: `Loi khi upload len Sanity: ${String(err)}` }
  }
}
