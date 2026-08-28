# Offerdy — Việc đang làm

> **File này chỉ chứa việc đang làm.** Nhật ký các điểm dừng đã khép nằm ở
> [`docs/NHAT_KY.md`](docs/NHAT_KY.md) — 2.900 dòng, giữ nguyên văn vì chứa số đo đã
> tốn công đo và bẫy đã trả giá. Đừng chép chúng ngược lại vào đây.
>
> ⚠️ **27/08: file này đã phình lên 908 dòng** vì ba điểm dừng đã khép (24–26/08) vẫn nằm
> lại. Đã chuyển chúng sang nhật ký, còn **533 dòng**. Đừng để nó phình lại — điểm dừng
> khép xong thì chuyển đi ngay.

---

## 🔖 Điểm dừng 2026-08-28

✅ **Việc chặn lớn nhất đã gỡ: khoá AI miễn phí chạy thật trên production.** Báo cáo hằng
ngày sinh lúc `2026-08-27T17:57:03Z` bằng `groq/openai/gpt-oss-20b` sau 4 ngày chết.

| Phép kiểm | Kết quả |
|---|---|
| `npm test` | **612 / 612** |
| `npx tsc --noEmit` | sạch |
| `npm run build` | sạch |

| Commit | Việc |
|---|---|
| `eef9651` | `fix(ai)` — hàng rào thời hạn từng tồn tại mà **không chặn gì** (72,6s trong khi trần là 30s) |
| `199e184` | `feat(ai)` — `nameArticleIdeas` đi qua router (việc thứ 6) |
| `6d9a7d5` | `docs` — bẫy Vercel env, bảng đo router, "5 link hỏng" chỉ 1 hỏng thật |
| *(commit này)* | `fix(links)` — 401/403/429 là chặn truy cập, không kết luận được |

### 🎯 Giai đoạn 1 của trang quảng cáo — ĐÃ XONG 28/08: bịt lỗ hổng gắn nguồn

Kế hoạch đầy đủ ở `~/.claude/plans/l-n-t-ng-t-o-polished-panda.md` — **đọc trước, đừng
thiết kế lại.** Đã chốt với user: chỉ đề xuất (không tự động đấu thầu) · trần ngân sách
đặt bằng Google Ads Script phía Google · đích là Blog + Review + Store · doanh thu dùng
**lượt bấm sang merchant** làm đích thay thế (doanh thu thật nằm bên GoAffPro, không lấy
được).

**Vấn đề đã giải:** cookie gắn nguồn trước đây **chỉ** được đặt ở `/d/` và `/g/`. Quảng cáo
dẫn thẳng vào `/blog/...` thì cú bấm sang merchant sau đó không mang nguồn nào — tiền chạy
mà không quy được về chiến dịch. Đo được: **56 bản ghi `click`, chỉ 5 có nguồn.**

| File | Việc |
|---|---|
| `src/lib/attributionCookie.ts` (mới) | phần **thuần** của phép gắn nguồn, tách khỏi `attribution.ts` |
| `src/lib/proxyAttribution.ts` (mới) | đặt cookie cho mọi trang đích |
| `src/lib/shortLinkSource.ts` | thêm nguồn `google-ads` + `hasGoogleAdsClickId()` |
| `src/proxy.ts` | gộp nhánh gắn nguồn vào cổng gác admin |
| `tests/adAttribution.test.ts` (mới) | 8 assertion, **612 → 620** |

⚠️ **BẪY LỚN NHẤT — Next 16 đổi `middleware` thành `proxy`, và repo ĐÃ CÓ `src/proxy.ts`.**
Tôi viết `src/middleware.ts` theo trí nhớ và build gãy cứng: *"Both middleware file and proxy
file are detected"*. Next chỉ cho **MỘT** file proxy cả dự án, nên phải **gộp** logic gắn
nguồn vào chính cổng gác đăng nhập admin. Tài liệu ở
`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` — đúng lệnh `AGENTS.md`
là đọc trước khi viết, tôi đã bỏ qua và trả giá một vòng.

⚠️ **Thứ tự trong `proxy.ts` là vấn đề an ninh.** `DUONG_DAN_CAN_GAC` phải khớp y nguyên
`config.matcher`; sửa một bên mà quên bên kia là mở lỗ hổng. Đã kiểm đòn `/admin?s=ads-thu`
để thử đi vòng qua cổng gác — vẫn 307 về `/admin/login`.

⚠️ **Chỉ đặt cookie khi URL mang `?s=` hoặc click-id.** Không phải để tiết kiệm: đặt cookie
trên mọi lượt xem sẽ làm trang tĩnh trả về `Set-Cookie`, và một bản HTML đã cache kèm
`Set-Cookie` có thể phát nhầm cookie người này cho người khác. Đo trên `next start`: lượt
truy cập thường vẫn giữ `s-maxage=60`, chỉ lượt có tín hiệu mới thành `private, no-store`.

📌 **`google` và `google-ads` có CÙNG referer** — chỉ click-id (`gclid`/`gbraid`/`wbraid`)
tách được. Không tách thì tiền quảng cáo và lượt tìm kiếm miễn phí bị gộp làm một.

**Đã kiểm trên `next start` (không phải dev):**

| Phép kiểm | Kết quả |
|---|---|
| `?s=ads-thu&gclid=X` + referer Google | `google-ads\|ads-thu` ✅ |
| cùng referer, **bỏ** gclid | `google\|ads-thu` ✅ tách đúng |
| không tín hiệu gì | không đặt cookie, giữ `s-maxage=60` ✅ |
| `/d/1212?s=ig-thu` (đường cũ) | `instagram\|ig-thu\|1212` ✅ còn `entryCode` |
| `/admin`, `/admin?s=ads-thu` | 307 → `/admin/login` ✅ cổng gác nguyên vẹn |
| `/api/import` | 401 JSON ✅ |
| **Luật 8c** — gỡ bản vá, build lại, đo lại | cookie **biến mất**; lắp vào thì có ✅ |

⚠️ Trong lúc làm phép 8c đã dính đúng bẫy `AGENTS.md`: `taskkill` chạy nhưng **server cũ vẫn
sống**, log báo `EADDRINUSE`. Nếu không kiểm log trước khi đo thì đã đo nhầm bản cũ và kết
luận ngược. Trên Windows dùng `Stop-Process` của PowerShell, đừng dùng `taskkill //PID` qua
Git Bash — cú pháp bị nuốt.

**Chưa commit.** Còn Giai đoạn 2 (schema `adCampaign`/`adSpendEntry` + trang `/admin/ads`)
và Giai đoạn 3 (`src/lib/adPerformance.ts` + bộ đề xuất).

### 🎯 Giai đoạn 2 + 3 của trang quảng cáo — ĐÃ XONG 28/08

| File | Việc |
|---|---|
| `sanity/schemaTypes/adCampaign.ts` (mới) | chiến dịch: nhãn `?s=`, loại trang đích, ngân sách, trần |
| `sanity/schemaTypes/adSpendEntry.ts` (mới) | chi tiêu **một ngày một chiến dịch**, nhập tay từ Google Ads |
| `sanity/schemaTypes/configAds.ts` | thêm 2 ô **giả định** (tỉ lệ đơn ước tính, hoa hồng mặc định/đơn) |
| `src/lib/adPerformance.ts` (mới) | bộ đề xuất `tang`/`giu`/`dung`/`chua-du-so-lieu` + hàng rào PPC |
| `src/lib/adPlanner.ts` | tách `earningsPerOrder()` ra để hai bên dùng chung một nguồn |
| `src/app/admin/ads/` (mới) | trang + server action |
| `tests/adPerformance.test.ts` (mới) | 12 assertion, **620 → 632** |

**Ba điều trang này CỐ Ý không làm** — đừng "sửa" thành có:

1. **Không điều khiển Google.** Trần ngân sách và lệnh tắt phải đặt bằng Google Ads Script
   phía Google để cron chết thì trần vẫn giữ. Một cái nút ở admin mà Google không nghe là
   cảm giác an toàn giả.
2. **Không in số lợi nhuận.** Đơn hàng thật nằm bên GoAffPro. Thứ đo được là **chi phí mỗi
   lượt bấm sang merchant**. In ra "lãi" là bịa (luật 2).
3. **Không tự động tăng/giảm.** User đã chọn "chỉ đề xuất".

📌 **`chua-du-so-lieu` là phán quyết MẶC ĐỊNH và đó là câu trả lời ĐÚNG.** Ngưỡng 25 lượt
bấm sang merchant; với nền 21 lượt/30 ngày thì phần lớn chiến dịch sẽ nằm ở đây khá lâu.
Hai ngoại lệ bất đối xứng có chủ đích: **lỗ rõ thì dừng ngay** không chờ đủ mẫu, và **tiêu
gấp 3 ngưỡng mà 0 lượt bấm cũng dừng** (Poisson λ=3, P(0 lượt) ≈ 5%). Cho phép dừng sớm
(sai thì mất cơ hội), không cho phép tăng sớm (sai thì mất tiền).

