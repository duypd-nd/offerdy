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

  // Ba trang thai KHAC NHAU ma mot phep `!process.env.X` gop het lam mot:
  //  - khoa khong ton tai  -> bien chua bao gio den runtime
  //  - khoa ton tai, gia tri rong -> bien CO den nhung o Vercel dang de trong
  //  - co gia tri
  // Da mat vai vong chan doan vi khong tach duoc hai truong hop dau: bang bao
  // "KHONG" trong khi danh sach ten bien lai liet ke dung CRON_SECRET.
  const keyExists = 'CRON_SECRET' in process.env
  const secretState = !keyExists
    ? 'KHÔNG có biến này ở runtime'
    : !secret
      ? 'CÓ biến nhưng GIÁ TRỊ RỖNG — đây là lỗi'
      : `có (${secret.trim().length} ký tự)`

  const rows: [string, string, boolean | null][] = [
    ['CRON_SECRET đọc được ở runtime', secretState, !!secret],
    ['Có khoảng trắng thừa ở đầu/cuối', secret ? (secret !== secret.trim() ? 'CÓ — đây là lỗi' : 'không') : '—', secret ? secret === secret.trim() : null],
    ['VERCEL_ENV', process.env.VERCEL_ENV ?? '(không có)', null],
    ['VERCEL_GIT_COMMIT_SHA', (process.env.VERCEL_GIT_COMMIT_SHA ?? '(không có)').slice(0, 7), null],
  ]

  /**
   * Toan bo bien moi truong ma code cham toi, nhom theo HAU QUA chu khong theo ten.
   *
   * ⚠️ Vi sao khong the biet bang cach nhin production dang chay binh thuong:
   * Vercel gan bien vao luc DEPLOY, nen ban dang chay giu nguyen bo bien cua luc
   * no duoc dung. Xoa mot bien tren dashboard khong lam gi ca cho toi lan deploy
   * ke tiep — luc do moi vo, va vo ma khong ai noi duoc vi sao. Trang nay doc
   * `process.env` cua chinh ban dang chay, nen no noi that ve BAN DO.
   *
   * Do that 2026-08-21: user xoa ADMIN_USERNAME/ADMIN_PASSWORD roi lo tay xoa
   * them mot bien nua, va khong co cach nao biet la cai nao — luc do trang nay
   * chi soi 6 bien va bo qua ca nhom dang nhap.
   */
  const groups: { title: string; hint: string; names: string[] }[] = [
    {
      title: 'Thiếu là hỏng ngay',
      hint: 'Thiếu một cái trong nhóm này thì trang đăng nhập từ chối phục vụ, và web công khai cũng không đọc được gì.',
      names: ['NEXT_PUBLIC_SANITY_PROJECT_ID', 'NEXT_PUBLIC_SANITY_DATASET', 'SANITY_API_TOKEN', 'AUTH_SECRET', 'AUTH_PEPPER'],
    },
    {
      title: 'Thiếu là hỏng âm thầm',
      hint: 'Mọi thứ trông vẫn chạy bình thường. Cái giá chỉ lộ ra vào đúng lúc cần đến.',
      names: ['AUTH_BACKUP_KEY', 'CRON_SECRET', 'ANTHROPIC_API_KEY', 'NEXT_PUBLIC_SENTRY_DSN',
        'SENTRY_AUTH_TOKEN', 'SENTRY_ORG', 'SENTRY_PROJECT',
        'GA4_PROPERTY_ID', 'GA4_CLIENT_EMAIL', 'GA4_PRIVATE_KEY', 'GSC_SITE_URL'],
    },
    {
      title: 'Để trống cũng được',
      hint: 'Đều có giá trị mặc định trong code.',
      names: ['ANTHROPIC_MODEL', 'LINK_CHECK_BATCH_SIZE', 'IMPORT_AI_STORE_CAP',
        'AI_CONTENT_BATCH_SIZE', 'AI_CONTENT_OFFER_BATCH_SIZE', 'AI_CONTENT_DEAL_BATCH_SIZE', 'AI_CONTENT_BUDGET_MS'],
    },
    {
      title: 'Đã chết — nên xoá khỏi Vercel',
      hint: 'Basic Auth cũ đã bị thay bằng đăng nhập thật ngày 21/08. Còn để đó chỉ gây nhầm.',
      names: ['ADMIN_USERNAME', 'ADMIN_PASSWORD'],
    },
  ]

  // Ba trang thai, khong phai hai — xem chu thich o `secretState` phia tren.
  // Rieng do dai duoc in ra vi no phan biet duoc "sai gia tri" voi "thua mot ky
  // tu trang", ma mat thuong khong nhin ra khac biet do.
  const stateOf = (name: string): { text: string; ok: boolean | null } => {
    if (!(name in process.env)) return { text: 'KHÔNG có ở runtime', ok: false }
    const v = process.env[name]
    if (!v) return { text: 'CÓ biến nhưng GIÁ TRỊ RỖNG', ok: false }
    if (v !== v.trim()) return { text: `${v.trim().length} ký tự — CÓ KHOẢNG TRẮNG THỪA`, ok: false }
    return { text: `${v.length} ký tự`, ok: true }
  }

  return (
    <div className="adm-dash" style={{ maxWidth: 720 }}>
      <h1 className="adm-dash-title">Chẩn đoán biến môi trường</h1>
      <p style={{ fontSize: 13, color: '#6B7694', lineHeight: 1.7, marginTop: 8 }}>
        Trang chỉ đọc, không ghi gì. <strong>Không hiển thị giá trị</strong> của bất kỳ biến nào — chỉ tên, độ dài và có/không.
      </p>
      <p style={{ fontSize: 12, color: '#92400E', background: '#FEF3C7', borderRadius: 8, padding: '10px 12px', lineHeight: 1.7, marginTop: 10 }}>
        ⚠️ Trang này nói về <strong>bản deploy đang chạy</strong>, không phải về danh sách trên dashboard Vercel.
        Vercel gắn biến vào lúc deploy, nên xoá hay sửa một biến trên dashboard <strong>chưa có tác dụng gì</strong> cho tới
        lần deploy kế tiếp. Muốn biết thay đổi vừa rồi ảnh hưởng thế nào thì phải deploy lại rồi mở lại trang này.
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

      {groups.map(g => {
        const thieu = g.names.filter(n => stateOf(n).ok === false)
        return (
          <div key={g.title} style={{ background: '#fff', border: '1px solid #E4EAF2', borderRadius: 12, marginTop: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                {g.title}
                {thieu.length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 99, background: '#FEE2E2', color: '#991B1B' }}>
                    thiếu {thieu.length}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#6B7694', marginTop: 3, lineHeight: 1.6 }}>{g.hint}</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <tbody>
                {g.names.map((n, i) => {
                  const st = stateOf(n)
                  return (
                    <tr key={n} style={{ borderTop: i > 0 ? '1px solid #F1F5F9' : undefined }}>
                      <td style={{ padding: '9px 16px', color: '#374151' }}><code>{n}</code></td>
                      <td style={{
                        padding: '9px 16px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                        color: st.ok === null ? '#374151' : st.ok ? '#16A34A' : '#DC2626',
                      }}>
                        {st.text}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

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
