-- ADR-003 Phase 6: cau_hoi, hop_dong_hoc_phi -> UUIDv7 PK.
-- Strategy: Expand - Backfill - Contract - Verify (ADR-003 Muc 4).
--
-- hop_dong_hoc_phi co 1 dong du lieu that tren staging. 3 view tai
-- chinh (v_thuc_thu_hop_dong, v_tai_chinh_hop_dong, v_hop_dong_qua_han)
-- deu phu thuoc hop_dong_hoc_phi.id/ghi_danh_id -> phai DROP+CREATE
-- lai lan nua (dung nhu Phase 5), voi luu y:
--   - v_thuc_thu_hop_dong: group/output theo hd.id (song) nhung JOIN
--     toi phieu_thu qua hd.id_old (phieu_thu la Phase 8, con bigint).
--   - v_tai_chinh_hop_dong: gd.id = hd.ghi_danh_id (doi tu gd.id_old
--     cua Phase 5, vi hd.ghi_danh_id nay da bat kip uuid).
--   - v_hop_dong_qua_han: tuong tu gd.id = hd.ghi_danh_id, NHUNG
--     ky_dong_hoc_phi.hop_dong_id la Phase 7 (con bigint) nen phai
--     dung hd.id_old cho join do rieng.
-- Phai giu nguyen UNIQUE (ghi_danh_id) tren hop_dong_hoc_phi (quan he
-- 1-1, ADR-003 Muc 3 nhac rieng khong duoc mat).

begin;

-- ============================================================
-- cau_hoi (Nhom B, rong tren staging)
-- lua_chon/de_cau_hoi la Phase 7 -> drop FK, noi lai sau
-- ============================================================
alter table public.lua_chon drop constraint lua_chon_cau_hoi_id_fkey;
alter table public.de_cau_hoi drop constraint de_cau_hoi_cau_hoi_id_fkey;

alter table public.cau_hoi drop constraint cau_hoi_pkey;
alter table public.cau_hoi alter column id drop identity if exists;
alter table public.cau_hoi alter column id type uuid using public.uuidv7();
alter table public.cau_hoi alter column id set default public.uuidv7();
alter table public.cau_hoi add primary key (id);

alter table public.cau_hoi alter column ngu_lieu_id type uuid using public.uuidv7();
alter table public.cau_hoi add constraint cau_hoi_ngu_lieu_id_fkey
  foreign key (ngu_lieu_id) references public.ngu_lieu(id) on delete set null;

-- ============================================================
-- hop_dong_hoc_phi (Nhom B, co du lieu tren staging: 1 dong)
-- ky_dong_hoc_phi la Phase 7, phieu_thu la Phase 8 -> drop FK toi
-- hop_dong_hoc_phi.id, noi lai sau
-- ============================================================
alter table public.hop_dong_hoc_phi add column id_new uuid default public.uuidv7();
alter table public.hop_dong_hoc_phi alter column id_new set not null;

alter table public.hop_dong_hoc_phi add column ghi_danh_id_new uuid;
update public.hop_dong_hoc_phi set ghi_danh_id_new = (
  select id from public.ghi_danh where ghi_danh.id_old = hop_dong_hoc_phi.ghi_danh_id
);
alter table public.hop_dong_hoc_phi alter column ghi_danh_id_new set not null;

alter table public.hop_dong_hoc_phi add column goi_hoc_phi_id_new uuid;
update public.hop_dong_hoc_phi set goi_hoc_phi_id_new = (
  select id from public.goi_hoc_phi where goi_hoc_phi.id_old = hop_dong_hoc_phi.goi_hoc_phi_id
);
alter table public.hop_dong_hoc_phi alter column goi_hoc_phi_id_new set not null;

drop policy p_read_hop_dong_quan_ly_chi_nhanh on public.hop_dong_hoc_phi;
drop policy p_write_hop_dong_quan_ly_chi_nhanh on public.hop_dong_hoc_phi;

drop view public.v_tai_chinh_hop_dong;
drop view public.v_hop_dong_qua_han;
drop view public.v_thuc_thu_hop_dong;

alter table public.ky_dong_hoc_phi drop constraint ky_dong_hoc_phi_hop_dong_id_fkey;
alter table public.phieu_thu drop constraint phieu_thu_hop_dong_id_fkey;

alter table public.hop_dong_hoc_phi drop constraint hop_dong_hoc_phi_ghi_danh_id_key;

alter table public.hop_dong_hoc_phi drop constraint hop_dong_hoc_phi_pkey;
alter table public.hop_dong_hoc_phi rename column id to id_old;
alter table public.hop_dong_hoc_phi rename column id_new to id;
alter table public.hop_dong_hoc_phi add primary key (id);
alter table public.hop_dong_hoc_phi alter column id set default public.uuidv7();

