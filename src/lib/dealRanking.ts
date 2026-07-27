import type { Deal } from '@/data/deals'

/**
 * Xep thu tu deal tren /links theo hieu qua THAT.
 *
 * Bai toan: /links chi co 50 o hien ngay, va do la vi tri dat nhat cua site (bio
 * Instagram/TikTok tro co dinh vao day). Mot san pham nhieu luot xem ma khong ai
 * bam sang merchant dang chiem cho cua san pham ban duoc.
 *
 * Nhung khong the sap don gian theo ty le chuyen doi: deal moi co 1 luot xem / 1
 * luot bam se ra 100% va nhay len dau, con deal that su tot voi 200/40 (20%) bi
 * day xuong. Nen dung LAM MIN BAYES — keo ty le cua tung deal ve phia trung binh
 * toan site, keo manh khi mau nho va nha dan khi mau lon:
 *
 *   diem = (bam + trungBinh * K) / (xem + K)
 *
 * K = so luot xem "ao" mang ty le trung binh. K = 10 nghia la phai co khoang 10
 * luot xem that thi so lieu rieng cua deal moi bat dau thang duoc mac dinh.
 *
 * He qua quan trong: deal chua co du lieu (xem = 0) nhan dung diem trung binh —
 * nam GIUA, khong bi phat vi moi. Deal chung minh duoc tot noi len tren no, deal
 * chung minh duoc te chim xuong duoi. Khi ca site chua co du lieu gi thi moi deal
 * cung diem, va sort on dinh giu nguyen thu tu goc (moi nhat truoc).
 */
const SMOOTHING = 10

/**
 * Mau so cua ty le: so lan san pham duoc NHIN THAY.
 *
 * Khong dung thang `shortLinkClicks`, vi co duong vao KHONG sinh ra luot mo nao:
 * /g/<ma> di thang ra merchant, va nut "Get Deal" tren trang deal co the duoc bam
 * boi khach den tu Google. Nhung deal do co `dealClicks > 0` va `shortLinkClicks
 * = 0` -> chia cho 0, diem bi thoi len vo ly (da gap khi test: mot deal 1 bam / 0
 * xem nhay len tren mot deal 1 bam / 1 xem).
 *
 * Mot luot bam luon keo theo it nhat mot luot nhin, nen `max(xem, bam)` la can
 * duoi dung cho so lan nhin thay — va no khien ty le khong bao gio vuot 100%.
 */
function exposures(d: Deal): number {
  return Math.max(d.shortLinkClicks ?? 0, d.dealClicks ?? 0)
}

/** Ty le chuyen doi trung binh toan site; khong co du lieu thi tra ve null. */
function siteConversionRate(deals: Deal[]): number | null {
  let seen = 0
  let clicks = 0
  for (const d of deals) {
    seen += exposures(d)
    clicks += d.dealClicks ?? 0
  }
  return seen > 0 ? clicks / seen : null
}

/**
 * Ghim truoc (ghim sau nam tren ghim truoc), roi den diem hieu qua.
 *
 * Ghim luon thang diem so: no la lua chon co y cua nguoi dang bai ("hom nay toi
 * dang ve mon nay"), va du lieu hieu qua khong the biet dieu do.
 *
 * KHONG sap trong GROQ: /deals dung chung ALL_DEALS_QUERY va co y giu thu tu
 * moi-nhat-truoc. Sap o day, tren 21 deal, la mien phi.
 */
export function rankDealsForLinks(deals: Deal[]): Deal[] {
  const avg = siteConversionRate(deals)

  const score = (d: Deal): number => {
    if (avg === null) return 0                    // ca site chua co du lieu -> hoa
    return ((d.dealClicks ?? 0) + avg * SMOOTHING) / (exposures(d) + SMOOTHING)
  }

  // Array.prototype.sort on dinh (bat buoc theo spec tu ES2019), nen deal cung
  // diem giu nguyen thu tu tu ALL_DEALS_QUERY (moi nhat truoc).
  return [...deals].sort((a, b) => {
    if (a.pinnedAt && b.pinnedAt) return b.pinnedAt.localeCompare(a.pinnedAt)
    if (a.pinnedAt) return -1
    if (b.pinnedAt) return 1
    return score(b) - score(a)
  })
}
