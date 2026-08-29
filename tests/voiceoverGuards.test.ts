/**
 * Hàng rào của lời đọc video.
 *
 * Ba thứ được canh ở đây, cả ba đều là lỗi đã trả giá thật:
 *
 * 1. **AI không được tự viết số.** Cùng nguyên tắc với bộ caption, và nghiêm
 *    hơn: một con số sai đọc lên thành tiếng thì người xem không có cách nào
 *    đối chiếu lại như khi đọc chữ. Đây là lỗi CỨNG — loại cả nhịp.
 * 2. **Mô hình độ dài phải bám số đo.** Bản lời đọc viết tay đầu tiên cho deal
 *    #1178 dài 34,7 giây cho một khung 15 giây; đọc trên giấy vẫn thấy gọn.
 *    Nhưng bản mô hình đầu tiên lại lấy MỘT phép đo suy ra tốc độ phẳng
 *    "2,3 chữ/giây", và nó sai tới 40% ở đoạn ngắn.
 * 3. **Dài quá KHÔNG phải lỗi cứng.** Chạy thật 29/08 vứt mất nhịp HOOK vì lố
 *    một chữ. Bịa số là vấn đề sự thật; dài quá là vấn đề tay nghề mà người
 *    dựng nhìn thấy và tự cắt được.
 *
 * ⚠️ Con số nào trong file này cũng có nguồn: hoặc là số đo ghi kèm, hoặc là
 * suy ra từ số đo đó. Không có con số nào "trông hợp lý".
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  GIAY_MO_DAU, NHIP, canhBaoThoiLuong, demChu, dienCho, giayUocTinh,
  khungTheoThoiLuong, nganSachChu, soatNhip,
} from '@/lib/ai/generateVoiceover'
import { docGiaLen, docMaLen, docPhanTramLen, soNguyenThanhChu } from '@/lib/tts/docSoLen'
import type { CaptionDealInput } from '@/lib/ai/generateCaption'

// Deal #1178 thật — VisoOne Rane, dữ liệu lấy từ chính bản lời đọc 28/08.
const DEAL: CaptionDealInput = {
  code: 1178,
  title: 'VisoOne Rane Blue Light Blocking Glasses',
  priceSale: '$14.99',
  priceOrig: '$29.99',
  discount: 50,
  categoryName: 'Fashion',
}

test('⚠️ mô hình độ dài khớp ĐÚNG ba phép đo thật, sai số dưới 0,2 giây', () => {
  // Ba đoạn đo được trong một lần chạy Gemini TTS ngày 29/08. Đây là toàn bộ
  // căn cứ của mọi con số giây trong tính năng này.
  for (const [chu, that] of [[2, 1.36], [5, 2.04], [18, 5.90]] as const) {
    const uoc = giayUocTinh(chu)
    assert.ok(Math.abs(uoc - that) < 0.2, `${chu} chữ: ước ${uoc.toFixed(2)}s vs thật ${that}s`)
  }
})

test('⚠️ tốc độ đọc KHÔNG phải hằng số — đó là lý do mô hình có phí mở đầu', () => {
  // Mô hình phẳng "2,3 chữ/giây" từng ép nhịp PRODUCT xuống 18 chữ trong khi 8
  // giây chứa được 25. Phép kiểm này chốt lại rằng chữ/giây phải TĂNG theo độ
  // dài — một mô hình phẳng sẽ làm cả ba tỉ số bằng nhau và rớt ở đây.
  const tocDo = (n: number) => n / giayUocTinh(n)
  assert.ok(tocDo(2) < tocDo(5) && tocDo(5) < tocDo(18), 'tốc độ phải tăng theo độ dài')
  assert.ok(GIAY_MO_DAU > 0.5, 'phí mở đầu là thứ tạo ra hiệu ứng đó')
})

test('ngân sách chữ là phép nghịch của mô hình độ dài', () => {
  for (const giay of [2, 4, 5, 8]) {
    const n = nganSachChu(giay)
    assert.ok(giayUocTinh(n) <= giay, `${n} chữ ước ${giayUocTinh(n).toFixed(2)}s, vượt khung ${giay}s`)
    assert.ok(giayUocTinh(n + 1) > giay, `${n + 1} chữ lẽ ra phải vượt khung ${giay}s`)
  }
  // Không bao giờ trả 0 hay số âm, dù khung có ngắn đến đâu.
  assert.equal(nganSachChu(0), 3)
})

test('⚠️ dài quá KHÔNG bị loại — mất một nhịp tệ hơn thừa vài phần mười giây', () => {
  // Chạy thật 29/08 loại mất nhịp HOOK vì lố đúng một chữ, tức vứt câu quan
  // trọng nhất của video. Bịa số là vấn đề sự thật nên chặn cứng; dài quá là
  // vấn đề tay nghề mà người dựng nhìn thấy và tự cắt được.
  const daiGap = {
    id: 'hook' as const,
    hienTrenMan: 'Blue light glasses',
    docLen: 'Hey everyone, today I want to show you something I found that I think you are going to really like',
  }
  assert.deepEqual(soatNhip(daiGap, false), [], 'độ dài không được là lý do loại')
  // Nhưng nó phải ĐO ĐƯỢC, để giao diện tô cảnh báo lên.
  assert.ok(giayUocTinh(demChu(daiGap.docLen)) > 2, 'vẫn phải nhìn ra là vượt khung 2 giây')
})

test('lời hợp lệ thì qua', () => {
  assert.deepEqual(
    soatNhip({ id: 'hook', hienTrenMan: 'Blue light glasses. {price}.', docLen: 'Blue light glasses. {price}.' }, false),
    []
  )
})

test('AI tự viết số tiền hoặc phần trăm là bị loại, ở CẢ hai trường', () => {
  const tien = soatNhip({ id: 'hook', hienTrenMan: 'Only $14.99', docLen: 'Only fifteen bucks' }, false)
  assert.ok(tien.some(l => l.includes('hienTrenMan tự viết số')), tien.join(' | '))

  const pt = soatNhip({ id: 'hook', hienTrenMan: 'Cheap', docLen: '50% off today' }, false)
  assert.ok(pt.some(l => l.includes('docLen tự viết số')), pt.join(' | '))

  // Chỗ trống thì KHÔNG bị coi là số — nếu bị thì mọi nhịp hợp lệ đều rớt.
  assert.deepEqual(soatNhip({ id: 'hook', hienTrenMan: '{discount}', docLen: '{price} today' }, false), [])
})

test('{coupon} bị chặn khi shop không có mã, và chặn cả khi đặt sai nhịp', () => {
  const khongMa = soatNhip({ id: 'cta', hienTrenMan: 'Code {coupon}', docLen: 'Use code {coupon}' }, false)
  assert.ok(khongMa.some(l => l.includes('không có mã')), khongMa.join(' | '))

  const saiNhip = soatNhip({ id: 'product', hienTrenMan: 'x', docLen: 'Use code {coupon}' }, true)
  assert.ok(saiNhip.some(l => l.includes('chỉ được đặt ở nhịp CTA')), saiNhip.join(' | '))

  assert.deepEqual(soatNhip({ id: 'cta', hienTrenMan: 'Code', docLen: 'Code {coupon} at checkout' }, true), [])
})

test('bốn nhịp được khai đúng thứ tự phễu, không thiếu không thừa', () => {
  assert.deepEqual(NHIP.map(n => n.id), ['hook', 'problem', 'product', 'cta'])
})

// ── Chia khung theo độ dài video ──────────────────────────────

test('⚠️ ở T=19s, công thức tái tạo ĐÚNG khung thiết kế tay ban đầu', () => {
  // Đây là điều biến công thức này thành cách viết tổng quát của thứ đã có, chứ
  // không phải một công thức mới nghĩ ra. Bản đầu ghi cứng 2 / 5 / 8 / 4 giây.
  const k = khungTheoThoiLuong(19)
  const mong: Record<string, number> = { hook: 2, problem: 5, product: 8, cta: 4 }
  for (const n of k) {
    assert.ok(Math.abs(n.giay - mong[n.id]) < 0.3,
      `${n.id}: ${n.giay.toFixed(1)}s, khung tay là ${mong[n.id]}s`)
  }
})

test('bốn khung luôn cộng đúng bằng độ dài video, không dôi không hụt', () => {
  for (const T of [5, 10, 15, 19, 30, 60, 120]) {
    const tong = khungTheoThoiLuong(T).reduce((s, n) => s + n.giay, 0)
    assert.ok(Math.abs(tong - T) < 0.001, `T=${T}: cộng lại ra ${tong}`)
  }
})

test('các khung nối liền nhau, không chồng lấn và không có khe hở', () => {
  const k = khungTheoThoiLuong(30)
  assert.equal(k[0].batDau, 0)
  for (let i = 1; i < k.length; i++) {
    assert.ok(Math.abs(k[i].batDau - (k[i - 1].batDau + k[i - 1].giay)) < 0.001,
      `nhịp ${k[i].id} bắt đầu ở ${k[i].batDau}, nhịp trước kết thúc ở ${k[i - 1].batDau + k[i - 1].giay}`)
  }
})

test('⚠️ HOOK KHÔNG giãn ra theo video dài — hook 9 giây không còn là hook', () => {
  // Người xem quyết định lướt tiếp trong ~2 giây đầu bất kể video dài bao nhiêu.
  // Chia đều theo tỉ lệ sẽ cho HOOK 9 giây ở video 60s, tức hỏng hẳn vai trò.
  for (const T of [15, 30, 60, 120]) {
    const hook = khungTheoThoiLuong(T).find(n => n.id === 'hook')!
    assert.ok(hook.giay <= 2.001, `T=${T}: HOOK ${hook.giay}s`)
  }
  // Nhưng video RẤT ngắn thì HOOK phải co lại, kẻo nó ăn gần hết thời lượng.
  assert.ok(khungTheoThoiLuong(6).find(n => n.id === 'hook')!.giay < 2)
})

test('PRODUCT là nhịp hút phần dôi ra khi video dài thêm', () => {
  const ngan = khungTheoThoiLuong(15).find(n => n.id === 'product')!.giay
  const dai = khungTheoThoiLuong(60).find(n => n.id === 'product')!.giay
  assert.ok(dai > ngan * 4, `15s -> ${ngan.toFixed(1)}s, 60s -> ${dai.toFixed(1)}s`)
})

test('độ dài vô lý bị kẹp chứ không đẻ ra khung âm hay khổng lồ', () => {
  for (const T of [0, -30, 1, 99999, NaN]) {
    const k = khungTheoThoiLuong(T)
    assert.equal(k.length, 4)
    for (const n of k) {
      assert.ok(Number.isFinite(n.giay) && n.giay > 0, `T=${T}, nhịp ${n.id} = ${n.giay}`)
    }
  }
})

test('cảnh báo nói đúng hai đầu, và im lặng ở khoảng dùng bình thường', () => {
  assert.ok(canhBaoThoiLuong(7), 'video 7s phải được cảnh báo là quá ngắn cho 4 nhịp')
  assert.ok(canhBaoThoiLuong(180), 'video 3 phút phải được cảnh báo là quá thưa')
  for (const T of [12, 15, 20, 30, 60]) {
    assert.equal(canhBaoThoiLuong(T), null, `T=${T} lẽ ra không có gì đáng nói`)
  }
})

test('nhãn khung dùng dấu phẩy thập phân, đọc được trên giao diện tiếng Việt', () => {
  const k = khungTheoThoiLuong(30)
  assert.equal(k[0].nhan, '0–2s')
  for (const n of k) assert.ok(!n.nhan.includes('.'), `nhãn "${n.nhan}" còn dấu chấm`)
})

// ── Đọc số lên ────────────────────────────────────────────────

test('giá đọc theo cách người Mỹ nói, không phải cách máy đọc dấu chấm', () => {
  assert.equal(docGiaLen('$14.99'), 'fourteen ninety-nine')
  assert.equal(docGiaLen('$29.99'), 'twenty-nine ninety-nine')
  // Số tròn thì phải có đơn vị, kẻo "fifteen" trống nghĩa.
  assert.equal(docGiaLen('$15'), 'fifteen dollars')
  assert.equal(docGiaLen('$1'), 'one dollar')
  assert.equal(docGiaLen('$199.00'), 'one hundred ninety-nine dollars')
  // Xu dưới 10 đọc "oh …", không phải "eight five".
  assert.equal(docGiaLen('$8.05'), 'eight oh five')
})

test('⚠️ giá kiểu châu Âu đi qua ĐÚNG bộ đọc giá của dự án', () => {
  // `€199,99` từng bị một bộ đọc giá thứ hai hiểu thành "Save €5000". Ở đây phải
  // ra một trăm chín mươi chín, không phải mười chín nghìn chín trăm chín chín.
  assert.equal(docGiaLen('€199,99'), 'one hundred ninety-nine ninety-nine')
  assert.equal(docGiaLen('€199'), 'one hundred ninety-nine euros')
  assert.equal(docGiaLen('£20'), 'twenty pounds')
})

test('giá đọc không được là chuỗi rỗng khi không có giá', () => {
  assert.equal(docGiaLen(undefined), '')
  assert.equal(docGiaLen('liên hệ'), 'liên hệ')
})

test('mã sản phẩm đọc từng chữ số — để người nghe gõ lại được', () => {
  assert.equal(docMaLen(1178), 'one one seven eight')
  assert.equal(docMaLen(7), 'seven')
  // "one thousand one hundred seventy-eight" thì không ai gõ lại vào ô tìm kiếm.
  assert.notEqual(docMaLen(1178), soNguyenThanhChu(1178))
})

test('số nguyên thành chữ, gồm cả các mốc dễ sai', () => {
  assert.equal(soNguyenThanhChu(0), 'zero')
  assert.equal(soNguyenThanhChu(15), 'fifteen')
  assert.equal(soNguyenThanhChu(20), 'twenty')
  assert.equal(soNguyenThanhChu(21), 'twenty-one')
  assert.equal(soNguyenThanhChu(100), 'one hundred')
  assert.equal(soNguyenThanhChu(101), 'one hundred one')
  assert.equal(soNguyenThanhChu(999), 'nine hundred ninety-nine')
  assert.equal(soNguyenThanhChu(1000), 'one thousand')
  assert.equal(docPhanTramLen(50), 'fifty percent')
})

// ── Điền chỗ trống ────────────────────────────────────────────

test('cùng một chỗ trống ra hai dạng: viết cho màn hình, đọc cho tai', () => {
  const chu = '{price}, was {was}. {discount}. {code}'
  assert.equal(dienCho(chu, DEAL, 'man'), '$14.99, was $29.99. 50% OFF. #1178')
  assert.equal(
    dienCho(chu, DEAL, 'doc'),
    'fourteen ninety-nine, was twenty-nine ninety-nine. fifty percent off. number one one seven eight'
  )
})

test('⚠️ giảm theo SỐ TIỀN không được đọc thành phần trăm', () => {
  // `discountByAmount` làm `{discount}` thành "Save $15.00", không phải "50%".
  // Đọc nó thành "fifty percent off" là nói sai mức giảm ra thành tiếng — mà
  // người nghe không có cách nào đối chiếu lại như khi đọc chữ.
  const theoTien: CaptionDealInput = { ...DEAL, discount: 50, discountByAmount: true }
  assert.equal(dienCho('{discount}', theoTien, 'man'), 'Save $15')
  assert.equal(dienCho('{discount}', theoTien, 'doc'), 'save fifteen dollars')
})

test('⚠️ cờ giảm-theo-tiền bật mà THIẾU giá gốc thì lời đọc bám theo huy hiệu', () => {
  // Huy hiệu rơi về phần trăm khi không tính được số tiền tiết kiệm. Lời đọc
  // đọc theo cờ thay vì theo huy hiệu sẽ nói một đằng, chữ trên màn hình một nẻo.
  const thieu: CaptionDealInput = { ...DEAL, priceOrig: undefined, discountByAmount: true }
  assert.equal(dienCho('{discount}', thieu, 'man'), '50% OFF')
  assert.equal(dienCho('{discount}', thieu, 'doc'), 'fifty percent off')
})

test('⚠️ mã coupon đọc lên KHÔNG có ngoặc đơn và không có dấu %', () => {
  // Trên màn hình "OFFERDY (5% Off)" đọc bằng mắt là ra ngay. Đọc lên thì tai
  // nghe thành "OFFERDY mở ngoặc năm phần trăm off" — chạy thật 29/08 đúng vậy.
  const coMa: CaptionDealInput = { ...DEAL, couponCode: 'OFFERDY', couponOfferText: '5% Off' }
  assert.equal(dienCho('code {coupon}', coMa, 'man'), 'code OFFERDY (5% Off)')
  assert.equal(dienCho('code {coupon}', coMa, 'doc'), 'code OFFERDY, five percent off')

  // offerText không có phần trăm thì giữ nguyên chữ, chỉ bỏ ngoặc.
  const chuThuong: CaptionDealInput = { ...DEAL, couponCode: 'SHIPFREE', couponOfferText: 'Free Shipping' }
  assert.equal(dienCho('{coupon}', chuThuong, 'doc'), 'SHIPFREE, free shipping')

  // Không có mã: chỗ trống biến mất chứ không lọt ra thành chữ "{coupon}".
  assert.equal(dienCho('code {coupon}', DEAL, 'doc'), 'code')
})

test('⚠️ "off off" bị gộp lại — {discount} đã mang sẵn chữ OFF', () => {
  // Chạy thật 29/08: mô hình viết "{discount} off today" và HOOK đọc lên thành
  // "thirty-one percent off off today". Prompt đã dặn đừng viết thêm "off";
  // đây là lưới thứ hai, vì prompt thì phớt lờ được.
  assert.equal(dienCho('{discount} off today', DEAL, 'doc'), 'fifty percent off today')
  assert.equal(dienCho('{discount} off today', DEAL, 'man'), '50% OFF today')
  // Chữ "off" đứng một mình vẫn phải còn nguyên.
  assert.equal(dienCho('Take it off the shelf', DEAL, 'doc'), 'Take it off the shelf')
})

test('⚠️ "number number" bị gộp lại — {code} đã mang sẵn chữ "number"', () => {
  // Chạy thật 29/08 ở video 30s: CTA đọc "Check number number one one seven eight".
  // Cùng họ lỗi với "off off": chỗ trống mang sẵn một chữ mà mô hình viết lại.
  assert.equal(dienCho('Check number {code} in bio', DEAL, 'doc'),
    'Check number one one seven eight in bio')
  // Dạng màn hình là "#1178" nên không có chữ nào để lặp.
  assert.equal(dienCho('Check {code} in bio', DEAL, 'man'), 'Check #1178 in bio')
})

test('⚠️ offerText theo SỐ TIỀN cũng phải đổi sang dạng đọc', () => {
  // `offerText` thật của một shop là "$100 Off". Để mộc thì máy đọc
  // "dollar one hundred off".
  const theoTien: CaptionDealInput = { ...DEAL, couponCode: 'VENTURESSALES', couponOfferText: '$100 Off' }
  const doc = dienCho('code {coupon}', theoTien, 'doc')
  assert.ok(!doc.includes('$'), `còn ký hiệu tiền: "${doc}"`)
  assert.equal(doc, 'code VENTURESSALES, one hundred dollars off')
  // Dạng màn hình giữ nguyên cách viết.
  assert.equal(dienCho('code {coupon}', theoTien, 'man'), 'code VENTURESSALES ($100 Off)')
})

test('dấu câu không bị đẩy ra xa sau khi chỗ trống bị xoá', () => {
  // "{was}." với deal không có giá gốc từng ra " ." — máy đọc nghỉ một nhịp lạ.
  const khongGoc: CaptionDealInput = { ...DEAL, priceOrig: undefined }
  assert.equal(dienCho('Only {price}, was {was}.', khongGoc, 'doc'), 'Only fourteen ninety-nine, was.')
})

test('không có giá gốc thì {was} biến mất, không để lại khoảng trắng thừa', () => {
  const khongGoc: CaptionDealInput = { ...DEAL, priceOrig: undefined }
  assert.equal(dienCho('{price} was {was} today', khongGoc, 'doc'), 'fourteen ninety-nine was today')
})

test('demChu tính chỗ trống là một chữ — vì đọc lên nó cũng chỉ là vài âm', () => {
  assert.equal(demChu('Blue light glasses. {price}.'), 4)
  assert.equal(demChu('   '), 0)
})
