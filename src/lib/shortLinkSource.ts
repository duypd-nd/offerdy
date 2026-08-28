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
  | 'google' | 'google-ads' | 'internal' | 'direct' | 'other'

export const SOURCE_LABEL: Record<ShortLinkSource, string> = {
  instagram: 'Instagram', tiktok: 'TikTok', facebook: 'Facebook', threads: 'Threads',
  pinterest: 'Pinterest', youtube: 'YouTube', twitter: 'X (Twitter)', linkedin: 'LinkedIn',
  reddit: 'Reddit', telegram: 'Telegram', snapchat: 'Snapchat', zalo: 'Zalo',
  google: 'Google (tự nhiên)', 'google-ads': 'Google Ads (trả tiền)',
  internal: 'Trong site', direct: 'Gõ tay / trực tiếp', other: 'Khác',
}

/**
 * Click-id do CHINH Google Ads gan vao URL dich.
 *
 * ⚠️ VI SAO PHAI TACH `google-ads` KHOI `google`: referer cua ca hai deu la
 * `google.com`, nen neu chi doc referer thi tien quang cao va luot tim kiem mien
 * phi bi gop lam mot — va moi phep do hieu qua quang cao thanh vo nghia. Su co
 * mat cua click-id la BANG CHUNG TRUC TIEP: Google chi gan no cho luot bam co
 * tra tien.
 *
 * Ba tham so vi Google dung ca ba: `gclid` la ban goc, `gbraid`/`wbraid` la ban
 * giu rieng tu (iOS / khi khong co cookie). Thieu hai cai sau thi mot phan luu
 * luong tra tien se bi doc nham thanh tim kiem tu nhien.
 *
 * ⚠️ Han che da biet, cho tuong lai: neu ai do CHEP nguyen URL con gclid roi dan
 * len Instagram thi luot bam do se bi ghi la `google-ads`. Google Analytics cung
 * co dung diem mu nay. Luu luong o muc nay thi khong dang chua; neu sau nay thay
 * so `google-ads` cao bat thuong ma chi tieu khong doi, day la cho can soi.
 */
const PAID_CLICK_IDS = ['gclid', 'gbraid', 'wbraid'] as const

export function hasGoogleAdsClickId(params: URLSearchParams): boolean {
  return PAID_CLICK_IDS.some(k => !!params.get(k))
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
 * @param paidClickId URL co click-id cua Google Ads khong (xem
 *   `hasGoogleAdsClickId`). Uu tien CAO NHAT, tren ca UA in-app: click-id do
 *   chinh Google gan cho luot bam co tra tien, con UA chi noi ve trinh duyet.
 *   Mot quang cao mo trong webview Instagram van la tien quang cao.
 */
export function detectShortLinkSource(
  userAgent: string | null,
  referer: string | null,
  selfHost?: string | null,
  paidClickId?: boolean
): ShortLinkSource {
  if (paidClickId) return 'google-ads'

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

// Rieng nhom BOT DOC LINK PREVIEW (dung thanh the trong Messenger/Zalo/Slack...).
// Tach khoi BOT_RE vi chung can duoc doi xu KHAC voi crawler tim kiem: preview bot
// phai nhan duoc HTML co the OG, con crawler tim kiem thi cu de redirect binh
// thuong (redirect tot hon cho SEO — no gop tin hieu ve trang deal that).
const PREVIEW_BOT_RE = /facebookexternalhit|facebookcatalog|whatsapp|twitterbot|slackbot|slack-imgproxy|discordbot|telegrambot|linkedinbot|pinterest|skypeuripreview|embedly|quora link preview|redditbot|vkshare|zalo|viber|line-poker|snapchat|bitlybot|nuzzel|outbrain|iframely|developers\.google\.com\/\+\/web\/snippet/i

export function isLinkPreviewBot(userAgent: string | null): boolean {
  return !!userAgent && PREVIEW_BOT_RE.test(userAgent)
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
