/**
 * Nut Copy khong duoc noi doi.
 *
 * Do 2026-08-25 tren Sentry: `NotAllowedError: Document is not focused` tren
 * /coupon-codes, va 5/11 nut Copy goi `.then()` ma khong co `.catch()`. Nang
 * nhat la `StoreOfferList`: no bat "✓ Copied" NGAY, khong cho ket qua — nen
 * chep hong van hien "da chep".
 *
 * Bo kiem nay giu ba dieu:
 *   1. clipboard chay duoc thi dung no, khong dung ban du phong.
 *   2. clipboard hong thi ROI XUONG `execCommand`, khong nem loi ra ngoai.
 *   3. ca hai deu hong thi tra `false` — de noi goi con biet ma hoi nguoi dung.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { copyText } from '@/lib/copyText'

type Ghi = { clipboard: number; exec: number; giaTri: string | null }

/** Dung mot DOM gia toi thieu, chay ham, roi tra ve ca ket qua lan so lan goi. */
async function chay(opts: {
  clipboard?: 'ok' | 'nem' | 'khong-co'
  exec?: boolean | 'nem'
}): Promise<{ ok: boolean; ghi: Ghi }> {
  const ghi: Ghi = { clipboard: 0, exec: 0, giaTri: null }

  const navGia =
    opts.clipboard === 'khong-co'
      ? {}
      : {
          clipboard: {
            writeText: async (t: string) => {
              ghi.clipboard++
              if (opts.clipboard === 'nem') throw new Error('Document is not focused.')
              ghi.giaTri = t
            },
          },
        }

  const nutGia = () => ({
    value: '',
    style: {} as Record<string, string>,
    setAttribute() {},
    select() {},
    setSelectionRange() {},
  })

  const docGia = {
    createElement: nutGia,
    body: { appendChild() {}, removeChild() {} },
    execCommand: (lenh: string) => {
      ghi.exec++
      if (opts.exec === 'nem') throw new Error('execCommand no')
      if (opts.exec) ghi.giaTri = lenh
      return opts.exec === true
    },
  }

  const cu = { nav: (globalThis as Record<string, unknown>).navigator, doc: (globalThis as Record<string, unknown>).document }
  // `navigator` la getter chi-doc san co cua Node 24 — phai dinh nghia de len.
  Object.defineProperty(globalThis, 'navigator', { value: navGia, configurable: true, writable: true })
  Object.defineProperty(globalThis, 'document', { value: docGia, configurable: true, writable: true })
  try {
    const ok = await copyText('OFFERDY')
    return { ok, ghi }
  } finally {
    Object.defineProperty(globalThis, 'navigator', { value: cu.nav, configurable: true, writable: true })
    Object.defineProperty(globalThis, 'document', { value: cu.doc, configurable: true, writable: true })
  }
}

test('clipboard chay duoc -> dung no, KHONG cham ban du phong', async () => {
  const { ok, ghi } = await chay({ clipboard: 'ok' })
  assert.equal(ok, true)
  assert.equal(ghi.clipboard, 1)
  assert.equal(ghi.exec, 0, 'khong duoc goi execCommand khi clipboard da chay')
  assert.equal(ghi.giaTri, 'OFFERDY')
})

test('clipboard nem loi -> roi xuong execCommand, khong nem ra ngoai', async () => {
  const { ok, ghi } = await chay({ clipboard: 'nem', exec: true })
  assert.equal(ok, true)
  assert.equal(ghi.clipboard, 1)
  assert.equal(ghi.exec, 1)
})

test('khong co clipboard API (ngoai HTTPS) -> van chep duoc', async () => {
  const { ok, ghi } = await chay({ clipboard: 'khong-co', exec: true })
  assert.equal(ok, true)
  assert.equal(ghi.exec, 1)
})

test('ca hai duong deu hong -> tra false, KHONG nem loi', async () => {
  const { ok } = await chay({ clipboard: 'nem', exec: false })
  assert.equal(ok, false)
})

test('execCommand nem loi -> van tra false chu khong vo', async () => {
  const { ok } = await chay({ clipboard: 'nem', exec: 'nem' })
  assert.equal(ok, false)
})

test('khong co DOM (chay tren may chu) -> tra false, khong vo', async () => {
  const cu = (globalThis as Record<string, unknown>).document
  Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true, writable: true })
  Object.defineProperty(globalThis, 'document', { value: undefined, configurable: true, writable: true })
  try {
    assert.equal(await copyText('X'), false)
  } finally {
    Object.defineProperty(globalThis, 'document', { value: cu, configurable: true, writable: true })
  }
})
