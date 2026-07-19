-- =============================================================================
-- NONSENSE EDU — VÁ LỖI: tao_lop()/tao_hoc_sinh() insert nhầm vào cột tự tính
-- Đích: Supabase / PostgreSQL 15+
--
-- Bối cảnh: cap_hoc_ma, chuong_trinh_ma, nam_hoc, so_lop (bảng lop) và stt
-- (bảng hoc_sinh) đều là cột GENERATED ALWAYS AS (...) STORED — tự tính từ
-- ma_lop/ma_hoc_sinh, Postgres không cho insert giá trị trực tiếp vào các cột
-- này. Migration 0004 viết nhầm insert luôn các cột đó → lỗi "cannot insert a
-- non-DEFAULT value into column". Migration này chỉ sửa lại 2 hàm cho đúng
-- (create or replace — an toàn chạy lại nhiều lần), không đổi gì khác.
-- =============================================================================

create or replace function tao_lop(
    p_cap_hoc      smallint,
    p_chuong_trinh text,
    p_nam_hoc      smallint,
    p_ten_lop      text default null,
    p_chi_nhanh_id bigint default null
)
returns lop
language plpgsql
security invoker
as $$
declare
    v_next_so_lop smallint;
    v_ma_lop      char(9);
    v_lop         lop;
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

    perform pg_advisory_xact_lock(hashtext('lop_' || p_cap_hoc::text || p_chuong_trinh || lpad(p_nam_hoc::text, 2, '0')));

    select coalesce(max(so_lop), 0) + 1 into v_next_so_lop
    from lop
    where cap_hoc_ma = p_cap_hoc and chuong_trinh_ma = p_chuong_trinh and nam_hoc = p_nam_hoc
      and deleted_at is null;

    if v_next_so_lop > 999 then
        raise exception 'Đã đạt tối đa 999 lớp cho tổ hợp cấp học/chương trình/năm học này';
    end if;

    v_ma_lop := p_cap_hoc::text || p_chuong_trinh || lpad(p_nam_hoc::text, 2, '0') || lpad(v_next_so_lop::text, 3, '0');

    -- cap_hoc_ma/chuong_trinh_ma/nam_hoc/so_lop là cột GENERATED, tự tính từ ma_lop.
    insert into lop (ma_lop, ten_lop, chi_nhanh_id, nguoi_tao)
    values (v_ma_lop, p_ten_lop, p_chi_nhanh_id, auth.uid())
    returning * into v_lop;

    return v_lop;
end;
$$;

create or replace function tao_hoc_sinh(
    p_lop_id         bigint,
    p_ho_ten         text,
    p_sdt_phu_huynh  text default null,
    p_anh_chan_dung  text default null
)
returns hoc_sinh
language plpgsql
security invoker
as $$
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

    -- stt là cột GENERATED, tự tính từ ma_hoc_sinh.
    insert into hoc_sinh (ma_hoc_sinh, lop_nhap_hoc_id, lop_hien_tai_id, ho_ten, sdt_phu_huynh, anh_chan_dung, nguoi_tao)
    values (v_ma_hoc_sinh, v_lop.id, v_lop.id, btrim(p_ho_ten), p_sdt_phu_huynh, p_anh_chan_dung, auth.uid())
    returning * into v_hs;

    insert into ghi_danh (hoc_sinh_id, lop_id, ngay_bat_dau, trang_thai)
    values (v_hs.id, v_lop.id, current_date, 'dang_hoc');

    return v_hs;
end;
$$;

-- =============================================================================
-- HẾT
-- =============================================================================
