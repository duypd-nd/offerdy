/**
 * Da du dieu kien de chay he thong dang nhap chua.
 *
 * Tra ve DANH SACH THIEU chu khong phai mot boolean: khi trang dang nhap tu choi
 * phuc vu, nguoi van hanh can biet **thieu cai gi**. Mot chu "chua cau hinh"
 * giong het nhau cho bon nguyen nhan khac han nhau la dung loi da tra hoc phi
 * hai lan roi — voi GA4 va voi Search Console.
 */
export function missingAuthConfig(): string[] {
  const missing: string[] = []
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID) missing.push('NEXT_PUBLIC_SANITY_PROJECT_ID')
  if (!process.env.SANITY_API_TOKEN) missing.push('SANITY_API_TOKEN')
  if (!process.env.AUTH_SECRET) missing.push('AUTH_SECRET')
  if (!process.env.AUTH_PEPPER) missing.push('AUTH_PEPPER')
  return missing
}
