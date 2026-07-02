import { SearchBar } from './Header'
import type { SearchableContent } from '@/sanity/queries'

export default function Hero({ searchableContent }: { searchableContent?: SearchableContent }) {
  return (
    <section className="hero">
      <h1>
        The best deals online.
        <span className="accent">Actually verified.</span>
      </h1>
      <p className="hero-sub">
        We test every coupon code before it goes live. No expired codes, no checkout disappointments — ever.
      </p>
      <SearchBar
        placeholder=""
        variant="hero"
        content={searchableContent}
      />
    </section>
  )
}
