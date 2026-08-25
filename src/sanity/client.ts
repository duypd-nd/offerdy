import { createClient } from 'next-sanity'

export const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'placeholder',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

/**
 * Ban doc KHONG qua CDN. Dung cho nhung thu phai dung ngay sau khi ghi.
 *
 * ⚠️ Do 2026-08-25: doi ten website xong, `readClient` (useCdn: true) con tra ten
 * CU them ~40 giay. Rieng no thi khong sao — nhung `getSiteName()` boc ngoai mot
 * lop `unstable_cache` 300s, nen mot request roi dung vao khe do se **uop ten cu
 * lai 5 phut**, du `saveConfigDoc` da goi `revalidatePath` dung. Bam Luu roi tai
 * lai trang thay ten cu la dung ho lo do.
 *
 * Khong kem token: dataset `production` la PUBLIC, doc duoc khong can token —
 * va nho vay ham nay dung duoc o moi runtime, khong phu thuoc bien moi truong.
 */
export const freshClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'placeholder',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
})

export function isConfigured() {
  return !!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.NEXT_PUBLIC_SANITY_PROJECT_ID !== 'placeholder'
}
