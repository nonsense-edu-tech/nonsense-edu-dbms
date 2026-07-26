-- Vá 2 bug nghiêm trọng phát hiện khi test thật qua UI (không phải do
-- Khối 2 gây ra, tồn tại từ trước, chỉ mới lộ ra khi test xoá thật):
--
-- 1. "Xoá lớp"/"Xoá học sinh" báo lỗi RLS dù đúng vai trò master_admin.
--    Nguyên nhân thật (đã cô lập bằng test trực tiếp, mô phỏng session
--    authenticated qua request.jwt.claims): policy p_write có
--    `deleted_at IS NULL AND auth_role() = ...` trong USING. PostgREST
--    luôn phát sinh `RETURNING` cho câu UPDATE (bất kể có gọi .select()
--    phía client hay không). Khi xoá mềm (set deleted_at = now()), dòng
--    SAU khi update không còn thoả `deleted_at IS NULL` nữa -> không
--    policy nào "nhìn thấy" được dòng để trả về RETURNING -> Postgres từ
--    chối toàn bộ câu lệnh với lỗi "new row violates row-level security
--    policy". Đây là hành vi RLS đúng của Postgres, không phải bug ngẫu
--    nhiên - xác nhận qua so sánh production (không lỗi vì lúc test chỉ
--    update cột không ảnh hưởng RLS) và qua nhiều test cô lập trực tiếp.
--    Fix: bỏ `deleted_at IS NULL AND` khỏi USING của các policy ghi trên
--    lop/hoc_sinh - vai trò vẫn được auth_role() kiểm tra đầy đủ, chỉ bỏ
--    điều kiện phụ vốn không phải ranh giới bảo mật thật (WITH CHECK đã
--    không có điều kiện này từ trước).
--    LƯU Ý: cùng pattern này tồn tại ở ~19 policy trên nhiều bảng khác
--    (bai_hoc, buoi_hoc, cau_hoi, de, ghi_danh, goi_hoc_phi, hoc_phan,
--    hop_dong_hoc_phi, mon_hoc, ngu_lieu, phong_hoc) - CHƯA sửa trong
--    migration này, chỉ sửa lop/hoc_sinh (đúng phạm vi Khối 2 đang test).
--
-- 2. "Tạo học sinh mới" báo lỗi "column hoc_sinh_id is of type uuid but
--    expression is of type bigint". Hàm tao_hoc_sinh() đang LIVE trên
--    staging bị lệch so với file migration 0025 trong repo (insert vào
--    ghi_danh dùng v_hs.id_old/v_lop.id_old thay vì v_hs.id/v_lop.id) -
--    có thể do một bước ad-hoc nào đó trong lịch sử debug ghi đè lại,
--    không phải do lần sửa Khối 2 này. Production đã đúng từ trước (đối
--    chiếu qua pg_get_functiondef xác nhận). Ghi đè lại đúng bản chuẩn.

begin;

-- ============================================================
-- lop: bỏ deleted_at IS NULL khỏi USING của 2 policy ghi
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

-- ============================================================
-- tao_hoc_sinh(): ghi đè lại đúng bản chuẩn (khớp production)
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
    where lop_nhap_hoc_id = v_lop.id and deleted_at is null;

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

commit;
