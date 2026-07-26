-- Bản PRODUCTION: tạo mới 4 bảng vận hành (loai_phong, phong_hoc,
-- chuong_trinh_mon_hoc, buoi_hoc) — 4 bảng này CHƯA BAO GIỜ tồn tại trên
-- production (root migration 0030 chỉ xoá+xây lại trên STAGING vì lúc đó
-- đã có dữ liệu test bigint cũ; production thì tạo mới hoàn toàn UUID
-- ngay từ đầu, không cần bước xoá).
--
-- Nội dung đối chiếu trực tiếp với schema THẬT đang chạy trên staging
-- (yxfgwzdxoxuoaulcjlcf) tại thời điểm viết file này — bao gồm cả phần RLS
-- p_write_phong_hoc/p_write_buoi_hoc đã được vá sau đó bởi 0033/0034/0035
-- (bỏ "deleted_at is null" khỏi USING, khác với bản gốc trong root 0030),
-- không lấy nguyên si root 0030 vì bản đó đã lỗi thời so với staging hiện
-- tại.

begin;

-- ============================================================
-- 1. loai_phong (UUID)
-- ============================================================
create table public.loai_phong (
    id                      uuid primary key default public.uuidv7(),
    ten                     text not null,
    don_gia_thue_gio        bigint not null,
    don_gia_dien_nuoc_gio   bigint not null,
    don_gia_khau_hao_gio    bigint not null default 0,
    hieu_luc_tu             date not null,
    hieu_luc_den            date,
    deleted_at              timestamptz
);

comment on table public.loai_phong is
    'Đơn giá theo loại phòng — THUẦN CHI PHÍ. Chỉ ke_toan/master_admin được đọc (RLS hàng, không cần REVOKE cột vì cả bảng đều là dữ liệu chi phí).';

alter table public.loai_phong enable row level security;

create policy p_read_loai_phong on public.loai_phong for select to authenticated
    using (deleted_at is null and auth_role() = any (array['master_admin', 'ke_toan']));

create policy p_write_loai_phong on public.loai_phong for all to authenticated
    using (auth_role() = 'master_admin')
    with check (auth_role() = 'master_admin');

-- ============================================================
-- 2. phong_hoc (UUID)
-- ============================================================
create table public.phong_hoc (
    id              uuid primary key default public.uuidv7(),
    ten             text not null,
    chi_nhanh_id    uuid not null references public.chi_nhanh (id),
    loai_phong_id   uuid not null references public.loai_phong (id),
    deleted_at      timestamptz
);

comment on table public.phong_hoc is
    'Phòng học vật lý. Đọc công khai cho mọi user đã đăng nhập (chỉ thấy tên phòng/chi nhánh, KHÔNG thấy đơn giá vì đó là bảng loai_phong riêng, bị ẩn).';

alter table public.phong_hoc enable row level security;

create policy p_read_phong_hoc on public.phong_hoc for select to authenticated
    using (deleted_at is null);

-- LƯU Ý: KHÔNG có "deleted_at is null" trong USING (khác root 0030) — khớp
-- trạng thái cuối cùng trên staging sau khi 0033/0034/0035 sửa lỗi RLS
-- chặn xoá mềm (PostgREST luôn RETURNING cho UPDATE). Cũng KHÔNG có "to
-- authenticated" (khác root 0030) — đối chiếu pg_policies() live trên
-- staging xác nhận 0033/0034/0035 recreate các policy p_write_* này
-- không kèm mệnh đề TO, nên role mặc định là PUBLIC (auth_role() vẫn chặn
-- đúng vì trả về NULL/không khớp cho request chưa đăng nhập).
create policy p_write_phong_hoc on public.phong_hoc for all
    using (auth_role() = any (array['master_admin', 'admin_ts']))
    with check (auth_role() = any (array['master_admin', 'admin_ts']));

create policy p_write_phong_hoc_quan_ly_chi_nhanh on public.phong_hoc for all
    using (
        auth_role() = 'quan_ly_chi_nhanh'
        and chi_nhanh_id in (select chi_nhanh_id from public.user_chi_nhanh where user_id = auth.uid())
    )
    with check (
        auth_role() = 'quan_ly_chi_nhanh'
        and chi_nhanh_id in (select chi_nhanh_id from public.user_chi_nhanh where user_id = auth.uid())
    );

-- ============================================================
-- 3. chuong_trinh_mon_hoc (khoá tự nhiên, không đổi)
-- ============================================================
create table public.chuong_trinh_mon_hoc (
    chuong_trinh_ma char(3)  not null references public.chuong_trinh (ma),
    cap_hoc_ma       smallint not null,
    mon_hoc_ma       smallint not null,
    primary key (chuong_trinh_ma, cap_hoc_ma, mon_hoc_ma),
    foreign key (cap_hoc_ma, mon_hoc_ma) references public.mon_hoc (cap_hoc_ma, ma)
);

