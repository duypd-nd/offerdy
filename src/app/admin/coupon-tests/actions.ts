'use server'

import { writeClient } from '@/sanity/writeClient'
import { revalidatePath } from 'next/cache'

/**
 * Ghi ket qua mot lan thu ma that o quay thanh toan.
 *
 * ⚠️ `codeTestedAt` do MAY CHU dat, khong nhan tu client. Ngay thang o day la
 * mot khang dinh cong khai ("chung toi da thu ngay 4/8"), nen no phai la thoi
 * diem thao tac that su xay ra chu khong phai mot gia tri go duoc.
 *
 * ⚠️ Xoa ket qua thi phai gui `null` chu khong phai `undefined` — Next BO cac
 * khoa `undefined` khi tuan tu hoa payload cua server action, nen truong se
 * khong bao gio duoc xoa. Da mat mot lan vi bay nay roi.
 */
export async function saveCodeTest(
  offerId: string,
  input: { result: 'worked' | 'partial' | 'rejected'; note: string },
) {
  const note = input.note.trim()
  const tx = writeClient.patch(offerId).set({
    codeTestedAt: new Date().toISOString(),
    codeTestResult: input.result,
    ...(note ? { codeTestNote: note } : {}),
  })
  await (note ? tx : tx.unset(['codeTestNote'])).commit()
  revalidateSurfaces()
}

/** Go ket qua thu — dung khi bam nham, de offer quay ve trang thai "chua thu". */
export async function clearCodeTest(offerId: string) {
  await writeClient.patch(offerId).unset(['codeTestedAt', 'codeTestResult', 'codeTestNote']).commit()
  revalidateSurfaces()
}

function revalidateSurfaces() {
  revalidatePath('/admin/coupon-tests')
  // Hai duong cong khai doc ba truong nay — xem OFFERS_BY_STORE_QUERY va
  // COUPON_OFFERS_QUERY. Bo sot mot cho la ket qua vua nhap khong hien ra.
  revalidatePath('/stores/[slug]', 'page')
  revalidatePath('/coupon-codes')
}
