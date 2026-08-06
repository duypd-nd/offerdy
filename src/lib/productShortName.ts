/**
 * Ten NGAN cua san pham, de dung giua van xuoi cua bai viet.
 *
 * Vi sao can: `[PRODUCT:n]` in ra tieu de marketing day du cua shop — tam den muoi bon
 * tu. Bai PoshRug dang chay that co **12/12 doan mo dau bang mot chuoi nhu vay**:
 * *"Cowhide Area Rug – Handmade Black & White Accent is a handmade black-and-white
 * version built from what the shop calls premium cowhide fibers."* Doc nhu mot bang
 * tinh do vao cau van. Model khong co loi thoat nao vi `[PRODUCT:n]` chi co MOT dang.
 *
 * ⚠️ Ten ngan do CODE suy ra, model khong bao gio duoc go. Cung ky luat voi gia
 * (`hasPrice: boolean`): model chon DUNG DANG NAO, code quyet dinh NOI DUNG. Mot ten
 * san pham do model tu viet la mot cho de sai ten hang, va sai ten hang tren trang ban
 * hang thi khong ai phat hien duoc bang mat.
 *
 * ⚠️ **Chi co ban theo CA LO, co y khong export ban mot ten.** Tinh duy nhat la thuoc
 * tinh cua ca tap: "Cowhide Area Rug" la mot ten tot neu no dung mot minh va la mot ten
 * HONG neu ba san pham cung mang no. De lot mot ham goi tung cai la mo lai dung cai loi
 * ma module nay sinh ra de dong. Cung ly le voi "MOT lenh goi cho MOI LAN QUET SHOP"
 * o `nameArticleIdeas.ts:16-19`.
 *
 * 📌 Rui ro con lai, biet truoc: khi khong rut gon duoc thi ham tra ve **nguyen tieu de
 * day du**, nen `[PRODUCT:n|short]` in ra y het `[PRODUCT:n]`. Dung va an toan, nhung
 * nghia la tat cu CO THE tai xuat tren mot danh muc ma moi tieu de chi phan biet duoc o
 * do dai day du (danh muc Kyoku la mot ung vien: tieu de nhoi thong so). Neu thay mot
 * bai lai toan ten dai, do la cho nay chu khong phai model khong nghe loi.
 */
import { identityPart, scanSpecs } from '@/lib/articleIdeas'
import { modelCodes, tokenize } from '@/lib/productMatch'

/**
 * Dau ngan giua phan DINH DANH va duoi marketing: `– — | :`.
 *
 * ⚠️ **KHONG cat o dau phay.** Frizzlife dat ma model ngay sau dau phay
 * (*"…Water Filter System, DW15"*), va cat o do da tung lam DW10 voi DW15 thanh mot
 * san pham — 179 dong danh muc co con 160 bang cach danh mat SKU that
 * (`articleIdeas.ts:230`).
 */
const SEPARATOR = /\s[–—|:]\s|\s[–—|:]|[–—|:]\s/

/** Tu khong bao gio duoc dung mot ten ngan (dung bai hoc `DANGLING_TAIL`). */
const CANNOT_END_ON = new Set(['&', 'and', 'with', 'for', 'the', 'a', 'an', 'of', '-', ','])

/** Tu keo theo ve phai: cat doi mot cap la mo ta sai mon hang. */
const PAIRING = new Set(['&', 'and'])

const MAX_WORDS = 5
/** Ten "ngan" ma khong ngan hon bao nhieu thi khong mua duoc su da dang nao. */
const MAX_LENGTH_RATIO = 0.65

/** So sanh tu: bo hoa/thuong va dau cau vien, giu nguyen ben trong (`PD600-TAM3`). */
function norm(word: string): string {
  return word.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
}

/**
 * ⚠️ Dung ban THO cho hai phep kiem duoi, khong dung `norm`.
 *
 * `norm('&')` tra ve chuoi RONG (no bo het ky tu khong phai chu/so), nen tra
 * `PAIRING.has(norm(w))` thi khong bao gio dung — do that: "Cowhide Area Rug – Brown &
 * Black Modern Accent" ra ten "Brown Rug", tuc goi cai tham nau-den la "cai tham nau"
 * trong khi trong lo con mot cai tham nau THAT.
 */
