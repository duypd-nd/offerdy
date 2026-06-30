import Link from 'next/link'
import type { Category } from '@/data/categories'

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  return (
    <section className="cat-section">
      <div className="cat-inner">
        <div className="section-header" style={{ marginBottom: 28 }}>
          <div>
            <div className="section-title">Browse by Category</div>
            <div className="section-sub">Find deals in the categories you shop most</div>
          </div>
          <Link href="/categories" className="see-all">All categories →</Link>
        </div>
        <div className="cat-grid">
          {categories.map(cat => (
            <Link key={cat.id} href={`/categories/${cat.slug ?? cat.id}`} className={`cat-card ${cat.colorClass}`}>
              <span className="cat-emoji">{cat.emoji}</span>
              <div className="cat-info">
                <div className="cat-name">{cat.name}</div>
                <div className="cat-count">{cat.count}</div>
              </div>
              <div className="cat-arr">→</div>
            </Link>
          ))}
          <Link href="/categories" className="cat-card ci-all">
            <span className="cat-emoji">🗂️</span>
            <div className="cat-info">
              <div className="cat-name">All Categories</div>
              <div className="cat-count">View all →</div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  )
}
