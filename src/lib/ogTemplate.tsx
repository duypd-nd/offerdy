// Shared branded OG/social-image layout — reused by per-entity opengraph-image.tsx
// routes (stores/blog/reviews) so every page gets its own real-content share image
// instead of one generic sitewide graphic, while keeping visual branding consistent
// with the root src/app/opengraph-image.tsx fallback.

const GREEN = '#22C55E'
const GREEN_DARK = '#16A34A'
const NAVY = '#0B1420'

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

const FRAME_STYLE = {
  width: 1200,
  height: 630,
  background: `linear-gradient(135deg, ${NAVY} 0%, #0F1929 55%, #14243B 100%)`,
  position: 'relative' as const,
  overflow: 'hidden' as const,
  fontFamily: 'sans-serif',
}

/** Ba lop anh sang nen — dung chung cho moi layout OG.
 *  "closest-side" (thay vi farthest-corner mac dinh) khien cac diem dung 0-100%
 *  do theo nua chieu rong cua chinh box, nen mau tat han truoc canh thang cua box —
 *  khong bi duong noi vuong nhu radial mac dinh hay filter:blur bi cat. */
function OgGlows() {
  return (
    <>
      <div style={{
        position: 'absolute', top: -260, right: -260, width: 680, height: 680, display: 'flex',
        background: 'radial-gradient(circle closest-side, rgba(34,197,94,0.34) 0%, rgba(34,197,94,0.13) 45%, rgba(34,197,94,0) 85%)',
      }} />
      <div style={{
        position: 'absolute', bottom: -240, left: -220, width: 560, height: 560, display: 'flex',
        background: 'radial-gradient(circle closest-side, rgba(34,197,94,0.20) 0%, rgba(34,197,94,0.08) 45%, rgba(34,197,94,0) 85%)',
      }} />
      <div style={{
        position: 'absolute', top: -200, left: -90, width: 440, height: 440, display: 'flex',
        background: 'radial-gradient(circle closest-side, rgba(120,180,255,0.06) 0%, rgba(120,180,255,0) 80%)',
      }} />
    </>
  )
}

function OgBottomBar() {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, height: 5,
      background: `linear-gradient(90deg, transparent 0%, ${GREEN} 15%, ${GREEN} 85%, transparent 100%)`,
      boxShadow: `0 -8px 24px rgba(34,197,94,0.35)`,
      display: 'flex',
    }} />
  )
}

function OgWordmark() {
  // Satori chen mot khoang trang giua hai flex item chua chu, nen ten thuong hieu
  // hien ra la "Offer dy". Loi nay da co tren MOI anh OG cua site tu truoc (kiem
  // chung tren anh deal that), chi lo ra khi lam anh dang mang xa hoi. Dat hai span
  // cung dong JSX KHONG sua duoc — phai bu bang le am. -7px o co chu 28px.
  return (
    <div style={{ display: 'flex', alignItems: 'baseline' }}>
      <span style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>Offer</span>
      <span style={{ fontSize: 28, fontWeight: 800, color: GREEN, marginLeft: -7 }}>dy</span>
    </div>
  )
}

/** Layout rieng cho deal: anh san pham to ben phai, gia + % giam noi bat ben trai.
 *  Khac BrandedOgImage vi voi deal thi GIA va MUC GIAM moi la thu keo click —
 *  logo nho 76px cua layout kia khong du suc lam viec do. */
