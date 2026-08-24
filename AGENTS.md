# AGENTS.md — môi trường này cắn ở đâu

> Đây **không** phải danh sách vai diễn. Đây là những thứ đã thật sự làm mất thời gian khi
> chạy lệnh trên chính máy này. Luật về *cách làm việc* nằm ở [`CLAUDE.md`](CLAUDE.md).

## ⚠️ Đây KHÔNG phải Next.js bạn từng biết

Bản Next.js trong repo này có thay đổi phá vỡ tương thích — API, quy ước, cấu trúc thư mục
đều có thể khác với thứ bạn nhớ. **Đọc tài liệu tương ứng trong `node_modules/next/dist/docs/`
trước khi viết code.** Để ý các cảnh báo ngừng hỗ trợ.

Vài hệ quả đã gặp:
- Next 16 chặn `revalidatePath` trong lúc render.
- Server Action bỏ khoá `undefined` trong payload — muốn **xoá** một trường phải gửi `null`.
- Module `'use server'` chỉ được export hàm `async`.
- `sitemap.ts` là Route Handler **được cache mặc định** — xem `PROJECT_CONTEXT.md`, mục
  *The sitemap is a Route Handler*. Nó đã hỏng im lặng **hai lần**.

---

## Máy này: Windows, repo ở `E:\Offerdy`

Có **bốn bản sao** repo Offerdy trên máy. `E:\Offerdy` là bản làm việc.

### Dev server

- `npm run dev` → `http://localhost:3000`.
- ⚠️ **Đừng chạy `next dev` đè lên `.next` do `npm run build` để lại.** Đo 22/08: sau ba
  lần build, `next dev` trả `/admin/login` thành **404** trong khi production trả 200.
  `rm -rf .next` rồi khởi động lại là hết. **Đừng đi tìm lỗi trong code đăng nhập.**
- Lần biên dịch đầu của mỗi route mất **20–90 giây**; Next tự in *"Slow filesystem detected"*
  cho `E:\Offerdy\.next`. Đừng vội kết luận là treo.

### Giết tiến trình — chỗ này sai nhiều nhất

⚠️ **`pkill -f "next start"` KHÔNG hoạt động.** Server mới sẽ chết vì `EADDRINUSE`, server
**cũ vẫn trả lời**, và vòng chờ `curl → 200` báo "sẵn sàng" — nên phép đo tiếp theo **đo
nhầm bản cũ, im lặng**. Đã dính hai lần liền trong một buổi.

```bash
# Đúng: tìm PID rồi giết đích danh
netstat -ano | grep ":3100.*LISTENING" | awk '{print $NF}'
taskkill //PID <pid> //F

# Và LUÔN kiểm log trước khi tin là đã khởi động
grep -qi "EADDRINUSE" server.log && echo "SERVER HỎNG"
```

⚠️ **Tắt dev server KHÔNG giết worker Turbopack.** Năm lần bật/tắt để lại **277 tiến trình
node ngốn 13,9 GB**. Lọc theo `.nextdevbuild`, **đừng giết hết `node.exe`** — làm thế là mất
cả editor.

### Git Bash

- ⚠️ **Đường dẫn bắt đầu bằng `/` bị viết lại**: `/blog/abc` → `C:/Program Files/Git/blog/abc`.
  Luôn dùng `MSYS_NO_PATHCONV=1` khi truyền URL hoặc đường dẫn kiểu Unix.
- ⚠️ **Backtick trong heredoc bị shell nuốt** — đã ghi hỏng cả `TODO.md` một lần. Soạn file
  có backtick thì dùng Write/Edit, đừng `cat <<'EOF'`.
- File JSON cấu hình chỉ sửa bằng Edit hoặc `jq`, **không `sed -i`**.

### Node 24 trên Windows

⚠️ **`process.exit()` gọi SAU `fetch()` làm Node sập, mã thoát 127.** Trong script vận hành
dùng `run()` / `stop()` ở `scripts/_vault.mjs`.

---

## Lái trình duyệt để kiểm giao diện

Script mẫu dùng lại được nằm ở `.scratch/`:

| Script | Dùng để |
|---|---|
| `do-admin-mobile.mjs` | đo tràn lề trang `/admin` (tự đúc cookie phiên, không cần đăng nhập tay) |
| `do-dich-nhieu-tieng.mjs` | đo bố cục khi chữ dài ra / đổi hướng đọc (5 chế độ ngôn ngữ) |
| `measure-*.mjs` | GA4, Search Console, deep link |

