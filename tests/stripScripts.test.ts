/**
 * Go <script> khoi HTML truoc khi nhung.
 *
 * Day la ham chan mot loi da xay ra that tren CA 107 trang store, nen test o
 * day nghieng ve phia "the viet lech kieu gi cung phai bat duoc": co thuoc
 * tinh, viet hoa, nhieu the, va the khong dong.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { stripScripts, hasScript } from '../src/lib/stripScripts'

test('go the script don gian', () => {
  assert.equal(stripScripts('<p>a</p><script>alert(1)</script><p>b</p>'), '<p>a</p><p>b</p>')
})

test('go duoc the co nhieu dong ben trong', () => {
  // Day chinh la hinh dang that cua doan script trong aboutTemplate.ts: nhieu
  // dong. Neu dung `.` thay vi [\\s\\S] thi khong khop va loi van con nguyen.
  const html = `<div>x</div>
<script>
(function(){
  var el = document.querySelector('.abs-wrap')
  el.style.setProperty('border','none','important')
})()
</script>`
  assert.equal(stripScripts(html).trim(), '<div>x</div>')
})

test('go duoc the co thuoc tinh va viet hoa', () => {
  assert.equal(stripScripts('<SCRIPT TYPE="text/javascript">x</SCRIPT>y'), 'y')
  assert.equal(stripScripts('<script defer src="a.js"></script>y'), 'y')
})

test('go HET, khong chi the dau tien', () => {
  assert.equal(stripScripts('<script>a</script>giua<script>b</script>'), 'giua')
})

test('the dong co khoang trang van go duoc', () => {
  assert.equal(stripScripts('<script>a</script >z'), 'z')
})

test('⚠️ the KHONG DONG thi go tu do den het chuoi', () => {
  // De lai mot the mo khong dong thi trinh duyet nuot toan bo phan con lai cua
  // bai viet lam noi dung script — mat sach noi dung phia sau.
  assert.equal(stripScripts('<p>giu lai</p><script>bi cat giua chung'), '<p>giu lai</p>')
})

test('khong dung toi HTML binh thuong', () => {
  const html = '<div class="abs-wrap"><h2>About <em>Shop</em></h2><p>noi dung</p></div>'
  assert.equal(stripScripts(html), html)
})

test('chuoi rong va chuoi khong co script tra ve nguyen ven', () => {
  assert.equal(stripScripts(''), '')
  assert.equal(stripScripts('<p>a</p>'), '<p>a</p>')
})

test('chu "script" trong van ban thuong khong bi coi la the', () => {
  // `\\b` sau `<script` chan `<scriptable>`; con chu script khong co dau `<`
  // thi khong bao gio khop.
  const html = '<p>He viet mot script nho</p><scriptable>x</scriptable>'
  assert.equal(stripScripts(html), html)
})

test('hasScript: goi NHIEU LAN cung mot dau vao phai cho cung ket qua', () => {
  // Bay that: `.test()` tren regex co co `g` la co trang thai (`lastIndex`
  // khong tu dat lai), nen lan goi thu hai tra ve false. Mot ham kiem tra ma
  // doi cau tra loi giua cac lan goi la thu rat kho lan ra.
  const html = '<p>a</p><script>x</script>'
  assert.equal(hasScript(html), true)
  assert.equal(hasScript(html), true)
  assert.equal(hasScript(html), true)
})

test('hasScript: khong co script thi false, lap lai van false', () => {
  assert.equal(hasScript('<p>a</p>'), false)
  assert.equal(hasScript('<p>a</p>'), false)
  assert.equal(hasScript(''), false)
})