### 🚨 BẪY MỚI, ĐẮT, SẼ CẮN LẠI — loại tài liệu MỚI vô hình với truy vấn không token

Chú thích trong [`src/sanity/client.ts`](src/sanity/client.ts) viết *"dataset production là
PUBLIC, đọc được không cần token"*. **Điều đó KHÔNG đúng với loại tài liệu mới.** Đo 28/08,
cùng endpoint `api.sanity.io`, chỉ khác header `Authorization`:

| Loại | Không token | Có token |
|---|---|---|
| `adCampaign` | **0** | **2** ⚠️ |
| `adSpendEntry` | **0** | **2** ⚠️ |
| `click` | 57 | 57 |
| `captionLog` | 3 | 3 |
| `store` | 107 | 107 |

Và nó trả về **mảng rỗng chứ không ném lỗi** — trang hiện "0 chiến dịch" y hệt như khi chưa
tạo cái nào. Mất một vòng đo mới tìm ra: tạo tài liệu xong, `curl` xác nhận HTTP 200 +
`operation: "update"`, mà trang vẫn trống.

**Luật rút ra: thêm một loại schema mới thì đường đọc phải dùng `writeClient` (có token),
đừng dùng `client`.** `/admin/ads` nay dùng `writeClient` để đọc, như `/admin/ad-planner`.

⚠️ **Kèm theo đó: mọi script `.scratch/` truy vấn không token sẽ "thấy 0" cho hai loại này**
— kể cả script kiểm-đã-xoá-chưa. Đó là một phép đo không phân biệt được "đã xoá" với "không
nhìn thấy". Dùng `.scratch/soi-public-read.mjs` để so hai bên.

### ✅ Đã kiểm bằng Chrome thật (không chỉ test)

Tạo 2 chiến dịch thử + 2 ngày chi tiêu, đo, rồi **xoá sạch** (đã xác nhận bằng truy vấn có
token). Cố ý **không** tạo tài liệu `click` giả — chúng sẽ làm bẩn 57 bản ghi click thật và
không phân biệt lại được.

| Phép kiểm | Kết quả |
|---|---|
| Bố cục 390px | 390/390, 0 xén im lặng, 26 khối cuộn có chủ đích ✅ |
| Phán quyết Poisson | $12,40 tiêu / 0 lượt / ngưỡng $0,24 → **"Nên dừng"** kèm lý do ✅ |
| Hàng rào PPC — store chưa khai | bấm ▶️ → server từ chối, Sanity vẫn `draft` ✅ |
| Hàng rào PPC — chiều ngược lại | blog bấm ▶️ → `active` ✅ **phân biệt được, không chặn bừa** |
| `npm test` · `tsc` · `build` | **632/632** · sạch · sạch ✅ |

⚠️ Hai lần suýt kết luận sai trong lúc đo, cả hai đều là bẫy đã ghi sẵn:
`node do-admin-mobile.mjs /admin/ads` **thiếu `MSYS_NO_PATHCONV=1`** nên đo nhầm trang 404
(rộng 980px = bề rộng mặc định của trang không có viewport meta), và script kiểm hàng rào
in nhãn cứng "HANG RAO THUNG" trong khi kết quả thật là đúng.

**Còn lại cho user** — hướng dẫn đầy đủ đã viết ở
[`docs/03-workflows/WORKFLOW_GOOGLE_ADS.md`](docs/03-workflows/WORKFLOW_GOOGLE_ADS.md),
script chặn ngân sách ở
[`docs/03-workflows/google-ads-tran-ngan-sach.js`](docs/03-workflows/google-ads-tran-ngan-sach.js).
⚠️ Script mới chỉ kiểm được **cú pháp** (`node --check`); các lệnh `AdsApp.*` đối chiếu tài
liệu chính thức 28/08 nhưng **chưa chạy thật lần nào** — bắt buộc bấm *Preview* trước *Run*.

**Chưa commit.**

### 💳 Google Ads đã chạy thật — 28/08, và ba việc code còn nợ

Tài khoản **610-787-1439** (`tkpro1.2026@gmail.com`), **tiền tệ VNĐ**, múi giờ GMT+7.
Chiến dịch đầu: Search → bài blog *12-Volt Car Refrigerator 58L vs 15L*, nhãn
`?s=ads-fridge-58l`, ngân sách **61.561đ/ngày**, CPC trần **4.000đ** (~$0,15),
Hoa Kỳ · Tiếng Anh · **không** Display, **không** Search Partners.

⚠️ **Tài khoản tính bằng VNĐ, không phải USD** — kéo theo ba hệ quả:
1. Script chặn ngân sách đã sửa: `TRAN_MOI_NGAY_VND = 150000` (≈2,5× ngân sách ngày;
   Google được tiêu tới 2× ngân sách trong một ngày lẻ nên đặt bằng ngân sách sẽ tắt oan).
   **`getStatsFor().getCost()` trả tiền theo đơn vị TÀI KHOẢN, không phải USD** — ghi `5`
   định là "5 đô" thì script hiểu 5 đồng và tắt sạch ngay lần chạy đầu, **không báo lỗi**.
2. Ô giá thầu trần cũng bằng đồng: điền `0.15` = 0,15 đồng = 0 hiển thị, nhìn y hệt
   "thị trường quá đắt". Đã bắt kịp trước khi chạy.
3. `/admin/ads` tính bằng USD → mỗi ngày phải quy đổi tay. Tỉ giá 28/08 ≈ **26.200đ/$1**.

**BA VIỆC CODE — ĐÃ XONG CẢ BA, 28/08:**

1. ✅ **XONG — sửa lỗi trộn tiền tệ trong `adPlanner.ts`.** `estimateAvgOrderValue()` nay
   **nhận chuỗi giá thay vì số**, tự đọc bằng `parsePriceAmount` + `priceSymbol`, gom theo
   tiền tệ rồi chỉ lấy trung bình **trong nhóm đông nhất**, trả thêm `symbol` và `skipped`.
   Thêm `estimateDungDuocLamUSD()` — chỉ `$` mới được đưa vào `breakEven()`; `€` cũng bị
   chặn (lệch 5–20%). Giao diện `/admin/ad-planner` hiện ước lượng kèm ký hiệu thật và
   dòng *"không phải USD — quy đổi rồi gõ tay"*.
   **Kiểm trên dữ liệu production thật:** WoWGadgets99 (₹) → *"KHÔNG tính"* thay vì `good`
   giả; Bodegacooler ($520) → *cần 1,0% → good*; Cloud Cushion vẫn đúng 10,5% như số cũ
   (không hồi quy shop USD). Test thêm 5 ca, **632 → 637**.
   *(mô tả lỗi cũ:)* `estimateAvgOrderValue()` lấy trung
   bình số thô từ `parsePriceAmount()`, mà hàm đó **không quy đổi tiền tệ**. Đo lại 28/08
   tách theo ký hiệu: **wowgadgets99.com = ₹1.257 ≈ $15**, không phải $1.257 — sai **83
   lần**. Kết luận *"WoWGadgets99 cần 0,4% khách mua → có cửa"* đang nằm trong `TODO.md`,
   trong chú thích `adPlanner.ts` và **đóng đinh trong `tests/adPlanner.test.ts`** là
   **SAI**; nó là shop tệ nhất chứ không phải tốt nhất. Shop thật sự đáng chạy là
   **bodegacooler.com ($520/đơn, 41 deal, USD)** — cần ~1% khách mua.
2. ✅ **XONG — ô tỉ giá ở `/admin/ads`.** Chọn đơn vị `đ`/`$` ngay trong form nhập chi phí;
   **quy đổi ở SERVER** (client là thứ sửa được). Bản ghi lưu cả `costNhapVao`, `donViNhap`
   và `tyGia` — ba tháng sau nhìn lại `$0,47` vẫn biết nó từ bao nhiêu đồng, tỉ giá nào.
   **Kiểm bằng Chrome thật:** gõ `61561đ` @ 26.200 → Sanity lưu `cost: 2.3496564…` ✅
