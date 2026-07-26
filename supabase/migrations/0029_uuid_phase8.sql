-- ADR-003 Phase 8 (cuoi cung): phieu_thu, nhat_ky_tai_chinh -> UUIDv7 PK.
-- Strategy: Expand - Backfill - Contract - Verify (ADR-003 Muc 4).
--
-- nhat_ky_tai_chinh.doi_tuong_id la cot da hinh, khong co FK constraint
-- (CSDL khong tu kiem tra). Da doc toan bo code ung dung (src/) truoc
-- khi doi: KHONG co noi nao trong app ghi hoac doc bang nay (grep
-- "nhat_ky_tai_chinh" va "doi_tuong" tren src/ deu 0 ket qua) - bang
-- chi ton tai tu migration 0011, chua bao gio duoc dung. Doi kieu an
-- toan tuyet doi, khong can sua code ung dung nao ca (khong co code
-- nao de sua).
--
-- phieu_thu.phieu_dao_cua_id tu tham chieu (self-FK) - xu ly dung thu
-- tu trong contract: rename PK rieng (id -> id_old, id_new -> id)
-- TRUOC, roi moi backfill phieu_dao_cua_id_new bang self-join (can ca
-- id_old lan id ton tai dong thoi tren cung bang). Hien tai ca 3 dong
-- phieu_thu deu la_phieu_dao=false, phieu_dao_cua_id=null nen backfill
-- la no-op, nhung van viet dung logic cho tuong lai.
--
-- 3 view tai chinh (v_thuc_thu_hop_dong, v_tai_chinh_hop_dong,
-- v_hop_dong_qua_han) viet lai LAN CUOI: phieu_thu.hop_dong_id/
-- ky_dong_id gio da bat kip uuid nen moi cho tham chieu id_old truoc
-- day (Phase 6, 7) doi het ve id (song). Day la dang cuoi cung, khong
-- con can id_old o dau nua.

begin;

-- drop 3 view truoc (chung phu thuoc cac cot phieu_thu.hop_dong_id/
-- ky_dong_id sap doi kieu ben duoi) - tao lai o cuoi migration
drop view public.v_tai_chinh_hop_dong;
drop view public.v_hop_dong_qua_han;
drop view public.v_thuc_thu_hop_dong;

-- ============================================================
-- phieu_thu (Nhom B, co du lieu tren staging: 3 dong)
-- trg_phieu_thu_no_update (forbid_phieu_thu_mutation, append-only)
-- chan het UPDATE - tam tat trong dung pham vi backfill migration
-- nay, bat lai truoc COMMIT. Khong lam yeu quy tac vinh vien (van
-- chan UPDATE tu app/user binh thuong ngay sau khi migration xong).
-- ============================================================
alter table public.phieu_thu disable trigger trg_phieu_thu_no_update;

alter table public.phieu_thu add column id_new uuid default public.uuidv7();
alter table public.phieu_thu alter column id_new set not null;

alter table public.phieu_thu add column hop_dong_id_new uuid;
update public.phieu_thu set hop_dong_id_new = (
  select id from public.hop_dong_hoc_phi where hop_dong_hoc_phi.id_old = phieu_thu.hop_dong_id
);
alter table public.phieu_thu alter column hop_dong_id_new set not null;

alter table public.phieu_thu add column ky_dong_id_new uuid;
update public.phieu_thu set ky_dong_id_new = (
  select id from public.ky_dong_hoc_phi where ky_dong_hoc_phi.id_old = phieu_thu.ky_dong_id
);

alter table public.phieu_thu add column tep_dinh_kem_id_new uuid;
update public.phieu_thu set tep_dinh_kem_id_new = (
  select id from public.tep_dinh_kem where tep_dinh_kem.id_old = phieu_thu.tep_dinh_kem_id
);

alter table public.phieu_thu add column tep_dinh_kem_id_2_new uuid;
update public.phieu_thu set tep_dinh_kem_id_2_new = (
  select id from public.tep_dinh_kem where tep_dinh_kem.id_old = phieu_thu.tep_dinh_kem_id_2
);

