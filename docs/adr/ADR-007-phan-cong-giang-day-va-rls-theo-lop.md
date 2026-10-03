# ADR-007: Phân công giảng dạy (lớp × môn) và RLS theo lớp cho Giáo viên / Trợ giảng / Trưởng bộ môn

**Status:** Accepted
**Date:** 2026-10-03
**Deciders:** Nguyen (Hiệu trưởng)
**Quan hệ với ADR cũ:** Ngoại lệ có chủ đích của ADR-002 (mục "chỉ thêm policy, không sửa policy cũ") và
ghi nhận một sai lệch quy trình với ADR-004 (migration được áp lên production trước khi có PR — xem mục 4).

## 1. Bối cảnh

Tạo giáo viên không cho biết giáo viên phụ trách lớp nào, nên không giới hạn được quyền truy cập: GV
đọc được mọi lớp, mọi học sinh (kèm SĐT), phòng học, buổi học. Yêu cầu nghiệp vụ: GV chỉ thấy lớp mình
phụ trách, học sinh trong các lớp đó (chỉ tên + lớp), được đề xuất học phần (Trưởng bộ môn duyệt) và tạo
bài học (không cần duyệt) trong môn mình phụ trách; không thấy cụm "Vận hành" và tab "Học liệu".

## 2. Quyết định

1. Bảng `phan_cong_giang_day(user_id, lop_id, mon_hoc_ma, tu_ngay, den_ngay)`. Trigger kiểm tra: chỉ
   gv / tro_giang / truong_bm; môn hợp lệ với cấp học của lớp; môn nằm trong `user_pham_vi` của người đó.
2. Hàm `lop_trong_pham_vi()` + `co_phan_cong()`; RLS đọc `lop`, `ghi_danh`, `buoi_hoc`, `danh_gia_hoc_sinh`
   theo phạm vi. Trưởng bộ môn thấy thêm lớp có phân công thuộc môn trong phạm vi của mình.
3. `hoc_sinh` và `phong_hoc` **không còn đọc trực tiếp** với 3 vai trò trên; học sinh chỉ qua RPC
   `hoc_sinh_cua_toi()` (SECURITY DEFINER) trả về tên + mã + lớp, không SĐT/CCCD.
4. Học phần có vòng đời `cho_duyet → da_duyet | tu_choi`; mã học phần cấp tự động khi duyệt (khoá advisory,
   không tự duyệt học phần của chính mình). Bài học: GV chỉ tạo dưới học phần đã duyệt thuộc môn mình.
5. RPC `master_admin_tao_nguoi_dung` áp hồ sơ + chi nhánh + phạm vi + phân lớp trong một transaction
   (tài khoản Auth tạo trước bằng service role, lỗi thì xoá).

## 3. Ngoại lệ so với ADR-002

Permissive policy được OR với nhau, nên **thêm** policy mới không thể thu hẹp quyền cũ. Migration 0052 vì
vậy `DROP` rồi tạo lại các policy SELECT của `lop`, `ghi_danh`, `hoc_sinh`, `buoi_hoc`, `phong_hoc`,
`danh_gia_hoc_sinh`, `hoc_phan`, `bai_hoc` và tách policy `FOR ALL` thành từng lệnh. Vai trò quản trị
(master_admin, admin_ht, admin_ts, ke_toan, thu_ngan, quan_ly_chi_nhanh) giữ nguyên quyền đọc như cũ.

## 4. Sai lệch quy trình cần ghi lại

Migration được áp trực tiếp lên production (03/10/2026) trước khi có PR/CI. Dữ liệu không bị đụng
(chỉ thêm bảng/cột/hàm, siết policy). Code cũ chạy với tài khoản quản trị không bị ảnh hưởng; tài khoản
GV hiện có chỉ thấy 0 lớp cho tới khi được phân công — đây là hành vi mong muốn. File
`0052_phan_cong_giang_day_rls_gv_duyet_hoc_phan.sql` là bản sao nguyên văn SQL đã áp; lịch sử migration
phía remote được đồng bộ về tên `0052`. Lần sau: mọi migration đi qua PR → merge → CI.

## 5. Việc còn lại

- `admin_ht_tao_nhan_su` chưa nhận môn/phân lớp (GV do Admin HT tạo chưa thấy lớp nào cho tới khi được phân).
- `danh_gia_tieu_chi` vẫn đọc/ghi mở (rủi ro thấp, chưa gắn với lớp).
- Ghi bài học của Admin HT/Trưởng bộ môn chưa giới hạn theo môn (có từ trước).