⚠️ **`anh-mobile.mjs` là bản cũ, phép đo vẫn sai — đừng tin số của nó.**

Bẫy khi lái trình duyệt:
- Phải **chờ React hydrate thật**, không chỉ chờ `load`.
- Headless Chrome **chặn `window.open`**.
- Headless Chrome **không bật được bộ dịch** của trình duyệt.
- Chọn nút theo **CLASS**, đừng theo `title` — đã bấm nhầm nút ★ và ghim nhầm deal `#1155`.

### ⚠️ Phép đo tràn lề nói dối BẢY kiểu

Đếm `scrollWidth - clientWidth > 2` rồi gọi là "bị cắt" cho ra **377 khối** trong khi chỉ có
**3** khối hỏng thật. Bảy loại báo động giả phải loại:

| # | Báo động giả | Cách loại |
|---|---|---|
| 1 | `text-overflow:ellipsis` | bỏ khi `textOverflow === 'ellipsis'` |
| 2 | nằm trong khối cuộn ngang được | tổ tiên có `overflow-x:auto` **và** `scrollWidth > clientWidth` thật |
| 3 | tổ tiên đã cắt có chủ ý | **phải leo lên cây tổ tiên** |
| 4 | `<input>` / `<textarea>` | loại theo tên thẻ |
| 5 | băng chạy (marquee) | con có `animationName !== 'none'` và `width:max-content` |
| 6 | `-webkit-line-clamp` | `st.webkitLineClamp !== 'none'` |
| 7 | trang trí `::before/::after` thò ra | không con `position:absolute` nào vượt mép |

📌 Kiểu 5–7 phải chặn ở **cả hai chỗ**: vòng quét chính *và* hàm leo tổ tiên.
📌 **Luôn xem ảnh chụp thật, đừng chỉ đọc con số.** Cả hai lần bố cục hỏng, ảnh chụp mới là
thứ lộ ra sự thật; bảng số nói ngược lại.

---

## Sanity

- **Hai client, hai hạn mức**: `readClient` (`useCdn: true`, không tính vào hạn mức API) và
  `writeClient`. Xem `PROJECT_CONTEXT.md` mục *Sanity: two clients, two quotas*.
- ⚠️ **Dataset `production` là PUBLIC** — ai cũng đọc mọi tài liệu, không cần token.
  **Không để thứ gì bí mật ở đó.** (Tài khoản admin được mã hoá cả khối, xem
  `project_admin_auth`.)
- ⚠️ **Trang admin vừa-ghi-vừa-đọc phải dùng `useCdn: false`** — không thì ghi xong, tải lại
  trang là dấu **biến mất**. Đã dính hai lần trong một ngày.
- ⚠️ **GROQ: `null != ""` cho TRUE.** Vòng chặn chỉ dùng `!= ""` **không chặn gì**; phải kèm
  `defined()`.
- ⚠️ **Trong schema, `content` / `seo` / `ai` là NHÓM TAB giao diện, không phải object lồng.**
  Trường nằm ở cấp cao nhất: dùng `articleProducts`, không phải `content.articleProducts`.
  Sai chỗ này thì `count()` trả 0 và trông y như "không có dữ liệu".
- ⚠️ **Đọc schema trước khi viết điều kiện lọc, đừng đoán tên giá trị.** Hỏi
  `codeTestResult == "works"` trong khi giá trị thật là `"worked"` cho ra "0 mã chạy" —
  sự thật là 71/71.

---

## Thứ báo "thành công" mà vẫn hỏng

Đây là họ lỗi đắt nhất của dự án. Mã thoát 0 **không** có nghĩa là xong.

- **ffmpeg** báo "Xong", mã thoát 0, tệp mở được — mà video **cụt mất các cảnh sau**. Cả hai
  lần chỉ lộ ra vì có người ngồi đo bằng `ffprobe`. **Mọi bước ffmpeg phải tự kiểm đầu ra.**
- **Ảnh chết** không lộ ở build, ở test, hay ở mã trạng thái 200.
- **`.adm-main{overflow-x:hidden}` xén phần tràn IM LẶNG** — không thanh cuộn, không dấu hiệu.
- **Deep link "chết mềm"**: trả 200 nhưng đẩy về trang chủ shop.
- **Server cũ vẫn trả lời** sau khi tưởng đã giết (xem phần trên).

📌 Và: **so hai lần chạy mà đầu vào do AI sinh lại mỗi lần thì không phải phép so sánh.**
Giữ nguyên đầu vào, chỉ đổi đúng một biến.
