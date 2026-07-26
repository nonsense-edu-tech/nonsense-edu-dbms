-- Bản PRODUCTION gộp trạng thái CUỐI CÙNG của root 0032 + 0033 (bỏ qua
-- phần 0034/0035 vì 2 file đó tự triệt tiêu lẫn nhau cho lop/hoc_sinh —
-- xem CHANGELOG.md). Đối chiếu qua pg_get_functiondef()/pg_policies trên
-- staging tại thời điểm viết file, không suy luận từ tên file.
--
-- 3 lỗi được vá trong file này (đã xác nhận ĐANG XẢY RA thật trên
-- production qua Supabase MCP trước khi viết migration):
-- 1. tao_hoc_sinh() đang insert v_hs.id_old/v_lop.id_old (bigint) vào
--    ghi_danh.hoc_sinh_id/lop_id (uuid) -> lỗi kiểu dữ liệu, tạo học sinh
--    mới hoàn toàn không chạy được.
-- 2. tao_hoc_sinh()/tao_lop() tính STT/so_lop tiếp theo chỉ dựa trên dòng
--    CHƯA xoá mềm, trong khi UNIQUE áp dụng cho mọi dòng kể cả đã xoá ->
--    xoá rồi tạo lại cùng lớp/tổ hợp sẽ đụng mã cũ (duplicate key).
-- 3. RLS p_write trên lop/hoc_sinh còn "deleted_at is null" trong USING
--    của policy FOR ALL -> PostgREST luôn RETURNING cho UPDATE -> xoá mềm
--    tự khiến dòng không còn thoả policy nào -> Postgres từ chối câu lệnh
--    xoá.

begin;

-- ============================================================
-- tao_hoc_sinh(): fix id_old -> id, bỏ deleted_at khỏi tính STT
-- ============================================================
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
    where lop_nhap_hoc_id = v_lop.id;

    if v_next_stt > 999 then
        raise exception 'Lớp % đã đạt tối đa 999 học sinh', v_lop.ma_lop;
    end if;

    v_ma_hoc_sinh := v_lop.ma_lop || lpad(v_next_stt::text, 3, '0');

    insert into hoc_sinh (ma_hoc_sinh, lop_nhap_hoc_id, lop_hien_tai_id, ho_ten, sdt_phu_huynh, anh_chan_dung, nguoi_tao)
    values (v_ma_hoc_sinh, v_lop.id, v_lop.id, btrim(p_ho_ten), p_sdt_phu_huynh, p_anh_chan_dung, auth.uid())
    returning * into v_hs;

    insert into ghi_danh (hoc_sinh_id, lop_id, ngay_bat_dau, trang_thai)
    values (v_hs.id, v_lop.id, current_date, 'dang_hoc');

    return v_hs;
end;
$function$;

-- ============================================================
-- tao_lop(): bỏ deleted_at khỏi tính so_lop
-- ============================================================
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
    where cap_hoc_ma = p_cap_hoc and chuong_trinh_ma = p_chuong_trinh and nam_hoc = p_nam_hoc;

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

-- ============================================================
-- lop: bỏ deleted_at is null khỏi USING của 2 policy ghi
-- ============================================================
drop policy p_write on public.lop;
create policy p_write on public.lop for all
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));

drop policy p_write_lop_quan_ly_chi_nhanh on public.lop;
create policy p_write_lop_quan_ly_chi_nhanh on public.lop for all
  using (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (chi_nhanh_id in (select user_chi_nhanh.chi_nhanh_id from public.user_chi_nhanh where user_chi_nhanh.user_id = auth.uid()))
  )
  with check (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (chi_nhanh_id in (select user_chi_nhanh.chi_nhanh_id from public.user_chi_nhanh where user_chi_nhanh.user_id = auth.uid()))
  );

-- ============================================================
-- hoc_sinh: tương tự
-- ============================================================
drop policy p_write on public.hoc_sinh;
create policy p_write on public.hoc_sinh for all
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));

drop policy p_write_hoc_sinh_quan_ly_chi_nhanh on public.hoc_sinh;
create policy p_write_hoc_sinh_quan_ly_chi_nhanh on public.hoc_sinh for all
  using (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (lop_hien_tai_id in (
      select l.id from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    ))
  )
  with check (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (lop_hien_tai_id in (
      select l.id from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    ))
  );

commit;