3. ✅ **XONG — và KHÔNG CẦN VIẾT DÒNG NÀO.** Đọc code trước khi viết đã tránh được cả một
   tính năng thừa: `AffiliateLink.tsx` **đã** đẩy `dataLayer.push({event:'affiliate_click'})`
   và GTM (`GTM-K3N8W8B8`) **đã** nằm sẵn trong `layout.tsx`. Kiểm bằng Chrome thật trên
   `/stores/bodegacooler`: sự kiện bắn đúng, kèm `affiliate_url` + `store_name`.
   Việc còn lại là **cấu hình trong GTM**, đã ghi thành Bước 5b của
   `docs/03-workflows/WORKFLOW_GOOGLE_ADS.md` (ID `AW-18414886120`, trigger Custom Event
   `affiliate_click`, **để trống ô Giá trị** — site không biết đơn hàng đáng bao nhiêu).
   ⚠️ Kỳ vọng đúng mức: thuật toán cần ~15–30 chuyển đổi/tháng, site đang 21 lượt/30 ngày —
   giá trị 1–2 tháng đầu là **báo cáo**, chưa phải tối ưu.

⚠️ **BẪY MỚI ĐÃ SUÝT LÀM SAI PHÉP ĐO:** `npm run dev` khi cổng 3000 bận thì Next **không**
báo `EADDRINUSE` — nó lặng lẽ nhảy sang **3001** và ghi `Port 3000 is in use by process N`.
Mọi script đo vẫn gọi 3000 và đo **server cũ**. Vòng kiểm chỉ grep `EADDRINUSE` là **không
đủ**; phải grep thêm `"Port 3000 is in use"` **và** `"Local:.*localhost:3000"`.

### 🚨 LỖ HỔNG LỚN NHẤT PHÁT HIỆN 28/08 — link trong bài blog KHÔNG được đếm

Phát hiện **sau khi chiến dịch Google Ads đã bật**, trong lúc kiểm chuỗi đo đầu-cuối.

**Vấn đề:** thân bài blog/review render bằng `dangerouslySetInnerHTML`, và nút mua là thẻ
`<a>` **HTML thô** do [`postRender.ts:111`](src/lib/postRender.ts) sinh ra — **không phải**
component `AffiliateLink`. Không `onClick` nghĩa là không gì được đếm: không tài liệu
`click`, không `dataLayer`, không chuyển đổi Google Ads.

**Vì sao nó tệ hơn "thiếu số liệu":** `/admin/ads` sẽ thấy chi phí tăng mà 0 lượt bấm, rồi
phán quyết **"Nên dừng"** theo nhánh Poisson. Phán quyết đó **sai** — lượt bấm có thể đang
xảy ra mà không ai đếm. Máy tự tin nói một điều nó không biết, đúng thứ `chưa-đủ-số-liệu`
được dựng để tránh, mà bị chọc thủng từ hướng khác.

**Đã sửa:**

| File | Việc |
|---|---|
| `src/components/ArticleLinkTracker.tsx` (mới) | nghe click **uỷ quyền** ở `document`, lọc bằng `closest('.article-body')` |
| `src/actions/trackClick.ts` | thêm `trackArticleLinkClick(url)` — suy store theo **domain** (`hostKey`), ghi `articleHost` |
| `blog/[slug]/page.tsx` · `reviews/[slug]/page.tsx` | gắn `<ArticleLinkTracker />` |

📌 **Component `return null`, không bọc quanh gì cả.** `.article-body` có **18 quy tắc CSS**;
chèn thêm một `<div>` là rủi ro vỡ bố cục 42 bài đang chạy tốt để đổi lấy không gì. Nghe ở
`document` cho cùng kết quả mà không đụng một byte DOM.

📌 Dùng **đúng tên sự kiện** `affiliate_click` như `AffiliateLink.tsx` — hai đường khác nhau
nhưng một sự kiện, để **một** trigger GTM phủ được cả hai.

📌 **Không `preventDefault`**: người ta bấm để đi mua hàng, giữ lại cho một lượt ghi Sanity
(~350ms) là trực tiếp làm mất đơn.

### ⚠️ VÀ MỘT BẪY ĐO LƯỜNG MỚI — Chrome headless TỰ BỊ CHẶN

Sau khi sửa xong, phép đo **vẫn ra 0**, và suýt nữa tôi đi sửa tiếp một đoạn code không hỏng.

Nguyên nhân: `isLikelyBot()` chặn UA chứa `headlesschrome`, mà Chrome headless **tự khai
đúng chuỗi đó**. Proxy thấy "bot" nên cố tình không đặt cookie gắn nguồn — **hành vi đúng của
code**, nhưng nó làm mọi phép đo lái bằng CDP ra 0 và **trông y hệt như code hỏng**.

🔧 **Luật: mọi script CDP đo phần gắn nguồn PHẢI ghi đè UA:**
```js
await send('Network.setUserAgentOverride', { userAgent: '...Chrome/140.0.0.0 Safari/537.36' })
```
Đã vá 4 script trong `.scratch/`. Cách nhận ra: cookie `ofd_src` không xuất hiện trong
`Network.getCookies` dù `curl` (có UA thật) thấy header `Set-Cookie`.

**Đã kiểm chứng, cả hai chiều (luật 8c):**

| Phép kiểm | Kết quả |
|---|---|
| Vào URL quảng cáo, bấm link trong bài | `click` có `source: "google-ads"`, `campaign: "ads-fridge-58l"` ✅ |
| Gỡ `<ArticleLinkTracker />` ra, đo lại | **không ghi bản ghi nào** ✅ phép đo phân biệt được |
| Lắp lại | ghi được ✅ |
| `npm test` · `tsc` · `build` | **637/637** · sạch · sạch ✅ |

🧹 Đã xoá **5 bản ghi `click` do chính phép kiểm tạo** — chúng mang nhãn thật `ads-fridge-58l`
nên để lại sẽ cộng vào số của chiến dịch. `count(click)` về lại **57**, nhãn chiến dịch về **0**.

### 📌 Trạng thái Google Ads cuối ngày 28/08

- Tài khoản `610-787-1439`, chiến dịch đã tạo, **user đã tạm dừng** chờ deploy bản vá này
- Script trần ngân sách **đã cài, đã chạy, đã đặt lịch hằng giờ**; nhãn `OFFERDY_TAT_TU_DONG`
  đã tạo trong tài khoản
- Bản ghi `adCampaign.ads-fridge-58l` đã tạo trong Sanity (ngân sách $2,35 · trần $5,73),
  `configAds.tyGiaVndPerUsd = 26200`
- ⚠️ **CHƯA kiểm được đơn vị tiền của script** — chi tiêu hôm nay là 0, mà `0 >= 150000` sai
  ở cả hai cách hiểu đơn vị nên phép đo **không phân biệt được** (luật 8c). Sau ngày chạy đầu
  tiên: mở Nhật ký script, so con số với chi tiêu Google báo cùng ngày. Ra `~61000d` là đúng;
  ra `~2.35` thì `getCost()` trả USD và phải đổi trần thành `6`.
- **PHẢI DEPLOY trước khi bật lại chiến dịch** — không thì vẫn không đếm được gì.

### 📌 MAI LÀM TIẾP — 29/08/2026

1. ✅ **XONG 28/08 — đã dọn 5 nhãn `broken` sai của Apollo Moda.**
   `node .scratch/don-nhan-broken-sai.mjs --ghi`. Đo bằng chính `BROKEN_LINK_GROQ`
   (chép từ `checkOfferLink.ts:112`): **8 → 3**. Ba cái còn lại đều đúng:
   2 WoWGadgets99 (trả 200, sẽ tự lành thành `ok` sau cron đêm) và 1 Urtopia đã ẩn.
   📌 Kiểm trước khi ghi: script dùng `unset: ['linkStatus']` chứ không đặt `"unchecked"`.
   An toàn vì `linkStatus == "broken"` không khớp `null`, và chỗ đếm duy nhất có nguy cơ
   (`linkStatus != "unchecked"` ở `queries.ts:1097`) **đã kèm `defined()`** — đúng bẫy
   GROQ `null != ""` mà dự án đã trả giá.
2. ✅ **XONG 28/08 — đã ẩn offer Urtopia** (`jL1U8dTGKJX6KazVlT1Def`, €4.798). User chọn ẩn
   thay vì đổi link. `active: true → false`, đọc lại qua `api.sanity.io` (**không** qua CDN)
   để xác nhận chứ không tin mã thoát. Store Urtopia EU còn 4 offer, cả 4 `linkStatus=ok`.
   Script: `.scratch/an-offer-urtopia.mjs`.
   📌 Offer **vẫn nằm trong cron kiểm link đêm** (`active == true || linkStatus == "broken"`),
   nên nếu Urtopia bán lại bundle thì nhãn tự lành — chỉ cần bật `active` lại.
   ⚠️ Vấp lại luật 8b ngay lần đầu: gõ bộ lọc theo trí nhớ (`Bundle Carbon 1 Pro`) trong khi
   tiêu đề thật là *"Bundle **with** Carbon 1 Pro **and** Carbon Fusion"* → khớp **0**. Lọc
   theo URL (chuỗi duy nhất, chép nguyên văn từ dữ liệu) mới đúng.