export function DealOgImage({ title, store, priceSale, priceOrig, badgeMain, badgeSub, imageUrl, couponCode }: {
  title: string
  store?: string
  priceSale?: string
  priceOrig?: string
  badgeMain: string
  badgeSub?: string | null
  imageUrl?: string
  /** Ma coupon that cua shop deal nay dan toi (khop qua domain — xem
   *  src/lib/dealStoreMatch.ts). Bo trong -> an ticket di.
   *  Dang chu tren ANH la duong duy nhat ma Instagram/TikTok khong chan: caption
   *  o do khong cho link bam duoc, con ma thi nguoi xem doc va go lai duoc. */
  couponCode?: string
}) {
  return (
    <div style={{ ...FRAME_STYLE, display: 'flex', alignItems: 'center', padding: '0 64px', gap: 52 }}>
      <OgGlows />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 22, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', alignSelf: 'flex-start', gap: 8,
          padding: '10px 24px', borderRadius: 999,
          background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`,
          boxShadow: '0 10px 26px rgba(34,197,94,0.35)',
        }}>
          <span style={{ fontSize: 38, fontWeight: 800, color: NAVY, letterSpacing: '-1px' }}>{badgeMain}</span>
          {badgeSub && <span style={{ fontSize: 22, fontWeight: 800, color: NAVY, letterSpacing: 1 }}>{badgeSub}</span>}
        </div>

        <div style={{
          fontSize: 50, fontWeight: 800, color: '#fff', lineHeight: 1.14, letterSpacing: '-1.5px',
          textShadow: '0 6px 28px rgba(0,0,0,0.5)', display: 'flex',
        }}>
          {truncate(title, 72)}
        </div>

        {(priceSale || priceOrig) && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
            {priceSale && (
              <span style={{ fontSize: 56, fontWeight: 800, color: GREEN, letterSpacing: '-2px', display: 'flex' }}>
                {priceSale}
              </span>
            )}
            {priceOrig && (
              <span style={{ fontSize: 30, color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through', display: 'flex' }}>
                {priceOrig}
              </span>
            )}
          </div>
        )}

        {couponCode && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 22px', borderRadius: 12,
              background: '#fff', boxShadow: '0 12px 28px rgba(0,0,0,0.35)',
            }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 3, display: 'flex' }}>Code</span>
              <span style={{ fontSize: 32, fontWeight: 800, color: NAVY, letterSpacing: 1, display: 'flex' }}>{truncate(couponCode, 18)}</span>
            </div>
          </div>
        )}

        {store && (
          <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
            at {truncate(store, 40)}
          </div>
        )}

        <OgWordmark />
      </div>

      {imageUrl && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 400, height: 400, flexShrink: 0,
          borderRadius: 28, background: '#fff', overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} width={400} height={400} style={{ objectFit: 'contain' }} alt="" />
        </div>
      )}

      <OgBottomBar />
    </div>
  )
}

// ── Anh de DANG bai (khac anh preview khi dan link) ──────────────
// Feed 4:5 va story 9:16 la hai khung Instagram/TikTok thuc su dung. Khong dung
// 1200x630 cua OG: ti le ngang do bi cat hai ben tren feed dien thoai va chiem
// chua toi mot phan ba man hinh doc.
export const SOCIAL_FORMATS = {
  feed: { width: 1080, height: 1350, label: 'Feed 4:5' },
  story: { width: 1080, height: 1920, label: 'Story/Reel 9:16' },
} as const

export type SocialFormat = keyof typeof SOCIAL_FORMATS

export function SocialPostImage({ format, title, priceSale, priceOrig, badgeMain, badgeSub, imageUrl, code }: {
  format: SocialFormat
  title: string
  priceSale?: string
  priceOrig?: string
  badgeMain: string
  badgeSub?: string | null
  imageUrl?: string
  code?: number
}) {
  const { width, height } = SOCIAL_FORMATS[format]
  const isStory = format === 'story'

  // Story: Instagram/TikTok phu giao dien cua ho len ~250px tren va ~380px duoi.
  // Doi noi dung vao giua de gia va ma khong bi nut/avatar de len.
  const padTop = isStory ? 260 : 72
  const padBottom = isStory ? 400 : 72
  const media = isStory ? 880 : 840

  return (
    <div style={{
      width, height,
      background: `linear-gradient(150deg, ${NAVY} 0%, #0F1929 50%, #14243B 100%)`,
      position: 'relative', overflow: 'hidden', fontFamily: 'sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      // Can giua theo chieu doc trong vung an toan: khong co dong nay thi noi dung
      // dinh len tren va bo trong mot mang lon o duoi, nhin nhu bi loi cat.
      justifyContent: 'center',
      padding: `${padTop}px 72px ${padBottom}px`,
    }}>
      <OgGlows />

      {imageUrl && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: media, height: media, flexShrink: 0,
          borderRadius: 36, background: '#fff', overflow: 'hidden',
          boxShadow: '0 26px 70px rgba(0,0,0,0.5)', position: 'relative',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} width={media} height={media} style={{ objectFit: 'contain' }} alt="" />
          <div style={{
            position: 'absolute', top: 26, left: 26, display: 'flex', alignItems: 'baseline', gap: 10,
            padding: '14px 30px', borderRadius: 999,
            background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`,
            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
          }}>
            <span style={{ fontSize: 46, fontWeight: 800, color: NAVY, letterSpacing: '-1px' }}>{badgeMain}</span>
            {badgeSub && <span style={{ fontSize: 26, fontWeight: 800, color: NAVY, letterSpacing: 1 }}>{badgeSub}</span>}
          </div>
          {code != null && (
            <div style={{
              position: 'absolute', top: 26, right: 26, display: 'flex',
              padding: '12px 24px', borderRadius: 999, background: 'rgba(11,20,32,0.86)',
            }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>#{code}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, marginTop: 46, width: '100%' }}>
        <div style={{
          fontSize: 52, fontWeight: 800, color: '#fff', lineHeight: 1.16, letterSpacing: '-1.2px',
          textAlign: 'center', display: 'flex', textShadow: '0 6px 28px rgba(0,0,0,0.5)',
        }}>
          {truncate(title, 64)}
        </div>

        {(priceSale || priceOrig) && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 22 }}>
            {priceSale && (
              <span style={{ fontSize: 82, fontWeight: 800, color: GREEN, letterSpacing: '-3px', display: 'flex' }}>
                {priceSale}
              </span>
            )}
            {priceOrig && (
              <span style={{ fontSize: 38, color: 'rgba(255,255,255,0.45)', textDecoration: 'line-through', display: 'flex' }}>
                {priceOrig}
              </span>
            )}
          </div>
        )}

        <OgWordmark />
      </div>

      <OgBottomBar />
    </div>
  )
}

export function BrandedOgImage({ eyebrow, title, subtitle, logoUrl, initials, couponCode }: {
  eyebrow?: string
  title: string
  subtitle?: string
  logoUrl?: string
  initials?: string
  /** Ma coupon affiliate — hien ticket noi bat trong the OG. Bo trong -> an di.
   *  Day la thu keo click nhat khi chia se len Facebook/X: nguoi ta thay ma giam
   *  gia ngay trong preview truoc khi bam vao. */
  couponCode?: string
}) {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        background: `linear-gradient(135deg, ${NAVY} 0%, #0F1929 55%, #14243B 100%)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '56px 72px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Soft ambient light — top-right, main highlight. "closest-side" sizing (not the
          default farthest-corner) means the 0-100% stops are measured against the box's
          own half-width, so the color reliably fades to fully transparent well before
          the box's straight edges — no hard rectangular seam like a default radial or
          a clipped filter:blur would produce. */}
      <div style={{
        position: 'absolute', top: -260, right: -260, width: 680, height: 680, display: 'flex',
        background: 'radial-gradient(circle closest-side, rgba(34,197,94,0.34) 0%, rgba(34,197,94,0.13) 45%, rgba(34,197,94,0) 85%)',
      }} />
      {/* Secondary glow — bottom-left, softer */}
      <div style={{
        position: 'absolute', bottom: -240, left: -220, width: 560, height: 560, display: 'flex',
        background: 'radial-gradient(circle closest-side, rgba(34,197,94,0.20) 0%, rgba(34,197,94,0.08) 45%, rgba(34,197,94,0) 85%)',
      }} />
      {/* Faint cool rim light — top-left, adds depth without competing */}
      <div style={{
        position: 'absolute', top: -200, left: -90, width: 440, height: 440, display: 'flex',
        background: 'radial-gradient(circle closest-side, rgba(120,180,255,0.06) 0%, rgba(120,180,255,0) 80%)',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} width={76} height={76} style={{ borderRadius: 18, objectFit: 'cover', background: '#fff', boxShadow: '0 12px 28px rgba(0,0,0,0.4)' }} alt="" />
        ) : initials ? (
          <div style={{
            width: 76, height: 76, borderRadius: 18,
            background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: NAVY,
            boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
          }}>
            {initials}
          </div>
        ) : null}
        {eyebrow && (
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '9px 20px', borderRadius: 999,
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.4)',
          }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: 2, display: 'flex' }}>
              {truncate(eyebrow, 40)}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{
          fontSize: 54, fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: '-1.5px',
          textShadow: '0 6px 28px rgba(0,0,0,0.5)', display: 'flex',
        }}>
          {truncate(title, 90)}
        </div>
        {couponCode && (
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '13px 28px', borderRadius: 14,
              background: `linear-gradient(135deg, ${GREEN} 0%, ${GREEN_DARK} 100%)`,
              boxShadow: '0 14px 32px rgba(34,197,94,0.42)',
            }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: NAVY, textTransform: 'uppercase', letterSpacing: 3, display: 'flex' }}>Code</span>
              <span style={{ fontSize: 40, fontWeight: 800, color: NAVY, letterSpacing: 1, display: 'flex' }}>{truncate(couponCode, 18)}</span>
            </div>
          </div>
        )}
        {subtitle && (
          <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.72)', textShadow: '0 2px 12px rgba(0,0,0,0.35)', display: 'flex' }}>
            {truncate(subtitle, 100)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline' }}>
        <span style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>Offer</span>
        <span style={{ fontSize: 28, fontWeight: 800, color: GREEN }}>dy</span>
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 5,
        background: `linear-gradient(90deg, transparent 0%, ${GREEN} 15%, ${GREEN} 85%, transparent 100%)`,
        boxShadow: `0 -8px 24px rgba(34,197,94,0.35)`,
        display: 'flex',
      }} />
    </div>
  )
}
