import Link from 'next/link'

/**
 * Muc luc liet ke ĐỦ moi trang con — dung o may chu, khong co JavaScript.
 *
 * ── VI SAO CAN ─────────────────────────────────────────────────────
 *
 * Cac trang danh sach cua site (`/stores`, `/reviews`) phan trang bang trang
 * thai React: `useState(1)` roi `slice(0, PAGE_SIZE)`. Nghia la HTML may chu
 * tra ve CHI chua trang dau. Khong co `?page=2`, khong co the <a> nao tro toi
 * phan con lai.
 *
 * Google co chay JavaScript, nhung no KHONG bam nut phan trang. Hau qua do
 * duoc ngay 2026-08-21:
 *
 *   store   107 trong kho ·  24 co link noi bo  -> 83 trang MO COI
 *   review   23 trong kho ·  20 co link noi bo  ->  3 trang mo coi
 *
 * Va Search Console noi dung chu ve mot trong so do:
 *
 *   /stores/ohmmu — "Trang gioi thieu: Khong phat hien duoc trang nao"
 *                   "Da phat hien thay – hien chua duoc lap chi muc"
 *
 * Mot trang khong ai tro toi la mot trang khong ai coi la quan trong. Do chinh
 * la dinh nghia cua trang thai tren.
 *
 * ── VI SAO LA MUC LUC CHU KHONG PHAI SUA PHAN TRANG ────────────────
 *
 * Doi sang phan trang bang URL that (`?page=2`) cung sua duoc, nhung no keo
 * theo viec dong bo trang thai loc/tim kiem voi URL, va lam moi lan bam bo loc
 * thanh mot lan dieu huong. Muc luc A–Z thi:
 *
 *   · sua TRIET DE ngay lap tuc — moi trang con deu co mot the <a> that
 *   · khong dung gi den phan luoi co loc/tim kiem dang chay tot
 *   · va la thu NGUOI DUNG that su dung — muc luc A–Z la khuon quen thuoc cua
 *     moi trang coupon lon
 *
 * ⚠️ Phai HIEN THI THAT. Giau di bang `display:none` de "cho bot doc" la link
 * an — Google coi do la thu doan va co the phat. Muc nay nam cuoi trang, thu
 * gon, nhung nhin thay va bam duoc.
 */

export type IndexItem = { href: string; label: string }

/** Chu cai dau de gom nhom. So va ky tu la deu ve nhom "#". */
function chuDau(s: string): string {
  const c = s.trim()[0]?.toUpperCase() ?? '#'
  return /[A-Z]/.test(c) ? c : '#'
}

export default function AllLinksIndex({ title, hint, items, groupByLetter = false }: {
  title: string
  hint?: string
  items: IndexItem[]
  /** Gom theo chu cai dau — hop voi ten ngan (ten shop), khong hop voi tieu de dai. */
  groupByLetter?: boolean
}) {
  if (!items.length) return null

  const sorted = [...items].sort((a, b) => a.label.localeCompare(b.label, 'en'))

  const nhom = new Map<string, IndexItem[]>()
  if (groupByLetter) {
    for (const it of sorted) {
      const k = chuDau(it.label)
      const g = nhom.get(k)
      if (g) g.push(it)
      else nhom.set(k, [it])
    }
  }

  return (
    <nav className="allidx" aria-label={title}>
      <h2 className="allidx-title">{title}</h2>
      {hint && <p className="allidx-hint">{hint}</p>}

      {groupByLetter ? (
        [...nhom.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([chu, ds]) => (
          <div key={chu} className="allidx-group">
            <span className="allidx-letter">{chu}</span>
            <div className="allidx-links">
              {ds.map(it => <Link key={it.href} href={it.href}>{it.label}</Link>)}
            </div>
          </div>
        ))
      ) : (
        <div className="allidx-links allidx-links--flat">
          {sorted.map(it => <Link key={it.href} href={it.href}>{it.label}</Link>)}
        </div>
      )}
    </nav>
  )
}
