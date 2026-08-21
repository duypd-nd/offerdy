/**
 * Go the <script> khoi HTML truoc khi nhung bang `dangerouslySetInnerHTML`.
 *
 * ── VI SAO CAN ─────────────────────────────────────────────────────
 *
 * Do that 2026-08-21: **ca 107/107 trang store deu bao loi hydration.** Nguyen
 * nhan la mot doan <script> nam trong chinh noi dung "About" luu o Sanity —
 * `src/lib/ai/aboutTemplate.ts` sinh ra no. Script do leo nguoc len TUNG THE CHA
 * cho toi <body> va ep `border/box-shadow/background/border-radius/padding`
 * bang `!important` thang vao thuoc tinh style.
 *
 * Nhung the do la cua React. Sua chung sau khi may chu da dung HTML nghia la
 * React hydrate mot cay khac voi cay no da ky:
 *
 *   "some attributes of the server rendered HTML didn't match the client
 *    properties. This won't be patched up."
 *
 * ⚠️ Loc o LUC HIEN THI chu khong phai viet lai 107 tai lieu: mot cho sua chua
 * duoc tat ca noi dung cu lan noi dung sinh truoc khi template duoc va. Va noi
 * dung lay tu kho du lieu von di khong nen mang theo ma chay duoc — day la
 * chuyen dung dan, khong chi la sua mot loi hydration.
 *
 * ── PHAM VI ────────────────────────────────────────────────────────
 *
 * Ham nay CHI go the <script>. No KHONG phai bo lam sach HTML day du: khong
 * dung toi `onclick=`, `javascript:` hay <iframe>. Noi dung "About" do chinh he
 * thong sinh ra chu khong phai nguoi la gui len, nen muc nay dung voi rui ro
 * that. Neu mot ngay nao do co noi dung tu ben ngoai, phai dung mot bo lam sach
 * that su chu dung noi rong ham nay.
 */

// [\s\S] chu khong phai `.`: noi dung script luon co xuong dong, ma `.` khong
// khop ky tu xuong dong. `[^>]*` cho phep <script type="..."> co thuoc tinh.
const MAU_THE = String.raw`<script\b[^>]*>[\s\S]*?<\/script\s*>`

// The <script> khong dong (bi cat giua chung) — go tu do den het chuoi. Neu de
// lai, trinh duyet se nuot toan bo phan con lai cua bai viet lam noi dung script.
const MAU_MO_KHONG_DONG = String.raw`<script\b[^>]*>[\s\S]*$`

export function stripScripts(html: string): string {
  if (!html) return html
  return html
    .replace(new RegExp(MAU_THE, 'gi'), '')
    .replace(new RegExp(MAU_MO_KHONG_DONG, 'i'), '')
}

/**
 * Co the <script> nao trong day khong — dung cho phep do va cho test.
 *
 * ⚠️ Dung `new RegExp` moi lan thay vi mot hang so dung chung: `.test()` tren
 * mot regex CO CO `g` la co trang thai (`lastIndex` khong tu dat lai), nen goi
 * hai lan lien tiep voi cung dau vao se cho hai ket qua khac nhau. Mot ham kiem
 * tra ma tra loi khac nhau moi lan goi la thu rat kho lan ra.
 */
export const hasScript = (html: string): boolean =>
  !!html && new RegExp(MAU_MO_KHONG_DONG, 'i').test(html)
