export type NavLink = { label: string; url: string }
export type SocialLink = { platform: string; url: string; icon: string }
export type FooterLink = { label: string; url: string }
export type FooterColumn = { title: string; links: FooterLink[] }

export type SiteSettings = {
  siteName: string
  tagline: string
  seoDescription: string
  logoUrl?: string
  navigation: NavLink[]
  socialMedia: SocialLink[]
  footerColumns: FooterColumn[]
  copyrightText: string
}

/**
 * ⚠️ `siteName` o day la GIA TRI ROI VE khi chua cau hinh Sanity hoac o *Ten
 * website* con trong — day la cho DUY NHAT trong `src/` con go cung ten that,
 * va no phai the. Moi cho khac doc qua `getSiteName()` hoac o `{site}`.
 */
export const defaultSiteSettings: SiteSettings = {
  siteName: 'Offerdy',
  tagline: 'The best deals online. Actually verified.',
  seoDescription: 'Find and save with verified deals, coupon codes, and discounts from top stores worldwide.',
  navigation: [
    { label: 'Deals', url: '/deals' },
    { label: 'Stores', url: '/stores' },
    { label: 'Reviews', url: '/reviews' },
    { label: 'Blog', url: '/blog' },
  ],
  socialMedia: [
    { platform: 'Facebook', url: '#', icon: 'f' },
    { platform: 'X', url: '#', icon: '𝕏' },
    { platform: 'LinkedIn', url: '#', icon: 'in' },
    { platform: 'YouTube', url: '#', icon: '▶' },
  ],
  footerColumns: [
    {
      title: 'Discover',
      links: [
        { label: "Today's Deals", url: '/deals' },
        { label: 'All Stores', url: '/stores' },
        { label: 'Flash Sales', url: '/flash-sales' },
        { label: 'Coupon Codes', url: '/coupon-codes' },
      ],
    },
    {
      title: 'Content',
      links: [
        { label: 'Product Reviews', url: '/reviews' },
        { label: 'Comparisons', url: '/comparisons' },
        { label: 'Shopping Blog', url: '/posts' },
        { label: 'Tips & Guides', url: '/tips-guides' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', url: '/about' },
        { label: 'Contact', url: '/contact' },
        { label: 'Submit a Deal', url: '/submit-deal' },
        { label: 'Partner with Us', url: '/partner' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms of Use', url: '/terms' },
        { label: 'Privacy Policy', url: '/privacy' },
        { label: 'Cookie Policy', url: '/cookies' },
        { label: 'Affiliate Disclosure', url: '/affiliate-disclosure' },
      ],
    },
  ],
  copyrightText: '© 2026 {site}. Real deals, no spam.',
}