-- drop FK tu tham chieu truoc khi doi ten id (con tro vao id cu)
alter table public.phieu_thu drop constraint phieu_thu_phieu_dao_cua_id_fkey;

-- contract PK rieng TRUOC de co ca id_old lan id dong thoi, phuc vu
-- backfill self-join ben duoi
alter table public.phieu_thu drop constraint phieu_thu_pkey;
alter table public.phieu_thu rename column id to id_old;
alter table public.phieu_thu rename column id_new to id;
alter table public.phieu_thu add primary key (id);
alter table public.phieu_thu alter column id set default public.uuidv7();

-- backfill phieu_dao_cua_id bang self-join (dung thu tu ADR-003 Muc 3
-- yeu cau rieng cho cot tu tham chieu nay)
alter table public.phieu_thu add column phieu_dao_cua_id_new uuid;
update public.phieu_thu p1 set phieu_dao_cua_id_new = (
  select p2.id from public.phieu_thu p2 where p2.id_old = p1.phieu_dao_cua_id
);

alter table public.phieu_thu drop column hop_dong_id;
alter table public.phieu_thu rename column hop_dong_id_new to hop_dong_id;
alter table public.phieu_thu add constraint phieu_thu_hop_dong_id_fkey
  foreign key (hop_dong_id) references public.hop_dong_hoc_phi(id);

alter table public.phieu_thu drop column ky_dong_id;
alter table public.phieu_thu rename column ky_dong_id_new to ky_dong_id;
alter table public.phieu_thu add constraint phieu_thu_ky_dong_id_fkey
  foreign key (ky_dong_id) references public.ky_dong_hoc_phi(id);

alter table public.phieu_thu drop column tep_dinh_kem_id;
alter table public.phieu_thu rename column tep_dinh_kem_id_new to tep_dinh_kem_id;
alter table public.phieu_thu add constraint phieu_thu_tep_dinh_kem_id_fkey
  foreign key (tep_dinh_kem_id) references public.tep_dinh_kem(id);

alter table public.phieu_thu drop column tep_dinh_kem_id_2;
alter table public.phieu_thu rename column tep_dinh_kem_id_2_new to tep_dinh_kem_id_2;
alter table public.phieu_thu add constraint phieu_thu_tep_dinh_kem_id_2_fkey
  foreign key (tep_dinh_kem_id_2) references public.tep_dinh_kem(id);

alter table public.phieu_thu drop column phieu_dao_cua_id;
alter table public.phieu_thu rename column phieu_dao_cua_id_new to phieu_dao_cua_id;
alter table public.phieu_thu add constraint phieu_thu_phieu_dao_cua_id_fkey
  foreign key (phieu_dao_cua_id) references public.phieu_thu(id);

alter table public.phieu_thu enable trigger trg_phieu_thu_no_update;

-- ============================================================
-- nhat_ky_tai_chinh (cot da hinh, rong, khong dung boi app - xem ghi
-- chu dau file)
-- ============================================================
alter table public.nhat_ky_tai_chinh drop constraint nhat_ky_tai_chinh_pkey;
alter table public.nhat_ky_tai_chinh alter column id drop identity if exists;
alter table public.nhat_ky_tai_chinh alter column id type uuid using public.uuidv7();
alter table public.nhat_ky_tai_chinh alter column id set default public.uuidv7();
alter table public.nhat_ky_tai_chinh add primary key (id);

alter table public.nhat_ky_tai_chinh alter column doi_tuong_id type uuid using null::uuid;

-- ============================================================
-- 3 view tai chinh: tao lai lan cuoi (da drop o dau migration), moi
-- tham chieu deu ve id song (khong con id_old nao trong chuoi phu
-- thuoc nua)
-- ============================================================
create view public.v_thuc_thu_hop_dong as
select hd.id as hop_dong_id,
    coalesce(sum(
        case when pt.la_phieu_dao then (-pt.so_tien) else pt.so_tien end
    ), 0::numeric) as thuc_thu
from public.hop_dong_hoc_phi hd
left join public.phieu_thu pt on pt.hop_dong_id = hd.id
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
    join public.ky_dong_hoc_phi ky on (ky.hop_dong_id = hd.id))
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
