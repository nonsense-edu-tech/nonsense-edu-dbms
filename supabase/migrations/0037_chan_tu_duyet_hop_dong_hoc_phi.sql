-- adr004-type: expand
-- =============================================================================
-- VÁ LỖ HỔNG TỰ DUYỆT HỢP ĐỒNG HỌC PHÍ (audit 01/08/2026).
--
-- Hiện trạng: trigger trg_hop_dong_forbid_soft_delete (0011/0012) chỉ kiểm
-- soát cột deleted_at, KHÔNG kiểm soát chuyển trang_thai. Policy p_write_hop_dong
-- (0011) cho admin_ts ghi ALL trên hop_dong_hoc_phi, và p_write_hop_dong_quan_ly_chi_nhanh
-- (0015-0018) cho quan_ly_chi_nhanh ghi ALL trong phạm vi chi nhánh của họ —
-- không gì chặn 2 vai trò này tự chuyển trang_thai sang dang_hoat_dong (tự
-- duyệt hợp đồng của chính mình).
--
-- Vá: chỉ chặn bước DUYỆT (chuyển SANG dang_hoat_dong). Bước nộp (nhap→
-- cho_duyet) admin_ts/quan_ly_chi_nhanh vẫn phải làm được — không đụng tới.
-- Chỉ master_admin/ke_toan được duyệt. Cùng khuôn với
-- forbid_hop_dong_soft_delete_by_non_master (0012): plpgsql, set search_path
-- = public, KHÔNG security definer (không cần — chỉ gọi auth_role(), tự nó
-- đã SECURITY DEFINER, và raise exception không cần quyền nâng).
--
-- Expand thuần: trigger mới, không đổi cột/bảng nào — code cũ đang chạy trên
-- production không bị ảnh hưởng trừ chính hành vi tự duyệt đang bị vá.
-- =============================================================================

create or replace function chan_tu_duyet_hop_dong_hoc_phi()
returns trigger language plpgsql set search_path = public as $$
begin
    if new.trang_thai is distinct from old.trang_thai
       and new.trang_thai = 'dang_hoat_dong'
       and auth_role() not in ('master_admin', 'ke_toan') then
        raise exception 'Chỉ Kế toán hoặc Master Admin được duyệt hợp đồng học phí.';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_hop_dong_chan_tu_duyet on hop_dong_hoc_phi;
create trigger trg_hop_dong_chan_tu_duyet before update on hop_dong_hoc_phi
    for each row execute function chan_tu_duyet_hop_dong_hoc_phi();
