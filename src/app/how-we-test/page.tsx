import type { Metadata } from 'next'
import Link from 'next/link'
import HeaderWrapper from '@/components/HeaderWrapper'
import Footer from '@/components/Footer'
import { getCouponTestRecords } from '@/sanity/queries'
import { fmtDayYearUtc } from '@/lib/offerTrust'

/**
 * Ho so cong khai cua viec thu ma coupon.
 *
 * Vi sao trang nay ton tai: gan nhu moi chu tren site nay do AI viet, va tren mot
 * ten mien affiliate chua co uy tin thi do la ho so kem. Trang nay la thu NGUOC
 * lai — khong mot cau nao o day duoc sinh ra, tat ca deu la ban ghi cua mot viec
 * mot nguoi that da ngoi lam: mo quay thanh toan cua tung shop va go ma vao.
 * Do la thong tin truc tiep, co ngay thang, khong doi thu nao chep duoc.
 *
 * ⚠️ MOI CON SO TREN TRANG NAY DEU DUOC TINH TU DU LIEU, khong go tay mot cai nao.
 * Neu mai co nguoi thu them 10 ma thi trang tu dung; neu ai do xoa ban ghi thi so
 * tu giam. Go tay mot con so o day la bien mot ho so bang chung thanh mot loi
 * quang cao — dung sai lam do (xem PROJECT_CONTEXT muc "The store count is
 * derived, never typed").
 *
 * ⚠️ Trang public => 100% tieng Anh (xem PROJECT_CONTEXT muc "Language split").
 */

export const dynamic = 'force-dynamic'
const BASE = 'https://www.offerdy.com'

export const metadata: Metadata = {
  title: 'How We Test Coupon Codes',
  description:
    'We enter every coupon code at the store checkout ourselves and record what happened, with dates. This is the full log — including the codes that failed.',
  alternates: { canonical: `${BASE}/how-we-test` },
}

/** 'worked' | 'partial' | 'rejected' -> chu cho nguoi doc + mau. */
function readResult(r: string | null): { label: string; tone: 'ok' | 'warn' | 'bad' } {
  if (r === 'rejected') return { label: 'Rejected at checkout', tone: 'bad' }
  if (r === 'partial') return { label: 'Worked, with conditions', tone: 'warn' }
  if (r === 'worked') return { label: 'Applied successfully', tone: 'ok' }
  return { label: 'Recorded', tone: 'warn' }
}

