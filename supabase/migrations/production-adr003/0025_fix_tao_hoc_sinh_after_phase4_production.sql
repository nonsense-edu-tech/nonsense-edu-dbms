-- ADR-003 Muc 6: sau Phase 4, hoc_sinh.lop_nhap_hoc_id/lop_hien_tai_id
-- da la uuid (khop lop.id song). tao_hoc_sinh() phai dung v_lop.id
-- (khong con v_lop.id_old) khi ghi vao 2 cot nay. ghi_danh van Phase 5
-- (chua chuyen doi) nen phan insert vao ghi_danh van phai dung id_old
-- (ca hoc_sinh_id lan lop_id).
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

    perform pg_advisory_xact_lock(hashtext('hoc_sinh_' || v_lop.id::text));

    select coalesce(max(stt), 0) + 1 into v_next_stt
    from hoc_sinh
    where lop_nhap_hoc_id = v_lop.id and deleted_at is null;

    if v_next_stt > 999 then
        raise exception 'Lớp % đã đạt tối đa 999 học sinh', v_lop.ma_lop;
    end if;

    v_ma_hoc_sinh := v_lop.ma_lop || lpad(v_next_stt::text, 3, '0');

    insert into hoc_sinh (ma_hoc_sinh, lop_nhap_hoc_id, lop_hien_tai_id, ho_ten, sdt_phu_huynh, anh_chan_dung, nguoi_tao)
    values (v_ma_hoc_sinh, v_lop.id, v_lop.id, btrim(p_ho_ten), p_sdt_phu_huynh, p_anh_chan_dung, auth.uid())
    returning * into v_hs;

    insert into ghi_danh (hoc_sinh_id, lop_id, ngay_bat_dau, trang_thai)
    values (v_hs.id_old, v_lop.id_old, current_date, 'dang_hoc');

    return v_hs;
end;
$function$;
