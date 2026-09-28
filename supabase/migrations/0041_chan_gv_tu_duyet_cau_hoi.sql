-- adr004-type: expand
-- =============================================================================
-- BƯỚC 5.4: LUỒNG NỘP DUYỆT / DUYỆT CÂU HỎI — vá lỗ hổng vai trò.
--
-- Hiện trạng: policy p_write_update (0040) cho phép cả 4 vai trò ghi
-- (master_admin/admin_ht/truong_bm/gv) UPDATE cau_hoi không phân biệt cột,
-- kể cả trang_thai. Trigger trg_chan_tu_duyet_cau_hoi (0038) chỉ chặn tự
-- duyệt (nguoi_duyet = nguoi_tao) — KHÔNG chặn việc gv (vai trò thấp nhất
-- trong nhóm ghi) tự chuyển trang_thai sang da_duyet cho câu hỏi của người
-- khác. Theo nghiệp vụ, duyệt câu hỏi chỉ dành cho Admin học thuật/Trưởng bộ
-- môn/Master Admin — gv chỉ được nộp duyệt (nhap→cho_duyet), không được
-- duyệt (cho_duyet→da_duyet).
--
-- Vá: chỉ chặn bước DUYỆT (chuyển SANG da_duyet). Bước nộp duyệt (nhap→
-- cho_duyet) và các chuyển trạng thái khác (vd cho_duyet→nhap khi từ chối)
-- không đụng tới — gv vẫn nộp duyệt được bình thường. Cùng khuôn với
-- chan_tu_duyet_hop_dong_hoc_phi (0037): plpgsql, set search_path = public,
-- không security definer (chỉ gọi auth_role(), tự nó đã SECURITY DEFINER).
--
-- Expand thuần: trigger mới, không đổi cột/bảng/policy nào — code cũ đang
-- chạy trên production không bị ảnh hưởng trừ chính hành vi gv tự duyệt đang
-- bị vá (hành vi này chưa từng được dùng vì UI trước đây chưa có nút duyệt).
-- =============================================================================

create or replace function chan_gv_tu_duyet_cau_hoi()
returns trigger language plpgsql set search_path = public as $$
begin
    if new.trang_thai is distinct from old.trang_thai
       and new.trang_thai = 'da_duyet'
       and auth_role() not in ('master_admin', 'admin_ht', 'truong_bm') then
        raise exception 'Chỉ Admin học thuật, Trưởng bộ môn hoặc Master Admin được duyệt câu hỏi.';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_cau_hoi_chan_gv_tu_duyet on cau_hoi;
create trigger trg_cau_hoi_chan_gv_tu_duyet before update on cau_hoi
    for each row execute function chan_gv_tu_duyet_cau_hoi();
