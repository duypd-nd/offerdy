'use server'

import { writeClient } from '@/sanity/writeClient'

export async function voteOffer(id: string, type: 'active' | 'expired'): Promise<void> {
  const field = type === 'active' ? 'votesActive' : 'votesExpired'
  await writeClient
    .patch(id)
    .setIfMissing({ votesActive: 0, votesExpired: 0 })
    .inc({ [field]: 1 })
    .commit()
}
