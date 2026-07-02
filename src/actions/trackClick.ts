'use server'

import { writeClient } from '@/sanity/writeClient'

export async function trackOfferClick(offerId: string): Promise<void> {
  await Promise.all([
    writeClient.patch(offerId).setIfMissing({ clicks: 0 }).inc({ clicks: 1 }).commit(),
    writeClient.create({ _type: 'click', offer: { _type: 'reference', _ref: offerId } }),
  ])
}

export async function trackStoreClick(storeId: string): Promise<void> {
  await Promise.all([
    writeClient.patch(storeId).setIfMissing({ clicks: 0 }).inc({ clicks: 1 }).commit(),
    writeClient.create({ _type: 'click', store: { _type: 'reference', _ref: storeId } }),
  ])
}
