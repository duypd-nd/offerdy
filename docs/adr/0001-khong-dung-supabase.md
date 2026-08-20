# ADR 0001 — Không dùng Supabase (giữ Sanity)

- **Ngày**: 2026-08-21
- **Trạng thái**: Đã chốt
- **Phạm vi**: `e:\Offerdy` (site đang chạy `offerdy.com`). Không nói về `d:\Offerdy-New`.

---

## Bối cảnh

Câu hỏi "có nên dùng Supabase không" nảy ra sau đợt dựng đăng nhập admin ngày
20–21/08. Lúc đó phát hiện dataset Sanity **công khai** và dataset riêng tư là
tính năng **trả phí**, nên phải mã hoá cả khối để cất tài khoản quản trị.

Không có sự cố nào thúc đẩy câu hỏi này — nó là câu hỏi tìm hiểu. Nhưng nó **sẽ
quay lại**: bất kỳ ai đọc lại `src/lib/adminVault.ts` sau vài tháng và thấy dòng
*"dataset công khai nên phải mã hoá cả khối"* đều sẽ hỏi đúng câu này. Bản ghi
này tồn tại để lần sau không phải đánh giá lại từ đầu.

---

## Supabase là gì

Nền tảng dựng sẵn quanh **PostgreSQL**:

| Thành phần | Việc |
|---|---|
| Postgres | Cơ sở dữ liệu SQL thật — quan hệ, giao dịch, ràng buộc |
| Auth | Đăng nhập, OAuth, quên mật khẩu, xác thực email |
| Row Level Security | Phân quyền ở **tầng dữ liệu**, không phải tầng code |
| Storage | File và ảnh, kèm biến đổi ảnh |
| Realtime | Đẩy thay đổi dữ liệu xuống trình duyệt |

Gói miễn phí: 500MB dữ liệu · 1GB file · 50.000 người dùng/tháng.

---

## Nó giải quyết được gì cho Offerdy — có thật, đã đo

1. **Dataset đang công khai.** Đo 20/08: gọi API Sanity **không kèm token** vẫn
   trả về mọi tài liệu (107 store · 423 offer · 47 click). Postgres + RLS thì
   riêng tư theo mặc định.
2. **Đăng nhập tự viết tay.** Kho mã hoá AES-256-GCM + phiên tự ký + chặn dò mật
   khẩu trong bộ nhớ tiến trình — Supabase Auth thay được cả ba.
3. **Ba lỗ hổng quản lý ghi ngày 21/08**: sao lưu · nhật ký thao tác · cắt phiên
   khi đổi mật khẩu. Cả ba cần một nơi cất **riêng tư**.
4. **47 tài liệu `click`** đang nằm trong CMS — số liệu phân tích thuộc về bảng
   dữ liệu, không thuộc về hệ quản trị nội dung.

## Nó tốn gì — cũng có thật, cũng đã đo

| | |
|---|---|
| File chạm tới Sanity | **127 / 284** (45% mã nguồn) |
| Lượt gọi đọc / ghi | 109 / 170 |
| Dòng GROQ trong `src/sanity/queries.ts` | 1.216 |
| Dòng định nghĩa schema | 1.819 (19 file trong `sanity/schemaTypes/`) |
| **Ảnh trên CDN Sanity** | **1.082** |
| Tài liệu nội dung | 451 deal · 423 offer · 107 store · 42 post · 23 review |

⚠️ **1.082 ảnh là rào cản nặng nhất, và nó vừa mới được chữa cháy.** Bộ đổi kích
thước ảnh của site (`src/lib/imageLoader.ts`) chạy trên CDN Sanity — chuyển sang
cách đó **ngày 13/08/2026** sau khi Vercel hết hạn mức tối ưu ảnh và **cả site
mất sạch ảnh**. Rời Sanity là dựng lại đúng đường đi vừa phải cứu tuần trước.

📌 **Một phát hiện ngược chiều, đáng ghi**: Sanity Studio **không còn là nơi biên
tập chính**. Dự án có **44 trang admin** và **27 file server action** tự viết
(`/admin/stores`, `/admin/offers`, `/admin/deals`, `/admin/posts`,
`/admin/config/*`). Studio giờ là đường dự phòng. Vai trò thật của Sanity đã thu
hẹp còn **kho dữ liệu + CDN ảnh** — nên nếu có ngày chuyển, phần khó không phải
Studio mà là 1.082 ảnh.