function raw(word: string): string {
  return word.trim().toLowerCase()
}

function words(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

/** Phan dinh danh, da cat duoi marketing. Duoi tra ve rieng de dung khi phan dau bi trung. */
function splitCore(title: string): { core: string[]; tail: string[] } {
  const identity = identityPart(title)
  const m = identity.match(SEPARATOR)
  if (m?.index === undefined) return { core: words(identity), tail: [] }
  const before = words(identity.slice(0, m.index))
  // Cat ma con duoi mot tu thi khong phai duoi marketing — giu nguyen ca cau.
  if (before.length < 2) return { core: words(identity), tail: [] }
  return { core: before, tail: words(identity.slice(m.index + m[0].length)) }
}

/**
 * Nac 0 — ma model cua chinh shop.
 *
 * ⚠️ Lay lai **dang chu goc** tu tieu de chu khong dung token. `tokenize` cat
 * `PD600-TAM3` thanh `pd600` + `tam3`; dung token se ra `PD600` va **danh mat `-TAM3`**
 * — dung loi `PD600-TAM` da ghi o `generateArticleContent.ts:389-391`, mot chuoi khong
 * bao gio khop duoc voi gi.
 *
 * Doc ma tren `scanSpecs().stripped` de `600GPD` khong bi nham la ma model, giong het
 * cach `ownModelCode` lam (`articleIdeas.ts:409`).
 */
function ownCode(title: string, storeTokens: Set<string>): string | null {
  const { core } = splitCore(title)
  const identity = core.join(' ')
  let code = modelCodes(tokenize(scanSpecs(identity).stripped)).find(c => !storeTokens.has(c))

  // ⚠️ `scanSpecs` AN MAT ma model dang chu-so-chu. Do that tren HWWH: `X5A` bi doc la
  // "5 A" (ampere — `a` nam trong `ATTACHED_ONLY`) va bi cat khoi `stripped`, nen chiec
  // xe duy nhat trong ca lo khong co ma, roi xuong Nac 1 va nhan cai ten vo nghia
  // "Electric". Tam cua so nay: doc lai tren tieu de CHUA cat thong so, nhung chi nhan
  // ma **bat dau bang chu cai** — nho vay `600gpd`, `21qt`, `20l` (gia tri thong so
  // that, luon la so truoc) khong the lot vao, ma `x5a` thi duoc.
  if (!code) {
    code = modelCodes(tokenize(identity)).find(c => !storeTokens.has(c) && /^[a-z]/.test(c))
  }
  if (!code) return null
  const surface = words(title).find(w => tokenize(w).includes(code) && !storeTokens.has(norm(w)))
  return surface ? surface.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '') : null
}

/**
 * Danh tu goc cua ca tap — tu ma moi san pham deu co va **khong bao gio dung dau**.
 *
 * ⚠️ Dieu kien "khong dung dau" moi la cho quyet dinh. Tren PoshRug ca `Cowhide` lan
 * `Rug` deu co mat 12/12, nhung ba san pham bat dau bang `Cowhide` — chon no thi ba cai
 * do khong con gi ben trai de noi dai ra. `Rug` khong bao gio dung dau nen luon noi
 * duoc.
 *
 * Chon theo **so tu dung truoc khac nhau**, khong theo tan suat. Tren Kyoku ca `Knife`,
 * `VG10` va `Steel` deu co 9/9, nhung `Knife` co 8 tu dung truoc khac nhau (Steak,
 * Utility, Butcher, Bread, Kiritsuke, Paring, Nakiri, Cleaver) con `VG10` chi co 2. Tu
 * nao duoc dung de PHAN BIET cac san pham thi chinh no la danh tu goc.
 */
