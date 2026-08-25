export type SentryIssue = {
  id: string
  shortId: string
  title: string
  culprit: string | null
  permalink: string
  level: string
  count: string
  userCount: number
  firstSeen: string
  lastSeen: string
}

export async function getRecentSentryIssues(limit = 10): Promise<SentryIssue[]> {
  const token = process.env.SENTRY_AUTH_TOKEN
  const org = process.env.SENTRY_ORG
  const project = process.env.SENTRY_PROJECT
  if (!token || !org || !project) return []

  /**
   * Loc `environment=production` — DA DO 2026-08-25, khong con la nuoc di
   * "dung tiep theo" nua ma la dung ngay bay gio.
   *
   * Ghi chu cu o cho nay noi khong loc duoc vi issue truoc 2026-07-26 khong
   * mang tag `environment`. Do lai thi dieu do KHONG con dung: ca 7 issue dang
   * mo deu co tag, ke ca hai cai cu nhat (`JAVASCRIPT-NEXTJS-B` va `-C`, tag
   * `production=1`). Loc khang dinh hom nay tra ve dung 7/7 — khong giau gi.
   *
   * ⚠️ Va phai la THAM SO RIENG `&environment=`, khong phai chu trong `query=`.
   * Do that: `query=is:unresolved environment:production`,
   * `query=is:unresolved !environment:local` va `query=is:unresolved` tra ve Y
   * HET 7 issue — tuc la Sentry BO QUA `environment` khi no nam trong chuoi
   * query. Mot ban va viet theo kieu do se chay, tra 200, va khong loc gi ca.
   *
   * Thu no thuc su don: tu 2026-08-25 loi sinh ra ngoai Vercel mang nhan
   * `local` (xem sentry.server.config.ts) nen khong con vao the do "Loi
   * production chua xu ly" o /admin. Bay issue cu thi da lo mang nhan
   * `production` roi — chung phai duoc danh dau resolved bang tay.
   */
  async function goi(env: string | null) {
    const loc = env ? `&environment=${env}` : ''
    return fetch(
      `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=is%3Aunresolved${loc}&limit=${limit}&sort=freq`,
      {
        headers: { Authorization: `Bearer ${token}` },
        // Do duoc: moi lan goi mat 720-830ms, va no nam tren duong toi han cua
        // ca /admin lan /admin/reports — /admin tu 915ms xuong 500ms chi nho cho
        // nay duoc cache. `no-store` truoc day tra gia do de doi lay do tuoi ma
        // khong ai can: mot loi production khong doi trong 5 phut, va bang nay
        // chi de tra loi "co gi dang chay khong", khong phai de theo doi tung giay.
        next: { revalidate: 300 },
      }
    )
  }

  try {
    /**
     * ⚠️ Duong LUI bat buoc phai co.
     *
     * Neu Sentry tu choi tham so loc thi nhanh `!res.ok` cu tra ve mang rong —
     * va mang rong o day KHONG hien ra nhu mot loi, no hien ra nhu dong chu
     * "0 loi production chua xu ly" tren /admin. Dung ho loi dat nhat cua du an
     * nay: bao thanh cong ma van hong. Nen khi cau co loc that bai thi goi lai
     * cau khong loc, tha nhieu con hon mu.
     */
    let res = await goi('production')
    if (!res.ok) res = await goi(null)
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}
