/**
 * Chon MOT nhan tin cay de hien tren the offer.
 *
 * Boi canh: nhan "✓ Verified" cu la mot khang dinh khong co gi chong lung —
 * `verified` mac dinh true nen moi offer deu co no. Ca nganh coupon do duoc
 * **26,2% ma bi tu choi o quay thanh toan** (78,8 trieu luot thu that) va
 * **87,6% phieu binh chon cua nguoi dung la phieu che**: nguoi mua den noi da
 * san sang cho ma hong. Voi ho, mot nhan khong ngay thang khong noi len dieu gi.
 *
 * Nen thu tu uu tien o day la thu tu do MANH cua bang chung:
 *
 *   1. Da thu that o quay thanh toan  -> manh nhat, va la thu doi thu khong chep duoc
 *   2. Cron kiem link con song        -> yeu hon nhieu, nhung that va tu dong
 *   3. Khong co gi                    -> khong hien nhan nao
 *
 * ⚠️ Hai muc dau KHONG duoc dung chung mot cach dien dat. Cron chua bao gio ap
 * ma vao gio hang; goi no la "code tested" la hua mot viec chua lam. Ca du an
 * nay giu dung mot ranh gioi do o moi cho hien ma (xem hop coupon trang review).
 *
 * ⚠️ Ket qua "bi tu choi" VAN duoc hien. Giau di thi tiet kiem duoc mot cu bam
 * hom nay va mat nguoi doc mai mai — va chinh su thang than do la thu phan biet
 * trang song voi trang rac trong nganh nay.
 */

export type OfferTrustInput = {
  /** Thoi diem NGUOI THAT mang ma di ap vao gio hang. Chi dien tay. */
  codeTestedAt?: string
  /** 'worked' | 'partial' | 'rejected' */
  codeTestResult?: string
  /** Quan sat duoc gi, vi du "giam 10%, khong yeu cau don toi thieu". */
  codeTestNote?: string
  /** Lan cuoi cron dem kiem link con song. Khong phai thu ma. */
  linkCheckedAt?: string
}

export type OfferTrustBadge = {
  /** Dung de chon mau/icon o tang giao dien. */
  tone: 'strong' | 'warn' | 'quiet'
  /** Dong chinh, vi du "Tested Aug 4". */
  label: string
  /** Cau mo ta ket qua, chi co khi da thu tay va co ghi chu. */
  detail?: string
  /** Cau giai thich pham vi cua khang dinh, dung cho thuoc tinh title. */
  title: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * "2026-08-04T09:12:00Z" -> "Aug 4", doc thang/ngay TRUC TIEP tu chuoi ISO.
 *
 * ⚠️ Co y khong dung `new Date().toLocaleDateString()`: ham do doi theo mui gio
 * cua may dang chay. Server render o UTC con trinh duyet khach o gio dia phuong,
 * nen mot moc gan nua dem cho ra hai ngay khac nhau -> hydration mismatch, va
 * hon nua la hai nguoi doc cung mot trang thay hai ngay khac nhau. Du an nay da
 * mat 7 tieng mot lan vi mui gio roi (xem src/lib/adminDateTime.ts).
 */
export function fmtDayUtc(iso?: string): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  const month = MONTHS[Number(m[2]) - 1]
  if (!month) return null
  return `${month} ${Number(m[3])}`
}

export function offerTrustBadge(offer: OfferTrustInput): OfferTrustBadge | null {
  const testedOn = fmtDayUtc(offer.codeTestedAt)

  // Da thu tay: bang chung manh nhat. Chi tin khi CO ngay — mot ket qua khong
  // ngay thang thi khong hon gi nhan "Verified" tran.
  if (testedOn) {
    const note = offer.codeTestNote?.trim() || undefined
    if (offer.codeTestResult === 'rejected') {
      return {
        tone: 'warn',
        label: `Didn't work on ${testedOn}`,
        detail: note,
        title: 'We entered this code at checkout ourselves and it was rejected.',
      }
    }
    return {
      tone: 'strong',
      label: `Tested ${testedOn}`,
      detail: note,
      title: 'We entered this code at the store checkout ourselves on this date.',
    }
  }

  // Chua thu tay -> lui ve du lieu cron. Noi dung pham vi, khong ngu y hon.
  const checkedOn = fmtDayUtc(offer.linkCheckedAt)
  if (checkedOn) {
    return {
      tone: 'quiet',
      label: `Link checked ${checkedOn}`,
      title: 'We check every outbound link nightly. This is the link check date — not a checkout test of the code.',
    }
  }

  return null
}
