'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Post } from '@/data/posts'

const PAGE_SIZE = 9

const TABS = [
  { label: 'All', value: 'all' },
  { label: 'Tips & Guides', value: 'Tips & Guides' },
  { label: 'Deals Roundup', value: 'Deals Roundup' },
  { label: 'Store Guide', value: 'Store Guide' },
  { label: 'News', value: 'News' },
]

const CAT_CLASS: Record<string, string> = {
  'Tips & Guides': 'cat-tips',
  'Deals Roundup': 'cat-roundup',
  'Store Guide': 'cat-store',
  'News': 'cat-news',
}

function PostMeta({ post }: { post: Post }) {
  return (
    <div className="blog-featured-meta">
      <span>✍️ {post.author}</span>
      <span>📅 {post.date}</span>
      <span>⏱ {post.readTime} min read</span>
    </div>
  )
}

function Pagination({ page, totalPages, goTo }: { page: number; totalPages: number; goTo: (p: number) => void }) {
  return (
    <div className="deals-pagination">
      <button className="dpag-btn dpag-arrow" onClick={() => goTo(1)} disabled={page === 1}>«</button>
      <button className="dpag-btn dpag-arrow" onClick={() => goTo(page - 1)} disabled={page === 1}>‹</button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
        .reduce<(number | '...')[]>((acc, p, idx, arr) => {
          if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
          acc.push(p)
          return acc
        }, [])
        .map((p, i) =>
          p === '...'
            ? <span key={`e-${i}`} className="dpag-ellipsis">…</span>
            : <button key={p} className={`dpag-btn${page === p ? ' dpag-active' : ''}`} onClick={() => goTo(p as number)}>{p}</button>
        )
      }
      <button className="dpag-btn dpag-arrow" onClick={() => goTo(page + 1)} disabled={page === totalPages}>›</button>
      <button className="dpag-btn dpag-arrow" onClick={() => goTo(totalPages)} disabled={page === totalPages}>»</button>
    </div>
  )
}

export default function BlogPageContent({ posts, columns }: { posts: Post[]; columns?: number }) {
  const [active, setActive] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = active === 'all' ? posts : posts.filter(p => p.category === active)
  const [featured, ...rest] = filtered
  const totalPages = Math.ceil(rest.length / PAGE_SIZE)
  const paginatedRest = rest.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const goTo = (p: number) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const switchTab = (val: string) => {
    setActive(val)
    setPage(1)
  }

  return (
    <>
      <div className="filter-bar">
        {TABS.map(tab => (
          <button
            key={tab.value}
            className={`filter-chip${active === tab.value ? ' active' : ''}`}
            onClick={() => switchTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="blog-layout">
        {!featured && (
          <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
            No articles in this category yet.
          </p>
        )}

        {featured && page === 1 && (
          <Link href={`/blog/${featured.slug}`} className="blog-featured">
            <div className="blog-featured-img" style={{ background: featured.coverBg, overflow: 'hidden', padding: featured.imageUrl ? 0 : undefined }}>
              {featured.imageUrl
                ? <img src={featured.imageUrl} alt={featured.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : featured.coverEmoji}
            </div>
            <div className="blog-featured-body">
              <span className={`blog-cat ${CAT_CLASS[featured.category] ?? 'cat-tips'}`}>
                {featured.category}
              </span>
              <div className="blog-featured-title">{featured.title}</div>
              <div className="blog-featured-excerpt">{featured.excerpt}</div>
              <PostMeta post={featured} />
              <span className="blog-featured-link">Read article →</span>
            </div>
          </Link>
        )}

        {paginatedRest.length > 0 && (
          <>
            <div className="section-header" style={{ marginBottom: 20 }}>
              <div className="section-title">
                {page === 1 ? 'More Articles' : 'Articles'}
              </div>
              <div className="section-sub" style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                {rest.length} article{rest.length !== 1 ? 's' : ''}{totalPages > 1 && ` · Page ${page}/${totalPages}`}
              </div>
            </div>
            <div className="blog-grid" style={{ gridTemplateColumns: `repeat(${columns ?? 3}, 1fr)` }}>
              {paginatedRest.map(post => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="blog-card">
                  <div className="blog-card-img" style={{ background: post.coverBg, overflow: 'hidden', padding: post.imageUrl ? 0 : undefined }}>
                    {post.imageUrl
                      ? <img src={post.imageUrl} alt={post.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      : post.coverEmoji}
                  </div>
                  <div className="blog-card-body">
                    <span className={`blog-cat ${CAT_CLASS[post.category] ?? 'cat-tips'}`}>
                      {post.category}
                    </span>
                    <div className="blog-card-title">{post.title}</div>
                    <div className="blog-card-excerpt">{post.excerpt}</div>
                    <div className="blog-card-meta">
                      <span>{post.date}</span>
                      <span>{post.readTime} min read</span>
                    </div>
                    <span className="blog-card-read">Read article →</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} goTo={goTo} />}
      </div>
    </>
  )
}
