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
- ✅ Project Supabase đã tạo (`it@nonsense.edu.vn`).
- 🔜 Đang bước vào **GĐ1**.

## GĐ0 — Chuẩn bị (phần lớn đã xong)

- ✅ Chốt cấu trúc ID câu hỏi 16 số, cập nhật đặc tả, chốt nơi lưu trữ (Supabase).
- ✅ Xác nhận Hikvision có OpenAPI; Person ID tối đa 16 ký tự, nhận chuỗi số 0 đầu.
- ✅ Chuẩn hoá dữ liệu 100 học viên (họ tên, SĐT phụ huynh, gán lớp).
- 🔲 Điền các **bảng mã gốc** (Cấp học, Chương trình, Môn học, Hình thức, Dạng câu).
- 🔲 Thu thập ảnh chân dung cho Hikvision + mẫu đồng ý (phụ huynh, HS < 18).

## GĐ1 — Lõi + điểm danh (đang tới)

Khởi tạo & phân quyền:
- 🔲 Cấu hình đăng nhập (giới hạn theo domain trung tâm nếu cần).
- 🔲 Tạo bảng mã: `cap_hoc`, `chuong_trinh`, `mon_hoc`, `hinh_thuc`, `dang_cau`.
- 🔲 Tạo bảng `users` (vai trò, trạng thái) + **RLS phân quyền theo vai trò**.
- 🔲 Kiểm thử phân quyền ở **cả UI lẫn CSDL**.

Quản lý lớp & học sinh:
- 🔲 Bảng `lop` + UNIQUE ID lớp (9 số); tạo/sửa lớp, tự sinh ID (giữ số 0 đầu).
- 🔲 Tự đánh số lớp kế tiếp (chống trùng).
- 🔲 Bảng `hoc_sinh` (ID 12 số cố định, cột lớp hiện tại riêng) + bảng ghi danh.
- 🔲 Tạo ID học sinh, tự đánh STT; nhập 100 học viên hiện tại.

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

Schema ngân hàng câu hỏi đánh số `0003` vì thuộc GĐ3. Migration GĐ1 (`0001` bảng mã
+ users, `0002` lớp + học sinh) **chưa viết** — sẽ tạo khi làm GĐ1. Supabase chạy
migration theo thứ tự tên file.
