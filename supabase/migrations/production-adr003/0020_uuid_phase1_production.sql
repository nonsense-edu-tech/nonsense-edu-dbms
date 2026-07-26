-- ADR-003 Phase 1 (PRODUCTION variant): chi_nhanh, cap_hoc, chuong_trinh,
-- hinh_thuc, dang_cau, tep_dinh_kem, de -> UUIDv7 primary keys.
-- Strategy: Expand - Backfill - Contract - Verify (ADR-003 Muc 4).
--
-- Khac voi ban staging (0020_uuid_phase1.sql): production KHONG co
-- phong_hoc/chuong_trinh_mon_hoc (migration 0017 chua tung ap dung
-- tren production) - da xac nhan qua list_migrations truoc khi viet
-- file nay. Da bo toan bo cau lenh dung toi 2 bang do so voi ban goc.
-- Moi ten constraint khac (fk_lop_cap_hoc, fk_lop_chi_nhanh,
-- fk_lop_chuong_trinh...) da doi chieu truc tiep voi pg_constraint
-- that tren production, khop voi ban staging.
--
-- lop.chi_nhanh_id va user_chi_nhanh.chi_nhanh_id KHONG doi o day
-- (lop = Phase 3, user_chi_nhanh = Phase 2 theo ADR-003 Muc 5). FK toi
-- chi_nhanh bi drop ngay bay gio (chi_nhanh.id dang doi kieu) va se
-- duoc noi lai khi den phase cua chung.

begin;

-- ============================================================
-- chi_nhanh (Nhom B)
-- ============================================================
alter table public.chi_nhanh add column id_new uuid default public.uuidv7();
alter table public.chi_nhanh alter column id_new set not null;

-- drop FKs currently pointing at chi_nhanh.id (about to be renamed away).
-- lop / user_chi_nhanh giu nguyen bigint chi_nhanh_id, FK duoc noi lai
-- o phase cua chung.
alter table public.lop drop constraint fk_lop_chi_nhanh;
alter table public.user_chi_nhanh drop constraint user_chi_nhanh_chi_nhanh_id_fkey;

alter table public.chi_nhanh drop constraint chi_nhanh_pkey;
alter table public.chi_nhanh rename column id to id_old;
alter table public.chi_nhanh rename column id_new to id;
alter table public.chi_nhanh add primary key (id);
alter table public.chi_nhanh alter column id set default public.uuidv7();

-- ============================================================
-- cap_hoc (Nhom C, khoa tu nhien -> them UUID PK moi)
-- ============================================================
alter table public.cap_hoc add column id uuid default public.uuidv7();
alter table public.cap_hoc alter column id set not null;

alter table public.mon_hoc drop constraint mon_hoc_cap_hoc_ma_fkey;
alter table public.lop drop constraint fk_lop_cap_hoc;
alter table public.user_pham_vi drop constraint user_pham_vi_cap_hoc_ma_fkey;

alter table public.cap_hoc drop constraint cap_hoc_pkey;
alter table public.cap_hoc add constraint cap_hoc_ma_key unique (ma);
alter table public.cap_hoc add primary key (id);

alter table public.mon_hoc add constraint mon_hoc_cap_hoc_ma_fkey
  foreign key (cap_hoc_ma) references public.cap_hoc(ma) on delete restrict;
alter table public.lop add constraint fk_lop_cap_hoc
  foreign key (cap_hoc_ma) references public.cap_hoc(ma);
alter table public.user_pham_vi add constraint user_pham_vi_cap_hoc_ma_fkey
  foreign key (cap_hoc_ma) references public.cap_hoc(ma);

-- ============================================================
-- chuong_trinh (Nhom C)
-- ============================================================
alter table public.chuong_trinh add column id uuid default public.uuidv7();
alter table public.chuong_trinh alter column id set not null;

alter table public.goi_hoc_phi drop constraint goi_hoc_phi_chuong_trinh_ma_fkey;
alter table public.lop drop constraint fk_lop_chuong_trinh;

alter table public.chuong_trinh drop constraint chuong_trinh_pkey;
alter table public.chuong_trinh add constraint chuong_trinh_ma_key unique (ma);
alter table public.chuong_trinh add primary key (id);

alter table public.goi_hoc_phi add constraint goi_hoc_phi_chuong_trinh_ma_fkey
  foreign key (chuong_trinh_ma) references public.chuong_trinh(ma);
alter table public.lop add constraint fk_lop_chuong_trinh
  foreign key (chuong_trinh_ma) references public.chuong_trinh(ma);

-- ============================================================
-- hinh_thuc (Nhom C, khong co bang nao FK toi)
-- ============================================================
alter table public.hinh_thuc add column id uuid default public.uuidv7();
alter table public.hinh_thuc alter column id set not null;
alter table public.hinh_thuc drop constraint hinh_thuc_pkey;
alter table public.hinh_thuc add constraint hinh_thuc_ma_key unique (ma);
alter table public.hinh_thuc add primary key (id);

-- ============================================================
-- dang_cau (Nhom C, khong co bang nao FK toi)
-- ============================================================
alter table public.dang_cau add column id uuid default public.uuidv7();
alter table public.dang_cau alter column id set not null;
alter table public.dang_cau drop constraint dang_cau_pkey;
alter table public.dang_cau add constraint dang_cau_ma_key unique (ma);
alter table public.dang_cau add primary key (id);

-- ============================================================
-- tep_dinh_kem (Nhom B)
-- ============================================================
alter table public.tep_dinh_kem add column id_new uuid default public.uuidv7();
alter table public.tep_dinh_kem alter column id_new set not null;

alter table public.phieu_thu drop constraint phieu_thu_tep_dinh_kem_id_fkey;
alter table public.phieu_thu drop constraint phieu_thu_tep_dinh_kem_id_2_fkey;

alter table public.tep_dinh_kem drop constraint tep_dinh_kem_pkey;
alter table public.tep_dinh_kem rename column id to id_old;
alter table public.tep_dinh_kem rename column id_new to id;
alter table public.tep_dinh_kem add primary key (id);
alter table public.tep_dinh_kem alter column id set default public.uuidv7();

-- ============================================================
-- de (Nhom B, rong tren ca staging lan production - doi kieu truc tiep)
-- ============================================================
alter table public.de_cau_hoi drop constraint de_cau_hoi_de_id_fkey;

alter table public.de drop constraint de_pkey;
alter table public.de alter column id drop identity if exists;
alter table public.de alter column id type uuid using public.uuidv7();
alter table public.de alter column id set default public.uuidv7();
alter table public.de add primary key (id);

commit;
