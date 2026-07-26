-- ADR-003 Phase 4: bai_hoc, hoc_sinh -> UUIDv7 PK.
-- Strategy: Expand - Backfill - Contract - Verify (ADR-003 Muc 4).
--
-- bai_hoc.id va hoc_sinh.id dung kieu "doi ten" (id -> id_old, id_new
-- -> id) dù rong/khong-rong, de RLS/view tham chieu qua bang con CHUA
-- chuyen doi (ngu_lieu/user_bai_hoc Phase 5, ghi_danh Phase 5) tu dong
-- bam theo id_old (khong can drop/sua policy/view cho phan nay) - dung
-- ky thuat da kiem chung o Phase 1-3.
--
-- hoc_sinh.lop_nhap_hoc_id/lop_hien_tai_id thi NGUOC LAI: chu dong noi
-- lai vao lop.id (uuid, da xong tu Phase 3), vi lop da chuyen doi roi.
-- Rieng lop_hien_tai_id bi 1 RLS policy tham chieu truc tiep
-- (p_write_hoc_sinh_quan_ly_chi_nhanh) -> phai drop truoc, tao lai sau
-- voi l.id (khong con l.id_old nhu ban Phase 3, vi gio hoc_sinh da bat
-- kip uuid).

begin;

-- ============================================================
-- bai_hoc (Nhom B, rong tren staging)
-- ============================================================
alter table public.bai_hoc drop constraint bai_hoc_hoc_phan_id_ma_key;

alter table public.bai_hoc add column id_new uuid default public.uuidv7();
alter table public.bai_hoc alter column id_new set not null;

-- ngu_lieu/user_bai_hoc la Phase 5 -> drop FK toi bai_hoc.id, noi lai sau
alter table public.ngu_lieu drop constraint ngu_lieu_bai_hoc_id_fkey;
alter table public.user_bai_hoc drop constraint user_bai_hoc_bai_hoc_id_fkey;

alter table public.bai_hoc drop constraint bai_hoc_pkey;
alter table public.bai_hoc rename column id to id_old;
alter table public.bai_hoc rename column id_new to id;
alter table public.bai_hoc add primary key (id);
alter table public.bai_hoc alter column id set default public.uuidv7();

-- hoc_phan_id: doi kieu truc tiep (bai_hoc va hoc_phan deu rong;
-- hoc_phan da la uuid thuan tu Phase 3, khong co id_old de map)
alter table public.bai_hoc alter column hoc_phan_id type uuid using public.uuidv7();
alter table public.bai_hoc add constraint bai_hoc_hoc_phan_id_fkey
  foreign key (hoc_phan_id) references public.hoc_phan(id) on delete restrict;
alter table public.bai_hoc add constraint bai_hoc_hoc_phan_id_ma_key
  unique (hoc_phan_id, ma);

-- ============================================================
-- hoc_sinh (Nhom B, co du lieu tren staging: 69 dong)
-- ============================================================
alter table public.hoc_sinh add column id_new uuid default public.uuidv7();
alter table public.hoc_sinh alter column id_new set not null;

alter table public.hoc_sinh add column lop_nhap_hoc_id_new uuid;
update public.hoc_sinh set lop_nhap_hoc_id_new = (
  select id from public.lop where lop.id_old = hoc_sinh.lop_nhap_hoc_id
);
alter table public.hoc_sinh alter column lop_nhap_hoc_id_new set not null;

alter table public.hoc_sinh add column lop_hien_tai_id_new uuid;
update public.hoc_sinh set lop_hien_tai_id_new = (
  select id from public.lop where lop.id_old = hoc_sinh.lop_hien_tai_id
);

-- policy tham chieu lop_hien_tai_id (chuan bi doi cot) - drop truoc
drop policy p_write_hoc_sinh_quan_ly_chi_nhanh on public.hoc_sinh;

-- ghi_danh la Phase 5 -> drop FK toi hoc_sinh.id, noi lai sau
alter table public.ghi_danh drop constraint ghi_danh_hoc_sinh_id_fkey;

alter table public.hoc_sinh drop constraint hoc_sinh_pkey;
alter table public.hoc_sinh rename column id to id_old;
alter table public.hoc_sinh rename column id_new to id;
alter table public.hoc_sinh add primary key (id);
alter table public.hoc_sinh alter column id set default public.uuidv7();

alter table public.hoc_sinh drop column lop_nhap_hoc_id;
alter table public.hoc_sinh rename column lop_nhap_hoc_id_new to lop_nhap_hoc_id;
alter table public.hoc_sinh add constraint hoc_sinh_lop_nhap_hoc_id_fkey
  foreign key (lop_nhap_hoc_id) references public.lop(id);

alter table public.hoc_sinh drop column lop_hien_tai_id;
alter table public.hoc_sinh rename column lop_hien_tai_id_new to lop_hien_tai_id;
alter table public.hoc_sinh add constraint hoc_sinh_lop_hien_tai_id_fkey
  foreign key (lop_hien_tai_id) references public.lop(id);

-- tao lai policy, dung l.id (uuid song, khong con can l.id_old vi
-- hoc_sinh.lop_hien_tai_id da la uuid)
create policy p_write_hoc_sinh_quan_ly_chi_nhanh on public.hoc_sinh for all
  using (
    deleted_at is null and auth_role() = 'quan_ly_chi_nhanh'
    and lop_hien_tai_id in (
      select l.id from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  )
  with check (
    auth_role() = 'quan_ly_chi_nhanh'
    and lop_hien_tai_id in (
      select l.id from public.lop l
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  );

commit;
