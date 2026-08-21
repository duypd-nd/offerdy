/**
 * Sinh tep kich ban video tu mot deal co that — `npm run video:spec <ma deal>`
 *
 * Ghep HAI nguon, va viec tach bach hai nguon nay la diem quan trong nhat:
 *
 *   Deal trong Sanity   -> SO LIEU DA KIEM CHUNG: gia, gia goc, % giam, ma coupon
 *   Trang san pham cua shop -> NHIEU ANH + mo ta
 *
 * ⚠️ Moi con so doc len trong video deu phai den tu nguon thu nhat. Trang san
 * pham dung de LAY ANH, khong dung de lay gia — gia tren trang co the khac gia
 * trong kho (Shopify Markets doi gia theo vi tri nguoi xem; da do that tren
 * empowerbeautiful.com tu Viet Nam: trang hien VND con API bao USD).
 *
 * Truong `verifiedFacts` ghi ro tung con so den tu dau. Buoc AI sau nay CHI duoc
 * dung so trong do.
 */
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadEnv, sanity, ok, bad, run, stop } from './_vault.mjs'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..')

await run(async () => {
  const maDeal = Number(process.argv[2])
  if (!Number.isInteger(maDeal)) {
    bad('Can ma deal.  npm run video:spec 1199')
    stop()
  }

  console.log('\nSinh kich ban video cho deal #' + maDeal + '\n')
  const env = loadEnv()
  const db = sanity(env)

  // ── 1. Deal: nguon so lieu da kiem chung ─────────────────────────
  const deal = await db.query(`*[_type == "deal" && code == ${maDeal}][0]{
    code, title, "slug": slug.current, priceSale, priceOrig, discount, discountByAmount,
    dealUrl, store, "anh": image.asset->url
  }`)
  if (!deal) { bad(`Khong tim thay deal #${maDeal}`); stop() }
  ok(`Deal: ${String(deal.title).slice(0, 62)}`)
  ok(`Gia ${deal.priceSale}${deal.priceOrig ? ` (goc ${deal.priceOrig}, giam ${deal.discount}%)` : ' — khong co gia goc'}`)

  // ── 2. Anh + ma: nap ham THAT cua du an ──────────────────────────
  const tmp = path.join(root, 'node_modules', '.cache', 'offerdy-vspec')
  fs.mkdirSync(tmp, { recursive: true })
  fs.writeFileSync(path.join(tmp, 'empty.js'), 'export {}\n')
  fs.writeFileSync(path.join(tmp, 'entry.ts'),
    "export { scrapeProductPage } from '@/lib/ai/scrapeProductPage'\n" +
    "export { couponForDealUrl } from '@/lib/dealStoreMatch'\n")
  await build({
    entryPoints: [path.join(tmp, 'entry.ts')], outfile: path.join(tmp, 'entry.mjs'),
    bundle: true, format: 'esm', platform: 'node', target: 'node24',
    packages: 'external',
    alias: { '@': path.join(root, 'src'), 'server-only': path.join(tmp, 'empty.js') },
    logLevel: 'warning',
  })
  const { scrapeProductPage, couponForDealUrl } = await import(pathToFileURL(path.join(tmp, 'entry.mjs')).href)

  // ── Ma giam gia: DOI CHIEU TRUC TIEP TRONG STORE ─────────────────
  //
  // Dung dung `couponForDealUrl` — ham ma trang deal va trang review dang dung,
  // voi dung truy van `STORE_HOSTS_QUERY`. Tu viet mot phep khop domain thu hai
  // la tao mot cho de lech: hai noi cung tra loi "shop nay co ma gi" ma tra loi
  // khac nhau thi khong ai biet ben nao dung.
  const storeHosts = await db.query(`*[_type == "store"]{
    "slug": slug.current, name, website, affiliateLink, category,
    "couponCode": *[_type == "offer" && store._ref == ^._id && active != false && defined(couponCode) && couponCode != ""]
      | order(coalesce(order, 9999) asc)[0].couponCode,
    "couponOfferText": *[_type == "offer" && store._ref == ^._id && active != false && defined(couponCode) && couponCode != ""]
      | order(coalesce(order, 9999) asc)[0].offerText
  }`)
  const coupon = couponForDealUrl(deal.dealUrl, storeHosts ?? [])
  const maCoupon = coupon?.code ?? null
  ok(maCoupon
    ? `Ma cua shop ${coupon.storeName}: ${maCoupon}`
    : 'Shop nay khong co ma — se bo scene ma')

  let anh = []
  let moTa = null
  if (deal.dealUrl) {
    const r = await scrapeProductPage(deal.dealUrl)
    if (r.error) bad(`Cao trang san pham that bai: ${r.error}`)
    else { anh = r.images ?? []; moTa = r.description ?? null }
  }
  // Anh trong kho luon la anh dau — no la anh nguoi van hanh da chon.
  if (deal.anh) anh = [deal.anh, ...anh.filter(a => a !== deal.anh)]
  if (!anh.length) { bad('Khong co anh nao'); stop() }
  ok(`${anh.length} anh (1 tu kho + ${anh.length - 1} tu trang san pham)`)

  // ── 4. Dung scene ────────────────────────────────────────────────
  const ten = String(deal.title).split('—')[0].trim()
  const shop = deal.store ?? 'the store'
  const lay = i => anh[i % anh.length]

  const scenes = []
  const them = (type, s) => scenes.push({ id: scenes.length + 1, type, kenBurns: scenes.length % 2 ? 'out' : 'in', ...s })

  them('hook', {
    image: lay(0), duration: 3.6,
    overlayText: 'LOOKING FOR\nA REAL GIFT?',
    voiceText: `Looking for a gift that actually gets used?`,
  })
  them('reveal', {
    image: lay(1), duration: 4.0,
    overlayText: ten.toUpperCase().slice(0, 26),
    voiceText: `This is the ${ten} from ${shop}.`,
  })
  // Mot scene cho moi anh con lai — day la thu lam video dai va do mat,
  // thay vi mot tam anh dung yen 30 giay.
  const nhan = [
    ['DECANTER\n+ GLASSES', `The set comes with everything you need, ready to use straight away.`],
    ['PREMIUM\nWOODEN BOX', `It arrives in a wooden box, so it looks the part before it is even opened.`],
    ['MADE TO\nLAST', `Solid, well made, and built to stay on the shelf for years.`],
    ['GREAT FOR\nGIFTING', `Birthdays, weddings, or just because — it works for most occasions.`],
    ['EVERY\nDETAIL', `Every piece is finished properly, right down to the detail.`],
  ]
  for (let i = 0; i < Math.min(nhan.length, Math.max(0, anh.length - 2)); i++) {
    them('benefit', { image: lay(i + 2), duration: 4.0, overlayText: nhan[i][0], voiceText: nhan[i][1] })
  }

  // ── Gia: chi noi khi co so THAT ──────────────────────────────────
  if (deal.priceOrig && deal.discount) {
    them('offer', {
      image: lay(anh.length - 1), duration: 4.0,
      overlayText: `${deal.discount}% OFF`,
      priceBadge: { sale: deal.priceSale, orig: deal.priceOrig },
      voiceText: `Right now it is ${noiGia(deal.priceSale)}, down from ${noiGia(deal.priceOrig)}.`,
    })
  } else {
    them('offer', {
      image: lay(anh.length - 1), duration: 3.4,
      overlayText: noiGiaNgan(deal.priceSale),
      voiceText: `It is ${noiGia(deal.priceSale)}.`,
    })
  }

  // ── Ma cua shop: scene ket, va giong doc nhac toi ────────────────
  //
  // ⚠️ NOI DUNG MUC DO, KHONG HUA. `src/sanity/queries.ts` ghi ro: day la ma cua
  // CA SHOP, khong phai ma rieng cho san pham nay, va nhieu shop loai tru hang
  // dang giam gia khoi ma. Nen loi doc la "shop dang co ma X, thu o buoc thanh
  // toan" chu KHONG phai "dung ma X de duoc giam them" — cau sau la mot loi hua,
  // va mot ma khong ap duoc o buoc thanh toan lam mat long tin nhieu hon la
  // khong hien ma nao.
  if (maCoupon) {
    them('coupon', {
      image: lay(0), duration: 5.0,
      overlayText: `CODE\n${maCoupon}`,
      couponBadge: maCoupon,
      voiceText: `${shop} currently has the code ${danhVan(maCoupon)}. Worth trying at checkout.`,
    })
  }

  them('cta', {
    image: lay(1), duration: 4.0,
    overlayText: 'LINK IN BIO',
    voiceText: `Tap the link to check today's price.`,
  })

  const tDur = 0.5
  const tongDai = scenes.reduce((n, s) => n + s.duration, 0) - tDur * (scenes.length - 1)

  const spec = {
    _ghiChu: 'Sinh tu npm run video:spec. Gia va ma coupon lay tu Sanity; anh cao tu trang san pham.',
    version: 1,
    format: '9:16',
    width: 1080, height: 1920, fps: 30,
    output: `deal-${deal.code}-${(deal.slug ?? 'video').slice(0, 40)}`,
    product: {
      dealCode: deal.code,
      brand: deal.store ?? null,
      name: deal.title,
      priceSale: deal.priceSale ?? null,
      priceOrig: deal.priceOrig ?? null,
      discountPercent: deal.discount ?? null,
      couponCode: maCoupon,
      ctaUrl: `https://www.offerdy.com/d/${deal.code}?s=video`,
      sourceUrl: deal.dealUrl ?? null,
      moTaGoc: moTa ? String(moTa).slice(0, 400) : null,
    },
    verifiedFacts: [
      `priceSale = ${deal.priceSale} — tu deal #${deal.code} trong Sanity`,
      deal.priceOrig ? `priceOrig = ${deal.priceOrig} — tu deal #${deal.code}` : 'khong co gia goc -> KHONG duoc noi ve giam gia',
      deal.discount ? `discountPercent = ${deal.discount} — code tinh tu hai gia tren` : 'khong co % giam',
      maCoupon ? `couponCode = ${maCoupon} — tu offer dang bat cua shop` : 'shop khong co ma doc quyen -> KHONG duoc bia ma',
      `${anh.length} anh — tu ${deal.dealUrl ?? 'kho'}`,
    ],
    voice: { provider: 'elevenlabs', voice: null, rate: 0 },
    transition: { type: 'fade', duration: tDur },
    scenes,
  }

  const ra = path.join(root, '.scratch', `spec-${deal.code}.json`)
  fs.writeFileSync(ra, JSON.stringify(spec, null, 2))
  ok(`${scenes.length} scene · dai ${tongDai.toFixed(1)}s`)
  if (tongDai < 30) bad(`CHU Y: chi ${tongDai.toFixed(1)}s, duoi 30s — trang san pham it anh qua`)
  ok(`Da ghi: .scratch/spec-${deal.code}.json`)
  console.log(`\n  Dung video:  npm run video:render .scratch/spec-${deal.code}.json\n`)

  fs.rmSync(tmp, { recursive: true, force: true })
})

/** "$79.95" -> "79 dollars 95" cho giong doc phat am tu nhien hon. */
function noiGia(s) {
  const m = String(s ?? '').match(/([\d.,]+)/)
  if (!m) return String(s ?? '')
  const so = m[1].replace(/,/g, '')
  const [nguyen, le] = so.split('.')
  const donVi = /€/.test(s) ? 'euro' : /£/.test(s) ? 'pounds' : 'dollars'
  return le && le !== '00' ? `${nguyen} ${donVi} ${le}` : `${nguyen} ${donVi}`
}

// ⚠️ Khai bao bang `function`, KHONG phai `const`. Ca file boc trong `await run(...)`
// o dau module, nen luc do than module chua chay xuong toi day — mot `const` o
// cuoi file se nem "Cannot access before initialization". `function` thi duoc
// hoisted nen goi luc nao cung duoc.
function noiGiaNgan(s) { return String(s ?? '').trim() }

/** "OFFERDY" -> "O F F E R D Y" de giong doc danh van tung chu, nghe ro hon. */
function danhVan(s) { return String(s).toUpperCase().split('').join(' ') }
