import { writeClient } from '@/sanity/writeClient'
import MigrateDealCodesClient from './MigrateClient'

export const dynamic = 'force-dynamic'

// Trang chi DOC so lieu; viec cap ma nam trong server action assignDealCodes()
// (xem ./actions.ts) va chi chay khi bam nut.
export default async function MigrateDealCodesPage() {
  const counts = await writeClient.fetch<{ missing: number; withCode: number }>(
    `{ "missing": count(*[_type == "deal" && !defined(code)]), "withCode": count(*[_type == "deal" && defined(code)]) }`
  )
  return <MigrateDealCodesClient missingCount={counts?.missing ?? 0} withCode={counts?.withCode ?? 0} />
}
