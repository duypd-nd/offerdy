@AGENTS.md

# CLAUDE.md — đọc cái này trước

Offerdy là một trang deal/coupon affiliate. Next.js (App Router) + Sanity + Vercel,
chạy thật ở **https://www.offerdy.com**. Một người làm, một nhánh `main`.

## Bắt đầu một phiên

**Đọc [`TODO.md`](TODO.md). Chỉ vậy thôi.** Nó nói `main` đang ở đâu, production đang chạy
gì, việc gì đang chặn, và những bẫy vừa trả giá.

Mọi thứ khác **đọc khi cần**, không đọc trước:

| Cần gì | Đọc |
|---|---|
| Kiến trúc thật, quyết định đã chốt, bẫy đã gặp | [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) — có mục lục ở đầu |
| Điểm dừng cũ, số đo cũ | [`docs/NHAT_KY.md`](docs/NHAT_KY.md) |
| Vì sao không dùng Supabase, v.v. | [`docs/adr/`](docs/adr/) |
| Quy trình khôi phục tài khoản admin | [`docs/03-workflows/`](docs/03-workflows/) |

⚠️ `docs/00-governance/` và `docs/04-project-management/` là tài liệu nguyên tắc chung
(~2.750 dòng). Chúng **không chứa một dòng nào riêng của Offerdy** và **không cần đọc để
làm việc**. Giữ lại để tra cứu, thế thôi.

---

## Bảy luật đã trả giá — vi phạm là hỏng thật

**1. ĐO TRƯỚC KHI SỬA.** Kiểm chứng lỗi có thật không *trước khi* sửa code. Cấm suy luận
"code này giống code đã hỏng nên chắc cũng hỏng". Phân biệt rõ **"đã đo"** với
**"đang đoán"**, và nói rõ mình đang ở bên nào.

> Ngày 24/08 tôi báo động "116 thuộc tính CSS vật lý, RTL là lỗ hổng lớn nhất". Đo xong
> thì **sai** — lật `dir="rtl"` cả trang không vỡ chỗ nào. Nếu tin theo con số đó thì đã
> viết lại vài chục dòng CSS cho một vấn đề không tồn tại.

**2. KHÔNG BỊA DỮ LIỆU.** Không tự nghĩ ra deal, coupon, tên shop, thông tin affiliate,
review, hay ghi chú thử mã. Thiếu dữ liệu thì **hỏi**, đừng điền. Trang này bán niềm tin;
một con số bịa làm hỏng đúng thứ đang xây.

**3. `npm test` TRƯỚC KHI COMMIT.** Hiện **565 assertion**. Kèm `npx tsc --noEmit` và
`npm run build`.
⚠️ `npm run lint` đang có **62 vấn đề có sẵn** — đừng tưởng là mình vừa làm hỏng. Muốn biết
chắc thì `git stash` bản chưa sửa rồi chạy lại mà đối chứng.

**4. TRANG CÔNG KHAI 100% TIẾNG ANH, `/admin/*` TIẾNG VIỆT.** Đừng "sửa" chữ tiếng Việt
trong admin. Đừng để lọt chữ Việt hay ngày `vi-VN` ra trang công khai.

**5. TRẢ LỜI USER BẰNG TIẾNG VIỆT.** Nội dung file trong repo giữ nguyên ngôn ngữ vốn có.

**6. KHÔNG DÙNG BACKTICK trong chú thích nằm giữa template literal.** Nó đóng chuỗi giữa
chừng. Đã mắc **bốn lần**, cả trong heredoc của shell lẫn trong `const CSS = \`...\``.
Soạn markdown hay code có backtick thì dùng Write/Edit, đừng dùng `cat <<'EOF'`.

**7. KHÔNG ĐẶT BỐ CỤC BẰNG INLINE STYLE.** `style={{display:'grid'}}` = tự vô hiệu hoá mọi
media query. Sáu lỗi giao diện điện thoại trong hai ngày đều là nó. Và dùng
**`minmax(0,1fr)`**, không dùng `1fr`.

---

## Trước khi commit

```
npm test          # phải 565, không giảm
npx tsc --noEmit  # sạch
npm run build     # sạch
```

Commit và push **chỉ khi user bảo**. Thông điệp commit viết tiếng Việt không dấu, theo nếp
đang có (`fix(web): ...`, `feat(admin): ...`), và **ghi cả số đo lẫn cái bẫy đã trả giá** —
đó là chỗ kiến thức được lưu lại.

Xong việc thì cập nhật `TODO.md`. Nếu học được thứ dùng lại được thì thêm vào
`PROJECT_CONTEXT.md`. **Không** chép nhật ký vào hai chỗ.

---

## Cách làm việc

**Việc gì cũng bắt đầu bằng đọc code đang có.** Dự án này đã đi được xa; gần như mọi thứ
đều đã có tiền lệ. Tìm nó trước khi viết mới.

**Ưu tiên tự động hoá** khi thấy việc lặp tay — nhưng chỉ khi đã có người thật sự làm việc
đó vài lần. Đừng dựng công cụ cho một việc chưa ai làm bao giờ.

⚠️ **Cảnh báo lớn nhất của dự án này, tính đến 24/08**: công cụ đã đi trước việc dùng rất
xa. 451 deal đã xây, **1 cái đã đăng**. Tổng lượt bấm cả đời trang web là **25**. Xây thêm
công cụ là việc dễ chịu; phân phối là việc khó chịu. Khi được hỏi "làm gì tiếp theo", hãy
cân nhắc điều đó trước khi đề xuất xây thêm.

---

## Khi hai quy trình mâu thuẫn — cái nào thắng

Bộ skill của Matt Pocock (22 skill đã cài) mang theo quy trình riêng
(spec → ticket → triage → implement). Chốt rõ:

1. **Nguồn sự thật về tiến độ là `TODO.md`**, kể cả khi việc bắt đầu từ một skill của Matt.
   Một dự án một người mà hai sổ là chắc chắn lệch.
2. **`PROJECT_CONTEXT.md`** giữ kiến trúc thật, quyết định đã chốt, bẫy đã gặp.
   `CONTEXT.md` (nếu sau này tạo) **chỉ chứa từ vựng nghiệp vụ** — "offer" khác "deal" khác
   "coupon" thế nào. Hai file, hai việc, đừng gộp.
3. **Skill là công cụ, không phải nghĩa vụ.** Dùng `/diagnosing-bugs` khi có lỗi khó,
   `/handoff` khi kết phiên, `/tdd` khi viết logic thuần. Không bắt mọi việc đi qua
   spec → ticket → triage; chi phí thủ tục đó lớn hơn lợi ích cho một người làm.
4. **`/code-review` có HAI bản** (bản dựng sẵn của Claude Code, và bản của Matt). Nêu rõ
   đang gọi bản nào.
5. Issue/spec nếu cần thì để dưới `.scratch/<feature>/` — xem `docs/agents/issue-tracker.md`.
   Chọn markdown cục bộ vì `gh` chưa đăng nhập và repo chưa từng mở issue nào.
