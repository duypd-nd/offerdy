# Khôi phục tài khoản quản trị

> Đọc file này **khi đang có sự cố**. Nó viết để dùng lúc hoảng, nên mỗi mục bắt
> đầu bằng triệu chứng, không phải bằng lý thuyết.

Toàn bộ tài khoản quản trị nằm trong **một tài liệu Sanity** tên `adminVault`,
nội dung mã hoá AES-256-GCM bằng khoá dẫn xuất từ `AUTH_PEPPER`. Không có tài
khoản dự phòng, không có "quên mật khẩu" qua email, không có thùng rác.

---

## Trước tiên: bạn đang gặp sự cố nào?

| Triệu chứng | Sự cố | Đi tới |
|---|---|---|
| `/admin/login` báo sai mật khẩu với **mọi** tài khoản | **B** — sai/mất `AUTH_PEPPER` | [Sự cố B](#sự-cố-b--mất-auth_pepper) |
| Trang đăng nhập báo chưa có tài khoản nào | **A** — mất `adminVault` | [Sự cố A](#sự-cố-a--tài-liệu-adminvault-biến-mất) |
| Đăng nhập được nhưng bị đá ra ngay | Cookie ký bằng `AUTH_SECRET` cũ | Đăng nhập lại là xong. Không phải sự cố dữ liệu. |
| Bị đá ra kèm dòng *"Mật khẩu hoặc quyền của bạn vừa được đổi"* | Ai đó vừa đổi mật khẩu/vai của bạn | Đăng nhập lại. Đây là **đúng thiết kế** — xem `sessionVersion` trong PROJECT_CONTEXT.md |
| `/admin/login` và `/admin` đẩy nhau **vô tận** | Trang đăng nhập kiểm phiên khác `requireAdmin()` | Cả hai PHẢI gọi `checkSession()`. Đừng chép logic sang trang đăng nhập |
| `/admin/users` hiện băng đỏ "Chưa có bản sao nào" | Chưa hỏng gì, nhưng **đang không có lưới an toàn** | `npm run vault:backup` ngay |

---

## Ba khoá, ba vai trò khác nhau

| Biến | Dùng để | Mất thì sao |
|---|---|---|
| `AUTH_PEPPER` | Trộn vào mật khẩu trước khi băm **và** mã hoá kho | **Mất sạch tài khoản.** Kho còn nguyên mà vĩnh viễn không mở được |
| `AUTH_SECRET` | Ký cookie phiên | Mọi người bị đăng xuất. Đăng nhập lại là xong |
| `AUTH_BACKUP_KEY` | Mã hoá **bản sao lưu** | Mất bản sao. Bản gốc không sao |

⚠️ `AUTH_BACKUP_KEY` **phải khác** `AUTH_PEPPER`. Code từ chối chạy nếu hai giá
trị bằng nhau — vì lúc đó mất một khoá là mất cả bản gốc lẫn bản sao, tức là
không sao lưu gì cả.

---

## Bản sao nằm ở đâu

**1. Bảy ô trong Sanity** — `adminVaultBackup.mon` … `adminVaultBackup.sun`

Ghi tự động mỗi đêm, ghép trong cron `daily-report` (01:00 UTC = 08:00 giờ VN).
Ô của thứ Hai bị ghi đè vào thứ Hai tuần sau, nên chỉ giữ được **7 ngày**.

Che được: ai đó xoá `adminVault`, mất `AUTH_PEPPER`.
**Không** che được: mất cả dự án Sanity.

**2. File `.enc` do bạn tự xuất** — `npm run vault:backup`

Ghi vào `backups/` (đã nằm trong `.gitignore`, và mọi `*.enc` cũng vậy). Đây là
bản sao **ngoài hệ thống** — thứ duy nhất sống sót nếu mất dự án Sanity.

⚠️ **File này có giá trị ngang toàn bộ quyền quản trị.** Nó chứa `AUTH_PEPPER`
và bản băm mật khẩu của mọi tài khoản. Mang nó ra khỏi máy này (ổ cứng ngoài,
kho mật khẩu, USB) và đừng bao giờ commit.

Xem có những gì:

```
npm run vault:restore -- --list
```

---

## Sự cố A — tài liệu `adminVault` biến mất

Triệu chứng: trang đăng nhập nói chưa có tài khoản nào, hoặc `/admin/users`
trống trơn. `AUTH_PEPPER` vẫn còn nguyên trong Vercel.

```
npm run vault:restore -- --list
npm run vault:restore -- --slot fri          # hoặc --file backups/adminVault-....enc
```

Lệnh sẽ in ra danh sách tài khoản trong bản sao, cảnh báo nó sắp thay thế cái
gì, rồi bắt gõ đúng chữ `GHI DE` để xác nhận. Sau khi ghi, nó **đọc lại và đối
chiếu** — không tin vào việc "ghi không báo lỗi".

Xong thì vào `/admin/login` đăng nhập bằng mật khẩu **cũ** (bản băm không đổi).

---

## Sự cố B — mất `AUTH_PEPPER`

Triệu chứng: mọi tài khoản đều báo sai mật khẩu, hoặc log báo không giải mã được
kho. Kho vẫn còn đó, chỉ là không ai mở được.

⚠️ **KHÔNG chạy `create-admin.mjs` để "tạo lại tài khoản".** Lệnh đó đã có vòng
chặn, nhưng hiểu rõ lý do vẫn hơn: ghi đè lên một kho không giải mã được là xoá
vĩnh viễn mọi tài khoản chỉ vì một biến môi trường đặt nhầm.

Bản sao có chứa **chính `AUTH_PEPPER` cũ** bên trong. Lấy nó ra:

```
npm run vault:restore -- --file backups/adminVault-....enc --reveal-pepper
```

Lệnh in `AUTH_PEPPER` (và `AUTH_SECRET` nếu có) ra màn hình. Đặt lại hai giá trị
đó vào `.env.local` **và** vào Vercel, deploy lại, rồi đăng nhập bình thường —
kho cũ mở được ngay, không cần khôi phục gì thêm.

Nếu `adminVault` cũng đã mất thì làm tiếp [Sự cố A](#sự-cố-a--tài-liệu-adminvault-biến-mất).

---

## Nếu mất cả `AUTH_PEPPER` lẫn `AUTH_BACKUP_KEY`

Không còn đường nào. Không có cửa hậu, và đó là chủ ý.

Cách duy nhất là dựng lại từ đầu: đặt `AUTH_PEPPER` mới, xoá `adminVault`, chạy
`node scripts/create-admin.mjs`, rồi tạo lại từng tài khoản. Mọi mật khẩu cũ mất
hết.

**Đây là lý do hai khoá phải được cất ở kho mật khẩu, không phải chỉ trong
`.env.local` trên một cái máy.**

---

## Kiểm tra định kỳ

- `/admin/users` có băng trạng thái sao lưu ngay dưới tiêu đề. Xám là bình
  thường; vàng nghĩa là bản sao gần nhất **đã quá 48 giờ** — cron hằng đêm hỏng
  rồi; đỏ nghĩa là chưa có bản sao nào hoặc chưa đặt `AUTH_BACKUP_KEY`.
- Sao lưu hỏng còn báo qua Sentry (`[vault-backup] …`), và Sentry chảy vào AI
  Daily Report ở `/admin/reports`.
- Mỗi vài tháng nên **diễn tập khôi phục thật một lần** trên bản sao mới nhất.
  Một bản sao chưa từng khôi phục chỉ là tin đồn.

---

## Code liên quan

| File | Việc |
|---|---|
| `src/lib/adminCrypto.ts` | Dẫn xuất khoá (HKDF), mã hoá/giải mã. `deriveBackupKey()` chặn trùng `AUTH_PEPPER` |
| `src/lib/adminBackup.ts` | Đóng gói / niêm phong / mở / kiểm chứng. Thuần, có test |
| `src/lib/adminVaultBackup.ts` | Bảy ô trong Sanity, trạng thái cho `/admin/users`, báo Sentry |
| `src/app/api/cron/daily-report/route.ts` | Nơi bản sao hằng đêm thực sự chạy |
| `src/app/api/cron/vault-backup/route.ts` | Gọi tay khi cần (cần `CRON_SECRET`) |
| `scripts/_vault.mjs` | Bản sao thuật toán cho phía dòng lệnh — phải khớp từng bit với `adminCrypto.ts` |
| `scripts/vault-backup.mjs` / `vault-restore.mjs` | Xuất ra file / khôi phục |
| `tests/adminBackup.test.ts` | 22 phép kiểm, nghiêng hẳn về phía "thứ phải từ chối" |

⚠️ **Không có cron riêng cho việc sao lưu.** Nó chạy ghép trong `daily-report`
vì dự án này đã có ba cron chết im lặng suốt 18 ngày trong khi dashboard vẫn báo
"Enabled" — thêm một cron thứ tư là thêm một thứ nữa có thể chết mà không ai
biết. `daily-report` sinh ra báo cáo người vận hành thực sự đọc mỗi sáng.
