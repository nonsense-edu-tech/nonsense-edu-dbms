-- adr004-type: expand
-- =============================================================================
-- GHI CHÚ QUY TRÌNH (bắt buộc đọc trước khi review):
-- File này VIẾT LẠI HỒI TỐ (retroactive) cho migration đã bị áp TAY lên
-- production qua MCP `apply_migration` ngày 28/09/2026 — VI PHẠM ADR-004 luật
-- (a) (cấm áp migration tay lên production DB ngoài pipeline). Production đã
-- có migration này dưới version tự sinh `20260928093020`
-- (`gd3_buoc2_vong_doi_khung_nang_luc_rls`), không khớp tên file `0038`.
--
-- Nội dung dưới đây KHÔNG chép lại từ trí nhớ — đã đối chiếu lại TOÀN BỘ qua
-- truy vấn trực tiếp production (information_schema.columns, pg_policies,
-- pg_constraint, pg_get_functiondef, information_schema.triggers) ngày
-- 28/09/2026 trước khi viết, đúng quy tắc CLAUDE.md "không tin trí nhớ khi có
-- nghi ngờ". File này dùng `create table if not exists` / `add column if not
-- exists` / `create or replace` để AN TOÀN CHẠY LẠI trên staging (nơi migration
-- này CHƯA từng chạy) mà không lỗi nếu ai đó vô tình chạy lại trên production.
--
-- adr004-type: expand thuần — chỉ thêm bảng/cột/hàm mới, KHÔNG đổi kiểu/xoá gì
-- của schema cũ. NGOẠI LỆ ĐÃ BIẾT với luật "RLS chỉ thêm không sửa" (CLAUDE.md):
-- migration này DROP + CREATE lại policy `p_read` đã có sẵn trên `cau_hoi`,
-- `ngu_lieu`, `lua_chon`, `de`, `de_cau_hoi` (thu hẹp từ "mọi gv đọc mọi câu
-- hỏi" xuống "gv chỉ đọc câu hỏi thuộc phạm vi qua co_quyen_mon()") — đây là
-- yêu cầu nghiệp vụ cốt lõi đã được duyệt (xem quyết định 6 trong buổi thảo
-- luận ngân hàng câu hỏi), không thể chỉ "thêm" một policy permissive khác vì
-- RLS permissive OR lại với nhau — thêm mới sẽ MỞ RỘNG quyền đọc thay vì thu
-- hẹp. Ghi nhận là ngoại lệ có chủ đích, không phải sơ suất; nêu lại ở
-- CHANGELOG.md để cân nhắc sửa ADR-002 khi có dịp.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Vai trò mới: trợ giảng
-- ---------------------------------------------------------------------------
alter table public.users drop constraint if exists users_vai_tro_check;
alter table public.users add constraint users_vai_tro_check
    check (vai_tro = any (array[
        'master_admin','admin_ts','admin_ht','truong_bm','gv','tro_giang',
        'ke_toan','thu_ngan','quan_ly_chi_nhanh'
    ]));

-- ---------------------------------------------------------------------------
-- 2. Bảng chủ đề (thuộc bảng mã gốc học thuật, dùng trong ma_cau_hoi)
-- ---------------------------------------------------------------------------
create table if not exists public.chu_de (
    id          uuid primary key default public.uuidv7(),
    mon_hoc_id  uuid not null references public.mon_hoc(id),
    ma          smallint not null check (ma between 1 and 99),
    ten         text not null,
    mo_ta       text,
    deleted_at  timestamptz,
    constraint uq_chu_de_mon unique (mon_hoc_id, ma)
);

alter table public.chu_de enable row level security;

drop policy if exists p_read_chu_de on public.chu_de;
create policy p_read_chu_de on public.chu_de for select to authenticated
    using (deleted_at is null);

drop policy if exists p_write_chu_de on public.chu_de;
create policy p_write_chu_de on public.chu_de for all to authenticated
    using (auth_role() in ('master_admin', 'admin_ht', 'truong_bm'))
    with check (auth_role() in ('master_admin', 'admin_ht', 'truong_bm'));

-- ---------------------------------------------------------------------------
-- 3. Vòng đời câu hỏi: nháp → chờ duyệt/đã duyệt → phát hành, versioning
-- ---------------------------------------------------------------------------
alter table public.cau_hoi add column if not exists trang_thai text not null default 'nhap';
alter table public.cau_hoi add column if not exists nguoi_duyet uuid;
alter table public.cau_hoi add column if not exists ngay_duyet timestamptz;
alter table public.cau_hoi add column if not exists phien_ban integer not null default 1;
alter table public.cau_hoi add column if not exists cau_hoi_goc_id uuid;

alter table public.de add column if not exists trang_thai text not null default 'nhap';

-- Chặn tự duyệt câu hỏi do chính mình tạo.
create or replace function chan_tu_duyet_cau_hoi()
returns trigger language plpgsql set search_path = public as $$
begin
    if new.trang_thai = 'da_duyet' and new.nguoi_duyet is not null
       and new.nguoi_duyet = new.nguoi_tao then
        raise exception 'Không được tự duyệt câu hỏi do chính mình tạo (cau_hoi.id=%)', new.id;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_chan_tu_duyet_cau_hoi on public.cau_hoi;
create trigger trg_chan_tu_duyet_cau_hoi
    before insert or update on public.cau_hoi
    for each row execute function chan_tu_duyet_cau_hoi();

-- Chặn sửa trực tiếp câu hỏi đã nằm trong đề đã phát hành.
create or replace function chan_sua_cau_hoi_da_phat_hanh()
returns trigger language plpgsql set search_path = public as $$
declare
    da_phat_hanh boolean;
begin
    select exists (
        select 1
        from public.de_cau_hoi dch
        join public.de d on d.id = dch.de_id
        where dch.cau_hoi_id = old.id
          and d.trang_thai = 'da_phat_hanh'
    ) into da_phat_hanh;

    if da_phat_hanh and (
        new.noi_dung      is distinct from old.noi_dung or
        new.dap_an_text   is distinct from old.dap_an_text or
        new.loi_giai      is distinct from old.loi_giai or
        new.ma_cau_hoi    is distinct from old.ma_cau_hoi
    ) then
        raise exception 'Câu hỏi % đã nằm trong đề đã phát hành — không sửa trực tiếp, tạo phiên bản mới (cau_hoi_goc_id)', old.ma_cau_hoi;
    end if;
    return new;
end;
$$;

drop trigger if exists trg_chan_sua_cau_hoi_da_phat_hanh on public.cau_hoi;
create trigger trg_chan_sua_cau_hoi_da_phat_hanh
    before update on public.cau_hoi
    for each row execute function chan_sua_cau_hoi_da_phat_hanh();

-- ---------------------------------------------------------------------------
-- 4. Cấp mã câu hỏi tự động (17 số, chống trùng qua bảng bộ đếm theo tổ hợp)
-- ---------------------------------------------------------------------------
create table if not exists public.cau_hoi_bo_dem (
    tien_to     char(13) primary key,
    stt_ke_tiep integer not null default 1
);

alter table public.cau_hoi_bo_dem enable row level security;

create or replace function public.cap_ma_cau_hoi(
    p_cap_hoc smallint, p_chuong_trinh smallint, p_mon_hoc smallint,
    p_hoc_phan smallint, p_bai_hoc smallint, p_chu_de smallint, p_dang_cau smallint
) returns char(17)
language plpgsql security definer set search_path = public as $$
declare
    v_tien_to   char(13);
    v_mon_id    uuid;
    v_stt       integer;
    v_ma        char(17);
begin
    select id into v_mon_id from public.mon_hoc
     where ma = p_mon_hoc and cap_hoc_ma = p_cap_hoc and deleted_at is null;
    if v_mon_id is null then
        raise exception 'Môn học % không tồn tại ở cấp học %', p_mon_hoc, p_cap_hoc;
    end if;

    if not exists (select 1 from public.hoc_phan where ma = p_hoc_phan and mon_hoc_id = v_mon_id and deleted_at is null) then
        raise exception 'Học phần % không thuộc môn %', p_hoc_phan, p_mon_hoc;
    end if;

    if not exists (
        select 1 from public.bai_hoc bh
        join public.hoc_phan hp on hp.id = bh.hoc_phan_id
        where bh.ma = p_bai_hoc and hp.ma = p_hoc_phan and hp.mon_hoc_id = v_mon_id and bh.deleted_at is null
    ) then
        raise exception 'Bài học % không thuộc học phần %/môn %', p_bai_hoc, p_hoc_phan, p_mon_hoc;
    end if;

    if not exists (select 1 from public.chu_de where ma = p_chu_de and mon_hoc_id = v_mon_id and deleted_at is null) then
        raise exception 'Chủ đề % không thuộc môn %', p_chu_de, p_mon_hoc;
    end if;

    if not exists (select 1 from public.dang_cau where ma = p_dang_cau and deleted_at is null) then
        raise exception 'Dạng câu % không tồn tại', p_dang_cau;
    end if;

    v_tien_to :=
        lpad(p_cap_hoc::text, 1, '0') ||
        lpad(p_chuong_trinh::text, 3, '0') ||
        lpad(p_mon_hoc::text, 2, '0') ||
        lpad(p_hoc_phan::text, 2, '0') ||
        lpad(p_bai_hoc::text, 2, '0') ||
        lpad(p_chu_de::text, 2, '0') ||
        lpad(p_dang_cau::text, 1, '0');

    insert into public.cau_hoi_bo_dem (tien_to, stt_ke_tiep)
    values (v_tien_to, 2)
    on conflict (tien_to) do update
        set stt_ke_tiep = public.cau_hoi_bo_dem.stt_ke_tiep + 1
    returning stt_ke_tiep - 1 into v_stt;

    if v_stt > 9999 then
        raise exception 'Đã vượt quá 9999 câu cho tổ hợp %', v_tien_to;
    end if;

    v_ma := v_tien_to || lpad(v_stt::text, 4, '0');
    return v_ma;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Khung năng lực V-ACT (tiến trình / năng lực / dạng bài) — lớp gắn nhãn
--    tách biệt khỏi lõi câu hỏi, chịu thay đổi mà không cần sửa schema lõi.
-- ---------------------------------------------------------------------------
create table if not exists public.tien_trinh (
    ma           text primary key,
    ten          text not null,
    mo_ta        text,
    dung_bao_cao boolean not null default true
);

alter table public.tien_trinh enable row level security;

drop policy if exists p_read_tien_trinh on public.tien_trinh;
create policy p_read_tien_trinh on public.tien_trinh for select to authenticated using (true);

drop policy if exists p_write_tien_trinh on public.tien_trinh;
create policy p_write_tien_trinh on public.tien_trinh for all to authenticated
    using (auth_role() in ('master_admin', 'admin_ht'))
    with check (auth_role() in ('master_admin', 'admin_ht'));

insert into public.tien_trinh (ma, ten, dung_bao_cao) values
    ('P1', 'Tiến trình 1', true),
    ('P2', 'Tiến trình 2', true),
    ('P3', 'Tiến trình 3 (dự phòng)', false)
on conflict (ma) do nothing;

create table if not exists public.nang_luc (
    id               uuid primary key default public.uuidv7(),
    ma_nang_luc      text not null unique,
    mien             text not null check (mien in ('TV', 'TA', 'TOAN', 'TD')),
    ten              text not null,
    mo_ta_hanh_vi    text,
    nguon_tham_chieu text,
    phien_ban_khung  text not null,
    hieu_luc_tu      date not null default current_date,
    hieu_luc_den     date
);

alter table public.nang_luc enable row level security;

drop policy if exists p_read_nang_luc on public.nang_luc;
create policy p_read_nang_luc on public.nang_luc for select to authenticated using (true);

drop policy if exists p_write_nang_luc on public.nang_luc;
create policy p_write_nang_luc on public.nang_luc for all to authenticated
    using (auth_role() in ('master_admin', 'admin_ht'))
    with check (auth_role() in ('master_admin', 'admin_ht'));

create table if not exists public.dang_bai (
    id                    uuid primary key default public.uuidv7(),
    ma                    text not null unique,
    ten                   text not null,
    mien                  text check (mien in ('TV', 'TA', 'TOAN', 'TD')),
    nang_luc_dien_hinh_id uuid references public.nang_luc(id),
    tien_trinh_dien_hinh  text references public.tien_trinh(ma)
);

alter table public.dang_bai enable row level security;

drop policy if exists p_read_dang_bai on public.dang_bai;
create policy p_read_dang_bai on public.dang_bai for select to authenticated using (true);

drop policy if exists p_write_dang_bai on public.dang_bai;
create policy p_write_dang_bai on public.dang_bai for all to authenticated
    using (auth_role() in ('master_admin', 'admin_ht', 'truong_bm'))
    with check (auth_role() in ('master_admin', 'admin_ht', 'truong_bm'));

alter table public.cau_hoi add column if not exists tien_trinh text references public.tien_trinh(ma);

create table if not exists public.cau_hoi_nang_luc (
    id          uuid primary key default public.uuidv7(),
    cau_hoi_id  uuid not null references public.cau_hoi(id) on delete cascade,
    nang_luc_id uuid references public.nang_luc(id),
    la_chinh    boolean not null default false,
    created_at  timestamptz not null default now()
);

alter table public.cau_hoi_nang_luc enable row level security;

drop policy if exists p_read_cau_hoi_nang_luc on public.cau_hoi_nang_luc;
create policy p_read_cau_hoi_nang_luc on public.cau_hoi_nang_luc for select to authenticated using (true);

drop policy if exists p_write_cau_hoi_nang_luc on public.cau_hoi_nang_luc;
create policy p_write_cau_hoi_nang_luc on public.cau_hoi_nang_luc for all to authenticated
    using (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'))
    with check (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'));

-- ---------------------------------------------------------------------------
-- 6. Phân quyền đọc theo phạm vi môn (gv/trợ giảng chỉ đọc học liệu phụ trách)
-- ---------------------------------------------------------------------------
create or replace function public.co_quyen_mon(p_mon_hoc_ma smallint, p_cap_hoc_ma smallint)
returns boolean
language sql stable security definer set search_path = public as $$
    select exists (
        select 1 from public.user_pham_vi upv
        where upv.user_id = auth.uid()
          and upv.cap_hoc_ma = p_cap_hoc_ma
          and (upv.mon_hoc_ma is null or upv.mon_hoc_ma = p_mon_hoc_ma)
    );
$$;

-- NGOẠI LỆ "RLS chỉ thêm không sửa" (xem ghi chú đầu file): DROP + CREATE lại
-- p_read hiện có trên 5 bảng dưới đây để THU HẸP quyền đọc theo phạm vi môn.
drop policy if exists p_read on public.cau_hoi;
create policy p_read on public.cau_hoi for select to authenticated
    using (
        deleted_at is null and (
            auth_role() in ('master_admin', 'admin_ht', 'truong_bm')
            or (auth_role() = 'gv' and co_quyen_mon(mon_hoc, cap_hoc))
        )
    );

drop policy if exists p_read on public.ngu_lieu;
create policy p_read on public.ngu_lieu for select to authenticated
    using (
        deleted_at is null and (
            auth_role() in ('master_admin', 'admin_ht', 'truong_bm')
            or (auth_role() = 'gv' and (mon_hoc_ma is null or co_quyen_mon(mon_hoc_ma, cap_hoc_ma)))
        )
    );

drop policy if exists p_read on public.lua_chon;
create policy p_read on public.lua_chon for select to authenticated
    using (
        exists (
            select 1 from public.cau_hoi c
            where c.id = lua_chon.cau_hoi_id
              and c.deleted_at is null
              and (
                  auth_role() in ('master_admin', 'admin_ht', 'truong_bm')
                  or (auth_role() = 'gv' and co_quyen_mon(c.mon_hoc, c.cap_hoc))
              )
        )
    );

-- de/de_cau_hoi: trợ giảng chưa được đưa vào (0 dòng cho tro_giang) — đề thi
-- nằm ngoài phạm vi đợt 1 của trợ giảng, chỉ gv trở lên mới đọc được.
drop policy if exists p_read on public.de;
create policy p_read on public.de for select to authenticated
    using (deleted_at is null and auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'));

drop policy if exists p_read on public.de_cau_hoi;
create policy p_read on public.de_cau_hoi for select to authenticated
    using (auth_role() in ('master_admin', 'admin_ht', 'truong_bm', 'gv'));

-- ---------------------------------------------------------------------------
-- 7. RPC cho trợ giảng: xem từng câu một lúc, KHÔNG xem được danh sách tổng,
--    KHÔNG thấy đáp án/lời giải.
-- ---------------------------------------------------------------------------
create or replace function public.danh_muc_cau_hoi_tro_giang(p_mon_hoc smallint)
returns table(id uuid, ma_cau_hoi char(17), bai_hoc smallint, chu_de smallint, dang_cau smallint, trang_thai text)
language sql stable security definer set search_path = public as $$
    select c.id, c.ma_cau_hoi, c.bai_hoc, c.chu_de, c.dang_cau, c.trang_thai
    from public.cau_hoi c
    where c.deleted_at is null
      and auth_role() = any (array['tro_giang','gv','truong_bm','admin_ht','master_admin'])
      and public.co_quyen_mon(p_mon_hoc, c.cap_hoc)
      and c.mon_hoc = p_mon_hoc;
$$;

create or replace function public.xem_mot_cau_hoi(p_id uuid)
returns table(id uuid, ma_cau_hoi char(17), noi_dung text, lua_chon_noi_dung text[], dap_an_text text, loi_giai text)
language plpgsql stable security definer set search_path = public as $$
declare
    v_role text := auth_role();
    v_cau  public.cau_hoi;
begin
    select * into v_cau from public.cau_hoi c where c.id = p_id and c.deleted_at is null;
    if v_cau.id is null then
        raise exception 'Không tìm thấy câu hỏi';
    end if;
    if not (v_role = any (array['master_admin','admin_ht','truong_bm','gv','tro_giang'])
            and public.co_quyen_mon(v_cau.mon_hoc, v_cau.cap_hoc)) then
        raise exception 'Không có quyền xem câu hỏi này';
    end if;

    return query
    select
        v_cau.id, v_cau.ma_cau_hoi, v_cau.noi_dung,
        array_agg(lc.noi_dung order by lc.thu_tu),
        case when v_role = 'tro_giang' then null else v_cau.dap_an_text end,
        case when v_role = 'tro_giang' then null else v_cau.loi_giai end
    from public.lua_chon lc where lc.cau_hoi_id = v_cau.id
    group by v_cau.id, v_cau.ma_cau_hoi, v_cau.noi_dung, v_cau.dap_an_text, v_cau.loi_giai, v_role;
end;
$$;