function headNoun(cores: string[][], storeTokens: Set<string>): { word: string; distinct: number } | null {
  const present = new Map<string, number>()
  const startsWith = new Set<string>()
  const before = new Map<string, Set<string>>()
  const posSum = new Map<string, number>()

  for (const core of cores) {
    const seen = new Set<string>()
    core.forEach((w, i) => {
      const k = norm(w)
      if (k.length < 2 || storeTokens.has(k)) return
      if (i === 0) startsWith.add(k)
      if (!seen.has(k)) {
        seen.add(k)
        present.set(k, (present.get(k) ?? 0) + 1)
        posSum.set(k, (posSum.get(k) ?? 0) + i)
      }
      if (i > 0) {
        const set = before.get(k) ?? new Set<string>()
        set.add(norm(core[i - 1]))
        before.set(k, set)
      }
    })
  }

  const need = Math.ceil(cores.length * 0.9)
  let best: { word: string; distinct: number } | null = null
  let bestPos = -1
  for (const [word, count] of present) {
    if (count < need || startsWith.has(word)) continue
    const distinct = before.get(word)?.size ?? 0
    const avgPos = (posSum.get(word) ?? 0) / count
    // ⚠️ Hoa vi so tu dung truoc thi lay tu NAM SAU HON. Tren ba cai tham co phan dinh
    // danh y het nhau ("Cowhide Area Rug"), ca `area` lan `rug` deu chi co dung mot tu
    // dung truoc — chon nham `area` thi ten ra thanh "Brown & Black Area".
    if (!best || distinct > best.distinct || (distinct === best.distinct && avgPos > bestPos)) {
      best = { word, distinct }
      bestPos = avgPos
    }
  }
  return best
}

/** Cua so ket thuc tai `end`, noi dan sang trai; tra ve mang tu. */
function windowLeft(core: string[], end: number, size: number): string[] {
  return core.slice(Math.max(0, end - size + 1), end + 1)
}

/**
 * Cua so bat dau tu 0 cua `tail`, noi dan sang phai, khong bao gio ket bang tu treo.
 *
 * ⚠️ Nhin tu NGAY SAU cua so: neu tu ke tiep la `&`/`and` thi nuot ca no lan tu sau no.
 * Cat doi mot cap la mo ta sai mon hang — "Brown" mot minh goi cai tham nau-den la
 * "cai tham nau", trong khi trong lo con mot cai tham nau that.
 */
function windowRight(tail: string[], size: number): string[] {
  let n = Math.min(size, tail.length)
  while (n < tail.length && PAIRING.has(raw(tail[n]))) n = Math.min(n + 2, tail.length)
  while (n > 0 && CANNOT_END_ON.has(raw(tail[n - 1]))) n--
  return tail.slice(0, n)
}

function tooLong(candidate: string, full: string): boolean {
  return words(candidate).length > MAX_WORDS || candidate.length > full.length * MAX_LENGTH_RATIO
}

/**
 * Ten ngan cho mot LO san pham. Tra ve dung thu tu dau vao, va **duy nhat trong lo**.
 *
 * Ba nac, lay nac dau tien cho ra ten duy nhat va thuc su ngan:
 *  0. ma model rieng cua san pham (`PD600-TAM3`, `P10`)
 *  1. cua so noi dan sang trai tu danh tu goc (`Brisket Butcher Knife`)
 *  2. cua so lay tu duoi marketing, ghep voi danh tu goc (`Brown & Black Rug`)
 * Khong nac nao xong thi **lui ve tieu de day du**.
 */
