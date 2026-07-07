'use client'

import { useSearchParams } from 'next/navigation'
import { parsePage } from '@/lib/adminPagination'

export function useUrlPage() {
  const searchParams = useSearchParams()
  return parsePage(searchParams.get('page') ?? undefined)
}
