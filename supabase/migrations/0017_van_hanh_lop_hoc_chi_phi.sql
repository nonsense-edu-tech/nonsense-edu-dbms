-- =============================================================================
-- VẬN HÀNH LỚP HỌC + CHI PHÍ THEO BUỔI (ADR-002 Mục 4.1)
--
-- 4 bảng mới: loai_phong, phong_hoc, chuong_trinh_mon_hoc, buoi_hoc.
--
-- LƯU Ý QUAN TRỌNG (khác với bản nháp SQL trong ADR-002): mon_hoc có KHÓA
-- CHÍNH KÉP (ma, cap_hoc_ma) — cùng 1 mã số môn học có ý nghĩa khác nhau ở
-- mỗi cấp học (vd ma=1 là "Toán" ở cap_hoc=1 nhưng là "Nội khoa" ở cap_hoc=2).
-- Vì vậy:
--   - chuong_trinh_mon_hoc phải có thêm cột cap_hoc_ma để FK đúng vào
--     mon_hoc(cap_hoc_ma, ma) — giống pattern bảng hoc_phan đã làm.
--   - buoi_hoc.mon_hoc_ma KHÔNG thể FK trực tiếp (buoi_hoc không có cột
--     cap_hoc_ma riêng, phải suy ra qua lop.cap_hoc_ma) — dùng trigger
--     validate thay vì FK cứng.
--
-- ADR-001 đã bị xoá khỏi dự án theo yêu cầu — không tham chiếu tới nữa,
-- chỉ dựa vào phần tóm tắt Model C trong ADR-002 Mục "Quan hệ với ADR-001".
--
-- ẨN CHI PHÍ (đã xác nhận cách làm): RLS không lọc được theo cột, nên phải
-- chặn ở tầng GRANT/REVOKE.
--
-- ⚠️ ĐÃ TEST TRÊN STAGING VÀ PHÁT HIỆN BUG: chỉ REVOKE SELECT/INSERT/UPDATE
-- theo TỪNG CỘT (vd `revoke select (thu_lao_gv) on buoi_hoc from
-- authenticated`) KHÔNG có tác dụng gì, vì Supabase đã GRANT quyền SELECT/
-- INSERT/UPDATE ở CẤP BẢNG cho `authenticated` trên mọi bảng public mới tạo —
-- và theo đúng ngữ nghĩa ACL của Postgres, quyền cấp BẢNG cho phép truy cập
-- MỌI cột bất kể cột đó có bị REVOKE cấp CỘT hay không (REVOKE cấp cột chỉ
-- có tác dụng thu hẹp phạm vi khi role đó KHÔNG có quyền cấp bảng bao trùm).
-- Test thực tế: ke_toan (và cả master_admin) vẫn `select thu_lao_gv from
-- buoi_hoc` được sau khi REVOKE cột — xác nhận qua has_column_privilege() và
-- pg_attribute.attacl trên 1 bảng scratch riêng.
--
-- CÁCH ĐÚNG: REVOKE SELECT/INSERT/UPDATE **cả bảng** khỏi `authenticated`,
-- rồi GRANT LẠI CHỈ đúng tập cột được phép (không gồm thu_lao_gv/
-- chi_phi_phong). Khi đó `authenticated` không còn quyền cấp bảng bao trùm
-- nữa nên 2 cột kia thực sự không truy cập được trực tiếp — chặn TẤT CẢ, kể
-- cả ke_toan/master_admin (vì Supabase dùng chung 1 Postgres role
-- `authenticated` cho mọi vai trò app). Truy cập lại qua 1 view riêng
-- (buoi_hoc_chi_phi, KHÔNG security_invoker — chạy bằng quyền chủ sở hữu
-- view, không bị REVOKE bảng/cột nào ở trên chặn vì đó là REVOKE nhắm vào
-- `authenticated`, không phải chủ sở hữu) tự lọc bằng
-- auth_role() = 'master_admin'/'ke_toan'. Vai trò còn lại dùng view
-- buoi_hoc_lich (security_invoker = true, không có cột chi phí, vẫn nằm
-- trong tập cột được GRANT nên hoạt động bình thường).
--
-- loai_phong là bảng TOÀN BỘ dữ liệu chi phí (đơn giá phòng) nên ẩn bằng RLS
-- hàng bình thường (không cần đụng GRANT/REVOKE) — quan_ly_chi_nhanh/gv
-- không có policy đọc bảng này nên không bị ảnh hưởng bởi bug nói trên (bug
-- chỉ liên quan tới việc ẩn CỘT trong 1 bảng mà các vai trò khác vẫn cần đọc
-- các cột khác).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. loai_phong — đơn giá theo loại phòng (THUẦN CHI PHÍ, chỉ ke_toan/master_admin đọc)
-- -----------------------------------------------------------------------------
create table loai_phong (
    id                      bigint generated always as identity primary key,
    ten                     text not null,
    don_gia_thue_gio        bigint not null,
    don_gia_dien_nuoc_gio   bigint not null,
    don_gia_khau_hao_gio    bigint not null default 0,
    hieu_luc_tu             date not null,
    hieu_luc_den            date,
    deleted_at              timestamptz
);

