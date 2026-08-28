import { earningsPerOrder } from './adPlanner'

/**
 * "Chien dich nay nen tang, giu, hay dung?" — va quan trong hon: "da du so lieu
 * de noi gi chua?"
 *
 * ⚠️ DIEU DAU TIEN PHAI HIEU: o day KHONG CO LOI NHUAN. Doanh thu affiliate that
 * nam ben GoAffPro va site khong nhin thay (xem `/admin/reports`). Thu do duoc
 * chi la CHI PHI cho mot LUOT BAM SANG MERCHANT. Moi con so tra ve deu la chi
 * phi va nguong, khong bao gio la lai. Giao dien phai noi ro dieu do — in mot
 * con so "lai" o day la bia (luat 2).
 *
 * ⚠️ DIEU THU HAI: nen dem cua site nay rat thua — 56 luot bam sang merchant ca
 * doi, 21 trong 30 ngay (do 28/08/2026). Mot chien dich ra 3 luot bam KHONG phan
 * biet duoc tot voi xau. Nen `chua-du-so-lieu` la cau tra loi MAC DINH va no la
 * cau tra loi DUNG, khong phai thieu sot. Day la luat 8c cua du an duoc dat
 * thang vao code: mot phep do khong phan biet duoc "hong" voi "chua xay ra" thi
 * chua noi duoc gi.
 */

export type AdVerdict = 'tang' | 'giu' | 'dung' | 'chua-du-so-lieu'

export type AdPerformanceInput = {
  /** USD da tieu, cong don ca ky. */
  cost: number
  /** Luot bam SANG MERCHANT do site dem (tai lieu `click` gom theo `campaign`). */
  merchantClicks: number
  /** USD mot luot bam sang merchant dang gia — xem `valuePerMerchantClick()`. */
  valuePerMerchantClick: number
}

export type AdPerformanceResult = {
  /** USD tren mot luot bam sang merchant. `null` khi chua co luot nao. */
  costPerMerchantClick: number | null
  valuePerMerchantClick: number
  verdict: AdVerdict
  /** Cau giai thich cho nguoi van hanh doc, tieng Viet. */
  reason: string
}

/**
 * Bao nhieu luot bam sang merchant thi moi dam ket luan.
 *
 * 25 khong phai con so thieng: no la muc ma mot ty le uoc luong bat dau bot dao
 * dong. Voi nen 21 luot/30 ngay hien nay, phan lon chien dich se nam o
 * `chua-du-so-lieu` kha lau — dung nhu vay.
 */
export const MIN_MERCHANT_CLICKS = 25

/**
 * ⚠️ NGOAI LE CO CHU DICH: khong co click nao VAN la thong tin, neu da tieu du.
 *
 * Neu chi phi da bang 3 lan gia tri mot luot bam ma van 0 luot, thi theo phan
 * phoi Poisson voi λ=3, xac suat thay 0 luot la ~5%. Tuc la gan nhu chac chan
 * chien dich nay dang duoi diem hoa von — du chua dat MIN_MERCHANT_CLICKS.
 *
 * Bat doi xung nay la co y: cho phep DUNG som (sai thi mat co hoi), khong cho
 * phep TANG som (sai thi mat tien).
 */
const BOI_SO_TIEU_KHONG_RA_GI = 3

/** Duoi muc nay so voi nguong hoa von thi moi dang tang tien. */
const NGUONG_TANG = 0.5

/**
 * Doi mot luot bam sang merchant ra USD.
 *
 * `tiLeDonUocTinh` la GIA DINH, va la gia dinh DUY NHAT trong ca he thong — vi
 * the no phai do nguoi van hanh dat va nhin thay, khong duoc chon dau trong code.
 * Nguoi ta khong biet bao nhieu phan tram khach bam sang merchant se mua that;
 * chi co GoAffPro biet, va no khong noi.
 *
 * Tra `null` khi thieu du lieu chu KHONG phai 0 — dung tien le da ghi trong
 * `adPlanner.ts`: mot bang hien "0" cho shop chua khai se bi doc thanh "shop nay
 * re nhat", tuc dung nguoc han su that.
 */
export function valuePerMerchantClick(
  commissionRate: number | null | undefined,
  avgOrderValue: number | null | undefined,
  tiLeDonUocTinh: number | null | undefined
): number | null {
  const earnings = earningsPerOrder(commissionRate, avgOrderValue)
  if (earnings == null) return null
  if (tiLeDonUocTinh == null || !Number.isFinite(tiLeDonUocTinh)) return null
  if (tiLeDonUocTinh <= 0 || tiLeDonUocTinh > 1) return null

  const value = earnings * tiLeDonUocTinh
  return value > 0 ? value : null
}

const usd = (n: number) => `$${n.toFixed(2)}`

