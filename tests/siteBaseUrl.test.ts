/**
 * O *Canonical URL* trong admin gio quyet dinh `metadataBase` — goc cua moi dia
 * chi tuyet doi ma Next sinh ra. Bo test nay giu dung mot dieu: mot o go nham
 * khong duoc phep doi dia chi cua ca site, va cung khong duoc lam trang 500.
 *
 * Ca dau tien la gia tri THAT da nam trong dataset cho toi 25/08.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { siteBaseUrl, SITE_URL_MAC_DINH } from '@/lib/siteBaseUrl'

test('⚠️ ca da that su xay ra: thieu www thanh hostname bat dau bang dau cham', () => {
  // `new URL('https://.offerdy.com/')` KHONG nem — try/catch mot minh se cho qua,
  // va ca site se khai canonical tro toi mot ten mien khong ton tai.
  assert.equal(siteBaseUrl('https://.offerdy.com/'), SITE_URL_MAC_DINH)
})

test('gia tri dung thi duoc dung, va khong con dau / o cuoi', () => {
  assert.equal(siteBaseUrl('https://www.offerdy.com/'), 'https://www.offerdy.com')
  assert.equal(siteBaseUrl('https://www.offerdy.com'), 'https://www.offerdy.com')
})

test('doi duoc ten mien that — o nay co ly do ton tai', () => {
  assert.equal(siteBaseUrl('https://dealwise.com'), 'https://dealwise.com')
  assert.equal(siteBaseUrl('http://localhost.dev:3000'), 'http://localhost.dev:3000')
})

test('o trong / thieu thi ve mac dinh, khong nem', () => {
  assert.equal(siteBaseUrl(undefined), SITE_URL_MAC_DINH)
  assert.equal(siteBaseUrl(null), SITE_URL_MAC_DINH)
  assert.equal(siteBaseUrl(''), SITE_URL_MAC_DINH)
  assert.equal(siteBaseUrl('   '), SITE_URL_MAC_DINH)
})

test('chuoi rac khong parse duoc thi ve mac dinh', () => {
  assert.equal(siteBaseUrl('abc'), SITE_URL_MAC_DINH)
  assert.equal(siteBaseUrl('//www.offerdy.com'), SITE_URL_MAC_DINH)
  assert.equal(siteBaseUrl('https://www offerdy.com'), SITE_URL_MAC_DINH)
})

test('parse duoc nhung khong phai ten mien that — cho nay try/catch mu', () => {
  // Ba ca duoi day deu qua `new URL`. Do bang Node 24 ngay 2026-08-26.
  assert.equal(siteBaseUrl('https://abc'), SITE_URL_MAC_DINH)        // mot nhan
  assert.equal(siteBaseUrl('https://offerdy.com.'), SITE_URL_MAC_DINH) // nhan cuoi rong
  assert.equal(siteBaseUrl('https://.com'), SITE_URL_MAC_DINH)       // nhan dau rong
})

test('giao thuc khac http/https bi loai — no se di thang vao <link rel=canonical>', () => {
  assert.equal(siteBaseUrl('javascript:alert(1)'), SITE_URL_MAC_DINH)
  assert.equal(siteBaseUrl('data:text/html,x'), SITE_URL_MAC_DINH)
  assert.equal(siteBaseUrl('ftp://files.offerdy.com'), SITE_URL_MAC_DINH)
})

test('duong dan / query / hash bi bo — day la GOC, khong phai mot trang', () => {
  assert.equal(siteBaseUrl('https://www.offerdy.com/blog?a=1#x'), 'https://www.offerdy.com')
})
