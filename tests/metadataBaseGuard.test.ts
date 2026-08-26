/**
 * Hang rao chan viec o *Canonical URL* bi vo hieu hoa lai lan nua.
 *
 * ⚠️ VI SAO PHAI QUET MA NGUON chu khong test mot ham.
 *
 * Ngay 26/08 o *Canonical URL* duoc noi vao `metadataBase` o `layout.tsx`, va
 * diem dung hom do ghi la "moi dia chi tuyet doi cua site" nay di qua mot bien
 * duy nhat. Do lai 27/08 thi KHONG: `siteBaseUrl` duoc import o **dung 1 file**,
 * trong khi **22 file** tu khai `const BASE = 'https://www.offerdy.com'` va 14
 * cho ghi thang dia chi vao `canonical:` / `openGraph.url`.
 *
 * Tai lieu Next noi ro vi sao dieu do lam ca co che thanh vo nghia:
 *
 *   "If a metadata field provides an absolute URL, metadataBase will be ignored."
 *   (node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
 *    generate-metadata.md)
 *
 * Nghia la: mot dong `canonical: 'https://www.offerdy.com/x'` do vao bat cu
 * trang nao — hom nay, hay sau nay khi them trang moi — deu am tham tat o cau
 * hinh do di, DUNG TREN TRANG AY, khong bao loi, khong ai thay. Build sach,
 * test xanh, trang tra 200. Dung ho loi "bao thanh cong ma van hong" ma
 * AGENTS.md liet ke.
 *
 * Khong co ham nao de test. Thu duy nhat chan duoc no la doc lai ma nguon.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const APP = path.join(process.cwd(), 'src', 'app')

/** Moi file .ts/.tsx duoi src/app, tru khu vuc /admin (trang noi bo, khong SEO). */
function fileTrangCongKhai(dir: string, ra: string[] = []): string[] {
  for (const m of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, m.name)
    if (m.isDirectory()) {
      if (m.name === 'admin') continue
      fileTrangCongKhai(p, ra)
    } else if (/\.tsx?$/.test(m.name)) {
      ra.push(p)
    }
  }
  return ra
}

const files = fileTrangCongKhai(APP)

/**
 * Dong nay co ghi cung dia chi vao mot truong URL cua `Metadata` khong.
 *
 * ⚠️ Ban dau ham nay neo `^\s*(canonical|url):` — va no KHONG bat duoc dang
 * pho bien nhat: `alternates: { canonical: 'https://...' },` (khoa nam giua
 * dong). Hang rao van xanh, vi khong co gi lot qua ca. Chinh test "phai KEU
 * tren dong xau" ben duoi lam lo ra — do la ly do no ton tai.
 */
