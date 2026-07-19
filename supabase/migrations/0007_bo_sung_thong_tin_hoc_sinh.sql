-- =============================================================================
-- BỔ SUNG THÔNG TIN HỌC SINH — 11 cột mới (tất cả optional/nullable) +
-- chặn xoá mềm học sinh với vai trò khác master_admin.
--
-- Không đụng tới các cột/constraint/RLS đã có trên hoc_sinh (đã đúng từ trước:
-- master_admin + admin_ts được ghi, các vai trò khác chỉ đọc). Chỉ thêm cột
-- và một trigger riêng để giới hạn thêm: admin_ts được thêm/sửa nhưng KHÔNG
-- được xoá mềm (chỉ master_admin mới đổi được deleted_at).
-- =============================================================================

alter table hoc_sinh
    add column if not exists tinh_trang_dang_ky text,
    add column if not exists ngay_sinh          date,
    add column if not exists gioi_tinh          text,
    add column if not exists email              text,
    add column if not exists sdt_hoc_sinh       text,
    add column if not exists cccd               text,
    add column if not exists truong_thpt        text,
    add column if not exists khoi_thi           text,
    add column if not exists nv1                text,
    add column if not exists ten_phu_huynh      text,
    add column if not exists dia_chi            text;

-- -----------------------------------------------------------------------------
-- Chặn xoá mềm (đổi deleted_at) nếu không phải master_admin. Admin_ts vẫn
-- update được các cột khác bình thường qua RLS write policy đã có sẵn — trigger
-- này chỉ chặn riêng hành vi đổi deleted_at.
-- -----------------------------------------------------------------------------
create or replace function forbid_hoc_sinh_soft_delete_by_non_master()
returns trigger language plpgsql as $$
begin
    if new.deleted_at is distinct from old.deleted_at and auth_role() <> 'master_admin' then
        raise exception 'Chỉ Master Admin được xoá (mềm) học sinh.';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_hoc_sinh_forbid_soft_delete on hoc_sinh;
create trigger trg_hoc_sinh_forbid_soft_delete before update on hoc_sinh
    for each row execute function forbid_hoc_sinh_soft_delete_by_non_master();
