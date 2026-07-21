-- =============================================================================
-- LƯU TÊN NGƯỜI THU (snapshot) NGAY TRÊN phieu_thu.
--
-- Lý do dùng snapshot text thay vì chỉ resolve tên qua nguoi_thu (uuid) lúc
-- hiển thị: RLS của users chỉ cho đọc CHÍNH mình (id = auth.uid()) hoặc
-- master_admin/admin_ht (xem p_users_read) — ke_toan/thu_ngan/admin_ts không
-- đọc được ho_ten của người khác qua bảng users, nên không resolve được tên
-- người thu khác mình trong danh sách phiếu thu. Server action đã tự đọc
-- ho_ten của CHÍNH người đang thao tác (được phép qua RLS) và ghi kèm vào
-- phieu_thu lúc tạo — đúng tinh thần append-only/snapshot đã dùng cho giá
-- hợp đồng, và không cần nới RLS của users.
-- =============================================================================

alter table phieu_thu add column if not exists nguoi_thu_ten text;

-- Backfill dữ liệu cũ (trước khi có cột này) cần tắt tạm trigger append-only —
-- trigger không phân biệt vai trò, chặn UPDATE với mọi role kể cả migration.
alter table phieu_thu disable trigger trg_phieu_thu_no_update;

update phieu_thu pt
set nguoi_thu_ten = coalesce(u.ho_ten, u.email)
from users u
where u.id = pt.nguoi_thu and pt.nguoi_thu_ten is null;

alter table phieu_thu enable trigger trg_phieu_thu_no_update;