---

## Quyết định

**Không chuyển sang Supabase. Giữ Sanity.**

Ba lý do, theo thứ tự sức nặng:

1. **Không có vấn đề nào đang gây thiệt hại.** Site chạy, ảnh chạy, đăng nhập
   vừa dựng xong và đã kiểm **22/22 phép kiểm đầu-cuối trên trình duyệt thật**.
   Chuyển nền dữ liệu của một site đang chạy để giải quyết một khó chịu là đổi
   rủi ro thật lấy tiện nghi.
2. **45% mã nguồn chạm tới Sanity** — đây là viết lại, không phải thay thư viện.
3. **Thêm một dịch vụ là thêm một điểm hỏng.** Dự án một người, và riêng tuần
   này đã có hai sự cố production: ảnh chết 13/08, sitemap đóng băng 8 ngày phát
   hiện 20/08. Chi phí thật của Supabase không phải tiền — là thêm một thứ nữa
   có thể hỏng lúc 2 giờ sáng.

⚠️ **Cạm bẫy phải kiểm chứng nếu sau này dùng thật**: dự án Supabase gói miễn phí
bị **tạm dừng sau 7 ngày không có request**. Nếu đăng nhập admin phụ thuộc vào
nó, một tuần không ai vào admin là tự khoá cửa. Chưa kiểm chứng con số này.

---

## Ba mốc khiến quyết định này đảo ngược

Ghi rõ để lần sau không phải tranh luận lại. **Chưa mốc nào xảy ra tính đến
21/08/2026.**

1. **Cần quan hệ dữ liệu thật hoặc giao dịch.** Ví dụ cụ thể đã thấy trước: nhập
   đơn hàng từ GoAffPro và đối soát hoa hồng. GROQ không làm được join và không
   có giao dịch. Việc này đã được ghi là "không tính được lãi/lỗ thật" trong
   `/admin/ad-planner` ngày 10/08 — nếu quyết định làm thật thì mốc này chạm.
2. **Có người dùng cuối đăng nhập** (không phải quản trị viên): tài khoản khách,
   danh sách yêu thích, đăng ký nhận mã giảm giá. Lúc đó tự viết auth là sai lầm.
3. **Chạm trần Sanity lần nữa.** Đã chạm một lần — hạn mức reset ngày 01/08/2026,
   trước đó mọi lệnh ghi đều hỏng. Nếu tái diễn và gói trả phí của Sanity đắt hơn
   Supabase thì tính lại.

---

## Hệ quả — làm gì thay cho việc chuyển

Ba lỗ hổng quản lý ghi ngày 21/08 **không cần Supabase**:

- **Sao lưu** — chỗ yếu nhất hiện nay, và không liên quan gì tới việc chọn cơ sở
  dữ liệu. Toàn bộ tài khoản quản trị nằm trong **một** tài liệu Sanity
  (`adminVault`) và **không có bản sao lưu nào**. Hai đường mất trắng: ai đó xoá
  tài liệu đó trong Studio (nó trông như rác vì đã mã hoá), hoặc mất
  `AUTH_PEPPER`. Cả hai đều không khôi phục được.
- **Nhật ký thao tác** — một tài liệu `auditLog` mã hoá bằng chính khoá đang có,
  cùng cách với `adminVault`.
- **Cắt phiên khi đổi mật khẩu / hạ quyền** — thêm một số phiên bản cho mỗi tài
  khoản; cookie mang số cũ bị từ chối. Không cần kho mới.

---

## Cách kiểm lại các con số trong bản ghi này

Đừng tin, hãy đo lại:

```bash
grep -rl "@/sanity\|next-sanity" src/ --include=*.ts --include=*.tsx | wc -l   # 127
find src -name "*.ts" -o -name "*.tsx" | wc -l                                  # 284
grep -c "" src/sanity/queries.ts                                                # 1216
```

Số ảnh: truy vấn `count(*[_type=="sanity.imageAsset"])` trên dataset
`production` → **1.082**.
