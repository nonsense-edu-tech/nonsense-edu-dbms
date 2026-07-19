-- =============================================================================
-- CHẶN XOÁ MỀM LỚP HỌC VỚI VAI TRÒ KHÁC MASTER_ADMIN.
--
-- Không đụng RLS write hiện có trên lop (đã đúng: master_admin + admin_ts được
-- ghi). Chỉ thêm trigger riêng: admin_ts vẫn sửa được (vd ten_lop) nhưng KHÔNG
-- được đổi deleted_at (xoá mềm) — chỉ master_admin. Tương tự trigger đã áp
-- dụng cho hoc_sinh ở migration 0007.
-- =============================================================================

create or replace function forbid_lop_soft_delete_by_non_master()
returns trigger language plpgsql as $$
begin
    if new.deleted_at is distinct from old.deleted_at and auth_role() <> 'master_admin' then
        raise exception 'Chỉ Master Admin được xoá (mềm) lớp học.';
    end if;
    return new;
end;
$$;

drop trigger if exists trg_lop_forbid_soft_delete on lop;
create trigger trg_lop_forbid_soft_delete before update on lop
    for each row execute function forbid_lop_soft_delete_by_non_master();
