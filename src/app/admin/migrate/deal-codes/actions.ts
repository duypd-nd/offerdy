'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'
import { nextDealCode } from '@/sanity/queries'

export type AssignResult = {
  assigned: { title: string; code: number }[]
  alreadyHad: number
  error?: string
}

/**
 * Cap ma san pham cho cac deal chua co (deal tao truoc khi co field `code`).
 *
 * An toan khi chay lai nhieu lan: chi cham deal !defined(code), deal da co ma
 * khong bao gio bi doi — ma da nam trong caption bai dang cu, doi la link chet.
 * Thu tu _createdAt asc de deal cu nhat lay #1000: so nho = deal lau nam.
 *
 * La server action chu khong phai chay trong render cua page: Next 16 chan
 * revalidatePath() trong luc render ("must always happen outside of renders"),
 * va ghi du lieu tren GET thi mo tab la mutate — bam nut moi mutate ro rang hon.
 */
export async function assignDealCodes(): Promise<AssignResult> {
  try {
    const [missing, alreadyHad] = await Promise.all([
      writeClient.fetch<{ _id: string; title: string }[]>(
        `*[_type == "deal" && !defined(code)] | order(_createdAt asc){ _id, title }`
      ),
      writeClient.fetch<number>(`count(*[_type == "deal" && defined(code)])`),
    ])

    const assigned: { title: string; code: number }[] = []
    let code = await nextDealCode()
    for (const deal of missing) {
      await writeClient.patch(deal._id).set({ code }).commit()
      assigned.push({ title: deal.title, code })
      code++
    }

    if (assigned.length) {
      revalidatePath('/links')
      revalidatePath('/deals')
      revalidatePath('/deals/[slug]', 'page')
      revalidatePath('/admin/deals')
    }

    return { assigned, alreadyHad: alreadyHad ?? 0 }
  } catch (e) {
    return { assigned: [], alreadyHad: 0, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
