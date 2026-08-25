import * as Sentry from '@sentry/nextjs'
import { getSiteName } from '@/sanity/queries'
import { writeClient } from '@/sanity/writeClient'
import { verifyCronRequest } from '@/lib/cronAuth'
import { generateStoreContent, type StoreContentInput } from '@/lib/ai/generateStoreContent'
import { generateOfferContent, type OfferContentInput } from '@/lib/ai/generateOfferContent'
import { generateDealContent, type DealContentInput } from '@/lib/ai/generateDealContent'

/**
 * ⚠️ KHONG DUOC BO DONG NAY.
 *
 * Mac dinh cua Vercel cho Node function ngan hon han thoi gian route nay can:
 * moi muc la mot luot goi Anthropic (~3-8 giay), va mot dem co the co hang chuc
 * muc. Het gio thi function bi giet GIUA CHUNG — khong exception, khong log loi,
 * chi la mot request bi cat.
 *
 * Do ngay 2026-08-04: `aiDraft` VANG MAT tren TOAN BO dataset (0 offer, 0 store,
 * 0 deal) du cron da khai bao trong vercel.json tu lau, bo loc GROQ khop dung 103
 * offer, va ca CRON_SECRET lan ANTHROPIC_API_KEY deu chay tot tren production
 * (daily-report sinh duoc bang chinh hai khoa do). Nghia la route nay chua bao gio
 * ra ket qua, suot ca thang, ma khong ai biet.
 */
export const maxDuration = 60

/**
 * Ngan sach thoi gian, dat THAP hon maxDuration.
 *
 * Day moi la thu thay doi hanh vi, khong phai `maxDuration`. Truoc day route bung
 * ca 60 luot goi Anthropic cung luc bang ba `Promise.all` roi cau cho kip; het gio
 * la mat sach, vi khong muc nao duoc ghi neu function chet truoc khi Promise.all
 * hoan tat. Bay gio: lam tung mieng nho, ghi xong mieng nao la chac mieng do, va
 * khi sap het gio thi DUNG CO CHU DINH roi bao lai con bao nhieu. Dem sau chay
 * tiep dung cho do — hang doi tu no ngan dan.
 *
 * 10 giay chenh lech la de danh cho luot Sanity cuoi cung + JSON tra ve.
 *
 * Doc duoc tu bien moi truong vi mot ly do rat cu the: neu khong, duong "het gio
 * thi dung" chi co the KIEM BANG MAT chu khong chay thu duoc — muon thay no cat
 * that thi phai cho doi mot dem that voi hang chuc ung vien that. Ha nguong xuong
 * vai giay la kiem duoc trong mot phut.
 */
const BUDGET_MS = Number(process.env.AI_CONTENT_BUDGET_MS) || 50_000

/**
 * Bao nhieu luot goi Anthropic chay song song. 4 chu khong phai "tat ca":
 * song song toan bo khong nhanh hon dang ke (van cho luot cham nhat) nhung lam
 * moi thu thanh mot canh bac duoc-an-ca-nga-ve-khong, va de cham tran rate limit.
 */
const CONCURRENCY = 4

const STORE_BATCH_SIZE = Number(process.env.AI_CONTENT_BATCH_SIZE) || 20
const OFFER_BATCH_SIZE = Number(process.env.AI_CONTENT_OFFER_BATCH_SIZE) || 30
const DEAL_BATCH_SIZE = Number(process.env.AI_CONTENT_DEAL_BATCH_SIZE) || 10

const STORE_CANDIDATES_QUERY = `*[_type == "store" && published != false && !defined(description) && aiReviewStatus == "none"] | order(_createdAt asc) [0...$limit] {
  "id": _id, name, category, website, maxOffer, shortDescription, description
}`

const OFFER_CANDIDATES_QUERY = `*[_type == "offer" && active == true && !defined(description) && aiReviewStatus == "none"] | order(_createdAt asc) [0...$limit] {
  "id": _id, title, offerText, expiresAt,
  "storeName": store->name,
  "hasCouponCode": defined(couponCode)
}`

const DEAL_CANDIDATES_QUERY = `*[_type == "deal" && !defined(summary) && aiReviewStatus == "none"] | order(_createdAt asc) [0...$limit] {
  "id": _id, title, store, priceSale, priceOrig, discount
}`

type RunOutcome = { done: number; failed: number; skipped: number; errors: string[] }

