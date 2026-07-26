-- ADR-003 Phase 3 (PRODUCTION variant): user_pham_vi, hoc_phan, lop ->
-- UUIDv7 PK, cong them cot FK moi (cap_hoc_id/mon_hoc_id/chuong_trinh_id).
-- Strategy: Expand - Backfill - Contract - Verify (ADR-003 Muc 4).
--
-- Khac voi ban staging (0022_uuid_phase3.sql): production KHONG co
-- phong_hoc/buoi_hoc, nen CHI CO 5 policy (khong phai 7) tham chieu
-- chi_nhanh_id can drop/tao lai:
--   lop.p_write_lop_quan_ly_chi_nhanh
--   hop_dong_hoc_phi.p_read_hop_dong_quan_ly_chi_nhanh
--   hop_dong_hoc_phi.p_write_hop_dong_quan_ly_chi_nhanh
--   ghi_danh.p_write_ghi_danh_quan_ly_chi_nhanh
--   hoc_sinh.p_write_hoc_sinh_quan_ly_chi_nhanh
-- (p_write_phong_hoc_quan_ly_chi_nhanh, p_write_buoi_hoc_quan_ly_chi_nhanh
-- khong ton tai vi bang khong ton tai). Cung khong can buoc "noi lai
-- phong_hoc.chi_nhanh_id" o cuoi - chi con lop + user_chi_nhanh.
--
-- 4 policy con lai (hop_dong_hoc_phi x2, ghi_danh, hoc_sinh) dung
-- l.id_old (bigint cu, giu lai) thay vi l.id (uuid moi) de so khop
-- dung kieu voi cac cot con CHUA chuyen doi (ghi_danh.lop_id,
-- hoc_sinh.lop_hien_tai_id - Phase 4/5). Phan join loc theo chi_nhanh
-- (uc.chi_nhanh_id = l.chi_nhanh_id) van dung cot UUID moi.

begin;

-- ============================================================
-- Buoc 0: drop 5 policy phu thuoc chi_nhanh_id (lop/user_chi_nhanh)
-- truoc khi dong cot
-- ============================================================
drop policy p_write_lop_quan_ly_chi_nhanh on public.lop;
drop policy p_read_hop_dong_quan_ly_chi_nhanh on public.hop_dong_hoc_phi;
drop policy p_write_hop_dong_quan_ly_chi_nhanh on public.hop_dong_hoc_phi;
drop policy p_write_ghi_danh_quan_ly_chi_nhanh on public.ghi_danh;
drop policy p_write_hoc_sinh_quan_ly_chi_nhanh on public.hoc_sinh;

-- ============================================================
-- user_pham_vi (Nhom B, rong tren production - doi kieu truc tiep)
-- them cap_hoc_id (NOT NULL, khop cap_hoc_ma) + mon_hoc_id (nullable,
-- khop mon_hoc_ma)
-- ============================================================
alter table public.user_pham_vi drop constraint user_pham_vi_pkey;
alter table public.user_pham_vi alter column id drop identity if exists;
alter table public.user_pham_vi alter column id type uuid using public.uuidv7();
alter table public.user_pham_vi alter column id set default public.uuidv7();
alter table public.user_pham_vi add primary key (id);

alter table public.user_pham_vi add column cap_hoc_id uuid;
update public.user_pham_vi set cap_hoc_id = (
  select id from public.cap_hoc where cap_hoc.ma = user_pham_vi.cap_hoc_ma
);
alter table public.user_pham_vi alter column cap_hoc_id set not null;
alter table public.user_pham_vi add constraint user_pham_vi_cap_hoc_id_fkey
  foreign key (cap_hoc_id) references public.cap_hoc(id);

alter table public.user_pham_vi add column mon_hoc_id uuid;
update public.user_pham_vi set mon_hoc_id = (
  select id from public.mon_hoc
  where mon_hoc.cap_hoc_ma = user_pham_vi.cap_hoc_ma and mon_hoc.ma = user_pham_vi.mon_hoc_ma
);
alter table public.user_pham_vi add constraint user_pham_vi_mon_hoc_id_fkey
  foreign key (mon_hoc_id) references public.mon_hoc(id);

-- ============================================================
-- hoc_phan (Nhom B, rong tren production - doi kieu truc tiep)
-- gop cap_hoc_ma+mon_hoc_ma thanh 1 cot mon_hoc_id (NOT NULL)
-- bai_hoc/ngu_lieu la Phase 4/5 -> drop FK, noi lai sau
-- ============================================================
alter table public.bai_hoc drop constraint bai_hoc_hoc_phan_id_fkey;
alter table public.ngu_lieu drop constraint ngu_lieu_hoc_phan_id_fkey;

alter table public.hoc_phan drop constraint hoc_phan_pkey;
alter table public.hoc_phan alter column id drop identity if exists;
alter table public.hoc_phan alter column id type uuid using public.uuidv7();
alter table public.hoc_phan alter column id set default public.uuidv7();
alter table public.hoc_phan add primary key (id);

alter table public.hoc_phan add column mon_hoc_id uuid;
update public.hoc_phan set mon_hoc_id = (
  select id from public.mon_hoc
  where mon_hoc.cap_hoc_ma = hoc_phan.cap_hoc_ma and mon_hoc.ma = hoc_phan.mon_hoc_ma
);
alter table public.hoc_phan alter column mon_hoc_id set not null;
alter table public.hoc_phan add constraint hoc_phan_mon_hoc_id_fkey
  foreign key (mon_hoc_id) references public.mon_hoc(id);

