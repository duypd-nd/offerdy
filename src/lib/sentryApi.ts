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

  try {
    // CO Y khong loc `environment=production` o day, du cac config Sentry da bat
    // dau gan tag `environment` tu 2026-07-26. Toan bo issue ghi TRUOC moc do
    // khong co tag, nen loc se tra ve 0 va giau luon nhung loi production that su
    // dang ton tai — bao cao se nhay tu "5 loi" xuong "0 loi" mot cach sai.
    // Khi issue co tag da du nhieu (va issue cu da duoc xu ly het), them
    // `&environment=production` vao day la buoc dung tiep theo.
    const res = await fetch(
      `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=is:unresolved&limit=${limit}&sort=freq`,
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
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}