export default async function HowWeTestPage() {
  const records = await getCouponTestRecords()

  // Tat ca deu tinh tu `records`. Khong hang so nao.
  const stores = new Set(records.map(r => r.storeName)).size
  const worked = records.filter(r => r.result === 'worked').length
  const partial = records.filter(r => r.result === 'partial').length
  const rejected = records.filter(r => r.result === 'rejected').length
  const days = [...records.map(r => r.testedAt)].sort()
  const firstDay = fmtDayYearUtc(days[0])
  const lastDay = fmtDayYearUtc(days[days.length - 1])
  const withNote = records.filter(r => (r.note ?? '').trim()).length

  // Ma nao chiem da so trong so lan thu. Dung de GIAI THICH ty le dau — mot bang
  // "100% thanh cong" ma khong noi vi sao thi doc nhu quang cao, va nguoi mua tung
  // bi lua boi cac trang coupon khac se khong tin. Noi ra ly do thi de tin hon.
  const byCode = new Map<string, number>()
  for (const r of records) {
    const k = r.code.trim().toUpperCase()
    byCode.set(k, (byCode.get(k) ?? 0) + 1)
  }
  const [topCode, topCount] = [...byCode].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
  const topIsMajority = topCount > records.length / 2

  return (
    <>
      <HeaderWrapper />
      <main style={{ flex: 1, background: 'var(--bg)' }}>
        <div className="hwt-wrap">
          <h1 className="hwt-h1">How we test coupon codes</h1>

          <p className="hwt-lead">
            Most coupon sites copy codes from each other and label them
            &ldquo;verified&rdquo; without checking anything. We do the boring version
            instead: someone opens the store, puts an item in the basket, types the
            code into the checkout, and writes down what happened.
          </p>

          {records.length === 0 ? (
            <p className="hwt-lead">
              No checkout tests have been recorded yet. When they are, every one of
              them will be listed on this page &mdash; including the failures.
            </p>
          ) : (
            <>
              <div className="hwt-stats">
                <div className="hwt-stat">
                  <div className="hwt-stat-n">{records.length}</div>
                  <div className="hwt-stat-l">checkout tests</div>
                </div>
                <div className="hwt-stat">
                  <div className="hwt-stat-n">{stores}</div>
                  <div className="hwt-stat-l">different stores</div>
                </div>
                <div className="hwt-stat">
                  <div className="hwt-stat-n">{worked}</div>
                  <div className="hwt-stat-l">applied successfully</div>
                </div>
                <div className="hwt-stat">
                  <div className="hwt-stat-n">{rejected + partial}</div>
                  <div className="hwt-stat-l">failed or had conditions</div>
                </div>
              </div>

              <h2 className="hwt-h2">What we did</h2>
              <p className="hwt-p">
                {firstDay === lastDay ? (
                  <>Every test below was run on <strong>{firstDay}</strong>.</>
                ) : (
                  <>The tests below were run between <strong>{firstDay}</strong> and{' '}
                    <strong>{lastDay}</strong>.</>
                )}{' '}
                Each row is one code entered at one store&rsquo;s real checkout page.
                A store appears once per test, not once per code it sells.
              </p>

              <h2 className="hwt-h2">Why the pass rate is high</h2>
              <p className="hwt-p">
                {rejected + partial === 0 ? (
                  <>Every test on this page passed, and that deserves an explanation
                    rather than a victory lap. </>
                ) : (
                  <>Most tests on this page passed. </>
                )}
                {topIsMajority && (
                  <>
                    <strong>{topCount} of the {records.length} tests</strong> used the
                    code <code className="hwt-code">{topCode}</code>{' '}&mdash; our own
                    partner code at stores we work with directly, not a code copied from
                    somewhere else. That is a far easier test to pass than a code scraped
                    off another coupon site.{' '}
                  </>
                )}
                Treat the log as evidence that these specific codes worked on these
                specific dates &mdash; not as proof that every code everywhere works.
              </p>

              <h2 className="hwt-h2">What this does not tell you</h2>
              <p className="hwt-p">
                A coupon that worked on a given date can stop working the next day &mdash;
                merchants change or cancel codes without notice, and we do not re-run
                these tests daily. <strong>Read the date, not the badge.</strong> We
                publish the date on every offer for exactly this reason.
                {rejected + partial > 0 && (
                  <> Failed tests stay on this page rather than being quietly deleted.</>
                )}
              </p>
              {withNote < records.length && (
                <p className="hwt-p hwt-quiet">
                  {withNote === 1
                    ? `1 of ${records.length} tests carries a written observation`
                    : `${withNote} of ${records.length} tests carry a written observation`}
                  . The rest record only the date and the outcome &mdash; the date and the
                  result are the parts we can vouch for.
                </p>
              )}

              <h2 className="hwt-h2">The full log</h2>
              <div className="hwt-scroll">
                <table className="hwt-table">
                  <thead>
                    <tr>
                      <th>Store</th>
                      <th>Code</th>
                      <th>Tested on</th>
                      <th>Result</th>
                      <th>What we saw</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r, i) => {
                      const res = readResult(r.result)
                      return (
                        <tr key={`${r.storeSlug ?? r.storeName}-${i}`}>
                          <td>
                            {r.storeSlug ? (
                              <Link href={`/stores/${r.storeSlug}`}>{r.storeName}</Link>
                            ) : (
                              r.storeName
                            )}
                          </td>
                          <td><code className="hwt-code">{r.code}</code></td>
                          <td className="hwt-nowrap">{fmtDayYearUtc(r.testedAt)}</td>
                          <td>
                            <span className={`hwt-res hwt-res-${res.tone}`}>{res.label}</span>
                          </td>
                          <td className="hwt-note">{(r.note ?? '').trim() || <span className="hwt-quiet">&mdash;</span>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <p className="hwt-p hwt-back">
            <Link href="/coupon-codes">Browse all coupon codes</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
