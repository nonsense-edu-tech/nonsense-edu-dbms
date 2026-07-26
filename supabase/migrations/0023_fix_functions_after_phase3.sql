-- ADR-003 Muc 6: ra soat ham/trigger sau khi lop/chi_nhanh doi UUID
-- (Phase 1 + Phase 3). 2 ham co tham so ep kieu bigint tuong minh, da
-- vo hieu vi bang dich da doi sang UUID. Sua ca 3 loi phat hien khi
-- kiem thu thuc te (khong chi doi kieu tham so):
--   1. p_chi_nhanh_id/p_lop_id bigint -> uuid.
--   2. CREATE OR REPLACE khong thay the duoc ham khi doi kieu tham so
--      (tao overload MOI thay vi ghi de) -> phai DROP overload bigint
--      cu tuong minh, khong thi bi loi "not unique" khi goi.
--   3. tao_lop() insert thieu cap_hoc_id/chuong_trinh_id (cot moi them
--      o Phase 3, NOT NULL) -> phai tra cuu qua ma va dien vao.
--   4. tao_hoc_sinh() ghi v_lop.id (uuid moi) vao
--      hoc_sinh.lop_nhap_hoc_id/lop_hien_tai_id va ghi_danh.lop_id -
--      cac cot nay VAN CON bigint (Phase 4/5, chua chuyen doi) -> phai
--      dung v_lop.id_old (bigint cu giu lai tu Phase 3) thay vi
--      v_lop.id.
--
-- 4 ham con lai trong danh sach ADR-003 Muc 6 (forbid_hoc_sinh_id_change,
-- forbid_hoc_sinh_soft_delete_by_non_master, forbid_lop_soft_delete_by_non_master,
-- forbid_hop_dong_soft_delete_by_non_master, forbid_phieu_thu_mutation,
-- tao_ma_phieu_thu, auth_role) khong co tham so bigint gan voi bang da
-- doi -> khong can sua.

drop function if exists public.tao_lop(smallint, text, smallint, text, bigint);
drop function if exists public.tao_hoc_sinh(bigint, text, text, text);

create or replace function public.tao_lop(
  p_cap_hoc smallint,
  p_chuong_trinh text,
  p_nam_hoc smallint,
  p_ten_lop text default null,
  p_chi_nhanh_id uuid default null
)
returns lop
language plpgsql
as $function$
declare
    v_next_so_lop smallint;
    v_ma_lop      char(9);
    v_lop         lop;
    v_cap_hoc_id  uuid;
    v_chuong_trinh_id uuid;
begin
    if p_cap_hoc not between 1 and 9 then
        raise exception 'Cấp học phải từ 1-9';
    end if;
    if p_chuong_trinh !~ '^[0-9]{3}$' then
        raise exception 'Chương trình phải là chuỗi 3 chữ số';
    end if;
    if p_nam_hoc not between 0 and 99 then
        raise exception 'Năm học phải từ 00-99';
    end if;

    select id into v_cap_hoc_id from cap_hoc where ma = p_cap_hoc;
    if not found then
        raise exception 'Không tìm thấy cấp học với mã=%', p_cap_hoc;
    end if;

    select id into v_chuong_trinh_id from chuong_trinh where ma = p_chuong_trinh;
    if not found then
        raise exception 'Không tìm thấy chương trình với mã=%', p_chuong_trinh;
    end if;

    perform pg_advisory_xact_lock(hashtext('lop_' || p_cap_hoc::text || p_chuong_trinh || lpad(p_nam_hoc::text, 2, '0')));

    select coalesce(max(so_lop), 0) + 1 into v_next_so_lop
    from lop
    where cap_hoc_ma = p_cap_hoc and chuong_trinh_ma = p_chuong_trinh and nam_hoc = p_nam_hoc
      and deleted_at is null;

    if v_next_so_lop > 999 then
        raise exception 'Đã đạt tối đa 999 lớp cho tổ hợp cấp học/chương trình/năm học này';
    end if;

    v_ma_lop := p_cap_hoc::text || p_chuong_trinh || lpad(p_nam_hoc::text, 2, '0') || lpad(v_next_so_lop::text, 3, '0');

    insert into lop (ma_lop, ten_lop, chi_nhanh_id, cap_hoc_id, chuong_trinh_id, nguoi_tao)
    values (v_ma_lop, p_ten_lop, p_chi_nhanh_id, v_cap_hoc_id, v_chuong_trinh_id, auth.uid())
    returning * into v_lop;

    return v_lop;
end;
$function$;

create or replace function public.tao_hoc_sinh(
  p_lop_id uuid,
  p_ho_ten text,
  p_sdt_phu_huynh text default null,
  p_anh_chan_dung text default null
)
returns hoc_sinh
language plpgsql
as $function$
declare
    v_lop           lop;
    v_next_stt      smallint;
    v_ma_hoc_sinh   char(12);
    v_hs            hoc_sinh;
begin
    select * into v_lop from lop where id = p_lop_id and deleted_at is null;
    if not found then
        raise exception 'Không tìm thấy lớp với id=% (hoặc lớp đã bị xoá)', p_lop_id;
    end if;

    if coalesce(btrim(p_ho_ten), '') = '' then
        raise exception 'Họ tên không được để trống';
    end if;

    perform pg_advisory_xact_lock(hashtext('hoc_sinh_' || v_lop.id_old::text));

    select coalesce(max(stt), 0) + 1 into v_next_stt
    from hoc_sinh
    where lop_nhap_hoc_id = v_lop.id_old and deleted_at is null;

    if v_next_stt > 999 then
        raise exception 'Lớp % đã đạt tối đa 999 học sinh', v_lop.ma_lop;
    end if;

    v_ma_hoc_sinh := v_lop.ma_lop || lpad(v_next_stt::text, 3, '0');

    insert into hoc_sinh (ma_hoc_sinh, lop_nhap_hoc_id, lop_hien_tai_id, ho_ten, sdt_phu_huynh, anh_chan_dung, nguoi_tao)
    values (v_ma_hoc_sinh, v_lop.id_old, v_lop.id_old, btrim(p_ho_ten), p_sdt_phu_huynh, p_anh_chan_dung, auth.uid())
    returning * into v_hs;

    insert into ghi_danh (hoc_sinh_id, lop_id, ngay_bat_dau, trang_thai)
    values (v_hs.id, v_lop.id_old, current_date, 'dang_hoc');

    return v_hs;
end;
$function$;
