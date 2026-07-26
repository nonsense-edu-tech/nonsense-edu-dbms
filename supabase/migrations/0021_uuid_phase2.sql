-- ADR-003 Phase 2: mon_hoc, user_chi_nhanh, goi_hoc_phi -> UUIDv7 PK.
-- Strategy: Expand - Backfill - Contract - Verify (ADR-003 Muc 4).
--
-- user_chi_nhanh.chi_nhanh_id is NOT reconnected to chi_nhanh.id here.
-- Discovered while reviewing RLS: p_write_lop_quan_ly_chi_nhanh (lop),
-- p_write_phong_hoc_quan_ly_chi_nhanh (phong_hoc), and
-- p_read/write_hop_dong_quan_ly_chi_nhanh (hop_dong_hoc_phi, via a
-- join through lop) all compare {lop,phong_hoc}.chi_nhanh_id against
-- user_chi_nhanh.chi_nhanh_id. lop.chi_nhanh_id is Phase 3 (ADR-003
-- Muc 5); converting user_chi_nhanh.chi_nhanh_id alone would break
-- those joins (uuid vs bigint), same class of bug found with
-- phong_hoc in Phase 1. So only user_chi_nhanh's own surrogate PK
-- (id) converts here; chi_nhanh_id stays bigint, FK stays dropped
-- (already dropped in Phase 1), to be reconnected together with
-- lop.chi_nhanh_id and phong_hoc.chi_nhanh_id in a later pass.

begin;

-- ============================================================
-- mon_hoc (Nhom C, khoa tu nhien kep -> them UUID PK moi)
-- Cac FK phu thuoc tro vao (cap_hoc_ma, ma) - khoa nghiep vu on dinh,
-- khong doi gia tri/kieu - nen drop+recreate ngay, khong can doi qua
-- phase rieng du user_pham_vi/hoc_phan la Phase 3/4.
-- ============================================================
alter table public.mon_hoc add column id uuid default public.uuidv7();
alter table public.mon_hoc alter column id set not null;

alter table public.user_pham_vi drop constraint user_pham_vi_cap_hoc_ma_mon_hoc_ma_fkey;
alter table public.hoc_phan drop constraint hoc_phan_cap_hoc_ma_mon_hoc_ma_fkey;
alter table public.chuong_trinh_mon_hoc drop constraint chuong_trinh_mon_hoc_cap_hoc_ma_mon_hoc_ma_fkey;

alter table public.mon_hoc drop constraint mon_hoc_pkey;
alter table public.mon_hoc add constraint mon_hoc_ma_cap_hoc_ma_key unique (ma, cap_hoc_ma);
alter table public.mon_hoc add primary key (id);

alter table public.user_pham_vi add constraint user_pham_vi_cap_hoc_ma_mon_hoc_ma_fkey
  foreign key (cap_hoc_ma, mon_hoc_ma) references public.mon_hoc(cap_hoc_ma, ma) on delete restrict;
alter table public.hoc_phan add constraint hoc_phan_cap_hoc_ma_mon_hoc_ma_fkey
  foreign key (cap_hoc_ma, mon_hoc_ma) references public.mon_hoc(cap_hoc_ma, ma) on delete restrict;
alter table public.chuong_trinh_mon_hoc add constraint chuong_trinh_mon_hoc_cap_hoc_ma_mon_hoc_ma_fkey
  foreign key (cap_hoc_ma, mon_hoc_ma) references public.mon_hoc(cap_hoc_ma, ma);

-- ============================================================
-- user_chi_nhanh (Nhom B, co du lieu tren staging: 2 dong)
-- Chi doi PK rieng (id); chi_nhanh_id GIU NGUYEN bigint, xem ghi chu
-- dau file.
-- ============================================================
alter table public.user_chi_nhanh add column id_new uuid default public.uuidv7();
alter table public.user_chi_nhanh alter column id_new set not null;
alter table public.user_chi_nhanh drop constraint user_chi_nhanh_pkey;
alter table public.user_chi_nhanh rename column id to id_old;
alter table public.user_chi_nhanh rename column id_new to id;
alter table public.user_chi_nhanh add primary key (id);
alter table public.user_chi_nhanh alter column id set default public.uuidv7();

-- ============================================================
-- goi_hoc_phi (Nhom B, co du lieu tren staging: 3 dong)
-- hop_dong_hoc_phi la Phase 6 -> drop FK, doi ket noi lai sau.
-- ============================================================
alter table public.goi_hoc_phi add column id_new uuid default public.uuidv7();
alter table public.goi_hoc_phi alter column id_new set not null;

alter table public.hop_dong_hoc_phi drop constraint hop_dong_hoc_phi_goi_hoc_phi_id_fkey;

alter table public.goi_hoc_phi drop constraint goi_hoc_phi_pkey;
alter table public.goi_hoc_phi rename column id to id_old;
alter table public.goi_hoc_phi rename column id_new to id;
alter table public.goi_hoc_phi add primary key (id);
alter table public.goi_hoc_phi alter column id set default public.uuidv7();

commit;
