-- =============================================================================
-- VAI TRÒ MỚI: quan_ly_chi_nhanh — phụ trách tuyển sinh + giáo vụ + phòng học
-- CHO MỘT CHI NHÁNH DUY NHẤT.
--
-- Nguyên tắc an toàn: KHÔNG sửa bất kỳ policy nào đang chạy thật (p_write,
-- p_write_hop_dong...) — chỉ THÊM policy mới. RLS cộng dồn theo OR nên không
-- ảnh hưởng quyền hiện có của admin_ts/master_admin/ke_toan.
--
-- Không tái dùng user_pham_vi (cap_hoc_ma NOT NULL — bảng đó dành cho phạm vi
-- NỘI DUNG, không phù hợp cho phạm vi CHI NHÁNH/vận hành). Tạo bảng phạm vi
-- riêng: user_chi_nhanh.
-- =============================================================================

-- 1. Thêm vai trò mới vào CHECK constraint (không đổi 7 vai trò cũ)
alter table users drop constraint users_vai_tro_check;
alter table users add constraint users_vai_tro_check
    check (vai_tro = any (array['master_admin','admin_ts','admin_ht','truong_bm',
                                 'gv','ke_toan','thu_ngan','quan_ly_chi_nhanh']));

-- 2. Bảng phạm vi chi nhánh — một user (thường quan_ly_chi_nhanh) phụ trách 1
--    hoặc nhiều chi nhánh. UNIQUE tránh gán trùng.
create table user_chi_nhanh (
    id            bigint generated always as identity primary key,
    user_id       uuid not null references users (id),
    chi_nhanh_id  bigint not null references chi_nhanh (id),
    created_at    timestamptz not null default now(),
    unique (user_id, chi_nhanh_id)
);

alter table user_chi_nhanh enable row level security;

create policy p_read_user_chi_nhanh on user_chi_nhanh for select to authenticated
    using (user_id = auth.uid() or auth_role() = 'master_admin');

create policy p_write_user_chi_nhanh on user_chi_nhanh for all to authenticated
    using (auth_role() = 'master_admin')
    with check (auth_role() = 'master_admin');

-- 3. Policy MỚI (thêm, không sửa cũ) cho lop — ghi trong phạm vi chi nhánh
create policy p_write_lop_quan_ly_chi_nhanh on lop for all to authenticated
    using (
        deleted_at is null
        and auth_role() = 'quan_ly_chi_nhanh'
        and chi_nhanh_id in (select chi_nhanh_id from user_chi_nhanh where user_id = auth.uid())
    )
    with check (
        auth_role() = 'quan_ly_chi_nhanh'
        and chi_nhanh_id in (select chi_nhanh_id from user_chi_nhanh where user_id = auth.uid())
    );

-- 4. Policy MỚI cho hoc_sinh — scope qua lop_hien_tai_id (chi nhánh HIỆN TẠI
--    của học sinh; giả định hợp lý: học sinh chuyển chi nhánh thì thuộc
--    quyền quản lý của chi nhánh mới, không phải chi nhánh nhập học ban đầu —
--    xác nhận lại với Nguyen nếu ý muốn khác).
create policy p_write_hoc_sinh_quan_ly_chi_nhanh on hoc_sinh for all to authenticated
    using (
        deleted_at is null
        and auth_role() = 'quan_ly_chi_nhanh'
        and lop_hien_tai_id in (
            select l.id from lop l
            join user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
            where uc.user_id = auth.uid()
        )
    )
    with check (
        auth_role() = 'quan_ly_chi_nhanh'
        and lop_hien_tai_id in (
            select l.id from lop l
            join user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
            where uc.user_id = auth.uid()
        )
    );

-- 5. Policy MỚI cho ghi_danh
create policy p_write_ghi_danh_quan_ly_chi_nhanh on ghi_danh for all to authenticated
    using (
        deleted_at is null
        and auth_role() = 'quan_ly_chi_nhanh'
        and lop_id in (
            select l.id from lop l
            join user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
            where uc.user_id = auth.uid()
        )
    )
    with check (
        auth_role() = 'quan_ly_chi_nhanh'
        and lop_id in (
            select l.id from lop l
            join user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
            where uc.user_id = auth.uid()
        )
    );

-- 6. Policy MỚI cho hop_dong_hoc_phi — CHỈ TẠO (nhap), giống admin_ts hiện tại.
--    Lưu ý: p_write_hop_dong hiện tại KHÔNG có trigger chặn admin_ts tự đổi
--    trang_thai sang cho_duyet/dang_hoat_dong — việc "chỉ tạo không duyệt"
--    hiện là quy ước UI, chưa ép được ở tầng CSDL cho cả admin_ts. Policy
--    dưới đây giữ nguyên mức đó (khớp yêu cầu "giống admin_ts hiện tại"),
--    không tự ý siết chặt hơn. Nếu muốn ép cứng ở CSDL cho cả 2 vai trò,
--    cần thêm trigger riêng — hỏi lại Nguyen trước khi làm vì ảnh hưởng cả
--    admin_ts đang chạy.
create policy p_write_hop_dong_quan_ly_chi_nhanh on hop_dong_hoc_phi for all to authenticated
    using (
        deleted_at is null
        and auth_role() = 'quan_ly_chi_nhanh'
        and ghi_danh_id in (
            select gd.id from ghi_danh gd
            join lop l on l.id = gd.lop_id
            join user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
            where uc.user_id = auth.uid()
        )
    )
    with check (
        auth_role() = 'quan_ly_chi_nhanh'
        and ghi_danh_id in (
            select gd.id from ghi_danh gd
            join lop l on l.id = gd.lop_id
            join user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
            where uc.user_id = auth.uid()
        )
    );

-- 7. Đọc: quan_ly_chi_nhanh cần thấy được hop_dong_hoc_phi trong chi nhánh
--    mình (policy đọc hiện tại p_read_hop_dong không có auth_role() này).
create policy p_read_hop_dong_quan_ly_chi_nhanh on hop_dong_hoc_phi for select to authenticated
    using (
        deleted_at is null
        and auth_role() = 'quan_ly_chi_nhanh'
        and ghi_danh_id in (
            select gd.id from ghi_danh gd
            join lop l on l.id = gd.lop_id
            join user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
            where uc.user_id = auth.uid()
        )
    );

-- =============================================================================
-- HẾT — chưa đụng gì tới phong_hoc/loai_phong/buoi_hoc (chưa tồn tại trên
-- production). Nguyên tắc "chỉ chọn phòng, không thấy giá" sẽ áp dụng ngay
-- từ migration tạo các bảng đó, không cần vá lại sau.
-- =============================================================================