comment on table public.chuong_trinh_mon_hoc is
    'Trục Model C — môn học nào thuộc chương trình nào. cap_hoc_ma bắt buộc vì mon_hoc có khóa kép (ma, cap_hoc_ma), không dùng mon_hoc_ma đơn lẻ được. Dữ liệu mapping cụ thể chưa được nhập.';

alter table public.chuong_trinh_mon_hoc enable row level security;

create policy p_read_chuong_trinh_mon_hoc on public.chuong_trinh_mon_hoc for select to authenticated
    using (true);

create policy p_write_chuong_trinh_mon_hoc on public.chuong_trinh_mon_hoc for all to authenticated
    using (auth_role() = 'master_admin')
    with check (auth_role() = 'master_admin');

-- ============================================================
-- 4. buoi_hoc (UUID)
-- ============================================================
create table public.buoi_hoc (
    id              uuid primary key default public.uuidv7(),
    lop_id          uuid not null references public.lop (id),
    mon_hoc_ma      smallint not null,
    gv_id           uuid references public.users (id),
    phong_hoc_id    uuid references public.phong_hoc (id),
    ngay            date not null,
    gio_bat_dau     time,
    gio_ket_thuc    time,
    thu_lao_gv      bigint,
    chi_phi_phong   bigint,
    trang_thai      text not null default 'du_kien'
                        check (trang_thai in ('du_kien', 'da_day', 'huy')),
    deleted_at      timestamptz,
    unique (lop_id, mon_hoc_ma, ngay)
);

comment on table public.buoi_hoc is
    'Buổi học cụ thể của 1 lớp. thu_lao_gv/chi_phi_phong bị REVOKE khỏi role authenticated ở mọi thao tác (SELECT/INSERT/UPDATE) — chỉ đọc/ghi được qua view buoi_hoc_chi_phi (ke_toan/master_admin). Vai trò khác dùng view buoi_hoc_lich (không có 2 cột này).';

create or replace function public.validate_buoi_hoc_mon_hoc()
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
    before insert or update of lop_id, mon_hoc_ma on public.buoi_hoc
    for each row execute function public.validate_buoi_hoc_mon_hoc();

alter table public.buoi_hoc enable row level security;

create policy p_read_buoi_hoc on public.buoi_hoc for select to authenticated
    using (deleted_at is null);

-- LƯU Ý: KHÔNG có "deleted_at is null" và KHÔNG có "to authenticated"
-- trong USING (khác root 0030), cùng lý do như phong_hoc ở trên.
create policy p_write_buoi_hoc on public.buoi_hoc for all
    using (auth_role() = any (array['master_admin', 'admin_ts']))
    with check (auth_role() = any (array['master_admin', 'admin_ts']));

create policy p_write_buoi_hoc_quan_ly_chi_nhanh on public.buoi_hoc for all
    using (
        auth_role() = 'quan_ly_chi_nhanh'
        and lop_id in (
            select l.id from public.lop l
            join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
            where uc.user_id = auth.uid()
        )
    )
    with check (
        auth_role() = 'quan_ly_chi_nhanh'
        and lop_id in (
            select l.id from public.lop l
            join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
            where uc.user_id = auth.uid()
        )
    );

create policy p_write_buoi_hoc_gv on public.buoi_hoc for all
    using (
        auth_role() = 'gv'
        and gv_id = auth.uid()
    )
    with check (
        auth_role() = 'gv'
        and gv_id = auth.uid()
    );

revoke select, insert, update on public.buoi_hoc from authenticated;

grant select (id, lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc, trang_thai, deleted_at)
    on public.buoi_hoc to authenticated;
grant insert (lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc, trang_thai, deleted_at)
    on public.buoi_hoc to authenticated;
grant update (lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc, trang_thai, deleted_at)
    on public.buoi_hoc to authenticated;

create view public.buoi_hoc_chi_phi as
select *
from public.buoi_hoc
where auth_role() = any (array['master_admin', 'ke_toan'])
with check option;

comment on view public.buoi_hoc_chi_phi is
    'Kênh DUY NHẤT để đọc/ghi thu_lao_gv/chi_phi_phong — chỉ trả dữ liệu khi auth_role() là master_admin/ke_toan. Không đặt security_invoker (cố ý) để bỏ qua REVOKE cột trên buoi_hoc. Chỉ select+update, không insert/delete.';

grant select, update on public.buoi_hoc_chi_phi to authenticated;

create view public.buoi_hoc_lich with (security_invoker = true) as
select id, lop_id, mon_hoc_ma, gv_id, phong_hoc_id, ngay, gio_bat_dau, gio_ket_thuc, trang_thai, deleted_at
from public.buoi_hoc;

comment on view public.buoi_hoc_lich is
    'Lịch buổi học không có cột chi phí — security_invoker=true nên chạy đúng theo RLS hàng của người gọi (dùng chung cho mọi vai trò, kể cả ke_toan/master_admin nếu muốn xem không kèm chi phí).';

grant select on public.buoi_hoc_lich to authenticated;

commit;