comment on table loai_phong is
    'Đơn giá theo loại phòng — THUẦN CHI PHÍ. Chỉ ke_toan/master_admin được đọc (RLS hàng, không cần REVOKE cột vì cả bảng đều là dữ liệu chi phí).';

alter table loai_phong enable row level security;

create policy p_read_loai_phong on loai_phong for select to authenticated
    using (deleted_at is null and auth_role() = any (array['master_admin', 'ke_toan']));

create policy p_write_loai_phong on loai_phong for all to authenticated
    using (auth_role() = 'master_admin')
    with check (auth_role() = 'master_admin');

-- -----------------------------------------------------------------------------
-- 2. phong_hoc — phòng học vật lý theo chi nhánh (không lộ giá qua loai_phong_id)
-- -----------------------------------------------------------------------------
create table phong_hoc (
    id              bigint generated always as identity primary key,
    ten             text not null,
    chi_nhanh_id    bigint not null references chi_nhanh (id),
    loai_phong_id   bigint not null references loai_phong (id),
    deleted_at      timestamptz
);

comment on table phong_hoc is
    'Phòng học vật lý. Đọc công khai cho mọi user đã đăng nhập (chỉ thấy tên phòng/chi nhánh, KHÔNG thấy đơn giá vì đó là bảng loai_phong riêng, bị ẩn).';

alter table phong_hoc enable row level security;

-- Đọc: mọi user đã đăng nhập (giống pattern các bảng danh mục khác) — chỉ lộ
-- tên phòng + chi nhánh, không lộ giá.
create policy p_read_phong_hoc on phong_hoc for select to authenticated
    using (deleted_at is null);

-- Ghi cơ bản: master_admin/admin_ts (giống mức của lop/hoc_sinh).
create policy p_write_phong_hoc on phong_hoc for all to authenticated
    using (deleted_at is null and auth_role() = any (array['master_admin', 'admin_ts']))
    with check (auth_role() = any (array['master_admin', 'admin_ts']));

-- Ghi MỚI cho quan_ly_chi_nhanh — vai trò này "phụ trách ... phòng học cho
-- một chi nhánh" (ADR-002 Mục 2.7), scoped theo chi nhánh mình quản lý.
create policy p_write_phong_hoc_quan_ly_chi_nhanh on phong_hoc for all to authenticated
    using (
        deleted_at is null
        and auth_role() = 'quan_ly_chi_nhanh'
        and chi_nhanh_id in (select chi_nhanh_id from user_chi_nhanh where user_id = auth.uid())
    )
    with check (
        auth_role() = 'quan_ly_chi_nhanh'
        and chi_nhanh_id in (select chi_nhanh_id from user_chi_nhanh where user_id = auth.uid())
    );

-- -----------------------------------------------------------------------------
-- 3. chuong_trinh_mon_hoc — trục Model C: môn học nào thuộc chương trình nào
-- -----------------------------------------------------------------------------
create table chuong_trinh_mon_hoc (
    chuong_trinh_ma char(3)  not null references chuong_trinh (ma),
    cap_hoc_ma       smallint not null,
    mon_hoc_ma       smallint not null,
    primary key (chuong_trinh_ma, cap_hoc_ma, mon_hoc_ma),
    foreign key (cap_hoc_ma, mon_hoc_ma) references mon_hoc (cap_hoc_ma, ma)
);

