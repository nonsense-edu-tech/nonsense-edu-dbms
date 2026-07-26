-- Vá tác dụng phụ ngoài ý muốn của migration 0032/0033: khi bỏ
-- `deleted_at IS NULL` khỏi USING của các policy p_write* (để sửa lỗi
-- xoá mềm bị RLS chặn do PostgREST luôn RETURNING), các policy này vẫn
-- khai báo `FOR ALL` — nghĩa là USING của chúng ÁP DỤNG LUÔN CHO SELECT
-- (không chỉ INSERT/UPDATE/DELETE), OR-combine với p_read. Kết quả: sau
-- khi bỏ điều kiện deleted_at khỏi p_write, master_admin/admin_ts (và
-- quan_ly_chi_nhanh trong phạm vi của họ) lại NHÌN THẤY CẢ dòng đã xoá
-- mềm khi đọc danh sách (p_write không còn chặn deleted_at, p_read tuy
-- vẫn đúng nhưng bị OR với p_write rộng hơn) -> lớp/học sinh đã xoá vẫn
-- hiện trong UI dù xoá thành công thật trong DB (đã xác nhận qua SQL
-- trực tiếp).
--
-- Fix đúng: TÁCH policy FOR ALL thành FOR INSERT + FOR UPDATE riêng
-- biệt. SELECT khi đó CHỈ do p_read quyết định (không đổi, vẫn lọc
-- deleted_at IS NULL đúng). FOR UPDATE giữ nguyên không có deleted_at
-- trong USING (để RETURNING của UPDATE xoá mềm vẫn hoạt động đúng như
-- 0032/0033 đã sửa). Áp dụng cho toàn bộ 4 bảng đã đụng tới:
-- lop, hoc_sinh, phong_hoc, buoi_hoc.

begin;

-- ============================================================
-- lop
-- ============================================================
drop policy p_write on public.lop;
create policy p_write_insert on public.lop for insert
  with check (auth_role() = any (array['master_admin', 'admin_ts']));
create policy p_write_update on public.lop for update
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));

drop policy p_write_lop_quan_ly_chi_nhanh on public.lop;
create policy p_write_lop_quan_ly_chi_nhanh_insert on public.lop for insert
  with check (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (chi_nhanh_id in (select user_chi_nhanh.chi_nhanh_id from public.user_chi_nhanh where user_chi_nhanh.user_id = auth.uid()))
  );
create policy p_write_lop_quan_ly_chi_nhanh_update on public.lop for update
  using (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (chi_nhanh_id in (select user_chi_nhanh.chi_nhanh_id from public.user_chi_nhanh where user_chi_nhanh.user_id = auth.uid()))
  )
  with check (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (chi_nhanh_id in (select user_chi_nhanh.chi_nhanh_id from public.user_chi_nhanh where user_chi_nhanh.user_id = auth.uid()))
  );

-- ============================================================
-- hoc_sinh
-- ============================================================
drop policy p_write on public.hoc_sinh;
create policy p_write_insert on public.hoc_sinh for insert
  with check (auth_role() = any (array['master_admin', 'admin_ts']));
create policy p_write_update on public.hoc_sinh for update
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));

drop policy p_write_hoc_sinh_quan_ly_chi_nhanh on public.hoc_sinh;
create policy p_write_hoc_sinh_quan_ly_chi_nhanh_insert on public.hoc_sinh for insert
  with check (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (lop_hien_tai_id in (
      select l.id from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    ))
  );
create policy p_write_hoc_sinh_quan_ly_chi_nhanh_update on public.hoc_sinh for update
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
-- phong_hoc
-- ============================================================
drop policy p_write_phong_hoc on public.phong_hoc;
create policy p_write_phong_hoc_insert on public.phong_hoc for insert
  with check (auth_role() = any (array['master_admin', 'admin_ts']));
create policy p_write_phong_hoc_update on public.phong_hoc for update
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));

drop policy p_write_phong_hoc_quan_ly_chi_nhanh on public.phong_hoc;
create policy p_write_phong_hoc_quan_ly_chi_nhanh_insert on public.phong_hoc for insert
  with check (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (chi_nhanh_id in (select user_chi_nhanh.chi_nhanh_id from public.user_chi_nhanh where user_chi_nhanh.user_id = auth.uid()))
  );
create policy p_write_phong_hoc_quan_ly_chi_nhanh_update on public.phong_hoc for update
  using (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (chi_nhanh_id in (select user_chi_nhanh.chi_nhanh_id from public.user_chi_nhanh where user_chi_nhanh.user_id = auth.uid()))
  )
  with check (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (chi_nhanh_id in (select user_chi_nhanh.chi_nhanh_id from public.user_chi_nhanh where user_chi_nhanh.user_id = auth.uid()))
  );

-- ============================================================
-- buoi_hoc
-- ============================================================
drop policy p_write_buoi_hoc on public.buoi_hoc;
create policy p_write_buoi_hoc_insert on public.buoi_hoc for insert
  with check (auth_role() = any (array['master_admin', 'admin_ts']));
create policy p_write_buoi_hoc_update on public.buoi_hoc for update
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));

drop policy p_write_buoi_hoc_gv on public.buoi_hoc;
create policy p_write_buoi_hoc_gv_insert on public.buoi_hoc for insert
  with check ((auth_role() = 'gv') and (gv_id = auth.uid()));
create policy p_write_buoi_hoc_gv_update on public.buoi_hoc for update
  using ((auth_role() = 'gv') and (gv_id = auth.uid()))
  with check ((auth_role() = 'gv') and (gv_id = auth.uid()));

drop policy p_write_buoi_hoc_quan_ly_chi_nhanh on public.buoi_hoc;
create policy p_write_buoi_hoc_quan_ly_chi_nhanh_insert on public.buoi_hoc for insert
  with check (
    (auth_role() = 'quan_ly_chi_nhanh')
    and (lop_id in (
      select l.id from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    ))
  );
create policy p_write_buoi_hoc_quan_ly_chi_nhanh_update on public.buoi_hoc for update
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