/**
 * Chay `fn` tren tung muc theo mieng nho, dung lai khi het ngan sach thoi gian.
 *
 * Kiem gio TRUOC moi mieng chu khong phai sau: vao mot mieng moi khi chi con vai
 * giay la cam chac bi giet giua chung, va mot muc bi giet giua chung khong de lai
 * dau vet nao ca.
 */
async function runWithBudget<T extends { id: string }>(
  items: T[],
  fn: (item: T) => Promise<unknown>,
  deadline: number
): Promise<RunOutcome> {
  const out: RunOutcome = { done: 0, failed: 0, skipped: 0, errors: [] }

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    if (Date.now() >= deadline) {
      out.skipped += items.length - i
      break
    }
    const chunk = items.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      chunk.map(async item => {
        try {
          await fn(item)
          return null
        } catch (err) {
          return `${item.id}: ${String(err).slice(0, 200)}`
        }
      })
    )
    for (const err of results) {
      if (err) {
        out.failed++
        // Giu toi da 5 thong diep: du de biet HONG KIEU GI ma khong bien mot dem
        // hong toan bo thanh mot bai van trong log.
        if (out.errors.length < 5) out.errors.push(err)
      } else {
        out.done++
      }
    }
  }

  return out
}

export async function GET(request: Request) {
  const auth = verifyCronRequest(request, 'ai-content-nightly')
  if (!auth.ok) return auth.response

  const startedAt = Date.now()
  const deadline = startedAt + BUDGET_MS

  const [stores, offers, deals] = await Promise.all([
    writeClient.fetch(STORE_CANDIDATES_QUERY, { limit: STORE_BATCH_SIZE }),
    writeClient.fetch(OFFER_CANDIDATES_QUERY, { limit: OFFER_BATCH_SIZE }),
    writeClient.fetch(DEAL_CANDIDATES_QUERY, { limit: DEAL_BATCH_SIZE }),
  ])

  // Offer truoc store va deal: day la loai ton dong lon nhat va la thu hien ngay
  // tren the offer ma nguoi mua doc. Khi ngan sach chi du mot phan, phan duoc lam
  // nen la phan dang gia nhat.
  // Ten website hoi MOT lan cho ca me — cac generator nhan no qua tham so vi
  // `lib/ai/*` khong duoc import `@/sanity/queries` (xem chu thich trong chung).
  const siteName = await getSiteName()
  const offerOutcome = await runWithBudget<OfferContentInput>(offers, o => generateOfferContent(o, siteName), deadline)
  const storeOutcome = await runWithBudget<StoreContentInput>(stores, st => generateStoreContent(st, siteName), deadline)
  const dealOutcome = await runWithBudget<DealContentInput>(deals, d => generateDealContent(d, siteName), deadline)

  const summary = {
    offers: offerOutcome,
    stores: storeOutcome,
    deals: dealOutcome,
    elapsedMs: Date.now() - startedAt,
    budgetMs: BUDGET_MS,
  }

  const totalFailed = offerOutcome.failed + storeOutcome.failed + dealOutcome.failed
  const totalDone = offerOutcome.done + storeOutcome.done + dealOutcome.done
  const totalCandidates = offers.length + stores.length + deals.length

  /**
   * Bao loi qua Sentry, KHONG phai console.error.
   *
   * `sentry.server.config.ts` khong bat `captureConsoleIntegration`, nen
   * console.error chi vao Vercel Logs — noi khong ai mo ra xem hang ngay. Con
   * Sentry thi da noi san vao `getRecentSentryIssues()` -> AI Daily Report ->
   * /admin/reports, tuc la duong ong duy nhat ma nguoi van hanh THUC SU doc moi
   * sang. Mot cron hong am tham suot mot thang la cai gia cua viec bao sai cho.
   *
   * Chi bao khi that su co gi de bao: co ung vien ma khong lam duoc muc nao,
   * hoac co muc that bai. "Dem nay khong con gi de lam" la trang thai binh thuong.
   */
  if (totalCandidates > 0 && totalDone === 0) {
    Sentry.captureMessage(
      `[cron ai-content-nightly] ${totalCandidates} ung vien nhung khong sinh duoc muc nao`,
      { level: 'error', extra: summary }
    )
  } else if (totalFailed > 0) {
    Sentry.captureMessage(
      `[cron ai-content-nightly] ${totalFailed}/${totalCandidates} muc that bai`,
      { level: 'warning', extra: summary }
    )
  }

  return Response.json(summary)
}
