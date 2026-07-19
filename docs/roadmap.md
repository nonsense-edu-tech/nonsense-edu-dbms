# Lộ trình triển khai — Nonsense Edu

Nguồn: bảng theo dõi tiến độ (71 đầu việc, 5 giai đoạn). Cập nhật trạng thái ở đây
khi hoàn thành để Claude Code nắm được đang ở đâu.

## Trạng thái tổng quan

- ✅ Trang đăng nhập (email/password) — đã deploy Vercel, **đã xác nhận đăng nhập
  thành công thật trên production** (19/07/2026). Trước đó từng tưởng xong nhưng
  thực chất chưa chạy được, do 2 lỗi: (1) code nằm ở project con
  `nonsense-edu-login-fe/` tách biệt, Vercel build nhầm project gốc (đã gộp vào
  `src/`); (2) `NEXT_PUBLIC_SUPABASE_URL` trên Vercel bị dư đuôi `/rest/v1`
  (đã sửa lại đúng Project URL trần). Cả hai đã fix ở commit `50796f0` + cấu
  hình lại env var.
- ✅ Project Supabase đã tạo (email đăng ký nền tảng: `it@nonsense.edu.vn` — đây KHÔNG
  phải tài khoản đăng nhập app; tài khoản đăng nhập app thật là `nguyen@nonsense.edu.vn`
  = `master_admin`).
- 🔜 Đang bước vào **GĐ1**.
- ⚠️ **QUAN TRỌNG — phát hiện 19/07/2026:** toàn bộ schema GĐ1-GĐ3 (`cap_hoc`,
  `chuong_trinh`, `mon_hoc`, `hinh_thuc`, `dang_cau`, `hoc_phan`, `bai_hoc`, `users`,
  `user_pham_vi`, `user_bai_hoc`, `lop`, `hoc_sinh`, `ghi_danh`, `ngu_lieu`, `cau_hoi`,
  `lua_chon`, `de`, `de_cau_hoi`) **đã được tạo thẳng trên Supabase production qua một
  phiên chat Claude khác, KHÔNG đi qua migration file trong repo này.** File
  `supabase/migrations/0001`, `0002` (nháp của phiên hiện tại) và `0003` (ngân hàng câu
  hỏi, phiên trước) **không khớp 1:1 với schema thật** — xem "Ghi chú migration" cuối
  file. Từ giờ, trước khi viết migration mới, **luôn kiểm tra cấu trúc bảng thật qua SQL
  Editor** (`information_schema.columns`, `pg_policies`, `pg_constraint`) thay vì tin
  vào `docs/dac-ta-he-thong.md` hay các file migration cũ trong repo — cả hai đều đã lệch
  so với thực tế.
- ⚠️ **Vai trò thật khác đặc tả cũ:** `master_admin` (bạn — quyền cao nhất) → `admin_ht`
  (admin theo từng cấp học, giới hạn phạm vi qua bảng `user_pham_vi`) → `truong_bm`
  (trưởng bộ môn, giới hạn theo cấp học+môn học) → `gv` (giáo viên, giới hạn theo
  `user_bai_hoc`); cộng thêm `admin_ts` (tuyển sinh — quyền ngang hàng master_admin cho
  riêng `lop`/`hoc_sinh`/`ghi_danh`). `trang_thai` chỉ có `active`/`disabled` (không có
  bước "chờ duyệt"). Mọi bảng dữ liệu dùng **xoá mềm** (`deleted_at`), không xoá cứng.
- 🟡 **Tạo ID học sinh** (ưu tiên gấp, phục vụ điểm danh khuôn mặt) — **code đã xong**,
  khớp đúng schema thật (migration `0004_tao_id_lop_hoc_sinh.sql`: hàm `tao_lop()`,
  `tao_hoc_sinh()` + trigger bất biến ID + tự tạo `ghi_danh`; trang `/dashboard/lop`,
  `/dashboard/hoc-sinh`, gate theo vai trò `master_admin`/`admin_ts`). **CHƯA chạy
  migration `0004` trên production** — cần chạy tay trong Supabase SQL Editor (không có
  Supabase CLI/service-role key trong môi trường này). Hiện chỉ `nguyen@nonsense.edu.vn`
  (master_admin) dùng được tính năng; chưa có tài khoản `admin_ts` nào.