-- ============================================================
-- lop (Nhom B, co du lieu tren production)
-- them cap_hoc_id + chuong_trinh_id (NOT NULL); noi lai chi_nhanh_id
-- (nullable)
-- hoc_sinh/ghi_danh la Phase 4/5 -> drop FK toi lop.id, noi lai sau
-- ============================================================
alter table public.lop add column id_new uuid default public.uuidv7();
alter table public.lop alter column id_new set not null;

alter table public.lop add column cap_hoc_id uuid;
update public.lop set cap_hoc_id = (
  select id from public.cap_hoc where cap_hoc.ma = lop.cap_hoc_ma
);
alter table public.lop alter column cap_hoc_id set not null;

alter table public.lop add column chuong_trinh_id uuid;
update public.lop set chuong_trinh_id = (
  select id from public.chuong_trinh where chuong_trinh.ma = lop.chuong_trinh_ma
);
alter table public.lop alter column chuong_trinh_id set not null;

alter table public.lop add column chi_nhanh_id_new uuid;
update public.lop set chi_nhanh_id_new = (
  select id from public.chi_nhanh where chi_nhanh.id_old = lop.chi_nhanh_id
);

alter table public.hoc_sinh drop constraint hoc_sinh_lop_nhap_hoc_id_fkey;
alter table public.hoc_sinh drop constraint hoc_sinh_lop_hien_tai_id_fkey;
alter table public.ghi_danh drop constraint ghi_danh_lop_id_fkey;

alter table public.lop drop constraint lop_pkey;
alter table public.lop rename column id to id_old;
alter table public.lop rename column id_new to id;
alter table public.lop add primary key (id);
alter table public.lop alter column id set default public.uuidv7();

alter table public.lop add constraint lop_cap_hoc_id_fkey
  foreign key (cap_hoc_id) references public.cap_hoc(id);
alter table public.lop add constraint lop_chuong_trinh_id_fkey
  foreign key (chuong_trinh_id) references public.chuong_trinh(id);

alter table public.lop drop column chi_nhanh_id;
alter table public.lop rename column chi_nhanh_id_new to chi_nhanh_id;
alter table public.lop add constraint fk_lop_chi_nhanh
  foreign key (chi_nhanh_id) references public.chi_nhanh(id);

-- ============================================================
-- user_chi_nhanh.chi_nhanh_id: noi lai UUID (hoan tu Phase 2)
-- ============================================================
alter table public.user_chi_nhanh drop constraint user_chi_nhanh_user_id_chi_nhanh_id_key;

alter table public.user_chi_nhanh add column chi_nhanh_id_new uuid;
update public.user_chi_nhanh set chi_nhanh_id_new = (
  select id from public.chi_nhanh where chi_nhanh.id_old = user_chi_nhanh.chi_nhanh_id
);
alter table public.user_chi_nhanh alter column chi_nhanh_id_new set not null;
alter table public.user_chi_nhanh drop column chi_nhanh_id;
alter table public.user_chi_nhanh rename column chi_nhanh_id_new to chi_nhanh_id;
alter table public.user_chi_nhanh add constraint user_chi_nhanh_chi_nhanh_id_fkey
  foreign key (chi_nhanh_id) references public.chi_nhanh(id);
alter table public.user_chi_nhanh add constraint user_chi_nhanh_user_id_chi_nhanh_id_key
  unique (user_id, chi_nhanh_id);

-- ============================================================
-- Buoc cuoi: tao lai 5 policy (dinh nghia y het ban goc, tru cho
-- l.id_old thay l.id o 4 policy tham chieu qua lop_id/lop_hien_tai_id
-- con bigint chua chuyen doi)
-- ============================================================
create policy p_write_lop_quan_ly_chi_nhanh on public.lop for all
  using (
    deleted_at is null and auth_role() = 'quan_ly_chi_nhanh'
    and chi_nhanh_id in (
      select user_chi_nhanh.chi_nhanh_id from public.user_chi_nhanh
      where user_chi_nhanh.user_id = auth.uid()
    )
  )
  with check (
    auth_role() = 'quan_ly_chi_nhanh'
    and chi_nhanh_id in (
      select user_chi_nhanh.chi_nhanh_id from public.user_chi_nhanh
      where user_chi_nhanh.user_id = auth.uid()
    )
  );

create policy p_read_hop_dong_quan_ly_chi_nhanh on public.hop_dong_hoc_phi for select
  using (
    deleted_at is null and auth_role() = 'quan_ly_chi_nhanh'
    and ghi_danh_id in (
      select gd.id from public.ghi_danh gd
      join public.lop l on l.id_old = gd.lop_id
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  );

create policy p_write_hop_dong_quan_ly_chi_nhanh on public.hop_dong_hoc_phi for all
  using (
    deleted_at is null and auth_role() = 'quan_ly_chi_nhanh'
    and ghi_danh_id in (
      select gd.id from public.ghi_danh gd
      join public.lop l on l.id_old = gd.lop_id
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  )
  with check (
    auth_role() = 'quan_ly_chi_nhanh'
    and ghi_danh_id in (
      select gd.id from public.ghi_danh gd
      join public.lop l on l.id_old = gd.lop_id
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  );

create policy p_write_ghi_danh_quan_ly_chi_nhanh on public.ghi_danh for all
  using (
    deleted_at is null and auth_role() = 'quan_ly_chi_nhanh'
    and lop_id in (
      select l.id_old from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  )
  with check (
    auth_role() = 'quan_ly_chi_nhanh'
    and lop_id in (
      select l.id_old from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  );

create policy p_write_hoc_sinh_quan_ly_chi_nhanh on public.hoc_sinh for all
  using (
    deleted_at is null and auth_role() = 'quan_ly_chi_nhanh'
    and lop_hien_tai_id in (
      select l.id_old from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  )
  with check (
    auth_role() = 'quan_ly_chi_nhanh'
    and lop_hien_tai_id in (
      select l.id_old from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  );

commit;
