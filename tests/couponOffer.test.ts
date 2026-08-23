/**
 * Doc muc giam ra khoi `offerText` cua ma coupon.
 *
 * ⚠️ Vi sao dang test nay dang gia: con so o day duoc NOI RA MIENG trong video
 * va IN LEN MAN HINH o canh cuoi. Doc sai la hua sai voi nguoi mua — nang hon
 * han mot con so lech trong trang admin. Nen luat quan trong nhat khong phai
 * "doc dung cang nhieu dang cang tot", ma la **khong chac thi tra `null`**.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { docUuDaiMa } from '../src/lib/video/couponOffer'

/** Doc `phanTram` sau khi da thu hep kieu — union khong cho cham thang vao. */
const phanTram = (offerText?: string | null): number | null => {
  const u = docUuDaiMa(offerText)
  return u && u.kieu === 'phan-tram' ? u.phanTram : null
}

test('doc phan tram tu du lieu that trong kho', () => {
  // Sau chuoi nay lay nguyen van tu 98 offer co ma, do 2026-08-23.
  const u = docUuDaiMa('5% Off')
  assert.equal(u?.kieu, 'phan-tram')
  assert.equal(phanTram('5% Off'), 5)
  assert.equal(u?.hienThi, '5% OFF')
  assert.equal(u?.docLen, '5 percent')

  assert.equal(docUuDaiMa('15% Off')?.hienThi, '15% OFF')
  assert.equal(phanTram('18% Off'), 18)
  assert.equal(docUuDaiMa('12% Off')?.docLen, '12 percent')
})

test('doc duoc ca offerText tieng Phap', () => {
  // "Cocon d'Ange :: 15% de réduction" — co that trong kho.
  const u = docUuDaiMa('15% de réduction')
  assert.equal(u?.kieu, 'phan-tram')
  assert.equal(phanTram('15% de réduction'), 15)
})

test('doc so tien co dinh, giu dung ky hieu tien te', () => {
  const euro = docUuDaiMa('€10 Off')
  assert.equal(euro?.kieu, 'so-tien')
  assert.equal(euro?.hienThi, '€10 OFF')
  assert.equal(euro?.docLen, '10 euro')

  const usd = docUuDaiMa('$10 Off')
  assert.equal(usd?.hienThi, '$10 OFF')
  assert.equal(usd?.docLen, '10 dollars')

  assert.equal(docUuDaiMa('€25 Off')?.hienThi, '€25 OFF')
})

test('so tien di qua bo doc gia duy nhat, khong tu boc so', () => {
  // ⚠️ Day la chinh cai loi tung in ra "Save €5000": `€199,99` co dau phay la
  // dau THAP PHAN, khong phai ngan nghin. Tu boc bang replace(/[^0-9.]/g,'')
  // se ra 19999.
  assert.equal(docUuDaiMa('€199,99 Off')?.hienThi, '€199.99 OFF')
  // Con `$1,299` thi dau phay LA ngan nghin.
  assert.equal(docUuDaiMa('$1,299 Off')?.hienThi, '$1299 OFF')
})

test('phan tram thap phan doc duoc va bo so 0 thua', () => {
  assert.equal(docUuDaiMa('7.5% Off')?.docLen, '7.5 percent')
  assert.equal(phanTram('7,5% Off'), 7.5)
  assert.equal(docUuDaiMa('10.0% Off')?.hienThi, '10% OFF')
})

test('KHONG doc duoc thi tra null chu khong doan', () => {
  // Khong co con so nao -> im lang. Canh ma van chay, chi la khong kem muc giam.
  assert.equal(docUuDaiMa('Free Shipping'), null)
  assert.equal(docUuDaiMa('Exclusive offer at checkout'), null)
  assert.equal(docUuDaiMa(''), null)
  assert.equal(docUuDaiMa(null), null)
  assert.equal(docUuDaiMa(undefined), null)
  assert.equal(docUuDaiMa('   '), null)
})

test('chan muc giam vo ly thay vi phat len video', () => {
  // ⚠️ Du lieu that cao nhat la 25%. Mot loi nhap "150% Off" hay mot cau
  // marketing "up to 100%" ma lot len video la loi hua khong ai giu duoc.
  assert.equal(docUuDaiMa('150% Off'), null)
  assert.equal(docUuDaiMa('100% Off'), null)
  assert.equal(docUuDaiMa('0% Off'), null)
  // 95 la nguong tren, van doc duoc.
  assert.equal(phanTram('95% Off'), 95)
})

test('so tien bang 0 hoac am khong duoc coi la uu dai', () => {
  assert.equal(docUuDaiMa('$0 Off'), null)
  assert.equal(docUuDaiMa('€0,00 Off'), null)
})

test('phan tram thang khi offerText co ca hai', () => {
  // "10% Off (up to $50)" — muc chinh la phan tram, khong phai tran tien.
  const u = docUuDaiMa('10% Off (up to $50)')
  assert.equal(u?.kieu, 'phan-tram')
  assert.equal(phanTram('10% Off (up to $50)'), 10)
})

test('moi duong ra deu an toan de in len video va doc len', () => {
  // ⚠️ `hienThi` di thang vao `drawtext` con `docLen` di thang vao may doc.
  // Mot ky tu xuong dong hay dau nhay lot vao la hong ca khung hinh hoac ca cau.
  const mau = ['5% Off', '15% Off', '€10 Off', '$10 Off', '7.5% Off', '95% Off', '15% de réduction']
  for (const m of mau) {
    const u = docUuDaiMa(m)
    assert.ok(u, `phai doc duoc: ${m}`)
    assert.doesNotMatch(u!.hienThi, /[\n\r'"\\]/, `hienThi co ky tu nguy hiem: ${m}`)
    assert.doesNotMatch(u!.docLen, /[\n\r'"\\%]/, `docLen co ky tu nguy hiem: ${m}`)
    // May doc phai nhan duoc CHU, khong phai ky hieu.
    assert.match(u!.docLen, /^[0-9.]+ (percent|euro|pounds|dollars)( [0-9]+)?$/)
  }
})