## GĐ0 — Chuẩn bị (phần lớn đã xong)

- ✅ Chốt cấu trúc ID câu hỏi 16 số, cập nhật đặc tả, chốt nơi lưu trữ (Supabase).
- ✅ Xác nhận Hikvision có OpenAPI; Person ID tối đa 16 ký tự, nhận chuỗi số 0 đầu.
- ✅ Chuẩn hoá dữ liệu 100 học viên (họ tên, SĐT phụ huynh, gán lớp).
- 🔲 Điền các **bảng mã gốc** (Cấp học, Chương trình, Môn học, Hình thức, Dạng câu).
- 🔲 Thu thập ảnh chân dung cho Hikvision + mẫu đồng ý (phụ huynh, HS < 18).

## GĐ1 — Lõi + điểm danh (đang tới)

Khởi tạo & phân quyền:
- 🔲 Cấu hình đăng nhập (giới hạn theo domain trung tâm nếu cần).
- ✅ Bảng mã `cap_hoc`, `chuong_trinh`, `mon_hoc`, `hinh_thuc`, `dang_cau`, `hoc_phan`,
  `bai_hoc` — **đã có cấu trúc sẵn trên production** (tạo ngoài migration repo, xem cảnh
  báo ở đầu file). 🔲 Vẫn **chưa điền dữ liệu thật** (tên cấp học, mã chương trình VACT...).
- ✅ Bảng `users` (vai trò, trạng thái, xoá mềm) + `user_pham_vi` (giới hạn phạm vi
  admin_ht/truong_bm theo cấp học/môn học) + `user_bai_hoc` (giới hạn gv theo bài học) +
  **RLS phân quyền theo vai trò** — đã có sẵn trên production, đúng thiết kế phân cấp
  master_admin → admin_ht → truong_bm → gv (+ admin_ts ngang hàng cho tuyển sinh).
  **Chưa có UI quản trị users** — gán vai trò/phạm vi qua Supabase SQL Editor tạm thời.
- 🟡 Kiểm thử phân quyền ở **cả UI lẫn CSDL** — RLS `lop`/`hoc_sinh`/`ghi_danh` đã đúng
  (master_admin + admin_ts ghi; còn lại chỉ đọc); đã kiểm tra logic qua SQL Editor,
  **chưa test thật qua giao diện web** (cần chạy migration `0004` trước).

Quản lý lớp & học sinh:
- ✅ Bảng `lop` (ID 9 số, cột `cap_hoc_ma`/`chuong_trinh_ma`/`nam_hoc`/`so_lop` tách rời +
  `chi_nhanh_id` cho GĐ4) — đã có sẵn trên production. Hàm tự sinh ID `tao_lop()` code
  xong ở migration `0004_tao_id_lop_hoc_sinh.sql` (advisory lock chống trùng số lớp,
  chỉ tính lớp chưa xoá mềm), trang `/dashboard/lop` — **chưa apply migration lên
  production**.
- ✅ Bảng `hoc_sinh` (ID 12 số cố định, `stt`, `lop_nhap_hoc_id`, `lop_hien_tai_id`,
  `anh_chan_dung`, `classin_uid`) + bảng `ghi_danh` (lịch sử ghi danh: `hoc_sinh_id`,
  `lop_id`, `ngay_bat_dau`/`ngay_ket_thuc`, `trang_thai` dang_hoc/da_nghi/bao_luu/hoan_thanh)
  — đã có sẵn trên production, đúng thiết kế (tốt hơn bản nháp ban đầu của tôi, vốn chỉ
  có 1 cột lớp hiện tại không có lịch sử).
- 🟡 Tạo ID học sinh, tự đánh STT — code xong (hàm `tao_hoc_sinh()` trong migration
  `0004`: tự sinh STT trong lớp nhập học + tự tạo bản ghi `ghi_danh` đầu tiên; trang
  `/dashboard/hoc-sinh`, form họ tên + SĐT phụ huynh); trigger chặn sửa `ma_hoc_sinh`/
  `lop_nhap_hoc_id` sau khi tạo. **Chưa apply migration `0004`, chưa nhập 100 học viên
  thật.**

