-- =============================================================================
-- HÀM danh_sach_gv() — cho phép mọi vai trò được ghi buoi_hoc (admin_ts,
-- quan_ly_chi_nhanh, gv) chọn GV theo tên khi tạo/sửa buổi học.
--
-- Vì sao cần: p_users_read (migration cũ, không đụng tới) chỉ cho
-- master_admin/admin_ht đọc toàn bộ bảng users — admin_ts/quan_ly_chi_nhanh
-- không đọc được để hiển thị dropdown chọn GV theo tên như ADR-002 Mục 2.7
-- mô tả ("quan_ly_chi_nhanh ... được ghi buoi_hoc (chọn GV/phòng/giờ)").
--
-- Giải pháp: hàm SECURITY DEFINER hẹp, CHỈ trả về (id, ho_ten) của user
-- vai_tro='gv' đang active — không lộ email/vai_tro/trang_thái của ai khác,
-- không đụng gì tới p_users_read hiện có. Cùng phong cách với auth_role(),
-- can_manage_cap_hoc() đã có (SECURITY DEFINER, search_path cố định).
-- =============================================================================

create or replace function danh_sach_gv()
returns table(id uuid, ho_ten text)
language sql
security definer
stable
set search_path = public
as $$
  select id, coalesce(ho_ten, email) as ho_ten
  from users
  where vai_tro = 'gv' and trang_thai = 'active' and deleted_at is null
  order by coalesce(ho_ten, email);
$$;

grant execute on function danh_sach_gv() to authenticated;

-- =============================================================================
-- HẾT
-- =============================================================================
