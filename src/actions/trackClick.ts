'use server'

import { writeClient } from '@/sanity/writeClient'

export async function trackOfferClick(offerId: string): Promise<void> {
  await writeClient.patch(offerId).setIfMissing({ clicks: 0 }).inc({ clicks: 1 }).commit()
}

export async function trackStoreClick(storeId: string): Promise<void> {
  await writeClient.patch(storeId).setIfMissing({ clicks: 0 }).inc({ clicks: 1 }).commit()
}
