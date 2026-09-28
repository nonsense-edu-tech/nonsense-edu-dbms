-- adr004-type: expand
-- =============================================================================
-- Tiếp theo `0038`/`0039` — viết lại hồi tố cho migration thứ 3 (cuối) trong
-- đợt áp tay lên production ngày 28/09/2026 (vi phạm ADR-004, xem ghi chú đầu
-- `0038`). Production đang có dưới version tự sinh `20260928094347`
-- (`gd3_buoc2_vaa_loi_p_write_for_all_de_ro_rls_doc`).
--
-- Gốc: khi viết + chạy bộ test RLS theo vai trò (gv/tro_giang/admin) cho
-- migration `0038`, phát hiện LỖI THẬT (không phải lỗi test): policy
-- `p_write` cũ trên `cau_hoi`/`ngu_lieu`/`lua_chon` là `FOR ALL` — trong
-- Postgres RLS, policy `FOR ALL` cũng áp dụng cho câu lệnh `SELECT`, và các
-- policy permissive được OR lại với nhau. Policy `p_write` cũ CHO PHÉP mọi gv
-- ghi (và do đó, đọc) mọi môn không giới hạn phạm vi — OR với `p_read` mới
-- (đã thu hẹp theo `co_quyen_mon()` ở `0038`) khiến gv vẫn đọc được MỌI môn,
-- không chỉ môn được phân công. Test 9 case theo vai trò xác nhận đúng lỗi
-- này trước khi vá (case "gv ngoài phạm vi đọc câu hỏi môn khác" FAIL trước
-- vá, PASS sau vá).
--
-- Vá: tách `p_write` (FOR ALL) thành 3 policy riêng theo đúng lệnh cụ thể
-- (`p_write_insert`/`p_write_update`/`p_write_delete`) — giữ nguyên logic vai
-- trò cũ, chỉ không còn áp dụng cho SELECT nữa (SELECT giờ chỉ do `p_read`
-- quyết định).
--
-- NGOẠI LỆ "RLS chỉ thêm không sửa" (cùng loại đã ghi ở `0038`): đây là sửa
-- một lỗi bảo mật thật đang mở (gv đọc vượt phạm vi), không thể chờ "thêm
-- policy mới" vì bản chất OR permissive sẽ không bao giờ THU HẸP quyền đã có
-- — phải DROP policy sai trước. Tại thời điểm áp (28/09/2026), giao diện nhập
-- liệu ngân hàng câu hỏi (Bước 5) CHƯA có code nào phụ thuộc `p_write` cũ, nên
-- không vi phạm luật (b) của ADR-004 (Contract chỉ chạy sau khi code phụ
-- thuộc đã live) — ở đây không có code phụ thuộc nào cả, cũ lẫn mới.
--
-- adr004-type vẫn để "expand" vì không đổi/xoá cột hay bảng, chỉ thay policy
-- RLS thuần tuý — đúng tinh thần phân loại Expand/Contract của ADR-004 (dựa
-- trên tác động tới schema/dữ liệu, không phải RLS).
-- =============================================================================

drop policy if exists p_write on public.cau_hoi;
create policy p_write_insert on public.cau_hoi for insert to authenticated
    with check (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'));
create policy p_write_update on public.cau_hoi for update to authenticated
    using (deleted_at is null and auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'))
    with check (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'));
create policy p_write_delete on public.cau_hoi for delete to authenticated
    using (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'));

drop policy if exists p_write on public.ngu_lieu;
create policy p_write_insert on public.ngu_lieu for insert to authenticated
    with check (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'));
create policy p_write_update on public.ngu_lieu for update to authenticated
    using (deleted_at is null and auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'))
    with check (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'));
create policy p_write_delete on public.ngu_lieu for delete to authenticated
    using (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'));

drop policy if exists p_write on public.lua_chon;
create policy p_write_insert on public.lua_chon for insert to authenticated
    with check (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'));
create policy p_write_update on public.lua_chon for update to authenticated
    using (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'))
    with check (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'));
create policy p_write_delete on public.lua_chon for delete to authenticated
    using (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'));
