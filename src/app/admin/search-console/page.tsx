import Link from 'next/link'
import {
  getSearchConsoleData, listSearchConsoleSites, isSearchConsoleConfigured, findDeadPages,
  type GscRow, type DeadPageReport,
} from '@/lib/searchConsole'

export const dynamic = 'force-dynamic'

/**
 * So URL site dang nop cho Google — doc tu chinh `sitemap.xml` cua PRODUCTION.
 *
 * Co y khong dem lai bang GROQ: sitemap.ts co logic rieng (bo /comparisons khi
 * chua co bai, chi nop category co store…), dem lai o day se tao ra mot con so
 * thu hai cho cung mot cau hoi va hai ben se lech nhau ngay lan sua tiep theo.
 * Doc production ke ca khi chay o may local, vi day la ban ma Google that su doc.
 */
async function sitemapUrlCount(): Promise<number | null> {
  try {
    const res = await fetch('https://www.offerdy.com/sitemap.xml', { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return ((await res.text()).match(/<loc>/g) ?? []).length
  } catch { return null }
}

export default async function SearchConsolePage() {
  const now = new Date()
  const [data, sitemapCount] = await Promise.all([
    getSearchConsoleData(now),
    sitemapUrlCount(),
  ])
  // Chi hoi danh sach site khi that bai — de chi ra gia tri dung cho GSC_SITE_URL
  const sites = data ? null : await listSearchConsoleSites(now)
  const dead = data ? await findDeadPages(data.allPages) : null

  return (
    <div className="adm-page" style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>Search Console</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0' }}>
          Phía Google của site — từ khoá nào đang hiện, trang nào đã vào chỉ mục
        </p>
      </div>

      {!data ? (
        <SetupCard configured={isSearchConsoleConfigured()} sites={sites} />
      ) : (
        <>
          <div className="adm-stat-row" style={{ marginBottom: 20 }}>
            <Stat label="Lượt bấm từ Google" value={data.totals.clicks} highlight />
            <Stat label="Lượt hiển thị" value={data.totals.impressions} />
            <Stat label="Tỷ lệ bấm" value={`${(data.totals.ctr * 100).toFixed(1)}%`} />
            <Stat label="Vị trí trung bình" value={data.totals.position.toFixed(1)} sub="nhỏ hơn là tốt hơn" />
          </div>

          <div style={{ fontSize: 11, color: '#94a3b8', margin: '-8px 0 20px' }}>
            28 ngày, kết thúc ở 3 ngày trước — Search Console luôn chậm 2–3 ngày so với thực tế.
          </div>

          {/* ── Trang chết mà Google vẫn xếp hạng — vấn đề lớn nhất, để lên đầu ── */}
          {dead && dead.pages.length > 0 && <DeadPagesCard report={dead} />}

          {/* ── Độ phủ chỉ mục ── */}
          <Card title="📄 Bao nhiêu trang thực sự xuất hiện trên Google">
            <div style={{ padding: 16 }}>
              <div style={{ fontSize: 13, color: '#374151' }}>
                <b style={{ fontSize: 20, color: '#0f172a' }}>{data.pagesSeen}</b>
                {sitemapCount !== null && (
                  <span style={{ color: '#94a3b8' }}> / {sitemapCount} URL đang nộp trong sitemap</span>
                )}
              </div>
              {sitemapCount !== null && sitemapCount > 0 && (
                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, margin: '8px 0 12px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (data.pagesSeen / sitemapCount) * 100)}%`, height: '100%', background: '#16a34a' }} />
                </div>
              )}
              <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.7 }}>
                Đây là số trang <b>từng hiện ít nhất một lần</b> trong kết quả tìm kiếm ở kỳ này — không hoàn toàn bằng
                &ldquo;số trang đã được lập chỉ mục&rdquo;: một trang đã vào chỉ mục nhưng chưa bao giờ khớp truy vấn nào
                sẽ không xuất hiện ở đây. Dù vậy, tỷ lệ thấp hẳn so với sitemap là dấu hiệu đáng tin rằng phần lớn nội dung
                chưa cạnh tranh được với ai.
              </div>
            </div>
          </Card>

          {/* ── Việc rẻ nhất: đẩy trang 2 lên trang 1 ── */}
          <Card title="🎯 Từ khoá đang ở trang 2 (vị trí 11–20)" accent="#f59e0b"
            note="Nhóm rẻ nhất để cải thiện: Google đã thấy trang bạn liên quan, chỉ thiếu một chút để lên trang 1 — khác hẳn việc tạo một trang mới từ số không.">
            <QueryTable rows={data.almostPageOne} empty="Chưa có từ khoá nào rơi vào khoảng 11–20." />
          </Card>

          {/* ── Việc rẻ thứ nhì: sửa tiêu đề ── */}
          <Card title="✍️ Hiện nhiều mà không ai bấm" accent="#dc2626"
            note="Gần như luôn là lỗi tiêu đề hoặc mô tả chứ không phải lỗi nội dung — Google đã đưa bạn ra trước mặt người ta mà họ không chọn. Sửa meta title/description là việc rẻ và nhanh nhất trong SEO.">
            <QueryTable rows={data.impressionsNoClicks} empty="Không có từ khoá nào hiện ≥5 lần mà không ra click." />
          </Card>

          <Card title="🔍 Từ khoá ra nhiều click nhất">
            <QueryTable rows={data.topQueries} empty="Chưa có từ khoá nào ra click." />
          </Card>

          <Card title="📃 Trang nhận nhiều click nhất từ Google">
            <QueryTable rows={data.topPages} empty="Chưa trang nào nhận click từ Google." linkKeys />
          </Card>
        </>
      )}
    </div>
  )
}

