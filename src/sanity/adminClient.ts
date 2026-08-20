import 'server-only'
import { createClient } from 'next-sanity'

/**
 * Client cho dataset **rieng tu** `admin` — noi cat tai khoan quan tri.
 *
 * ⚠️ VI SAO PHAI LA MOT DATASET KHAC: dataset `production` o che do **public**.
 * Do ngay 2026-08-20: goi API khong kem token van tra ve moi tai lieu. Neu ban
 * bam mat khau nam o do thi ai cung tai ve duoc va do offline thoai mai.
 *
 * `import 'server-only'` la vong chan cung: neu co ai vo tinh import file nay
 * vao mot component chay o trinh duyet, **build se hong ngay** thay vi am tham
 * gui `SANITY_API_TOKEN` xuong may khach.
 *
 * `useCdn: false` khong phai de "cho moi": dataset rieng khong di qua CDN cong
 * cong, va moi so lieu o day (vai, trang thai bat/tat) la co so de quyet dinh
 * cho vao hay khong — doc mot ban cu 60 giay nghia la mot tai khoan vua bi tat
 * van dang nhap duoc.
 */
export const ADMIN_DATASET = 'admin'

export const adminClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'placeholder',
  dataset: ADMIN_DATASET,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  perspective: 'published',
})

/**
 * Da du dieu kien de chay he thong dang nhap chua.
 *
 * Tra ve danh sach thieu chu khong phai mot boolean: khi trang dang nhap tu
 * choi phuc vu, nguoi van hanh can biet **thieu cai gi**, khong phai mot chu
 * "chua cau hinh" giong het nhau cho bon nguyen nhan khac han nhau — dung bai
 * hoc da rut ra voi GA4 va Search Console.
 */
export function missingAuthConfig(): string[] {
  const missing: string[] = []
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) missing.push('NEXT_PUBLIC_SANITY_PROJECT_ID')
  if (!process.env.SANITY_API_TOKEN) missing.push('SANITY_API_TOKEN')
  if (!process.env.AUTH_SECRET) missing.push('AUTH_SECRET')
  if (!process.env.AUTH_PEPPER) missing.push('AUTH_PEPPER')
  return missing
}