Tra cứu & điểm danh Hikvision:
- 🔲 Tra cứu ID; xuất file (ID, tên, ảnh) đúng định dạng Hikvision.
- 🔲 Import vào Hikvision, test nhận diện khuôn mặt, nghiệm thu.

## GĐ2 — Chấm công, báo cáo, CRM

- 🔲 Kéo/nhập dữ liệu chấm công (API HikCentral), bảng log điểm danh.
- 🔲 Báo cáo chuyên cần cho phụ huynh (Zalo OA / email).
- 🔲 CRM tuyển sinh (Lark Base): pipeline lead → tư vấn → học thử → chốt.
- 🔲 Mapping ClassIn (cột `classin_uid`).

## GĐ3 — Ngân hàng câu hỏi

- 🔲 Bảng `tai_lieu` (ID 14 số) + UNIQUE; chức năng tạo ID; lưu file + metadata.
- 🔲 Ngân hàng câu hỏi: `ngu_lieu`, `cau_hoi` (ID 16 số), `lua_chon`.
  → **Schema có sẵn:** `supabase/migrations/0003_ngan_hang_cau_hoi.sql`.
- 🔲 Tạo ID câu hỏi, tự đánh STT theo tổ hợp; form nhập đủ 8 dạng câu.
- 🔲 Ghép đề: `de` + `de_cau_hoi` (M-N) + UNIQUE `(de_id, cau_hoi_id)`.
- 🔲 Nhập kho nội dung V-ACT (CORE, số liệu, logic) + y dược.
- 🔲 Thống kê tỉ lệ đúng, cập nhật độ khó tự động (metadata, không đổi ID).

## GĐ4 — QA & scale

- 🔲 Dashboard QA theo lớp; cảnh báo lớp có vấn đề.
- 🔲 Báo cáo phụ huynh đầy đủ (chuyên cần + học tập), tự động gửi định kỳ.
- 🔲 Chuẩn bị scale: cột `chi_nhanh_id`, lớp ảo (`000` = chưa xếp lớp), mã mới.
- 🔲 Bảng `nhat_ky`; kiểm tra backup & thử di dời `pg_dump`.

## Ghi chú migration

**Lịch sử rối — đọc kỹ trước khi thêm migration mới:**

- `0003_ngan_hang_cau_hoi.sql`: schema đề xuất cho ngân hàng câu hỏi (phiên trước).
  Schema **thật** trên production cho `cau_hoi`/`ngu_lieu`/`lua_chon`/`de`/`de_cau_hoi`
  đã tồn tại nhưng **khác** file này ở ít nhất 1 điểm đã biết: `ma_cau_hoi` thật là
  **17 số** (`CHECK (ma_cau_hoi ~ '^[0-9]{17}$')`), không phải 16 số như file `0003` và
  `docs/dac-ta-he-thong.md` mô tả. Chưa đối chiếu toàn bộ — đừng giả định file `0003`
  đúng với production.
- `0001_bang_ma_va_users.sql`, `0002_lop_hoc_sinh.sql`: bản nháp của phiên 19/07/2026,
  **đã xoá khỏi repo** vì viết trước khi phát hiện schema thật đã tồn tại sẵn trên
  production (soft-delete, vai trò master_admin/admin_ts/admin_ht/truong_bm/gv, bảng
  `ghi_danh` riêng...). Phần logic còn dùng được (hàm tự sinh ID) đã viết lại đúng schema
  thật trong `0004`.
- `0004_tao_id_lop_hoc_sinh.sql`: **migration đầu tiên khớp đúng schema production thật.**
  Chỉ thêm phần còn thiếu (hàm `tao_lop()`/`tao_hoc_sinh()`, trigger bất biến ID, vài
  index) — không tạo lại bảng nào (đã có sẵn ngoài git).

**Việc nên làm sau này (chưa làm, không nằm trong phạm vi tính năng gấp hôm nay):**
dùng `supabase db pull` (khi có Supabase CLI) hoặc `pg_dump --schema-only` để đưa toàn
bộ schema thật vào git làm baseline, và đối chiếu lại `docs/dac-ta-he-thong.md` (đặc tả
đang mô tả sai ít nhất: khoảng cấp học 0-9 → thật là 1-9, ID câu hỏi 16 số → thật 17 số,
mô hình vai trò 3 cấp đơn giản → thật là 5 vai trò phân cấp theo phạm vi).
