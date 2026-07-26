-- Đảo ngược migration 0034: tách FOR ALL thành FOR INSERT/FOR UPDATE
-- riêng đúng là fix được lỗi rò rỉ deleted_at (bug đọc thấy dòng đã
-- xoá), NHƯNG lại làm hỏng chính chức năng xoá mềm nó định giữ nguyên -
-- đã xác nhận bằng test trực tiếp (bọc UPDATE trong hàm PL/pgSQL, không
-- RETURNING, không qua PostgREST/MCP tool nào cả): Postgres THẬT SỰ yêu
-- cầu dòng SAU KHI update phải còn được một policy có phạm vi SELECT
-- (FOR ALL hoặc FOR SELECT) chấp nhận, thì UPDATE mới thành công -
-- FOR UPDATE/FOR INSERT rời rạc KHÔNG đủ, bất kể RETURNING hay không.
-- Đây là giới hạn thật của RLS Postgres cho tình huống "update khiến
-- dòng tự ẩn khỏi chính sách đọc", không phải lỗi cấu hình.
--
-- Quyết định: quay lại FOR ALL (giống 0033, đã xác nhận xoá mềm chạy
-- đúng), CHẤP NHẬN việc master_admin/admin_ts/quan_ly_chi_nhanh (trong
-- phạm vi) sẽ có khả năng đọc được cả dòng đã xoá qua RLS - và chuyển
-- trách nhiệm "ẩn dòng đã xoá khỏi danh sách" sang TẦNG ỨNG DỤNG (thêm
-- .is('deleted_at', null) tường minh ở các trang danh sách, xem sửa
-- lop/page.tsx và hoc-sinh/page.tsx cùng đợt). Đây là ranh giới hợp lý:
-- RLS đảm bảo AI được đụng vào bảng; tầng ứng dụng quyết định HIỂN THỊ
-- gì cho từng màn hình. phong_hoc/buoi_hoc đã có sẵn .is('deleted_at',
-- null) trong page.tsx từ trước nên không cần sửa thêm ở đó.

begin;

-- ============================================================
-- lop
-- ============================================================
drop policy p_write_insert on public.lop;
drop policy p_write_update on public.lop;
create policy p_write on public.lop for all
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));

drop policy p_write_lop_quan_ly_chi_nhanh_insert on public.lop;
drop policy p_write_lop_quan_ly_chi_nhanh_update on public.lop;
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
-- hoc_sinh
-- ============================================================
drop policy p_write_insert on public.hoc_sinh;
drop policy p_write_update on public.hoc_sinh;
create policy p_write on public.hoc_sinh for all
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));

drop policy p_write_hoc_sinh_quan_ly_chi_nhanh_insert on public.hoc_sinh;
drop policy p_write_hoc_sinh_quan_ly_chi_nhanh_update on public.hoc_sinh;
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
-- phong_hoc
-- ============================================================
drop policy p_write_phong_hoc_insert on public.phong_hoc;
drop policy p_write_phong_hoc_update on public.phong_hoc;
create policy p_write_phong_hoc on public.phong_hoc for all
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));

drop policy p_write_phong_hoc_quan_ly_chi_nhanh_insert on public.phong_hoc;
drop policy p_write_phong_hoc_quan_ly_chi_nhanh_update on public.phong_hoc;
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
-- buoi_hoc
-- ============================================================
drop policy p_write_buoi_hoc_insert on public.buoi_hoc;
drop policy p_write_buoi_hoc_update on public.buoi_hoc;
create policy p_write_buoi_hoc on public.buoi_hoc for all
  using (auth_role() = any (array['master_admin', 'admin_ts']))
  with check (auth_role() = any (array['master_admin', 'admin_ts']));

drop policy p_write_buoi_hoc_gv_insert on public.buoi_hoc;
drop policy p_write_buoi_hoc_gv_update on public.buoi_hoc;
create policy p_write_buoi_hoc_gv on public.buoi_hoc for all
  using ((auth_role() = 'gv') and (gv_id = auth.uid()))
  with check ((auth_role() = 'gv') and (gv_id = auth.uid()));

drop policy p_write_buoi_hoc_quan_ly_chi_nhanh_insert on public.buoi_hoc;
drop policy p_write_buoi_hoc_quan_ly_chi_nhanh_update on public.buoi_hoc;
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
