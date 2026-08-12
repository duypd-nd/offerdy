/**
 * Loader ảnh cho next/image.
 *
 * Cái đặt cược: **mọi ảnh trên site đi qua đúng hàm này**. Ngày 12/08/2026 hạn mức
 * tối ưu ảnh của Vercel cạn, `/_next/image` trả 402 và 181/182 biến thể ảnh trên
 * production chết trắng — trang /deals chỉ còn chữ alt to đùng. Loader này đẩy việc
 * đổi kích thước sang CDN của Sanity để không còn phụ thuộc hạn mức đó nữa.
 *
 * Sai ở đây không hỏng build, không đỏ test nào khác — nó chỉ lặng lẽ trả về URL
 * hỏng, và người xem thấy y hệt sự cố cũ.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import loader from '@/lib/imageLoader'

const SANITY = 'https://cdn.sanity.io/images/ns0upb1t/production/abc123-800x800.jpg'

test('ảnh Sanity: đặt lại bề rộng theo yêu cầu của next/image', () => {
  const url = new URL(loader({ src: SANITY, width: 384, quality: 75 }))
  assert.equal(url.hostname, 'cdn.sanity.io')
  assert.equal(url.searchParams.get('w'), '384')
  assert.equal(url.searchParams.get('q'), '75')
  assert.equal(url.searchParams.get('auto'), 'format')
  // fit=max: Sanity không phóng to vượt kích thước gốc.
  assert.equal(url.searchParams.get('fit'), 'max')
})

test('⚠️ URL từ GROQ đã sẵn ?w=1200 — bề rộng cũ phải bị đè, không được nhân đôi', () => {
  // queries.ts nối sẵn `?w=1200&auto=format&q=75` vào mọi imageUrl.
  const src = `${SANITY}?w=1200&auto=format&q=75`
  const href = loader({ src, width: 256, quality: 75 })
  const url = new URL(href)
  assert.equal(url.searchParams.getAll('w').length, 1)
  assert.equal(url.searchParams.get('w'), '256')
})

test('giữ nguyên tham số cắt ảnh mà admin đã chọn', () => {
  const src = `${SANITY}?rect=0,100,800,600&w=1200`
  const url = new URL(loader({ src, width: 640, quality: 75 }))
  assert.equal(url.searchParams.get('rect'), '0,100,800,600')
  assert.equal(url.searchParams.get('w'), '640')
})

test('thiếu quality thì mặc định 75, không ra chữ "undefined" trong URL', () => {
  const href = loader({ src: SANITY, width: 640 })
  assert.equal(new URL(href).searchParams.get('q'), '75')
  assert.ok(!href.includes('undefined'))
})

test('⚠️ ảnh ngoài Sanity trả nguyên vẹn — externalImageUrl của post/review', () => {
  // Domain lạ không hiểu tham số của Sanity; thêm vào là nguy cơ hỏng URL ký sẵn.
  const src = 'https://example-shop.com/cdn/shop/files/whiskey.jpg?v=17281'
  assert.equal(loader({ src, width: 640, quality: 75 }), src)
})

test('đường dẫn nội bộ và data URI trả nguyên vẹn, không được ném lỗi', () => {
  assert.equal(loader({ src: '/logo.png', width: 128, quality: 75 }), '/logo.png')
  assert.equal(loader({ src: 'data:image/gif;base64,R0lGOD', width: 8 }), 'data:image/gif;base64,R0lGOD')
})