comment on table chuong_trinh_mon_hoc is
    'Trục Model C — môn học nào thuộc chương trình nào. cap_hoc_ma bắt buộc vì mon_hoc có khóa kép (ma, cap_hoc_ma), không dùng mon_hoc_ma đơn lẻ được (khác bản nháp ADR-002 ban đầu). Dữ liệu mapping cụ thể chưa được nhập trong migration này.';

alter table chuong_trinh_mon_hoc enable row level security;

-- Đọc: mọi user đã đăng nhập (dữ liệu danh mục học thuật, không phải chi phí).
create policy p_read_chuong_trinh_mon_hoc on chuong_trinh_mon_hoc for select to authenticated
    using (true);

-- Ghi: chỉ master_admin (giống mức chuong_trinh gốc).
create policy p_write_chuong_trinh_mon_hoc on chuong_trinh_mon_hoc for all to authenticated
    using (auth_role() = 'master_admin')
    with check (auth_role() = 'master_admin');

-- -----------------------------------------------------------------------------
-- 4. buoi_hoc — buổi học cụ thể, mang chi phí snapshot theo buổi
-- -----------------------------------------------------------------------------
create table buoi_hoc (
    id              bigint generated always as identity primary key,
    lop_id          bigint not null references lop (id),
    mon_hoc_ma      smallint not null,   -- validate qua trigger, xem bên dưới (không FK cứng được)
    gv_id           uuid references users (id),
    phong_hoc_id    bigint references phong_hoc (id),
    ngay            date not null,
    gio_bat_dau     time,
    gio_ket_thuc    time,
    thu_lao_gv      bigint,        -- CHI PHÍ, chính xác theo buổi (snapshot) — cột bị REVOKE, xem bên dưới
    chi_phi_phong   bigint,        -- CHI PHÍ, chính xác theo buổi (snapshot) — cột bị REVOKE, xem bên dưới
    trang_thai      text not null default 'du_kien'
                        check (trang_thai in ('du_kien', 'da_day', 'huy')),
    deleted_at      timestamptz,
    unique (lop_id, mon_hoc_ma, ngay)
);

comment on table buoi_hoc is
    'Buổi học cụ thể của 1 lớp. thu_lao_gv/chi_phi_phong bị REVOKE khỏi role authenticated ở mọi thao tác (SELECT/INSERT/UPDATE) — chỉ đọc/ghi được qua view buoi_hoc_chi_phi (ke_toan/master_admin). Vai trò khác dùng view buoi_hoc_lich (không có 2 cột này).';

-- Validate mon_hoc_ma theo đúng cấp học của lớp (vì không FK cứng được — xem
-- ghi chú đầu file). SECURITY DEFINER để không phụ thuộc RLS của lop/mon_hoc.
create or replace function validate_buoi_hoc_mon_hoc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_cap_hoc_ma smallint;
begin
    select cap_hoc_ma into v_cap_hoc_ma from lop where id = new.lop_id;

    if v_cap_hoc_ma is null then
        raise exception 'lop_id % không tồn tại', new.lop_id;
    end if;

    if not exists (
        select 1 from mon_hoc where cap_hoc_ma = v_cap_hoc_ma and ma = new.mon_hoc_ma
    ) then
        raise exception 'mon_hoc_ma % không hợp lệ cho cấp học của lop_id %', new.mon_hoc_ma, new.lop_id;
    end if;

    return new;
end;
$$;

create trigger trg_validate_buoi_hoc_mon_hoc
    before insert or update of lop_id, mon_hoc_ma on buoi_hoc
    for each row execute function validate_buoi_hoc_mon_hoc();

alter table buoi_hoc enable row level security;

-- Đọc (hàng): mở cho mọi user đã đăng nhập, giống pattern p_read của lop —
-- việc ẩn CHI PHÍ nằm ở REVOKE cột bên dưới, không nằm ở đây.
create policy p_read_buoi_hoc on buoi_hoc for select to authenticated
    using (deleted_at is null);

