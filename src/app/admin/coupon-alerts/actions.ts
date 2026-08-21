'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'
import { recordAudit, describeDoc } from '@/lib/adminAudit'

export async function deleteCouponAlert(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const label = await describeDoc(id)
    await writeClient.delete(id)
    await recordAudit({ action: 'couponalert.delete', target: id, label })
    revalidatePath('/admin/coupon-alerts')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
