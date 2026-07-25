// Nhan dien nguon truy cap cho short link /d/<ma>.
//
// Bai toan rieng cua link-in-bio: khach den tu app mang xa hoi, va trinh duyet
// trong app THUONG KHONG gui `Referer` (Instagram/TikTok mo webview khong co
// referrer). Neu chi doc referer thi gan nhu moi luot deu thanh "direct" — vo dung.
// Bu lai, chinh cac webview do TU KHAI trong User-Agent (`Instagram`,
// `BytedanceWebview`, `FBAN`...), nen UA la tin hieu chinh xac hon referer o day.
//
// Thu tu uu tien: UA in-app (chac chan nhat) -> referer -> khong co referer =
// direct (go tay/bookmark, dung la cai ta muon dem voi short link) -> other.

export type ShortLinkSource =
  | 'instagram' | 'tiktok' | 'facebook' | 'threads' | 'pinterest' | 'youtube'
  | 'twitter' | 'linkedin' | 'reddit' | 'telegram' | 'snapchat' | 'zalo'
  | 'google' | 'internal' | 'direct' | 'other'

export const SOURCE_LABEL: Record<ShortLinkSource, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', threads: 'Threads',
  pinterest: 'Pinterest', youtube: 'YouTube', twitter: 'X (Twitter)', linkedin: 'LinkedIn',
  reddit: 'Reddit', telegram: 'Telegram', snapchat: 'Snapchat', zalo: 'Zalo',
  google: 'Google', internal: 'Trong site', direct: 'Gõ tay / trực tiếp', other: 'Khác',
}

// Token in-app webview. `Barcelona` la ten noi bo cua app Threads, `musical_ly`/
// `Trill`/`BytedanceWebview` la cua TikTok, `FBAN`/`FBAV`/`FB_IAB` cua Facebook.
const UA_SOURCES: [RegExp, ShortLinkSource][] = [
  [/instagram/i, 'instagram'],
  [/bytedancewebview|musical_ly|tiktok|\btrill\b/i, 'tiktok'],
  [/barcelona/i, 'threads'],
  [/fban|fbav|fb_iab|fbios/i, 'facebook'],
  [/pinterest/i, 'pinterest'],
  [/snapchat/i, 'snapchat'],
  [/linkedinapp/i, 'linkedin'],
  [/\bzalo\b/i, 'zalo'],
  [/\btwitter\b/i, 'twitter'],
]

const REFERER_SOURCES: [RegExp, ShortLinkSource][] = [
  [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)(facebook\.com|fb\.me|fb\.watch)$/, 'facebook'],
  [/(^|\.)threads\.(net|com)$/, 'threads'],
  [/(^|\.)pinterest\.[a-z.]+$/, 'pinterest'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
  [/(^|\.)(twitter\.com|x\.com)$|^t\.co$/, 'twitter'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'linkedin'],
  [/(^|\.)reddit\.com$/, 'reddit'],
  [/^t\.me$/, 'telegram'],
  [/(^|\.)zalo\.me$/, 'zalo'],
  [/(^|\.)google\.[a-z.]+$/, 'google'],
  [/(^|\.)offerdy\.com$/, 'internal'],
]

/**
 * @param selfHost host cua chinh request (header `Host`) — de nhan ra dieu huong
 *   TRONG SITE. Bat buoc phai so voi host that chu khong chi voi `offerdy.com`
 *   hardcode: tren localhost / domain preview cua Vercel, referer noi bo se roi
 *   vao 'other' va lam mat phep gan nguon tu cookie (bug da gap khi test).
 */
export function detectShortLinkSource(
  userAgent: string | null,
  referer: string | null,
  selfHost?: string | null
): ShortLinkSource {
  const ua = userAgent ?? ''
  for (const [re, source] of UA_SOURCES) if (re.test(ua)) return source

  if (!referer) return 'direct'
  let host: string
  try {
    host = new URL(referer).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return 'other'
  }
  // Host header co the kem port (localhost:3000) — bo di truoc khi so sanh.
  const self = selfHost?.toLowerCase().replace(/^www\./, '').split(':')[0]
  if (self && host === self) return 'internal'
  for (const [re, source] of REFERER_SOURCES) if (re.test(host)) return source
  return 'other'
}

// Trinh thu thap va bot doc truoc link (Facebook/WhatsApp/Slack ve the preview,
// uptime monitor, Googlebot...) khong phai nguoi that. Khong loc thi so click cua
// mot ma vua dang len se nhay len chi vi cac dich vu do doc URL.
const BOT_RE = /bot\b|bot$|crawl|spider|slurp|facebookexternalhit|whatsapp|discord|slackbot|embedly|quora link preview|vkshare|skypeuripreview|bingpreview|applebot|lighthouse|headlesschrome|monitor|uptime|pingdom|curl\/|wget|python-requests|go-http-client|axios\/|node-fetch|okhttp/i

export function isLikelyBot(userAgent: string | null): boolean {
  // UA rong = gan nhu chac chan la script, khong phai trinh duyet
  if (!userAgent || userAgent.trim().length < 10) return true
  return BOT_RE.test(userAgent)
}

/**
 * Nhan chien dich tu `?s=` — de phan biet cac bai dang khac nhau cung tro ve mot
 * san pham (VD /d/1005?s=reel-jul25 vs ?s=story-jul26). Lam sach chat che vi gia
 * tri nay do nguoi ngoai dat va se duoc luu vao Sanity roi hien lai trong admin.
 */
export function parseCampaign(raw: string | null): string | undefined {
  if (!raw) return undefined
  const clean = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24)
  return clean || undefined
}