export function shortProductNames(titles: string[], opts?: { storeName?: string }): string[] {
  if (!titles.length) return []
  const storeTokens = new Set(tokenize(opts?.storeName ?? ''))
  const parts = titles.map(splitCore)
  const cores = parts.map(p => p.core)
  const noun = headNoun(cores, storeTokens)

  // ── Nac 0 ──
  const codes = titles.map(t => ownCode(t, storeTokens))
  const codeCount = new Map<string, number>()
  for (const c of codes) if (c) codeCount.set(norm(c), (codeCount.get(norm(c)) ?? 0) + 1)

  const out: (string | null)[] = titles.map((title, i) => {
    const c = codes[i]
    return c && codeCount.get(norm(c)) === 1 ? c : null
  })

  // ── Nac 1: cua so noi sang trai tu danh tu goc ──
  //
  // Chay THEO VONG: moi vong noi rong cua so cua nhung san pham con trung nhau. Xet
  // trung tren TOAN BO lo (ke ca ten da chot o nac 0), vi hai ten giong nhau la hong
  // du chung den tu nac nao.
  const pending = new Set(out.map((v, i) => (v === null ? i : -1)).filter(i => i >= 0))
  // ⚠️ Nac 1 chi chay khi danh tu goc THAT SU phan biet duoc (>=2 tu dung truoc khac
  // nhau). Neu moi san pham deu mang cung mot cum truoc no thi noi sang trai chi de ra
  // cung mot chuoi cho tat ca — phai xuong thang Nac 2 lay thu phan biet o duoi.
  if (noun && noun.distinct >= 2) {
    const size = new Map<number, number>()
    for (const i of pending) size.set(i, 1)

    for (let round = 0; round < 12 && pending.size; round++) {
      const candidate = new Map<number, string>()
      for (const i of pending) {
        const core = cores[i]
        const at = core.map(norm).lastIndexOf(noun.word)
        if (at < 0) continue
        candidate.set(i, windowLeft(core, at, size.get(i) ?? 1).join(' '))
      }
      const count = new Map<string, number>()
      for (const v of out) if (v) count.set(v.toLowerCase(), (count.get(v.toLowerCase()) ?? 0) + 1)
      for (const v of candidate.values()) count.set(v.toLowerCase(), (count.get(v.toLowerCase()) ?? 0) + 1)

      let grew = false
      for (const [i, v] of candidate) {
        if (count.get(v.toLowerCase()) === 1) {
          out[i] = v
          pending.delete(i)
          continue
        }
        const at = cores[i].map(norm).lastIndexOf(noun.word)
        const next = (size.get(i) ?? 1) + 1
        if (next <= at + 1) {
          size.set(i, next)
          grew = true
        }
      }
      if (!grew) break
    }
  }

  // ── Nac 2: duoi marketing, ghep voi danh tu goc ──
  //
  // Day la nac cuu ba cai tham PoshRug: `Cowhide Area Rug` la NGUYEN phan dinh danh cua
  // ca ba, noi sang trai het chu van trung. Thu phan biet chung nam o duoi:
  // "Brown & Black Modern Accent" / "Handmade Black & White Accent" /
  // "Black & White Modern Accent Rug".
  if (noun && pending.size) {
    const size = new Map<number, number>()
    for (const i of pending) size.set(i, 1)

    for (let round = 0; round < 12 && pending.size; round++) {
      const candidate = new Map<number, string>()
      for (const i of pending) {
        const tail = parts[i].tail
        if (!tail.length) continue
        const win = windowRight(tail, size.get(i) ?? 1)
        if (!win.length) continue
        const nounWord = cores[i][cores[i].map(norm).lastIndexOf(noun.word)] ?? noun.word
        candidate.set(i, win.map(norm).includes(noun.word) ? win.join(' ') : `${win.join(' ')} ${nounWord}`)
      }
      const count = new Map<string, number>()
      for (const v of out) if (v) count.set(v.toLowerCase(), (count.get(v.toLowerCase()) ?? 0) + 1)
      for (const v of candidate.values()) count.set(v.toLowerCase(), (count.get(v.toLowerCase()) ?? 0) + 1)

      let grew = false
      for (const [i, v] of candidate) {
        if (count.get(v.toLowerCase()) === 1) {
          out[i] = v
          pending.delete(i)
          continue
        }
        const next = (size.get(i) ?? 1) + 1
        if (next <= parts[i].tail.length) {
          size.set(i, next)
          grew = true
        }
      }
      if (!grew) break
    }
  }

  // ── Nac 3: lui ve tieu de day du ──
  const result = out.map((v, i) => {
    if (!v) return titles[i]
    const clean = v.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '').trim()
    if (!clean || CANNOT_END_ON.has(raw(words(clean).at(-1) ?? ''))) return titles[i]
    return tooLong(clean, titles[i]) ? titles[i] : clean
  })

  // ⚠️ Luoi an toan cuoi cung. Ten nao co >=2 san pham cung mang thi MOI ke giu no lui
  // ve tieu de day du.
  //
  // Tuyet doi khong gan hau to `(2)`: mot token do code bia ra nam giua van xuoi khong
  // phan biet duoc voi mot ma model that, ma ca luong nay dung tren nguyen tac moi tu
  // deu truy nguoc duoc ve du lieu cua shop.
  const held = new Map<string, number>()
  for (const r of result) held.set(r.toLowerCase(), (held.get(r.toLowerCase()) ?? 0) + 1)
  return result.map((r, i) => (held.get(r.toLowerCase())! > 1 ? titles[i] : r))
}