/**
 * Trang Google van xep hang nhung site tra ve 4xx.
 *
 * Khong the thay dieu nay tu Search Console (o do chi co luot hien, khong biet
 * URL con song khong) va cung khong the thay tu /admin (khong biet Google dang
 * xep hang URL nao). Phai ghep hai nguon moi lo ra — va lan dau ghep, no cho
 * thay 71% luot hien cua site dang roi vao trang chet.
 */
function DeadPagesCard({ report }: { report: DeadPageReport }) {
  const pct = report.checkedImpressions > 0
    ? Math.round((report.deadImpressions / report.checkedImpressions) * 100)
    : 0
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #fee2e2', background: '#fef2f2', fontSize: 13, fontWeight: 700, color: '#dc2626' }}>
          🚨 Google vẫn xếp hạng {report.pages.length} trang đã chết
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
            Trong <b>{report.checked}</b> trang được kiểm tra (nhiều lượt hiển thị nhất),
            {' '}<b style={{ color: '#dc2626' }}>{report.pages.length}</b> trang trả về lỗi.
            Chúng đang chiếm <b style={{ color: '#dc2626' }}>{report.deadImpressions.toLocaleString('vi-VN')} lượt hiển thị ({pct}%)</b>
            {report.deadClicks > 0 && <> và đã nuốt <b style={{ color: '#dc2626' }}>{report.deadClicks} lượt bấm</b> — những người đó bấm vào rồi rơi thẳng vào trang &ldquo;Page Not Found&rdquo;</>}.
          </div>
          <div style={{ fontSize: 11.5, color: '#94a3b8', lineHeight: 1.7, margin: '10px 0 14px' }}>
            Nguyên nhân thường là các đợt dọn store/review cũ: xoá xong nhưng Google còn giữ kết quả nhiều tuần.
            Với trang còn nội dung tương đương, chuyển hướng 301 sang trang đó sẽ giữ được thứ hạng.
            Với trang không còn gì thay thế, để 404 là đúng và Google sẽ tự bỏ — chỉ là chậm.
          </div>
          <div className="adm-scroll-x">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '8px 0', fontSize: 11, fontWeight: 700, color: '#94a3b8', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.04em' }}>Trang</th>
                  <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textAlign: 'right', textTransform: 'uppercase' }}>Hiện</th>
                  <th style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textAlign: 'right', textTransform: 'uppercase' }}>Vị trí</th>
                  <th style={{ padding: '8px 0 8px 12px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textAlign: 'right', textTransform: 'uppercase' }}>Mã</th>
                </tr>
              </thead>
              <tbody>
                {report.pages.map(p => (
                  <tr key={p.url} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 0', fontSize: 12.5, color: '#1e293b', maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.url.replace(/^https?:\/\/[^/]+/, '')}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>{p.impressions}</td>
                    {/* Vi tri <= 10 la TRANG 1 — mat cho nay dau hon han mat mot ket qua o trang 4 */}
                    <td style={{ padding: '8px 12px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: p.position <= 10 ? '#dc2626' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                      {p.position.toFixed(1)}
                    </td>
                    <td style={{ padding: '8px 0 8px 12px', fontSize: 12, textAlign: 'right', color: '#94a3b8' }}>{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f8fafc', fontSize: 11, color: '#94a3b8' }}>
            Cột vị trí tô đỏ = đang ở trang 1 của Google. Đó là những chỗ mất mát đau nhất.
            Chỉ {report.checked}/{report.totalPages} trang được kiểm tra mỗi lần tải để không tự dội request vào site.
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, sub, highlight }: {
  label: string; value: number | string; sub?: string; highlight?: boolean
}) {
  return (
    <div style={{
      background: highlight ? '#f0fdf4' : '#fff',
      border: `1px solid ${highlight ? '#86efac' : '#e5e7eb'}`,
      borderRadius: 12, padding: '14px 16px',
    }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: highlight ? '#16a34a' : '#0f172a', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{sub}</div>}
    </div>
  )
}

function Card({ title, note, accent, children }: {
  title: string; note?: string; accent?: string; children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
          fontSize: 13, fontWeight: 700, color: accent ?? '#374151',
        }}>
          {title}
        </div>
        {note && (
          <div style={{ padding: '10px 16px 0', fontSize: 11.5, color: '#94a3b8', lineHeight: 1.7 }}>{note}</div>
        )}
        {children}
      </div>
    </div>
  )
}

function QueryTable({ rows, empty, linkKeys }: { rows: GscRow[]; empty: string; linkKeys?: boolean }) {
  if (rows.length === 0) {
    return <div style={{ padding: '20px 16px', fontSize: 13, color: '#94a3b8' }}>{empty}</div>
  }
  const th = { padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '.04em' }
  const td = { padding: '8px 16px', fontSize: 13, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' as const, whiteSpace: 'nowrap' as const }
  return (
    <div className="adm-scroll-x">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: 'left' }}>{linkKeys ? 'Trang' : 'Từ khoá'}</th>
            <th style={{ ...th, textAlign: 'right' }}>Bấm</th>
            <th style={{ ...th, textAlign: 'right' }}>Hiện</th>
            <th style={{ ...th, textAlign: 'right' }}>Tỷ lệ</th>
            <th style={{ ...th, textAlign: 'right' }}>Vị trí</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.key} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px 16px', fontSize: 13, color: '#1e293b', maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {linkKeys ? (
                  <a href={r.key} target="_blank" rel="noopener noreferrer" style={{ color: '#1e293b', textDecoration: 'none' }}>
                    {r.key.replace(/^https?:\/\/[^/]+/, '') || '/'}
                  </a>
                ) : r.key}
              </td>
              <td style={{ ...td, fontWeight: 800, color: r.clicks > 0 ? '#16a34a' : '#cbd5e1' }}>{r.clicks}</td>
              <td style={{ ...td, color: '#6b7280' }}>{r.impressions}</td>
              <td style={{ ...td, color: '#6b7280' }}>{(r.ctr * 100).toFixed(1)}%</td>
              <td style={{ ...td, fontWeight: 700, color: r.position <= 10 ? '#16a34a' : '#d97706' }}>{r.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Chua doc duoc thi noi RO ket vi sao. Ba nguyen nhan (chua bat API / chua cap
 * quyen / sai GSC_SITE_URL) deu cho ra mot man hinh trong nhu nhau, nen phai
 * tach chung ra bang chu.
 */
function SetupCard({ configured, sites }: { configured: boolean; sites: string[] | null }) {
  const code = { background: '#f6f8fb', padding: '1px 5px', borderRadius: 4, fontSize: 12 }
  return (
    <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #fef3c7', background: '#fffbeb', fontSize: 13, fontWeight: 700, color: '#92400e' }}>
        Chưa đọc được Search Console
      </div>
      <div style={{ padding: 16, fontSize: 12.5, color: '#374151', lineHeight: 1.9 }}>
        <div style={{ marginBottom: 10 }}>
          Dùng chung service account với GA4 — không phải tạo khoá mới. Ba việc còn thiếu, làm theo thứ tự:
        </div>
        <div><b>1.</b> Bật <b>Google Search Console API</b> trong Google Cloud (cùng dự án với GA4).</div>
        <div>
          <b>2.</b> search.google.com/search-console → chọn property → <b>Settings</b> → <b>Users and permissions</b> →
          thêm email service account (xem ở <code style={code}>GA4_CLIENT_EMAIL</code>) với quyền <b>Full</b> hoặc <b>Restricted</b>.
        </div>
        <div>
          <b>3.</b> Đặt biến <code style={code}>GSC_SITE_URL</code>
          {sites && sites.length > 0 ? (
            <> — service account đang đọc được các property sau, chép <b>nguyên văn</b> một trong số này:
              <div style={{ marginTop: 6 }}>
                {sites.map(s => (
                  <div key={s} style={{ ...code, display: 'inline-block', marginRight: 8, marginBottom: 4, fontWeight: 700 }}>
                    GSC_SITE_URL={s}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <> — có hai dạng hợp lệ khác nhau: <code style={code}>sc-domain:offerdy.com</code> (xác minh theo tên miền)
              hoặc <code style={code}>https://www.offerdy.com/</code> (xác minh theo tiền tố URL, kể cả dấu <code style={code}>/</code> cuối).
              Phải khớp từng ký tự.</>
          )}
        </div>
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f8fafc', color: '#6b7280' }}>
          Kiểm tra bằng <code style={code}>npm run check:gsc</code> — nó nói rõ đang kẹt ở bước nào và liệt kê giá trị
          <code style={code}>GSC_SITE_URL</code> đúng. {configured ? '' : 'Hiện GSC_SITE_URL chưa được đặt.'}
        </div>
        <div style={{ marginTop: 10 }}>
          <Link href="/admin/seo-audit" style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
            Trong lúc chờ: xem SEO Audit (kiểm tra nội bộ, không cần Google) →
          </Link>
        </div>
      </div>
    </div>
  )
}
