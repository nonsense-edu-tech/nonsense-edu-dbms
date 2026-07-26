-- Vá tiếp các bug phát hiện khi test thật (đợt 2):
--
-- 1. "Tạo học sinh mới" báo duplicate key ma_hoc_sinh. Nguyên nhân thật:
--    tao_hoc_sinh() tính STT tiếp theo chỉ dựa trên học sinh CHƯA xoá
--    (`deleted_at is null`), nhưng UNIQUE (ma_hoc_sinh) áp dụng cho MỌI
--    dòng kể cả đã xoá mềm. Sau khi xoá 1 học sinh, STT của nó bị tính
--    lại cho học sinh mới -> đụng độ với ma_hoc_sinh cũ vẫn còn tồn tại
--    trong bảng (chỉ xoá mềm, không xoá vật lý). Vi phạm nguyên tắc "mã
--    cố định vĩnh viễn" đã chốt trong tài liệu dự án - mã không được tái
--    sử dụng dù học sinh đã bị xoá. Fix: bỏ `and deleted_at is null`
--    khỏi truy vấn tính STT (tính trên TOÀN BỘ lịch sử, kể cả đã xoá).
--    tao_lop() có cùng pattern y hệt cho so_lop -> sửa luôn để nhất quán,
--    tránh lỗi tương tự khi xoá lớp rồi tạo lớp mới cùng tổ hợp.
--
-- 2. phong_hoc/buoi_hoc: cùng pattern RLS "deleted_at IS NULL trong
--    USING" đã sửa cho lop/hoc_sinh ở migration 0032 (PostgREST luôn
--    RETURNING cho UPDATE -> xoá mềm tự khoá mình ra khỏi USING -> bị
--    Postgres từ chối). Áp dụng cùng cách sửa.

begin;

-- ============================================================
-- tao_hoc_sinh(): bỏ deleted_at is null khi tính STT
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
-- tao_lop(): bỏ deleted_at is null khi tính so_lop
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
-- phong_hoc: bỏ deleted_at IS NULL khỏi USING của 2 policy ghi
-- ============================================================
drop policy p_write_phong_hoc on public.phong_hoc;
create policy p_write_phong_hoc on public.phong_hoc for all
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));

drop policy p_write_phong_hoc_quan_ly_chi_nhanh on public.phong_hoc;
create policy p_write_phong_hoc_quan_ly_chi_nhanh on public.phong_hoc for all
  using (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (chi_nhanh_id in (select user_chi_nhanh.chi_nhanh_id from public.user_chi_nhanh where user_chi_nhanh.user_id = auth.uid()))
  )
  with check (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (chi_nhanh_id in (select user_chi_nhanh.chi_nhanh_id from public.user_chi_nhanh where user_chi_nhanh.user_id = auth.uid()))
  );

-- ============================================================
-- buoi_hoc: bỏ deleted_at IS NULL khỏi USING của 3 policy ghi
-- ============================================================
drop policy p_write_buoi_hoc on public.buoi_hoc;
create policy p_write_buoi_hoc on public.buoi_hoc for all
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));

drop policy p_write_buoi_hoc_gv on public.buoi_hoc;
create policy p_write_buoi_hoc_gv on public.buoi_hoc for all
  using ((auth_role() = 'gv') and (gv_id = auth.uid()))
  with check ((auth_role() = 'gv') and (gv_id = auth.uid()));

drop policy p_write_buoi_hoc_quan_ly_chi_nhanh on public.buoi_hoc;
create policy p_write_buoi_hoc_quan_ly_chi_nhanh on public.buoi_hoc for all
  using (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (lop_id in (
      select l.id from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    ))
  )
  with check (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (lop_id in (
      select l.id from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    ))
  );

commit;
