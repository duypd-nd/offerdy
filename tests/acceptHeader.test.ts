import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ACCEPT_HTML } from '@/lib/safeFetch'

// Bay da dinh that: gui `Accept: text/html` tran trui thi seeandbuy12.wed2c.com
// tra ve 500 (nginx) va o admin hien "HTTP 500 khi tai ...". Test nay giu cho
// khong ai rut gon chuoi Accept lai lan nua — chi kiem tinh chat, khong kiem
// nguyen van chuoi, de con doi thu tu/q-value ma khong lam vo test.
test('ACCEPT_HTML co ky tu dai dien — thieu no la mot so storefront tra 500', () => {
  assert.ok(ACCEPT_HTML.includes('*/*'), `Accept phai chap nhan moi kieu: ${ACCEPT_HTML}`)
})

test('ACCEPT_HTML van uu tien HTML', () => {
  assert.ok(ACCEPT_HTML.startsWith('text/html'), `Accept phai xin HTML truoc: ${ACCEPT_HTML}`)
})
