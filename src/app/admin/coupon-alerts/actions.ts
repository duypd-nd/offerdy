'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'

export async function deleteCouponAlert(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await writeClient.delete(id)
    revalidatePath('/admin/coupon-alerts')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
