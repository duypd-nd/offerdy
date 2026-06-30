const CONFIGS = [
  { href: '/admin/config/content', icon: '📋', label: 'Cấu hình nội dung', desc: 'How-to, FAQ mặc định, mô tả offer, số lượng hiển thị' },
  { href: '/admin/config/general', icon: '⚙️', label: 'Cấu hình chung', desc: 'Tên site, slogan, menu điều hướng, footer' },
  { href: '/admin/config/seo', icon: '🔍', label: 'Cấu hình SEO', desc: 'Meta title, description, OG image, keywords' },
  { href: '/admin/config/ads', icon: '📢', label: 'Cấu hình Ads', desc: 'Google AdSense, GTM, Facebook Pixel' },
  { href: '/admin/config/author', icon: '👤', label: 'Cấu hình tác giả', desc: 'Tên, chức danh, bio, email' },
  { href: '/admin/config/social', icon: '🌐', label: 'Mạng xã hội', desc: 'Facebook, Twitter, Instagram, YouTube...' },
]

export default function ConfigHubPage() {
  return (
    <div className="adm-dash">
      <h1 className="adm-dash-title">Cấu hình</h1>
      <p className="adm-dash-sub">Thiết lập toàn bộ cấu hình hoạt động của Offerdy</p>
      <div className="adm-dash-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {CONFIGS.map(c => (
          <a key={c.href} href={c.href} className="adm-dash-card">
            <div className="adm-dash-card-icon">{c.icon}</div>
            <div className="adm-dash-card-label">{c.label}</div>
            <div className="adm-dash-card-desc">{c.desc}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
