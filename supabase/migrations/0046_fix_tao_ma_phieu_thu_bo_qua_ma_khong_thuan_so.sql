-- adr004-type: expand
-- 0046: tao_ma_phieu_thu() không được vỡ khi gặp mã phiếu không thuần số (Expand).
--
-- Sự cố 02/10/2026: phiếu đảo được chèn tay bằng SQL với mã 'PT-2026-000187-DAO'.
-- Hàm cũ lấy max(substring(ma_phieu_thu from 9)::int) trên MỌI mã khớp 'PT-2026-%'
-- nên ép '000187-DAO' sang int → lỗi 'invalid input syntax for type integer' →
-- MỌI lần ghi phiếu thu mới đều thất bại. Phiếu thu là append-only (trigger
-- forbid_phieu_thu_mutation) nên không sửa/xoá được mã đó — phải sửa hàm.
--
-- Sửa: chỉ xét các mã đúng dạng 'PT-<năm>-<chữ số>'. Mã khác (vd hậu tố '-DAO') bị bỏ
-- qua khi tính số thứ tự kế tiếp. Điều kiện nằm ở WHERE nên chạy trước khi ép kiểu.
--
-- Backward-compatible (ADR-004 luật 3): cùng tên, cùng tham số, cùng kiểu trả về;
-- CREATE OR REPLACE giữ nguyên quyền thực thi. Code cũ gọi y hệt, kết quả chỉ khác
-- ở chỗ không còn vỡ.
create or replace function public.tao_ma_phieu_thu()
returns text
language plpgsql
set search_path to 'public'
as $function$
declare
    v_nam  text := to_char(current_date, 'YYYY');
    v_next int;
begin
    perform pg_advisory_xact_lock(hashtext('phieu_thu_' || v_nam));

    select coalesce(max(substring(ma_phieu_thu from 9)::int), 0) + 1 into v_next
    from phieu_thu
    where ma_phieu_thu ~ ('^PT-' || v_nam || '-[0-9]+$');

    return 'PT-' || v_nam || '-' || lpad(v_next::text, 6, '0');
end;
$function$;
