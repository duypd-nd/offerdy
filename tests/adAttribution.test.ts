/**
 * Gan nguon cho luu luong quang cao tra tien.
 *
 * Vi sao bo test nay ton tai: truoc 28/08/2026, cookie gan nguon chi duoc dat o
 * `/d/` va `/g/`. Quang cao dan thang vao `/blog/...` thi cu bam sang merchant
 * sau do khong mang nguon nao — tien chay ma khong quy duoc ve chien dich. Do
 * duoc: 56 ban ghi click, chi 5 co nguon.
 *
 * Diem quan trong nhat o day la ca `google` va `google-ads` deu co referer
 * `google.com`. Neu khong tach ra thi tien quang cao va luot tim kiem mien phi
 * bi gop lam mot.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  SOURCE_LABEL, detectShortLinkSource, hasGoogleAdsClickId, parseCampaign,
} from '@/lib/shortLinkSource'
import { parseAttribution, serializeAttribution } from '@/lib/attributionCookie'

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
const params = (qs: string) => new URLSearchParams(qs)

// ── Cho ma toan bo phep do quang cao dua vao ────────────────────────────────
test('⚠️ Google tra tien va Google tu nhien co CUNG referer — chi click-id tach duoc', () => {
  const ref = 'https://www.google.com/'

  // Khong co click-id: luot tim kiem mien phi.
  assert.equal(detectShortLinkSource(CHROME, ref, 'offerdy.com', false), 'google')

  // Co click-id: tien quang cao.
  assert.equal(detectShortLinkSource(CHROME, ref, 'offerdy.com', true), 'google-ads')
})

test('nhan ca ba click-id cua Google, khong chi gclid', () => {
  // `gclid` la ban goc; `gbraid`/`wbraid` la ban giu rieng tu (iOS / khong cookie).
  // Thieu hai cai sau thi mot phan luu luong tra tien bi doc nham thanh tu nhien.
  assert.equal(hasGoogleAdsClickId(params('gclid=Abc123')), true)
  assert.equal(hasGoogleAdsClickId(params('gbraid=Abc123')), true)
  assert.equal(hasGoogleAdsClickId(params('wbraid=Abc123')), true)

  assert.equal(hasGoogleAdsClickId(params('s=ads-blog')), false)
  assert.equal(hasGoogleAdsClickId(params('')), false)
  // Tham so rong khong phai bang chung — `?gclid=` khong noi len dieu gi.
  assert.equal(hasGoogleAdsClickId(params('gclid=')), false)
})

test('click-id thang ca UA in-app: quang cao mo trong webview Instagram VAN la tien quang cao', () => {
  const igUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Instagram 300.0.0.0'

  // Khong co click-id thi UA thang, nhu truoc gio.
  assert.equal(detectShortLinkSource(igUa, null, 'offerdy.com', false), 'instagram')
  // Co click-id thi day la luot bam co tra tien, du mo o dau.
  assert.equal(detectShortLinkSource(igUa, null, 'offerdy.com', true), 'google-ads')
})

test('them google-ads KHONG lam hong phep nhan dien cu', () => {
  // Hang rao chong hoi quy: bon nguon nay la duong tien cua bai dang mang xa hoi.
  assert.equal(detectShortLinkSource('... Instagram 300.0.0.0', null, 'offerdy.com'), 'instagram')
  assert.equal(detectShortLinkSource(CHROME, 'https://www.tiktok.com/@x', 'offerdy.com'), 'tiktok')
  assert.equal(detectShortLinkSource(CHROME, null, 'offerdy.com'), 'direct')
  assert.equal(detectShortLinkSource(CHROME, 'https://offerdy.com/blog', 'offerdy.com'), 'internal')
})

test('moi nguon deu co nhan tieng Viet — thieu mot cai la admin hien "undefined"', () => {
  for (const s of ['google', 'google-ads', 'instagram', 'direct', 'internal', 'other'] as const) {
    assert.equal(typeof SOURCE_LABEL[s], 'string')
    assert.ok(SOURCE_LABEL[s].length > 0, `thieu nhan cho ${s}`)
  }
  // Hai nhan Google phai KHAC nhau, khong thi bang bao cao khong doc duoc.
  assert.notEqual(SOURCE_LABEL['google'], SOURCE_LABEL['google-ads'])
})

// ── Chuoi cookie: middleware va route handler phai dung chung MOT bo ma hoa ──
test('nhan chien dich quang cao di qua duoc chuoi cookie nguyen ven', () => {
  const raw = serializeAttribution({ source: 'google-ads', campaign: 'ads-blog-ebike' })
  const back = parseAttribution(raw)

  assert.equal(back?.source, 'google-ads')
  assert.equal(back?.campaign, 'ads-blog-ebike')
  // Trang blog khong gan voi mot ma san pham nao — phai la undefined, khong phai 0.
  assert.equal(back?.entryCode, undefined)
})

test('⚠️ dau gach ngang trong "google-ads" khong duoc lam vo dinh dang phang', () => {
  // Dinh dang la "source|campaign|code". Neu ai do doi sang dau `-` lam dau tach
  // thi `google-ads` se bi cat doi va moi luot quang cao thanh nguon "google".
  const raw = serializeAttribution({ source: 'google-ads', campaign: 'x', entryCode: 1470 })
  assert.equal(raw, 'google-ads|x|1470')
  assert.equal(parseAttribution(raw)?.source, 'google-ads')
})

test('nhan chien dich cua quang cao van bi lam sach nhu moi nhan khac', () => {
  // Gia tri nay do nguoi ngoai dat va se duoc luu vao Sanity roi hien lai o admin.
  assert.equal(parseCampaign('ADS-Blog-Ebike'), 'ads-blog-ebike')
  assert.equal(parseCampaign('ads blog<script>'), 'adsblogscript')
  assert.equal(parseCampaign(null), undefined)
  // ≤24 ky tu — cat bot chu khong tu choi.
  assert.equal(parseCampaign('a'.repeat(40))?.length, 24)
})