-- Ghi cơ bản: master_admin/admin_ts, giống mức của lop.
create policy p_write_buoi_hoc on buoi_hoc for all to authenticated
    using (deleted_at is null and auth_role() = any (array['master_admin', 'admin_ts']))
    with check (auth_role() = any (array['master_admin', 'admin_ts']));

-- Ghi MỚI cho quan_ly_chi_nhanh — scoped theo chi nhánh của lớp.
create policy p_write_buoi_hoc_quan_ly_chi_nhanh on buoi_hoc for all to authenticated
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

-- Ghi MỚI cho gv — CHỈ được tự gán chính mình làm gv_id (đã xác nhận: không
-- được gán GV khác), không giới hạn thêm theo lớp/chi nhánh.
create policy p_write_buoi_hoc_gv on buoi_hoc for all to authenticated
    using (
        deleted_at is null
        and auth_role() = 'gv'
        and gv_id = auth.uid()
    )
    with check (
        auth_role() = 'gv'
        and gv_id = auth.uid()
    );

-- Ẩn 2 cột chi phí khỏi role authenticated — xem ghi chú đầu file: REVOKE
-- theo CỘT không đủ vì Supabase đã GRANT nguyên bảng cho authenticated (quyền
-- cấp bảng thắng REVOKE cấp cột). Phải REVOKE NGUYÊN BẢNG rồi GRANT LẠI CHỈ
-- đúng tập cột được phép (không gồm thu_lao_gv/chi_phi_phong). DELETE không
-- cần đụng vì xoá cả hàng không lộ giá trị cột nào.
revoke select, insert, update on buoi_hoc from authenticated;

grant select (id, lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc, trang_thai, deleted_at)
    on buoi_hoc to authenticated;
grant insert (lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc, trang_thai, deleted_at)
    on buoi_hoc to authenticated;
grant update (lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc, trang_thai, deleted_at)
    on buoi_hoc to authenticated;

-- View CHỈ ke_toan/master_admin — KHÔNG đặt security_invoker nên chạy bằng
-- quyền chủ sở hữu view (không bị REVOKE cột chặn, không bị RLS của buoi_hoc
-- chặn — giống cơ chế auth_role() đã dùng SECURITY DEFINER từ trước). WITH
-- CHECK OPTION bắt buộc UPDATE qua view này cũng phải thoả auth_role(), không
-- chỉ SELECT. Chỉ GRANT select+update (không insert/delete) — tạo/xoá buổi
-- học vẫn phải qua bảng gốc buoi_hoc và policy RLS thường của nó, view này
-- chỉ dùng để ghi nhận chi phí cho buổi đã tồn tại.
create view buoi_hoc_chi_phi as
select *
from buoi_hoc
where auth_role() = any (array['master_admin', 'ke_toan'])
with check option;

comment on view buoi_hoc_chi_phi is
    'Kênh DUY NHẤT để đọc/ghi thu_lao_gv/chi_phi_phong — chỉ trả dữ liệu khi auth_role() là master_admin/ke_toan. Không đặt security_invoker (cố ý) để bỏ qua REVOKE cột trên buoi_hoc. Chỉ select+update, không insert/delete.';

grant select, update on buoi_hoc_chi_phi to authenticated;

-- View lịch (không có cột chi phí) cho các vai trò còn lại — security_invoker
-- để tôn trọng RLS hàng của người gọi thật sự (không bypass như view trên).
create view buoi_hoc_lich with (security_invoker = true) as
select id, lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc, trang_thai, deleted_at
from buoi_hoc;

comment on view buoi_hoc_lich is
    'Lịch buổi học không có cột chi phí — security_invoker=true nên chạy đúng theo RLS hàng của người gọi (dùng chung cho mọi vai trò, kể cả ke_toan/master_admin nếu muốn xem không kèm chi phí).';

grant select on buoi_hoc_lich to authenticated;

-- =============================================================================
-- HẾT — chưa đụng gì tới chi_phi_co_dinh/phan_bo_chi_phi_lop/
-- ghi_nhan_doanh_thu_buoi (ADR-002 Mục 4.2-4.3, làm ở bước sau).
-- Dữ liệu mapping chuong_trinh_mon_hoc chưa được nhập — cần nhập riêng.
-- =============================================================================