export function laMetadataGhiCung(dong: string): boolean {
  return /(?:^\s*|[{,]\s*)(canonical|url):\s*['"`]https?:\/\//.test(dong)
}

/** Dong nay co tu khai lai mot dia chi goc khong. */
export function laKhaiLaiDiaChiGoc(dong: string): boolean {
  return /^\s*(?:const|let)\s+\w*BASE\w*\s*=\s*['"`]https?:\/\//.test(dong)
}

test('⚠️ hang rao phai KEU tren dong xau — khong thi mau xanh cua no vo nghia', () => {
  // Luat 8c: mot phep do khong doi gi ca thi chua noi duoc gi. Hai test duoi
  // deu ky vong mang RONG, nen chung se xanh y het nhau ca khi vong quet hong,
  // ca khi vong quet nhin nham thu muc. Chung minh chieu nguoc lai o day.
  for (const xau of [
    "    alternates: { canonical: 'https://www.offerdy.com/blog' },",
    '      url: `https://www.offerdy.com/deals`,',
    '  canonical: "http://example.com/x",',
  ]) assert.ok(laMetadataGhiCung(xau), `phai bat duoc: ${xau}`)

  for (const lanh of [
    "    alternates: { canonical: '/blog' },",
    '      url: `/deals/${slug}`,',
    // ca dong that da tung gay bao dong gia o stores/[slug]/page.tsx:149
    "        url: store.website ? (store.website.startsWith('http') ? store.website : `https://${store.website}`) : undefined,",
    '        url: base,',
  ]) assert.ok(!laMetadataGhiCung(lanh), `khong duoc bat: ${lanh}`)

  assert.ok(laKhaiLaiDiaChiGoc("const BASE = 'https://www.offerdy.com'"))
  assert.ok(laKhaiLaiDiaChiGoc("const SHORT_LINK_BASE = 'https://www.offerdy.com'"))
  assert.ok(!laKhaiLaiDiaChiGoc("const base = await getSiteBase()"))
})

test('co quet duoc thu gi that khong (chinh phep do phai tu chung minh)', () => {
  // Neu duong dan doi ma khong ai sua, vong quet rong se cho PASS gia — dung
  // cai bay "phep do khong doi gi ca thi chua noi duoc gi" cua luat 8c.
  assert.ok(files.length > 30, `chi thay ${files.length} file duoi src/app — duong dan sai?`)
  assert.ok(
    files.some(f => f.endsWith(path.join('app', 'page.tsx'))),
    'khong thay src/app/page.tsx — vong quet dang nhin nham cho'
  )
})

test('⚠️ khong trang cong khai nao duoc ghi cung dia chi vao canonical / openGraph.url', () => {
  // Chi bat truong URL cua `Metadata`. JSON-LD dung dia chi tuyet doi la DUNG —
  // no phai la chuoi that, va no lay tu `getSiteBase()`.
  //
  // ⚠️ Ban dau vong quet nay bat MOI dong `url:` co "http" va no lap tuc bao
  // dong gia o `stores/[slug]/page.tsx:149` — dong do la website CUA SHOP trong
  // JSON-LD (`store.website`), khong phai truong Metadata. Bai hoc cu cua du an:
  // mot phep do bat qua rong thi nguoi ta hoc cach bo qua no.
  //
  // Nen chi bat CHUOI VIET THANG (`'https://...'`, `\`https://...\``). Dang
  // `url: \`${BASE}/x\`` khong lot qua duoc day — no bi test `const BASE` chan.
  const xau: string[] = []
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8')
    for (const [i, dong] of src.split('\n').entries()) {
      if (!laMetadataGhiCung(dong)) continue
      xau.push(`${path.relative(process.cwd(), f)}:${i + 1}  ${dong.trim()}`)
    }
  }
  assert.deepEqual(
    xau,
    [],
    'Truong Metadata dung dia chi TUYET DOI -> metadataBase bi bo qua, o ' +
      '*Canonical URL* thanh o chet tren dung trang nay. Viet duong dan tuong ' +
      `doi ('/blog', \`/deals/\${slug}\`) de metadataBase ghep:\n  ` +
      xau.join('\n  ')
  )
})

test('⚠️ khong file nao duoi src/app duoc tu khai lai dia chi goc', () => {
  // 22 file da tung lam dung viec nay. Moi ban sao la mot cho `getSiteBase()`
  // khong voi toi duoc.
  const xau: string[] = []
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8')
    for (const [i, dong] of src.split('\n').entries()) {
      if (laKhaiLaiDiaChiGoc(dong)) {
        xau.push(`${path.relative(process.cwd(), f)}:${i + 1}  ${dong.trim()}`)
      }
    }
  }
  assert.deepEqual(
    xau,
    [],
    'Dia chi goc phai lay tu `getSiteBase()` (JSON-LD, sitemap, robots, llms.txt) ' +
      'hoac de Next ghep qua `metadataBase` (truong Metadata):\n  ' + xau.join('\n  ')
  )
})

test('layout.tsx van la noi duy nhat dat metadataBase, va no doc o cau hinh', () => {
  const layout = fs.readFileSync(path.join(APP, 'layout.tsx'), 'utf8')
  assert.match(layout, /metadataBase: new URL\(base\)/, 'metadataBase khong con doc bien `base`')
  // ⚠️ Phai la `getSiteBase()`, KHONG phai `siteBaseUrl(seo.canonicalUrl)`.
  // `getConfigSeo()` di qua CDN Sanity nen doc o day tre ~60s so voi phan con lai
  // cua site — do that 27/08: sitemap/robots/llms.txt da doi ten mien trong khi
  // canonical va JSON-LD cua layout van giu ten cu.
  assert.match(layout, /const base = await getSiteBase\(\)/, 'layout khong con doc qua getSiteBase()')
  assert.doesNotMatch(layout, /const base = siteBaseUrl\(/, 'layout doc lai qua duong CDN — se tre hon ca site')

  const datOChoKhac = files
    .filter(f => !f.endsWith('layout.tsx'))
    .filter(f => /metadataBase:/.test(fs.readFileSync(f, 'utf8')))
    .map(f => path.relative(process.cwd(), f))
  assert.deepEqual(datOChoKhac, [], 'metadataBase dat o hai noi = hai nguon su that')
})
