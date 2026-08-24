# Offerdy — Việc đang làm

> **File này chỉ chứa việc đang làm.** Nhật ký các điểm dừng đã khép nằm ở
> [`docs/NHAT_KY.md`](docs/NHAT_KY.md) — 2.400 dòng, giữ nguyên văn vì chứa số đo đã
> tốn công đo và bẫy đã trả giá. Đừng chép chúng ngược lại vào đây.

---

## 🔖 Điểm dừng 2026-08-24

**`main` = `origin/main` = `5e2201d`**, đã push, cây làm việc sạch.
Production đã chạy `5e2201d` và **đã kiểm trên web thật**, không phải chỉ build xong.

| Phép kiểm | Kết quả |
|---|---|
| `npm test` | **565 / 565** |
| `npx tsc --noEmit` | sạch |
| `npm run build` | sạch |
| `npm run lint` | **62 vấn đề (28 lỗi, 34 cảnh báo)** — xem cảnh báo bên dưới |

⚠️ **`lint` 62 là CÓ SẴN, không phải mới hỏng.** Đã `git stash` bản chưa sửa chạy lại và
ra y hệt 62. Phần lớn là `react-hooks/set-state-in-effect`. Ghi chú cũ nói *"lint sạch"*
là **sai**, đã bỏ. 4 trong số đó đến từ chính các script `.scratch/*.mjs` — ESLint quét cả
thư mục đó.

Dev server **đang tắt**. Bản dựng production cục bộ cũng đã tắt.

---

## 🔴 Hai việc chặn mọi thứ — chỉ anh làm được

**1. Nạp credit Anthropic** ở console.anthropic.com → Plans & Billing, rồi **xoay khoá đó**
(nằm trong nhóm 4 khoá đã lỡ dán vào phòng chat). Đo tách bạch 23/08:
`GET /v1/models` → **200** (khoá tốt) · `POST /v1/messages` → **400** (hết tiền).
Đang kẹt: viết bài, kịch bản video, chấm ảnh, báo cáo AI.

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

## 📅 Hai mốc đo đã hẹn — đừng quyết gì lớn trước chúng

| Ngày | Việc |
|---|---|
| **25/08** | Mở `/admin/reports` xem nhãn `video`. Số đầu tiên cho một kênh ngoài Google — nhưng n=1, đọc như nhiễu. |
| **27/08** | Đo lại `0/65` trang nội dung chưa được Google bò, để biết phép cắt sitemap 20/08 có tác dụng không. |

⚠️ Khi đọc kết quả 27/08, **cân nhắc hai giả thuyết chứ đừng chỉ một**: (a) nút thắt là
hạn mức bò, hoặc (b) nút thắt là đánh giá chất lượng — 42 bài đều do AI sinh, trên một tên
miền affiliate chưa có uy tín. Nếu là (b) thì **viết thêm bài AI là đào sâu thêm hố**.

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
| Google 30 ngày | **0 lượt bấm** · 3 URL trong chỉ mục · 0/65 trang được bò |

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

## Hôm nay làm được gì — 4 commit

| Commit | Việc |
|---|---|
| `29ac54a` | Nút *Get Code* và thanh tab không còn xén im lặng khi chữ dài ra |
| `6e32d13` | Điểm dừng + sửa con số lint sai trong sổ |
| `07a3d13` | Một từ dài không còn làm vỡ bố cục điện thoại |
| `5e2201d` | **Trang `/how-we-test`** — hồ sơ thử mã, nội dung KHÔNG do AI viết |

Câu hỏi mở màn là *"xây 10 ngôn ngữ theo vị trí khách hàng mất bao lâu"*. Trả lời sau khi
đo: **đừng làm** (1,33 triệu từ, sitemap 197 → ~1.970 URL, trong khi 3 URL chỉ mục / 0 bấm).
Chi tiết ở `PROJECT_CONTEXT.md` mục *International readers*.

---

## ⚠️ Bẫy trả giá hôm nay — đừng mắc lại

1. **`pkill -f "next start"` KHÔNG giết được server trên Windows.** Server mới chết vì
   `EADDRINUSE`, server **cũ vẫn trả lời**, vòng chờ `curl → 200` báo "sẵn sàng" →
   **đo nhầm bản cũ hai lần liền, im lặng**. Phải `netstat -ano | grep :3100` lấy PID rồi
   `taskkill //PID <pid> //F`, và **grep log tìm `EADDRINUSE` trước khi tin là đã khởi động**.

2. **CSS do template sinh ra rồi lưu vào Sanity là CSS ĐÓNG BĂNG.** `aboutTemplate.ts` sinh
   HTML kèm khối `<style>` rồi lưu cả cụm — sửa template **không chạm** tới 107 mô tả store
   đã lưu. Trả giá đúng một vòng build + đo mới biết. Phải đè bằng luật ở `globals.css`.

3. **Bộ đo tràn lề nói dối BẢY kiểu, không phải bốn.** Ba kiểu mới: băng chạy marquee, cắt
   theo dòng `-webkit-line-clamp`, và trang trí `::before/::after` thò ra ngoài. Phải chặn
   ở **cả hai chỗ**: vòng quét chính *và* hàm `capCat()` leo tổ tiên.

4. **Backtick trong chú thích nằm giữa template literal** làm đứt chuỗi — lần thứ tư.
   Cả `heredoc` của shell lẫn `const CSS = \`...\`` trong TSX đều dính.

5. **Trình rút gọn CSS của Next đảo thứ tự thuộc tính** — grep một luật vừa viết mà trả 0
   thì chưa chắc build hỏng; có thể chỉ là grep trượt.

6. **Git Bash biến `/blog/...` thành `C:/Program Files/Git/blog/...`** — luôn dùng
   `MSYS_NO_PATHCONV=1` khi truyền đường dẫn URL.

📌 **Bài học lớn nhất trong ngày**: một `width` cố định đặt vừa khít một chuỗi tiếng Anh
**là một lỗi xén đang nằm chờ**. Dùng `min-width`.
