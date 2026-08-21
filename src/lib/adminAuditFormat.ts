import { ADMIN_TIMEZONE } from '@/lib/adminDateTime'
import type { AdminRole } from '@/lib/adminAuth'

/**
 * Phan THUAN cua nhat ky thao tac: kieu du lieu, cach chia ngay, va chu hien ra
 * man hinh.
 *
 * ⚠️ Tach khoi `adminAudit.ts` co chu dich. File kia noi chuyen voi Sanity va
 * doc cookie (`next/headers`), nen no khong nap duoc ngoai Next — keo theo la
 * nhung ham thuan nam cung file cung khong test duoc. Day la cung mot ly do
 * khien `adminAuth.ts` co y khong import gi ngoai `node:crypto`.
 */

export type AuditActorRole = AdminRole | 'system' | 'unknown'

export type AuditEntry = {
  /** ISO */
  at: string
  /** id tai khoan; rong khi la he thong (cron) */
  actorId: string
  actorRole: AuditActorRole
  /** Ma hanh dong, dang `doi-tuong.viec` — vi du `user.role`, `offer.delete` */
  action: string
  /** id hoac slug cua ban ghi bi tac dong */
  target?: string
  /** Mot dong nguoi doc hieu duoc, khong chua bi mat */
  label?: string
}

export type AuditRow = AuditEntry & {
  /** Doi chieu tu kho luc doc; `null` khi tai khoan da bi xoa */
  actorEmail: string | null
}

export type AuditActor = { id: string; role: AuditActorRole }

/** He thong (cron) — khong co ai bam nut. */
export const SYSTEM_ACTOR: AuditActor = { id: '', role: 'system' }

/**
 * Ngay theo GIO VN, dang `YYYY-MM-DD`.
 *
 * ⚠️ Hai dieu kien, ca hai deu tung lam hong thu gi do trong du an nay:
 *
 * 1. **Gio VN, khong phai UTC.** Chia theo ngay UTC thi moi thao tac tu 00:00
 *    den 07:00 gio VN roi vao tai lieu cua HOM QUA — mo nhat ky buoi sang se
 *    khong thay viec minh vua lam.
 * 2. **`YYYY-MM-DD` sap xep duoc bang so sanh chuoi.** `readAuditLog` loc bang
 *    `day >= $from` con `pruneAuditLog` bang `day < $cutoff`; ca hai la so sanh
 *    CHUOI trong GROQ. Doi sang `DD/MM/YYYY` la don nham nam khac.
 */
export function auditDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ADMIN_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

/**
 * Chu tieng Viet cho tung ma hanh dong.
 *
 * ⚠️ Ma khong co trong bang van phai hien duoc — tra ve chinh ma con hon tra ve
 * chuoi rong. Mot muc nhat ky khong doc duoc van la bang chung rang co viec gi
 * do da xay ra; nuot no di la mat luon bang chung.
 */
const ACTION_LABEL: Record<string, string> = {
  'login.ok': 'Đăng nhập',
  'login.fail': 'Đăng nhập thất bại',
  'logout': 'Đăng xuất',
  'user.create': 'Tạo tài khoản',
  'user.role': 'Đổi vai',
  'user.enable': 'Bật lại tài khoản',
  'user.disable': 'Vô hiệu hoá tài khoản',
  'user.password': 'Đổi mật khẩu',
  'user.delete': 'Xoá tài khoản',
  'store.delete': 'Xoá store',
  'offer.delete': 'Xoá offer',
  'offer.bulkDelete': 'Xoá hàng loạt offer',
  'deal.delete': 'Xoá deal',
  'post.delete': 'Xoá bài viết',
  'review.delete': 'Xoá review',
  'page.delete': 'Xoá trang',
  'category.delete': 'Xoá danh mục',
  'comparison.delete': 'Xoá bài so sánh',
  'tipsguide.delete': 'Xoá tips & guides',
  'flashsale.delete': 'Xoá flash sale',
  'couponcode.delete': 'Xoá mã coupon',
  'couponalert.delete': 'Xoá cảnh báo coupon',
}

export const actionLabel = (action: string): string => ACTION_LABEL[action] ?? action