3. **Phân phối, không xây thêm.** 📌 Giai đoạn 1 ở trên đã làm mọi trang đích gắn được
   nguồn, nên 3–5 bài Instagram sắp đăng **đo được thay vì mù** — thêm `?s=<nhãn>` vào link
   là xong. Số đo 28/08: **0 click hôm nay · 9 trong 7 ngày · 21 trong
   30 ngày · 56 click cả đời · 95/107 store chưa từng có click**. Short-link: **2 lượt mở cả
   đời, lần cuối 25/07** — cơ chế đếm không hỏng (nó đã ghi được 2 lượt), nghĩa là 30 ngày
   qua **không có gì được đăng**. Đăng thật 3–5 bài qua short link là việc duy nhất đổi được
   con số 21.
4. **30/08**: mốc đo đã hẹn — `/blog` được bò chưa, `28/65` có nhích không.

### Còn treo — user quyết

- **`AI_TASK_PROVIDER_article_names`**: để mặc định thì `article-names` rơi xuống Gemini lite
  và mất ~6/8 tên mỗi lần quét (hậu kiểm loại). Đặt `=anthropic` thì giữ chất lượng — việc
  này chạy tay, ít lần, và tên bài quyết định SEO. Bảng đo đầy đủ ở `docs/AI_ROUTER.md`.
- **Xoay 6 khoá API đã lộ** (dán thẳng vào khung chat 27/08).
- ✅ **`.gitignore` cho `.scratch/` — XONG 28/08.** `git status`: **228 → 2** (chỉ còn
  đúng hai file tôi vừa sửa). Luật: bỏ qua tất cả, **trừ** `.md` nằm trong thư mục con —
  đó là quy ước issue tracker (`docs/agents/issue-tracker.md`); `.md` nằm ngay dưới
  `.scratch/` là ghi chú nháp (có bản sao 346 KB của `NHAT_KY.md`) nên không theo dõi.
  ⚠️ Dòng `!.scratch/**/` là **bắt buộc**: git không mở lại được một file nếu thư mục cha
  của nó đang bị loại. Đã kiểm bằng `git check-ignore` trên 8 đường dẫn thật, đạt cả 8.
  📌 **Đo lại nỗi lo "lộ trên repo công khai": nhẹ hơn ghi ở đây.** Chưa file `.scratch`
  nào từng bị commit ngoài `clean-store-scripts.mjs` (đã soi: 0 khớp mẫu bí mật).
  `envkey.mjs` **không chứa khoá** — nó chỉ đọc `.env.local`. Thứ duy nhất đáng che là
  `cookies.txt` (cookie phiên đã ký của 3 tài khoản thử). Rủi ro là *"một lần `git add .`
  là lộ"*, không phải *"đang lộ"*. `.gitignore` **không gỡ file đã commit** — nếu sau này
  lỡ commit thì phải `git rm --cached`.

---

## 🔖 Điểm dừng 2026-08-27

