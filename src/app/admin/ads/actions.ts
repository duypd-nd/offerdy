'use server'

import { revalidatePath } from 'next/cache'
import { writeClient } from '@/sanity/writeClient'
import { requireAdmin } from '@/lib/adminSession'
import { recordAudit } from '@/lib/adminAudit'
import { parseCampaign } from '@/lib/shortLinkSource'
import { coDuocChayQuangCaoStore } from '@/lib/adPerformance'

/**
 * ⚠️ Module 'use server' chi duoc export ham async — Next 16 tu choi build neu co
 * mot hang so duoc export o day. Moi thu khong phai hanh dong deu phai nam noi khac.
 */

type KetQua = { ok: true } | { ok: false; error: string }

/** Luu hai o gia dinh toan cuc. */
export async function luuGiaDinh(
  estimatedOrderRate: number | null,
  fallbackEarningsPerOrder: number | null,
  tyGiaVndPerUsd: number | null
): Promise<KetQua> {
  await requireAdmin()

  // O trong -> unset, khong phai set 0. Payload cua server action ma hoa
  // `undefined` thanh `null` khi di qua ranh gioi, nen phai bat ca hai — bay da
  // ghi trong `updateStore`.
  const set: Record<string, unknown> = {}
  const unset: string[] = []
  for (const [k, v] of Object.entries({ estimatedOrderRate, fallbackEarningsPerOrder, tyGiaVndPerUsd })) {
    if (v === null || v === undefined) unset.push(k)
    else set[k] = v
  }

  try {
    let patch = writeClient.patch('configAds')
    if (Object.keys(set).length) patch = patch.set(set)
    if (unset.length) patch = patch.unset(unset)
    await writeClient
      .createIfNotExists({ _id: 'configAds', _type: 'configAds' })
      .then(() => patch.commit())

    await recordAudit({ action: 'ads.assumptions', target: 'configAds', label: `tỉ lệ đơn ${estimatedOrderRate ?? '—'}%` })
    revalidatePath('/admin/ads')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Bat mot chien dich sang "dang chay".
 *
 * ⚠️ HANG RAO DIEU KHOAN PPC CHAN O DAY, phia server — khong chi o giao dien.
 * Giao dien la thu nguoi ta sua duoc. Vi pham dieu khoan PPC cua merchant thuong
 * dan toi cham dut chuong trinh VA mat phan hoa hong da tich, nen `unknown` bi
 * TU CHOI chu khong duoc coi la "chac la duoc".
 */
export async function doiTrangThai(id: string, status: 'draft' | 'active' | 'paused'): Promise<KetQua> {
  await requireAdmin()

  try {
    if (status === 'active') {
      const c = await writeClient.fetch<{ destinationType?: string; allows?: string; name?: string } | null>(
        `*[_type == "adCampaign" && _id == $id][0]{
          destinationType, name, "allows": destinationStore->allowsPaidTraffic
        }`,
        { id }, { cache: 'no-store' }
      )
      if (!c) return { ok: false, error: 'Không tìm thấy chiến dịch' }

      if (c.destinationType === 'store') {
        const { duoc, canhBao } = coDuocChayQuangCaoStore(c.allows)
        if (!duoc) return { ok: false, error: canhBao ?? 'Store này chưa được phép chạy quảng cáo trả tiền.' }
      }
    }

    await writeClient.patch(id).set({ status }).commit()
    await recordAudit({ action: 'ads.status', target: id, label: status })
    revalidatePath('/admin/ads')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export type ChiTieuMoi = {
  campaignId: string
  date: string
  /** Con so nguoi van hanh go — CHUA quy doi. */
  cost: number
  /** Don vi cua `cost`. Tai khoan Google Ads cua Offerdy bao bang VND. */
  donVi: 'usd' | 'vnd'
  /** Bat buoc khi `donVi === 'vnd'`. */
  tyGia: number | null
  adClicks: number | null
  impressions: number | null
}

/**
 * Ghi chi tieu mot ngay.
 *
 * Nhap lai cung mot ngay thi GHI DE chu khong cong don: nguoi van hanh doc lai
 * so tu Google Ads va go lai la chuyen binh thuong, con cong don se lam so phong
 * len ma khong ai nhan ra. Dung `_id` tat dinh de Sanity tu lo viec do.
 */
export async function ghiChiTieu(input: ChiTieuMoi): Promise<KetQua> {
  await requireAdmin()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: 'Ngày phải dạng YYYY-MM-DD' }
  if (!Number.isFinite(input.cost) || input.cost < 0) return { ok: false, error: 'Chi phí không hợp lệ' }

  // Quy doi ve USD o SERVER, khong tin con so client gui len da quy doi san:
  // client la thu nguoi ta sua duoc, va mot ty gia sai o day lam lech moi phan
  // quyet tang/giu/dung ma khong co dau hieu gi.
  let costUsd = input.cost
  if (input.donVi === 'vnd') {
    if (!input.tyGia || !Number.isFinite(input.tyGia) || input.tyGia <= 0) {
      return { ok: false, error: 'Nhập bằng VNĐ thì phải có tỉ giá — điền ô "1 USD = ? VNĐ" ở đầu trang.' }
    }
    costUsd = input.cost / input.tyGia
  }

  try {
    const c = await writeClient.fetch<{ campaignTag?: string } | null>(
      `*[_type == "adCampaign" && _id == $id][0]{ campaignTag }`,
      { id: input.campaignId }, { cache: 'no-store' }
    )
    // Chep nhan tu chien dich chu KHONG nhan tu client: nhan la soi day duy nhat
    // noi chi tieu voi ket qua, de client dat la de mot cho lech vao so lieu.
    const tag = parseCampaign(c?.campaignTag ?? null)
    if (!tag) return { ok: false, error: 'Chiến dịch chưa có nhãn ?s= hợp lệ' }

    const _id = `adSpend.${tag}.${input.date}`
    await writeClient.createOrReplace({
      _id,
      _type: 'adSpendEntry',
      campaign: { _type: 'reference', _ref: input.campaignId, _weak: true },
      campaignTag: tag,
      date: input.date,
      cost: costUsd,
      costNhapVao: input.cost,
      donViNhap: input.donVi,
      ...(input.donVi === 'vnd' && input.tyGia ? { tyGia: input.tyGia } : {}),
      ...(input.adClicks != null ? { adClicks: input.adClicks } : {}),
      ...(input.impressions != null ? { impressions: input.impressions } : {}),
    })

    await recordAudit({
      action: 'ads.spend',
      target: _id,
      label: `${input.date} · ${input.donVi === 'vnd' ? `${input.cost}đ` : `$${input.cost}`} → $${costUsd.toFixed(2)}`,
    })
    revalidatePath('/admin/ads')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
