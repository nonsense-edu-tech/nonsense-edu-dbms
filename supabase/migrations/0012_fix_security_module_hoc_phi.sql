-- =============================================================================
-- FIX BẢO MẬT cho migration 0011 (phát hiện qua Supabase advisors):
-- 1. 3 view tài chính mặc định chạy theo quyền NGƯỜI TẠO view (security definer
--    ngầm định của Postgres cho view) — có thể vượt qua RLS của bảng gốc thay vì
--    áp policy theo người đang truy vấn. Bật security_invoker = true để view
--    luôn tôn trọng RLS của người gọi, đúng như các bảng bên dưới nó.
-- 2. Ba hàm mới tạo ở 0011 (trigger + tao_ma_phieu_thu) chưa cố định search_path
--    (function_search_path_mutable) — thêm SET search_path = public.
-- =============================================================================

alter view v_thuc_thu_hop_dong  set (security_invoker = true);
alter view v_tai_chinh_hop_dong set (security_invoker = true);
alter view v_hop_dong_qua_han   set (security_invoker = true);

create or replace function forbid_hop_dong_soft_delete_by_non_master()
returns trigger language plpgsql set search_path = public as $$
begin
    if new.deleted_at is distinct from old.deleted_at and auth_role() <> 'master_admin' then
        raise exception 'Chỉ Master Admin được xoá (mềm) hợp đồng học phí.';
    end if;
    return new;
end;
$$;

create or replace function forbid_phieu_thu_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
    raise exception 'Phiếu thu là append-only: không được sửa/xoá (kể cả Master Admin). Hãy tạo phiếu đảo.';
end;
$$;

create or replace function tao_ma_phieu_thu()
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_nam  text := to_char(current_date, 'YYYY');
    v_next int;
begin
    perform pg_advisory_xact_lock(hashtext('phieu_thu_' || v_nam));

    select coalesce(max(substring(ma_phieu_thu from 9)::int), 0) + 1 into v_next
    from phieu_thu
    where ma_phieu_thu like 'PT-' || v_nam || '-%';

    return 'PT-' || v_nam || '-' || lpad(v_next::text, 6, '0');
end;
$$;
