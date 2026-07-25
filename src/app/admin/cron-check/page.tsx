export const dynamic = 'force-dynamic'

/**
 * Chan doan bien moi truong cua cron, doc truc tiep tren production.
 *
 * Ly do ton tai: cron tra 401 vi `process.env.CRON_SECRET` khong ton tai o runtime,
 * du dashboard Vercel van hien bien do. Thong tin can de thu hep nam trong log cua
 * Vercel — ma log thi bi cat dong, phai chup man hinh gui qua lai tung vong. Trang
 * nay dat cung thong tin do o mot cho doc duoc truc tiep.
 *
 * Nam duoi /admin nen da duoc Basic Auth trong proxy.ts bao ve.
 *
 * TUYET DOI khong in gia tri bien nao — chi ten, do dai, va co/khong.
 */
export default async function CronCheckPage() {
  const secret = process.env.CRON_SECRET
  const cronNames = Object.keys(process.env).filter(k => /cron/i.test(k))

  const rows: [string, string, boolean | null][] = [
    ['CRON_SECRET đọc được ở runtime', secret ? `có (${secret.trim().length} ký tự)` : 'KHÔNG', !!secret],
    ['Có khoảng trắng thừa ở đầu/cuối', secret ? (secret !== secret.trim() ? 'CÓ — đây là lỗi' : 'không') : '—', secret ? secret === secret.trim() : null],
    ['ANTHROPIC_API_KEY', process.env.ANTHROPIC_API_KEY ? 'có' : 'KHÔNG', !!process.env.ANTHROPIC_API_KEY],
    ['SANITY_API_TOKEN', process.env.SANITY_API_TOKEN ? 'có' : 'KHÔNG', !!process.env.SANITY_API_TOKEN],
    ['ADMIN_USERNAME', process.env.ADMIN_USERNAME ? 'có' : 'KHÔNG', !!process.env.ADMIN_USERNAME],
    ['SENTRY_AUTH_TOKEN', process.env.SENTRY_AUTH_TOKEN ? 'có' : 'KHÔNG', !!process.env.SENTRY_AUTH_TOKEN],
    ['VERCEL_ENV', process.env.VERCEL_ENV ?? '(không có)', null],
    ['VERCEL_GIT_COMMIT_SHA', (process.env.VERCEL_GIT_COMMIT_SHA ?? '(không có)').slice(0, 7), null],
  ]

  return (
    <div className="adm-dash" style={{ maxWidth: 720 }}>
      <h1 className="adm-dash-title">Chẩn đoán biến môi trường Cron</h1>
      <p style={{ fontSize: 13, color: '#6B7694', lineHeight: 1.7, marginTop: 8 }}>
        Trang chỉ đọc, không ghi gì. <strong>Không hiển thị giá trị</strong> của bất kỳ biến nào — chỉ tên, độ dài và có/không.
      </p>

      <div style={{ background: '#fff', border: '1px solid #E4EAF2', borderRadius: 12, marginTop: 20, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {rows.map(([label, value, ok], i) => (
              <tr key={label} style={{ borderTop: i > 0 ? '1px solid #F1F5F9' : undefined }}>
                <td style={{ padding: '10px 16px', color: '#374151' }}>{label}</td>
                <td style={{
                  padding: '10px 16px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                  color: ok === null ? '#374151' : ok ? '#16A34A' : '#DC2626',
                }}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E4EAF2', borderRadius: 12, marginTop: 16, padding: '16px 18px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6B7694', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
          Tên biến chứa &ldquo;cron&rdquo; mà runtime nhìn thấy
        </div>
        {cronNames.length === 0 ? (
          <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
            Không có biến nào — nghĩa là <code>CRON_SECRET</code> chưa từng tới được function này.
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#1E293B', lineHeight: 1.8 }}>
            {cronNames.map(n => (
              // Bao trong dau ngoac nhon de nhin ra khoang trang thua trong TEN bien
              <li key={n}><code>&laquo;{n}&raquo;</code> — {n.length} ký tự</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