export function assessCampaign(input: AdPerformanceInput): AdPerformanceResult | null {
  const { cost, merchantClicks, valuePerMerchantClick: value } = input

  if (!Number.isFinite(cost) || cost < 0) return null
  if (!Number.isInteger(merchantClicks) || merchantClicks < 0) return null
  if (!Number.isFinite(value) || value <= 0) return null

  const costPerMerchantClick = merchantClicks > 0 ? cost / merchantClicks : null

  // Chua tieu dong nao thi khong co gi de danh gia — ke ca khi da co click.
  if (cost === 0) {
    return {
      costPerMerchantClick, valuePerMerchantClick: value, verdict: 'chua-du-so-lieu',
      reason: 'Chưa nhập chi phí ngày nào — không có gì để đánh giá.',
    }
  }

  if (merchantClicks === 0) {
    if (cost >= value * BOI_SO_TIEU_KHONG_RA_GI) {
      return {
        costPerMerchantClick, valuePerMerchantClick: value, verdict: 'dung',
        reason:
          `Đã tiêu ${usd(cost)} mà chưa có lượt bấm sang merchant nào. ` +
          `Ở mức hoà vốn ${usd(value)}/lượt thì lẽ ra đã phải có khoảng ` +
          `${BOI_SO_TIEU_KHONG_RA_GI} lượt — xác suất thấy 0 lượt chỉ ~5%.`,
      }
    }
    return {
      costPerMerchantClick, valuePerMerchantClick: value, verdict: 'chua-du-so-lieu',
      reason:
        `Chưa có lượt bấm sang merchant, nhưng mới tiêu ${usd(cost)} — ` +
        `chưa đủ để kết luận. Cần tới ${usd(value * BOI_SO_TIEU_KHONG_RA_GI)} mới nói được gì.`,
    }
  }

  const cpmc = costPerMerchantClick as number

  // Lo ro rang thi dung ngay, khong cho du mau: cho them chi de mat them tien.
  if (cpmc > value) {
    return {
      costPerMerchantClick, valuePerMerchantClick: value, verdict: 'dung',
      reason:
        `${usd(cpmc)} cho mỗi lượt bấm sang merchant, trong khi ngưỡng hoà vốn là ` +
        `${usd(value)}. Đang lỗ ở mọi lượt.`,
    }
  }

  // Duoi nguong nhung mau con mong -> chua duoc phep tang tien.
  if (merchantClicks < MIN_MERCHANT_CLICKS) {
    return {
      costPerMerchantClick, valuePerMerchantClick: value, verdict: 'chua-du-so-lieu',
      reason:
        `${usd(cpmc)}/lượt, dưới ngưỡng hoà vốn ${usd(value)} — nhưng mới ` +
        `${merchantClicks}/${MIN_MERCHANT_CLICKS} lượt bấm. Chưa đủ để tin, đừng tăng tiền vội.`,
    }
  }

  if (cpmc <= value * NGUONG_TANG) {
    return {
      costPerMerchantClick, valuePerMerchantClick: value, verdict: 'tang',
      reason:
        `${usd(cpmc)}/lượt, chưa tới nửa ngưỡng hoà vốn ${usd(value)}, ` +
        `trên ${merchantClicks} lượt bấm. Còn dư địa để tăng ngân sách.`,
    }
  }

  return {
    costPerMerchantClick, valuePerMerchantClick: value, verdict: 'giu',
    reason:
      `${usd(cpmc)}/lượt so với ngưỡng ${usd(value)}, trên ${merchantClicks} lượt bấm. ` +
      `Có lãi nhưng biên mỏng — giữ nguyên, đừng tăng.`,
  }
}

/**
 * Store nay co duoc chay quang cao khong.
 *
 * Gia tri chep tu `sanity/schemaTypes/store.ts` (`allowsPaidTraffic`) — KHONG go
 * lai theo tri nho (luat 8b). Bon gia tri that: `unknown` | `yes` |
 * `brand_excluded` | `no`.
 *
 * ⚠️ `unknown` bi CHAN chu khong duoc coi la "chac la duoc". Vi pham dieu khoan
 * PPC thuong dan toi cham dut chuong trinh VA mat phan hoa hong da tich — mac
 * dinh phai la tu choi. Chinh schema da ghi ly do do.
 */
export function coDuocChayQuangCaoStore(allowsPaidTraffic: string | null | undefined): {
  duoc: boolean
  canhBao?: string
} {
  switch (allowsPaidTraffic) {
    case 'yes':
      return { duoc: true }
    case 'brand_excluded':
      return {
        duoc: true,
        canhBao: 'Shop này cấm đấu từ khoá thương hiệu — loại tên shop khỏi từ khoá trước khi chạy.',
      }
    case 'no':
      return { duoc: false, canhBao: 'Shop này KHÔNG cho chạy quảng cáo trả tiền.' }
    default:
      return {
        duoc: false,
        canhBao: 'Chưa xác minh điều khoản PPC của shop này. Đọc điều khoản affiliate rồi khai ở /admin/ad-planner.',
      }
  }
}