alter table public.hop_dong_hoc_phi drop column ghi_danh_id;
alter table public.hop_dong_hoc_phi rename column ghi_danh_id_new to ghi_danh_id;
alter table public.hop_dong_hoc_phi add constraint hop_dong_hoc_phi_ghi_danh_id_fkey
  foreign key (ghi_danh_id) references public.ghi_danh(id);
alter table public.hop_dong_hoc_phi add constraint hop_dong_hoc_phi_ghi_danh_id_key
  unique (ghi_danh_id);

alter table public.hop_dong_hoc_phi drop column goi_hoc_phi_id;
alter table public.hop_dong_hoc_phi rename column goi_hoc_phi_id_new to goi_hoc_phi_id;
alter table public.hop_dong_hoc_phi add constraint hop_dong_hoc_phi_goi_hoc_phi_id_fkey
  foreign key (goi_hoc_phi_id) references public.goi_hoc_phi(id);

create policy p_read_hop_dong_quan_ly_chi_nhanh on public.hop_dong_hoc_phi for select
  using (
    deleted_at is null and auth_role() = 'quan_ly_chi_nhanh'
    and ghi_danh_id in (
      select gd.id from public.ghi_danh gd
      join public.lop l on l.id = gd.lop_id
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  );

create policy p_write_hop_dong_quan_ly_chi_nhanh on public.hop_dong_hoc_phi for all
  using (
    deleted_at is null and auth_role() = 'quan_ly_chi_nhanh'
    and ghi_danh_id in (
      select gd.id from public.ghi_danh gd
      join public.lop l on l.id = gd.lop_id
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  )
  with check (
    auth_role() = 'quan_ly_chi_nhanh'
    and ghi_danh_id in (
      select gd.id from public.ghi_danh gd
      join public.lop l on l.id = gd.lop_id
      join public.user_chi_nhanh uc on uc.chi_nhanh_id = l.chi_nhanh_id
      where uc.user_id = auth.uid()
    )
  );

create view public.v_thuc_thu_hop_dong as
select hd.id as hop_dong_id,
    coalesce(sum(
        case when pt.la_phieu_dao then (-pt.so_tien) else pt.so_tien end
    ), 0::numeric) as thuc_thu
from public.hop_dong_hoc_phi hd
left join public.phieu_thu pt on pt.hop_dong_id = hd.id_old
group by hd.id;

create view public.v_tai_chinh_hop_dong as
select hd.id as hop_dong_id,
    hd.ghi_danh_id,
    gd.lop_id,
    l.chuong_trinh_ma,
    hd.doanh_thu_thuan,
    tt.thuc_thu,
    (hd.doanh_thu_thuan::numeric - tt.thuc_thu) as con_phai_thu,
    hd.trang_thai,
    hd.kich_hoat_luc
from ((public.hop_dong_hoc_phi hd
    join public.ghi_danh gd on (gd.id = hd.ghi_danh_id))
    join public.lop l on (l.id = gd.lop_id))
    join public.v_thuc_thu_hop_dong tt on (tt.hop_dong_id = hd.id)
where hd.deleted_at is null;

create view public.v_hop_dong_qua_han as
select hd.id as hop_dong_id,
    hs.ho_ten,
    hs.ma_hoc_sinh,
    l.ten_lop,
    sum(greatest((ky.so_tien_du_kien::numeric - coalesce(da_thu.da_thu_trong_ky, 0::numeric)), 0::numeric)) as so_tien_cham,
    max(current_date - ky.ngay_den_han) as so_ngay_tre_nhat
from (((((public.hop_dong_hoc_phi hd
    join public.ghi_danh gd on (gd.id = hd.ghi_danh_id))
    join public.hoc_sinh hs on (hs.id = gd.hoc_sinh_id))
    join public.lop l on (l.id = gd.lop_id))
    join public.ky_dong_hoc_phi ky on (ky.hop_dong_id = hd.id_old))
    left join ( select phieu_thu.ky_dong_id,
           sum(
               case
                   when phieu_thu.la_phieu_dao then (-phieu_thu.so_tien)
                   else phieu_thu.so_tien
               end) as da_thu_trong_ky
          from public.phieu_thu
         where phieu_thu.ky_dong_id is not null
         group by phieu_thu.ky_dong_id) da_thu on (da_thu.ky_dong_id = ky.id))
where (hd.deleted_at is null and hd.trang_thai = 'dang_hoat_dong' and ky.ngay_den_han < current_date
       and coalesce(da_thu.da_thu_trong_ky, 0::numeric) < ky.so_tien_du_kien::numeric)
group by hd.id, hs.ho_ten, hs.ma_hoc_sinh, l.ten_lop
order by (max(current_date - ky.ngay_den_han)) desc;

alter view public.v_thuc_thu_hop_dong set (security_invoker = true);
alter view public.v_tai_chinh_hop_dong set (security_invoker = true);
alter view public.v_hop_dong_qua_han set (security_invoker = true);

commit;