> 👉 **Mai bắt đầu ở mục [`MAI LÀM TIẾP`](#-mai-làm-tiếp--28082026) ngay bên dưới.**
> Phần còn lại của mục 27/08 là số đo và bẫy — đọc khi cần, không cần đọc trước.

✅ **`main` = `origin/main` = `4ca4efa`, đã push** (3 commit + 1 commit docs). Cây làm việc sạch.
Không có server nào đang chạy. Vercel đang dựng — **kiểm production sáng mai**.

| Phép kiểm | Kết quả |
|---|---|
| `npm test` | **608 / 608** (587 + 21 test router AI) |
| `npx tsc --noEmit` | sạch |
| `npm run build` | sạch |

| Commit | Việc |
|---|---|
| `f7de865` | `feat(seo)` — ô *Canonical URL* điều khiển thật cả site, 22 bản sao `const BASE` → 0 |
| `a3c6116` | `feat(ai)` — bộ định tuyến nhà cung cấp: Groq/Gemini trước, Claude cuối |
| `d5beeb6` | `docs` — mốc SEO 27/08 (`0/65` → `28/65`) và sửa một kết luận sai của chính tôi |

---

## 📌 MAI LÀM TIẾP — 28/08/2026

### 🔴 Ba việc chỉ user làm được — việc 2 ĐÃ XONG 27/08 tối

1. **XOAY LẠI 6 KHOÁ API.** Chúng đã dán thẳng vào khung chat ngày 27/08 nên coi như **đã
   lộ**: 2 khoá Gemini, 2 Groq, 2 OpenRouter. Đều là free tier nên thiệt hại giới hạn ở hạn
   mức, nhưng đừng để vậy. Lần sau dán thẳng vào `.env.local` rồi bảo *"đã có khoá"*.

2. ✅ **THÊM KHOÁ VÀO VERCEL — XONG 27/08 tối, ĐÃ ĐO TRÊN PRODUCTION.**

   ```
   generatedAt = 2026-08-27T17:57:03Z   (trước đó đứng im từ 23/08 — chết 4 ngày)
   nha/model   = groq/openai/gpt-oss-20b
   triggeredBy = admin
   ```

   Router rơi đúng xuống nhà miễn phí đầu tiên và **không đụng Anthropic**, nên credit
   rỗng không còn chặn được nữa. Đó là toàn bộ mục đích của `a3c6116`.

   ⚠️ **Bẫy đã trả giá:** thêm biến vào Vercel **không** áp dụng cho deployment đang
   chạy — bấm *Tạo lại ngay* ngay sau khi thêm khoá vẫn ra `anthropic(auth)` y hệt. Phải
   có một lần **build mới** (push `644c8f1` lúc 17:52 là thứ mở đường). Đừng đọc lần thử
   thất bại đó thành "khoá sai".

3. **Nạp credit Anthropic** rồi xoay khoá đó. **Không còn gấp** — báo cáo hằng ngày đã
   chạy bằng Groq (xem ô ngay trên). Vẫn cần: 6 generator kiểu streaming (bài
   viết, review, kịch bản video) **chưa có đường lui** — xem `docs/AI_ROUTER.md` để biết vì
   sao cố ý không nối chúng.

### ✅ Kiểm production — ĐÃ CHẠY 27/08, cuối ngày ĐẠT CẢ 3

| Kiểm gì | Kết quả |
|---|---|
| `/sitemap.xml` · `/robots.txt` · `/llms.txt` · `/about` | ✅ 198 + 1 + 36 + 26 địa chỉ, **tất cả** là `https://www.offerdy.com`, 0 host lạ |
| Sentry releases | ✅ production nay chạy **`644c8f1`** (`created=2026-08-27T17:52:55Z`); lúc đo đầu ngày là `4ca4efa` |
| Thẻ *Lỗi production* | ✅ **đã hết** — báo cáo AI sinh được lúc 17:57 bằng `groq/openai/gpt-oss-20b`. Chi tiết ở việc 🔴 số 2 |

**Cron đêm 27/08 (01:40 UTC) vẫn chết, thông điệp đã đổi:**

```
KhongCoNhaNaoError: Moi nha cung cap AI deu hong: anthropic(auth)   (2x, environment=production)
```

Đây không phải tin xấu thuần tuý — `KhongCoNhaNaoError` là class **chỉ tồn tại trong `a3c6116`**,
nên nó chứng minh bộ định tuyến mới đang chạy thật trên production (đêm 26/08 lỗi là hết credit
Anthropic). Danh sách chỉ có **một** tên ⇒ Groq/Gemini/OpenRouter đều
`isAvailable() === false` ⇒ **khoá chưa thêm vào Vercel** (đúng việc 🔴 số 2 ở trên).

Script đo: `.scratch/do-release-2708b.mjs` (Sentry releases) · `.scratch/do-sentry-sang-2708.mjs` (issue).

### 🔧 Đã vá cùng ngày — điểm mù trong chính thông điệp lỗi đó

Nhà thiếu khoá bị bỏ qua **lặng lẽ** — bỏ qua thì đúng, nhưng **báo cáo** lặng lẽ thì không:
thông điệp chỉ nêu `anthropic(auth)` nên đọc y hệt như site chỉ có một nhà cung cấp; phải mở
[`index.ts:108`](src/lib/ai/router/index.ts) ra đọc mới biết. Nay nó ghi cả nhà bị bỏ qua:

```
Moi nha cung cap AI deu hong: groq(thieu-khoa), gemini(thieu-khoa), openrouter(thieu-khoa), anthropic(auth)
```

- `tenBienKhoa()` mới trong `registry.ts` trả **TÊN biến môi trường**, không phải giá trị khoá
  (`khoaCuaNha()` trả giá trị — **đừng bao giờ đẩy nó vào log/Sentry**).
- Test mới đã kiểm là **có đo thật**: bỏ bản vá ra thì đỏ 1, lắp vào thì xanh (luật 8c).
- `npm test` **609/609** · `npx tsc --noEmit` sạch · `npm run build` sạch. **Chưa commit.**

### 🔗 "5 link hỏng" — đo 28/08: chỉ **1** hỏng thật, 7 là báo động giả

Con số trong báo cáo AI là `linkChecked - linkOk`; bộ lọc thật của dự án
(`checkOfferLink.ts:112`) cho **10** offer `linkStatus == "broken"`, 8 trong đó có URL.
Gọi thử từng cái bằng `curl` kèm UA trình duyệt:

| Shop | Số | Kết quả đo | Kết luận |
|---|---|---|---|
| Apollo Moda | 5 | 301 → `www.` rồi **403 Cloudflare** *"Attention Required"* | ⚠️ **chặn bot**, chưa chứng minh được là chết |
| WoWGadgets99 | 2 | **200**, trang sản phẩm thật (248KB, đúng title) | ✅ báo động giả — link sống |
| Urtopia EU | 1 | 301 → `newurtopia.de/` (**trang chủ**) | ❌ **chết mềm thật** — sản phẩm không còn |

**Việc thật sự cần làm chỉ có 1**: offer *Urtopia Bundle Carbon 1 Pro + Carbon Fusion*
(€4.798) — sản phẩm đã bị gỡ, đổi link hoặc ẩn offer.

🔧 **ĐÃ VÁ 28/08**: `401/403/429` nay cho `indeterminate` thay vì `broken`
([checkOfferLink.ts](src/lib/checkOfferLink.ts)). Vòng chặn **cố tình rộng hơn** `landedOnRoot`
— nó **không** đòi dấu hiệu Cloudflare, vì Cloudflare đứng trước cả những site trả 403 thật
nên dấu hiệu đó không phân biệt được gì. Thứ phân biệt được là chính mã trạng thái:
**403 = "không cho bạn vào", khác hẳn 404 = "không có ở đây"**.

Hai test mới, và đã kiểm là có đo thật: gỡ bản vá ra thì đỏ 1. Test thứ hai giữ cho vòng
chặn không nới rộng ra cả họ 4xx/5xx — `404/410/500` **vẫn phải** kết luận được là hỏng.

⚠️ Nếu tin thẳng báo cáo AI thì đã đi sửa "5 link hỏng" — trong khi 5 cái đó chính là 5
cái **không** hỏng, còn cái hỏng thật lại nằm ngoài con số ấy.

### Câu hỏi đang mở — user quyết

**`.scratch/` không nằm trong `.gitignore`, mà repo này CÔNG KHAI.** Đo 27/08: **218 file
untracked**, trong đó có `cookies.txt`, `envkey.mjs`, `diag-tokens*.mjs`,
`measure-vault-backup.mjs`. Hôm nay không sao vì tôi stage từng đường dẫn, nhưng **một lần
`git add -A` là đẩy hết lên GitHub** — và `.scratch` đã từng được commit một lần (`2b9fe57`)
nên tiền lệ có rồi.

Ba cách, tôi nghiêng về (1): (1) thêm `.scratch/` vào `.gitignore` · (2) chỉ chặn file nhạy
cảm · (3) để nguyên, tự nhớ không bao giờ `git add -A`.

### Nếu muốn tôi code tiếp — theo thứ tự đáng làm

1. **`/blog` chỉ phơi 10/42 bài trong HTML máy chủ.** [`BlogPageContent.tsx:59`] là
   `'use client'` + `useState` + `.slice()` — đúng họ lỗi của 83 trang store mồ côi. ⚠️ 42
   bài **không** mồ côi (`/comparisons` link đủ 42/42), nên **lợi ích SEO là suy đoán**.
2. **Đo lại tốc độ bò 30/08** — xem mục *Mốc đo đã hẹn*.
3. `/links` dẫn bằng mã thay vì dẫn bằng deal — một buổi, nằm đúng chỗ traffic mạng xã hội
   đi qua.

### ⛔ Đừng làm — đã đo và đã bác bỏ 27/08

- **Đừng viết lại 33 bài blog.** Chúng chưa được bò vì đang **xếp hàng**, không phải vì bị
  chê. Bằng chứng ở mục 27/08 bên dưới.
- **Đừng trả 451 deal về sitemap** (mốc 03/09 trả lời sớm được rồi).
- **Đừng dựng "affiliate automation platform"** theo prompt ChatGPT — lý do đầy đủ ở cuối
  mục 27/08. Tóm tắt: nó viết cho dự án dùng Prisma/Supabase, đòi xây lại 6 thứ đã có, và
  tăng tốc **sản xuất nội dung** đúng lúc Google đang từ chối bò thứ đã có.

---

### ✅ Hai phép kiểm production đã hẹn — cả hai ĐẠT

Production đang chạy `bf2e2ac` (hỏi Sentry releases, không đoán theo "đã push"):
`created=2026-08-25T17:55:54Z`.

**Ô *Canonical URL*** — HTML trang chủ production: `<link rel="canonical">`, `og:url` và
`"url"` trong JSON-LD đều là `https://www.offerdy.com`.
⚠️ Riêng phép đo này **không** chứng minh code mới đang chạy — giá trị đó **giống hệt**
trước và sau bản vá (luật 8c). Thứ chứng minh là dòng release ở trên.

**Cron `daily-report` báo lỗi thay vì chết im lặng** — đêm 26/08 nó chết vì hết credit
Anthropic và **đã kêu thật**:

| | Sự kiện test tay 25/08 | Sự kiện đêm 26/08 |
|---|---|---|
| Thời điểm | 2026-08-25T15:59 UTC | **2026-08-26T01:11 UTC** (cron `0 1 * * *`) |
| release | `3003a3f` | **`bf2e2ac`** ← bản vá |
| environment | `local` | **`production`** |
| `extra` keys | backup, cron, pruned | **backup, cron, pruned** |

Ba khoá đó khớp đúng `extra: { backup, pruned, cron: 'daily-report' }` ở
[`route.ts:67`](src/app/api/cron/daily-report/route.ts) — nên chắc chắn nó đến từ
`captureException` mới.

⚠️ **Chỗ suýt đọc sai:** điểm dừng 26/08 chờ *"một issue MỚI mang culprit
`GET /api/cron/daily-report`"*. Sentry **gộp vào issue cũ `JAVASCRIPT-NEXTJS-1F`**, và
culprit trên production hiện ra là `s.generate(node_modules_02uqxih._)` (stack đã rút gọn).
Nếu chỉ đếm "có issue mới không" thì đã kết luận **sai là bản vá hỏng**. Phải mở sự kiện ra
đọc `release` + `environment` mới phân biệt được.

### 🎯 Mốc 27/08: `0/65` → **28/65**. Google ĐÃ bò và ĐÃ lập chỉ mục.

Đo bằng URL Inspection API trên **71 URL** lấy thẳng từ sitemap production (6 hub + 42 blog
+ 23 review). Script: `.scratch/` — xem mục *Cách đo lại* bên dưới.

| | 20/08 | **27/08** |
|---|---|---|
| Trang nội dung đã được bò | 0 / 65 | **28 / 65** |
| Trang nội dung trong chỉ mục | 0 / 65 | **28 / 65** |
| Tổng URL trong chỉ mục (kể hub) | 3 | **34 / 71** |
| Sitemap | 197 URL | 198 URL · 107 store · 42 blog · 23 review · **0 deal** |

**Bò được là vào chỉ mục luôn — 28/28.** Không có trang nào "đã bò mà bị loại".

### ⚠️ Nhưng chia đôi rất gắt: review **23/23**, blog **5/42**

| Trạng thái | Số bài blog |
|---|---|
| `Submitted and indexed` (bò 24/08) | **5** |
| `Discovered - currently not indexed` | **33** ← Google **biết** URL, **chọn không bò** |
| `URL is unknown to Google` | **4** |

### ❌ SỬA KẾT LUẬN: **không** phải khuôn blog bị chê chất lượng

> Trong vòng một buổi 27/08 tôi kết luận *"(b) đánh giá chất lượng, ở cấp khuôn bài blog"*
> rồi **tự bác bỏ bằng phép đo tiếp theo**. Giữ nguyên cả hai ở đây để lần sau đừng đi lại.

5 bài blog được bò là **đúng vị trí #1–#5 trong sitemap, liền một dải**:

```
# 1 (abs 126)  >>> DA BO <<<  best-baby-zip-swim-rompers-at-babywonders-2026
# 2 (abs 127)  >>> DA BO <<<  best-kids-cameras-at-bloomingbabies-2026
# 3 (abs 128)  >>> DA BO <<<  sc15-vs-sc21-vs-sc25-soft-cooler-bags-compared-2026
# 4 (abs 129)  >>> DA BO <<<  12-volt-car-refrigerator-vs-portable-refrigerator-...
# 5 (abs 130)  >>> DA BO <<<  12-volt-car-refrigerator-58l-vs-15l-compared-2026
# 6 (abs 131)                 12-inch-childrens-mountain-bike-vs-24-inch-...
```

Nếu Google chọn theo chất lượng thì 5 bài "được chọn" rơi trúng 5 vị trí đầu là xác suất
**1 / 850.668**. Đây là **hàng đợi đang chạy dở** — bò blog mới bắt đầu **24/08**, ba ngày
trước lúc đo.

📌 **Nên ĐỪNG viết lại 33 bài blog.** Chưa có một bằng chứng nào nói chúng có vấn đề.
Câu hỏi *"viết thêm bài AI có đào sâu hố không"* hiện **vẫn chưa trả lời được**.

⚠️ Một giả thuyết nữa cũng **tự bác bỏ**: định nói *"`/comparisons` bò từ 07/08 nên blog
thiệt"*. Nhưng `/reviews` bò từ **28/07** — cũ hơn — mà cả 23 review đều được bò. **Ngày bò
của trang hub không giải thích được gì.**

📅 **Đo lại 30/08** để biết tốc độ bò (bao nhiêu bài/ngày). Chỉ khi hàng đợi chạy hết mà
vẫn còn bài bị bỏ thì mới nói được tới chất lượng.

### Hai thứ khác đo ra được trong lúc truy phần trên

**1. `/blog` chỉ phơi 10/42 bài trong HTML máy chủ.**
[`BlogPageContent.tsx:59`](src/components/BlogPageContent.tsx) — `'use client'` +
`useState(1)` + `.slice()`. **Đúng họ lỗi của 83 trang store mồ côi** đã sửa 21/08.
⚠️ Nhưng nói cho công bằng: 42 bài **không** mồ côi — đo cả 12 trang hub thì `/comparisons`
link đủ **42/42**. Lỗi là thật, **lợi ích SEO là suy đoán**, chưa đo được.

**2. Ô *Canonical URL* hôm qua chưa đi tới đâu như đã tưởng** — xem mục riêng bên dưới.

### ✅ Nối nốt ô *Canonical URL* — nay điều khiển thật, đã đo đầu-cuối

| | Trước (đo 27/08) | Sau |
|---|---|---|
| File tự khai `const BASE` dưới `src/app` | **22** | **0** |
| `canonical:` / `og:url` ghi cứng địa chỉ | **14** | **0** |
| File nối được vào ô cấu hình | **1** (`layout.tsx`) | **14** |
| `npm test` | 582 | **587** |

**Cách chữa KHÔNG phải thay 53 chuỗi.** Tài liệu Next trong `node_modules` cho lối gọn hơn:

> *"If a metadata field provides an absolute URL, `metadataBase` will be ignored."*
> — `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md`

Nên chia **hai đường, không lẫn nhau**:

| Loại | Cách |
|---|---|
| Trường `Metadata` (`canonical`, `og:url`) | **đường dẫn tương đối** — `'/about'`, `` `/deals/${slug}` `` — để `metadataBase` ghép |
| JSON-LD · `sitemap.ts` · `robots.ts` · `llms.txt` · link chia sẻ | `await getSiteBase()` — Next không ghép hộ |

`getSiteBase()` ở [`src/sanity/queries.ts`](src/sanity/queries.ts) dùng **`freshClient` + hai lớp
cache**, đúng khuôn `getSiteName()` — đọc qua CDN ở đây là dính lại bẫy "ướp giá trị cũ 300s"
của 25/08. Hàm thuần (`dealSchema`, `dealPreviewHtml`) nhận `base` qua **tham số**,
`ShareDeal` (client) qua **prop** — vì `lib/*` không được import `@/sanity/queries`.

**Số đo đầu-cuối** (`npm start` :3100, đổi ô sang `shop.dealwise-test.example` rồi trả về):

| Trang | Đổi theo ô? |
|---|---|
| `/about` — canonical · og:url · JSON-LD của layout · JSON-LD của trang | ✅ cả 4 |
| `/how-we-test` · `/privacy` — canonical · og:url | ✅ |
| `/sitemap.xml` · `/llms.txt` | ✅ |
| `/robots.txt` | ✅ nhưng **trễ tới 5 phút** — nó là trang tĩnh `revalidate 5m` |

### ⚠️ Ba cái bẫy trả giá trong lúc làm — cái thứ hai là lỗi thật

**1. Phép đo tự phá chính nó.** Vòng chờ "server sẵn sàng" gọi `/robots.txt` **trước khi**
đổi giá trị → `unstable_cache` ướp giá trị cũ 300s → đo ra "không đổi gì". Suýt đọc thành
"bản vá hỏng". Phải **ghi giá trị TRƯỚC, bật server SAU**, và chờ sẵn sàng bằng **log**
(`grep "Ready in"`) chứ không gọi trang.

**2. `layout.tsx` đọc ô đó qua ĐƯỜNG KHÁC — lỗi thật, đã sửa.** Nó dùng
`siteBaseUrl(seo.canonicalUrl)` với `getConfigSeo()` đi qua **CDN Sanity**, còn cả site đọc
tươi. Kết quả đo được: `sitemap`/`robots`/`llms.txt` đổi tên miền ngay trong khi `canonical`
và JSON-LD của layout **vẫn giữ tên cũ**. Đúng "một nguồn sự thật mà hai đường đọc" — và trớ
trêu là chú thích cảnh báo điều đó nằm ngay cạnh dòng gây lỗi. Nay layout cũng dùng
`getSiteBase()`.

**3. `unstable_cache` SỐNG QUA khởi động lại server.** Nó nằm ở `.next/cache/fetch-cache`,
không phải trong bộ nhớ. Trả giá trị về rồi restart mà trang vẫn phát giá trị test — không
phải hỏng, là cache. Muốn đo ngay thì `rm -rf .next/cache/fetch-cache`. (Trên production
nút **Lưu** gọi `revalidatePath('/', 'layout')` nên không phải chờ.)

### Hàng rào mới: [`tests/metadataBaseGuard.test.ts`](tests/metadataBaseGuard.test.ts) — 5 test

Quét mã nguồn `src/app`, chặn (a) ghi cứng địa chỉ vào `canonical`/`og:url`, (b) khai lại
`const BASE`, (c) đặt `metadataBase` ở hai nơi.

📌 **Và nó bắt được lỗi của chính nó.** Test *"hàng rào phải KÊU trên dòng xấu"* lộ ra rằng
mẫu quét đầu tiên neo `^\s*canonical:` nên **không bắt được** dạng phổ biến nhất
`alternates: { canonical: '...' }` — nó xanh chỉ vì không nhìn thấy gì. Một hàng rào chỉ
kiểm chiều "không có gì lọt" thì xanh y hệt khi nó mù.

### ⚠️ CỐ Ý CHƯA LÀM — mặt short link vẫn ghi cứng tên miền

Đường SEO đã nối hết. **Đường short link / QR / caption thì chưa**, và đó là lựa chọn có
chủ ý chứ không phải sót:

| Chỗ | Dùng để |
|---|---|
| `src/app/admin/deals/DealAdmin.tsx` — `SHORT_LINK_BASE` | nút Copy link `/d/<mã>` trong admin |
| `src/lib/socialCaption.ts` — `FULL_BASE`, `DISPLAY_BASE` | caption mạng xã hội, QR, clipboard |
| `src/app/admin/social-kit/actions.ts` | `shortUrl` cho bộ đăng bài |
| `src/lib/safeFetch.ts` | chuỗi User-Agent `OfferdyBot`, không phải địa chỉ trang |

Vì sao dừng: chúng **không ảnh hưởng SEO**, đều nằm sau `/admin`, và `socialCaption.ts` là
hàm thuần đang có test riêng cùng bộ dựng video — đụng vào là mở một mặt trận khác trong
cùng một lượt. Hàng rào `const BASE` **chỉ quét `src/app` trừ `/admin`**, nên nó không kêu
oan ở đây.

📌 Hệ quả nếu thật sự đổi tên miền: QR và caption sẽ trỏ về tên miền cũ. **Nhớ mục này.**

### ✅ Bộ định tuyến AI — Claude thôi làm nhà duy nhất

Việc này bắt đầu từ một prompt ChatGPT đề xuất dựng cả "affiliate automation platform".
**Chỉ lấy §4–§8 + §55–§56 của nó**; phần còn lại bỏ, lý do ghi ở cuối mục.

Chi tiết đầy đủ: [`docs/AI_ROUTER.md`](docs/AI_ROUTER.md). Tóm tắt:

| | |
|---|---|
| Thứ tự mặc định | **groq → gemini → openrouter → anthropic** (đo thật, không phải cảm giác) |
| Generator đã nối | 5 file kiểu `messages.parse` (offer, deal, store, caption, daily-report) |
| Generator **không** nối | 6 file kiểu `messages.stream` — giữ nguyên Claude, có lý do |
| `npm test` | **608** (587 + 21 test router) |

**Đo thật qua router** (`npx tsx .scratch/do-router-that.mts`):

```
1. binh thuong        -> groq/openai/gpt-oss-20b        622ms  ✓
2. ep hong nha dau    -> gemini/gemini-3.5-flash-lite  1054ms  ✓ (roi xuong dung)
3. het ngan sach      -> NEM: anthropic(het-ngan-sach)         ✓ (khong lang le goi Claude)
```

⚠️ **Tính chất quan trọng nhất: chưa có khoá miễn phí thì hành vi y hệt trước 27/08.**
Nhà không có khoá bị bỏ qua lặng lẽ → rơi thẳng xuống Claude.

### ⚠️ Bốn cái bẫy trong buổi này, hai cái là lỗi thật của tôi

1. **Danh sách model nói một đằng, lệnh gọi nói một nẻo.** `GET /v1beta/models` liệt kê
   `gemini-2.5-flash*`; `:generateContent` trả **404** cho đúng tên đó.
2. **Tôi kết luận "model miễn phí hay bịa" từ một phép so sánh không hợp lệ** — đưa
   OpenRouter prompt rút gọn còn Groq/Gemini prompt thật. Chạy lại cùng đầu vào:
   **cả 8 model đều không bịa một chữ.** Thứ chặn bịa đặt là **prompt**, không phải model.
3. **20 test xanh mà cờ cấu hình vô hiệu.** `AI_MODEL_GROQ` truyền vào `generateStructured`
   không có tác dụng gì — adapter tự đọc `process.env`. Test dùng **nhà giả** nên không hề
   chạm vào phần đọc cấu hình. Chỉ lần chạy thật mới lộ. Nay test mục 9 dùng nhà **thật**.
4. **Bản vá tự tạo ra một dòng dữ liệu nói dối**: vẫn ghi `model: MODEL` vào Sanity, tức
   báo "claude-sonnet-5" kể cả khi Groq viết. Nay ghi `${provider}/${model}` thật.

### 🔴 Việc của user

- [ ] **Xoay lại 6 khoá API** — chúng đã dán thẳng vào khung chat nên coi như đã lộ.
- [ ] Thêm `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY` (+ bản `_2`) vào **Vercel**.
      `.env.local` chỉ có tác dụng ở máy này — cron trên production vẫn sẽ chết nếu thiếu.
- [ ] Nạp credit Anthropic (vẫn cần: 6 generator kiểu streaming chưa có đường lui).

### Vì sao KHÔNG làm phần còn lại của prompt

Prompt giả định Prisma + Supabase/PostgreSQL — dự án dùng **Sanity**, và
[`docs/adr/0001-khong-dung-supabase.md`](docs/adr/) đã chốt không dùng Supabase. Nó đòi xây
lại Search Console, GA4, chống bịa đặt, schema markup, cron — **tất cả đã có**. Nó đòi
adapter **Awin** trong khi dự án chạy **GoAffPro**. Và 8 bảng nó đề xuất, ở Sanity, sẽ nằm
trong dataset **CÔNG KHAI**.

📌 Lý do lớn nhất: nó tăng tốc **sản xuất nội dung**, trong khi đo sáng nay cho thấy
**33/42 bài blog đang ở `Discovered – currently not indexed`** — Google biết URL và **chọn
không bò**. Đổ thêm nội dung vào đúng lúc đó không giúp gì.

✅ **Đã commit và push** — `d5beeb6`. Việc còn lại chuyển lên mục
[`MAI LÀM TIẾP`](#-mai-làm-tiếp--28082026) ở đầu file.

### ⚠️ Không phải phép so sánh sạch — ba biến đổi cùng lúc

Quanh 20–21/08 có **ba** thay đổi, không phải một:

1. Sitemap **hết đóng băng** (`force-dynamic`) — trước đó nó kẹt ở bản build **8 ngày** trước
2. Cắt **451 deal** khỏi sitemap
3. Mục lục A–Z cho **83 trang store mồ côi** lần đầu có link nội bộ

Nên **không quy công cho riêng phép cắt deal được**. Nghi can chính thật ra là (1) — một
sitemap chết 8 ngày thì Google không có gì mới để bò.

📌 **Mốc 03/09 (trả 451 deal về sitemap) — nay trả lời được: ĐỪNG TRẢ VỀ.** Chỉ mục đi từ
3 lên 34 sau khi cắt. Không có lý do lật lại.

### 📉 Chỉ mục lên, nhưng lưu lượng CHƯA theo

14 ngày (11/08 → 24/08, GSC trễ 2 ngày): **31 lượt hiển thị cấp site · 1 lượt bấm**.

**Lượt bấm đó là thật và là lần đầu trên trang sống**: 21/08,
`/reviews/the-midgard-premium-sconce-review-copper-steel`, **vị trí 1,0**. Mốc cũ ghi
*"0 bấm suốt 30 ngày"* — nay không còn là 0.

⚠️ **Ma 404 vẫn còn ăn hiển thị.** 15 trang có hiển thị, trong đó **5 trang vẫn trả 404**
và ôm **19 / 37 hiển thị cấp-trang** — gồm cả trang nhiều nhất (13 hiển thị):

| Hiển thị | Trạng thái | Trang |
|---|---|---|
| 13 | **404** | `/reviews/willwork-jewelry-review-2026-...` |
| 2 | **404** | `/blog/how-to-save-money` |
| 2 | **404** | `/blog/daily-saving-habits` |
| 1 | **404** | `/reviews/flashfish-portable-power-station-review-2026-...` |
| 1 | **404** | `/reviews/hovsco-e-bike-review-2026-...` |

📌 **Đừng cộng hai bảng GSC với nhau.** Tổng theo ngày là **31**, tổng theo trang là **37** —
GSC gộp khác nhau ở mỗi chiều. Nói *"19/31"* là sai; phải nói *"19 trên 37 hiển thị
cấp-trang"*.

### Cách đo lại

Ba script chỉ-đọc, đã chạy thật 27/08, để sẵn ở `.scratch/` (chạy `node .scratch/<tên>`):

| Script | Việc | Ghi chú |
|---|---|---|
| `do-moc-2708.mjs` | bò / chỉ mục 71 URL | URL Inspection ~7s/URL ≈ **8 phút**. Lấy URL **từ sitemap**, đừng gõ tay |
| `do-gsc-2708.mjs` | hiển thị / bấm | `searchAnalytics/query`, chiều `date` **và** `page` |
| `do-sentry-sang-2708.mjs` | issue Sentry | `environment` là **tham số riêng**, không nhét vào `query=` (luật 8) |

⚠️ Chạy script từ **ngoài** `.scratch/` thì phải import `envkey.mjs` bằng
**`file:///e:/...`** — Node 24 từ chối `import ... from 'e:/...'` với
`ERR_UNSUPPORTED_ESM_URL_SCHEME`.

---

## 🔴 Hai việc chặn mọi thứ — chỉ anh làm được

**1. Nạp credit Anthropic** ở console.anthropic.com → Plans & Billing, rồi **xoay khoá đó**.
Đo tách bạch 23/08: `GET /v1/models` → **200** (khoá tốt) · `POST /v1/messages` → **400**
(hết tiền).

⚠️ **Cập nhật 27/08 — phạm vi kẹt đã HẸP LẠI, đừng đọc dòng cũ.** Bộ định tuyến AI nay đưa
5 việc ngắn (mô tả offer/deal/store, caption, báo cáo ngày) sang Groq/Gemini **miễn phí**.
Còn kẹt vì credit: **viết bài, review, kịch bản video, chấm ảnh** — 6 generator kiểu
streaming, cố ý không nối, lý do ở `docs/AI_ROUTER.md`.
📌 Và nó chỉ đúng **sau khi khoá miễn phí có trên Vercel**, không phải chỉ ở `.env.local`.

**2. ĐĂNG BÀI — nút thắt thật của cả dự án.**

Đo 24/08: **1 / 451 deal đã đăng (0,2%)**. Và tổng lượt bấm **từ đầu tới giờ** là **25**
(9 deal + 0 short link + 16 offer) — không phải mỗi tháng, mà là cả đời trang web.

🔑 **Đăng mạng xã hội KHÔNG cần credit**: caption mặc định do code thuần dựng, ảnh sản phẩm
cào bằng cheerio, QR + short link + ô tick đều cục bộ. **Chỉ video mới kẹt vì credit.**
Mỗi bài vài phút: chọn deal → *Lấy ảnh sản phẩm* → *Copy caption* → đăng → tick *đã đăng*.

⚠️ **Mốc 25/08 chỉ dựa trên MỘT video** đăng 23/08. Dù nó hiện ra số gì thì đó là **nhiễu,
không phải dữ liệu**. Muốn biết kênh này có chạy không thì cần khoảng **30 bài**.

**3. Viết ghi chú khi thử mã.** Trang [`/how-we-test`](https://www.offerdy.com/how-we-test)
đã dựng xong và đang chờ nội dung: 71 lần thử nhưng **chỉ 1 có ghi chú**. Mỗi lần thử tới,
thay vì chỉ bấm nút kết quả, viết một câu thật:

> *Thử 24/08: mã áp được, giảm 15%. Trang shop không ghi, nhưng không áp cho hàng sale.*

Tôi **không bịa được** những câu này, và bịa thì phá hỏng đúng thứ làm trang đó có giá trị.

---

## 📅 Mốc đo đã hẹn — đừng quyết gì lớn trước chúng

| Ngày | Việc |
|---|---|
| ~~25/08~~ | ✅ **ĐÃ ĐO**: nhãn `video` = **0**. Không phải chỉ nhãn đó — **chưa từng có** lượt bấm nào mang nhãn chiến dịch. Short link cả đời: 2, đều ngày 25/07. Bài đăng lúc 23/08 15:52; từ đó tới 25/08 **0 lượt bấm** toàn trang. ⚠️ Deal `#1471` có 2 lượt bấm nhưng cả hai rơi vào **21/08** — trước lúc đăng, không liên quan tới video. Và `videoMadeAt` chưa tick cho deal nào. n=1 nên đây là nhiễu, không bác bỏ được kênh video. |
| **30/08** | Đo lại tốc độ bò: bao nhiêu bài blog rời khỏi `Discovered – currently not indexed`? Chạy `node .scratch/do-moc-2708.mjs`. Chỉ khi hàng đợi chạy hết mà vẫn còn bài bị bỏ thì mới nói được tới chất lượng. |
| ~~27/08~~ | ✅ **ĐÃ ĐO**: `0/65` → **28/65** đã bò **và** đã vào chỉ mục; tổng chỉ mục 3 → 34. Nhưng review **23/23** còn blog **5/42** (33 bài kẹt ở `Discovered – currently not indexed`). Chi tiết ở điểm dừng 27/08 đầu file. |
| **03/09** | ~~Phán quyết trả 451 deal về sitemap~~ — **trả lời sớm được rồi: ĐỪNG TRẢ VỀ.** Chỉ mục 3 → 34 sau khi cắt. |

⚠️ Hai giả thuyết đặt ra ngày 20/08 — (a) hạn mức bò, (b) đánh giá chất lượng — **kết quả
27/08 là (a) ở cấp site, (b) ở cấp khuôn bài blog.** Nên câu *"viết thêm bài AI là đào sâu
thêm hố"* vẫn **đúng với blog**, và **không** đúng với review.

---

## 📊 Số đo hiện trạng (đo thật 24/08 — đừng đo lại)

### Kho hàng đã xây

| | |
|---|---|
| Deal | **451** — 100% có giá gốc, tính được mức giảm |
| Offer | **423** · có mã coupon **98** · có deep link **185 (43,7%)** |
| Store | **107** — 100% có link affiliate |
| Bài viết công khai | **42** · review **23** |
| Chữ nội dung trong Sanity | **318.076 từ** (store 64,5k · deal 170k · post 36,7k · offer 30,5k · review 16k) |

### Đã đưa ra ngoài

| | |
|---|---|
| Deal đã đăng bài | **1 / 451** |
| Deal đã làm video | **0 / 451** |

### Quay lại được

| | |
|---|---|
| Tổng lượt bấm, từ đầu tới giờ | **25** |
| ~~Google 30 ngày~~ | ~~**0 lượt bấm** · 3 URL trong chỉ mục · 0/65 trang được bò~~ ← **đã cũ, xem dòng dưới** |
| Google 14 ngày (đo 27/08) | **1 lượt bấm** (21/08, review Midgard, vị trí 1,0) · 31 hiển thị · **34** URL trong chỉ mục · **28/65** trang được bò |

### Thử mã coupon — tài sản riêng, không ai chép được

| | |
|---|---|
| Offer **có mã** | 98 |
| Trong đó **đã thử tay** | **71 (72%)** trên **67 shop** |
| Kết quả | **71/71 áp được** |
| **Có ghi chú** | **1 / 71** ← chỗ hổng duy nhất |
| Ngày thử | 03/08 (70 lần) và 05/08 (1 lần) |

⚠️ **72%, không phải 17%.** Ngày 24/08 tôi từng báo 17% vì lấy mẫu số là *mọi* offer (423),
phần lớn không có mã để mà thử. Và từng báo *"0 mã chạy"* vì hỏi `codeTestResult == "works"`
trong khi giá trị thật là `"worked"`.
📌 **Bài học: đọc schema trước khi viết điều kiện lọc, đừng đoán tên giá trị.**

### Tiền tệ — một tín hiệu chưa ai để ý

`$` 381 deal · **`₹` 44 deal** · `€` 24 deal.
**10% kho hàng đang là thị trường Ấn Độ.** Chưa làm gì với thông tin này.

---

## 💡 Ý tưởng cuối ngày 24/08 — chưa quyết, đọc trước khi làm gì lớn

### Ý chính: sản phẩm là MỘT MÃ, không phải 451 deal

Đo 24/08:

| | |
|---|---|
| Mã `OFFERDY` dùng được ở | **88 / 107 shop công khai (82%)** |
| Đã đích thân thử ở quầy | **63 shop** |
| Offer còn đang bật | 86 |

Là *trang tổng hợp coupon*, Offerdy đấu với RetailMeNot / Honey / Slickdeals trên sân của
họ, với **3 URL trong chỉ mục**. Không có cửa.

Là *"một mã, 88 cửa hàng"*, nó là **một câu người ta nhớ được và nhắc lại được** — đúng thứ
lan đi trên TikTok/Instagram, kênh duy nhất đang mở.

📌 Điểm mấu chốt **đã nằm sẵn trong code**, ở `src/components/LinkInBioCodes.tsx:13`:
*"GoAffPro ghi nhận đơn qua CẢ MÃ, nên khách dùng mã là đơn về mình kể cả khi họ không bấm
link."* → **Mã là cái phễu tốt hơn link.** File đó đã biết; định vị của cả trang thì chưa.

Hệ quả: bài đăng không còn là *"Deal #1470 giảm 20%"* (một bài một deal, 451 lần) mà thành
*"Mã này dùng được ở 88 cửa hàng, đây là danh sách"* — **một nội dung, dùng lại được, không
hết hạn.**

⚠️ **ĐÂY LÀ GIẢ THUYẾT, CHƯA CHỨNG MINH.** Nó suy ra từ dữ liệu, không phải từ khách thật —
vì chưa có khách thật. Với 25 lượt bấm cả đời, **mọi** lý thuyết định vị đều chưa được kiểm,
kể cả cái này. Cách kiểm rẻ nhất vẫn là **đăng 10 bài theo góc đó rồi xem**.

### Ba ý nhỏ hơn

1. **`/links` nên dẫn bằng mã, không dẫn bằng deal.** Hiện nó hiện 3 dòng mã rồi tới lưới
   12 deal. Nếu ý chính đúng thì dòng đầu tiên phải là mã và con số 88, trước khi cuộn.
   Đây là trang đích của toàn bộ traffic mạng xã hội — sửa nó rẻ hơn sửa 451 deal nhiều.
   *(Nếu làm ý nào trước thì nên là ý này — nhỏ, một buổi, nằm đúng chỗ traffic đi qua.)*

2. **Tạm thôi coi đây là canh bạc SEO.** 0/65 trang được bò, 3 URL chỉ mục, 0 bấm/30 ngày.
   Google sẽ không thưởng cho một tên miền affiliate mới nội dung AI trong 6–12 tháng. Nếu
   chấp nhận: trang web là **nơi đáp của traffic mạng xã hội**, không phải tài sản tìm kiếm
   — và khi đó hai trang quan trọng nhất là `/links` và `/how-we-test`, **không phải 42 bài
   viết**.

3. **`₹` 44 deal — thử một lần cho Ấn Độ.** 10% kho hàng. Cộng đồng săn deal Ấn Độ đông,
   nói tiếng Anh, sinh hoạt trên Telegram — rào cản thấp hơn TikTok.

---

## 📌 Nhắc lại một lần nữa, vì nó là điều quan trọng nhất

Công cụ đã đi trước việc dùng **rất xa**: 451 deal đã xây, **1 cái đã đăng**, tổng lượt bấm
cả đời trang web là **25**.

Xây thêm công cụ là việc dễ chịu — commit tăng, test tăng, bẫy được ghi. Phân phối là việc
khó chịu và có thể thất bại công khai. **Một tháng nữa mà vẫn 1/451 thì không phải tại thiếu
công cụ.**
