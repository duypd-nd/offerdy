import { writeClient } from '@/sanity/writeClient'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const FOOTER_COLUMNS = [
  {
    _type: 'footerColumn', _key: 'col1', title: 'Discover',
    links: [
      { _type: 'footerLink', _key: 'l11', label: "Today's Deals",  url: '/deals' },
      { _type: 'footerLink', _key: 'l12', label: 'All Stores',      url: '/stores' },
      { _type: 'footerLink', _key: 'l13', label: 'Flash Sales',     url: '/flash-sales' },
      { _type: 'footerLink', _key: 'l14', label: 'Coupon Codes',    url: '/coupon-codes' },
    ],
  },
  {
    _type: 'footerColumn', _key: 'col2', title: 'Content',
    links: [
      { _type: 'footerLink', _key: 'l21', label: 'Product Reviews', url: '/reviews' },
      { _type: 'footerLink', _key: 'l22', label: 'Comparisons',     url: '/comparisons' },
      { _type: 'footerLink', _key: 'l23', label: 'Shopping Blog',   url: '/posts' },
      { _type: 'footerLink', _key: 'l24', label: 'Tips & Guides',   url: '/tips-guides' },
    ],
  },
  {
    _type: 'footerColumn', _key: 'col3', title: 'Company',
    links: [
      { _type: 'footerLink', _key: 'l31', label: 'About Us',        url: '/about' },
      { _type: 'footerLink', _key: 'l32', label: 'Contact',         url: '/contact' },
      { _type: 'footerLink', _key: 'l33', label: 'Submit a Deal',   url: '/submit-deal' },
      { _type: 'footerLink', _key: 'l34', label: 'Partner with Us', url: '/partner' },
    ],
  },
  {
    _type: 'footerColumn', _key: 'col4', title: 'Legal',
    links: [
      { _type: 'footerLink', _key: 'l41', label: 'Terms of Use',         url: '/terms' },
      { _type: 'footerLink', _key: 'l42', label: 'Privacy Policy',       url: '/privacy' },
      { _type: 'footerLink', _key: 'l43', label: 'Cookie Policy',        url: '/cookies' },
      { _type: 'footerLink', _key: 'l44', label: 'Affiliate Disclosure', url: '/affiliate-disclosure' },
    ],
  },
]

export default async function FixFooterLinksPage() {
  let success = false
  let error = ''

  try {
    await writeClient.createIfNotExists({ _id: 'configGeneral', _type: 'configGeneral' })
    await writeClient.patch('configGeneral').set({ footerColumns: FOOTER_COLUMNS }).commit()
    revalidatePath('/', 'layout')
    success = true
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error'
  }

  return (
    <div className="adm-dash" style={{ maxWidth: 520 }}>
      <h1 className="adm-dash-title">Migrate: Footer Links</h1>

      {success ? (
        <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 12, padding: '24px 28px', marginTop: 24 }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#16A34A', marginBottom: 8 }}>Footer links updated!</div>
          <div style={{ fontSize: 13, color: '#15803d', lineHeight: 1.7, marginBottom: 20 }}>
            Tất cả 16 footer links đã được patch vào Sanity:<br />
            <strong>Discover</strong> · <strong>Content</strong> · <strong>Company</strong> · <strong>Legal</strong>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <a href="/" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, fontWeight: 700, background: '#16A34A', color: '#fff', padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>
              Xem website →
            </a>
            <Link href="/admin" style={{ fontSize: 13, fontWeight: 600, color: '#6B7694', padding: '8px 16px', borderRadius: 8, border: '1.5px solid #E4EAF2', textDecoration: 'none' }}>
              ← Admin
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 12, padding: '24px 28px', marginTop: 24 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>Lỗi</div>
          <div style={{ fontSize: 13, color: '#B91C1C' }}>{error}</div>
        </div>
      )}
    </div>
  )
}
