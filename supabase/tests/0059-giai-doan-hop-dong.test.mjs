import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Kiểm thử migration 0059 (giai đoạn hợp đồng học phí) trên PGlite với schema giả lập — KHÔNG đụng DB thật.
// Chạy: npm run test:giai-doan-hop-dong
const dir = path.dirname(fileURLToPath(import.meta.url));
const mig = fs.readFileSync(path.join(dir, "../migrations/0059_giai_doan_hop_dong_hoc_phi.sql"), "utf8");

const db = new PGlite();
const U = (n) => `00000000-0000-0000-0000-00000000000${n}`;
await db.exec(`
create schema auth;
create role authenticated; create role anon; create role service_role;
grant usage on schema public, auth to authenticated, anon, service_role;
alter default privileges in schema public grant all on tables to authenticated, anon;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
create function public.uuidv7() returns uuid language sql as $$ select gen_random_uuid() $$;
create table public.users(id uuid primary key, vai_tro text);
create function public.auth_role() returns text language sql stable security definer as $$ select vai_tro from public.users where id = auth.uid() $$;
create table public.user_chi_nhanh(user_id uuid, chi_nhanh_id uuid);
create table public.nhat_ky(id uuid primary key default gen_random_uuid(), nguoi_dung_id uuid references public.users(id),
  hanh_dong text not null, doi_tuong text not null, doi_tuong_id uuid, truoc jsonb, sau jsonb, created_at timestamptz not null default now(), ly_do text);
create table public.lop(id uuid primary key default gen_random_uuid(), ten_lop text, chi_nhanh_id uuid, ngay_khai_giang date, ngay_ket_thuc date, deleted_at timestamptz);
create table public.ghi_danh(id uuid primary key default gen_random_uuid(), lop_id uuid, trang_thai text not null default 'dang_hoc');
create table public.hop_dong_hoc_phi(
  id uuid primary key default gen_random_uuid(), ghi_danh_id uuid not null, goi_hoc_phi_id uuid,
  gia_niem_yet bigint not null, loai_giam_gia text not null default 'khong', gia_tri_giam_gia bigint not null default 0,
  so_tien_giam bigint not null default 0, so_tien_mien_cong_no bigint not null default 0, doanh_thu_thuan bigint not null,
  hinh_thuc_dong text not null default 'mot_lan', trang_thai text not null default 'dang_hoat_dong', kich_hoat_luc timestamptz, deleted_at timestamptz,
  constraint chk check (doanh_thu_thuan = gia_niem_yet - so_tien_giam - so_tien_mien_cong_no));
create table public.ky_dong_hoc_phi(id uuid primary key default gen_random_uuid(), hop_dong_id uuid not null, so_ky integer not null,
  ngay_den_han date not null, so_tien_du_kien bigint not null, trang_thai text not null default 'cho_thu', unique(hop_dong_id, so_ky));
create function public.chan_sua_tai_chinh_hop_dong() returns trigger language plpgsql as $$ begin return new; end $$;
create trigger trg_hop_dong_chan_sua_tai_chinh before update on public.hop_dong_hoc_phi for each row execute function public.chan_sua_tai_chinh_hop_dong();
grant all on public.users, public.lop, public.ghi_danh, public.hop_dong_hoc_phi, public.user_chi_nhanh to authenticated;
insert into public.users values ('${U(1)}','master_admin'),('${U(2)}','ke_toan'),('${U(3)}','gv'),('${U(4)}','admin_ts');
`);
// Lớp Nội A: 01/09/2025 -> 31/08/2027 (24 tháng). Hôm nay (giả lập) = thật; dùng mốc quá khứ/tương lai tương đối.
const hom = (await db.query(`select (now() at time zone 'Asia/Ho_Chi_Minh')::date d`)).rows[0].d.toISOString().slice(0, 10);
await db.exec(`
insert into public.lop(id, ten_lop, ngay_khai_giang, ngay_ket_thuc) values
 ('aaaaaaaa-0000-0000-0000-000000000001','Nội A (24 tháng, GĐ1 đã xong)', (date '${hom}' - interval '13 months')::date, (date '${hom}' + interval '11 months')::date),
 ('aaaaaaaa-0000-0000-0000-000000000002','Lớp 12 tháng', (date '${hom}' - interval '2 months')::date, (date '${hom}' + interval '10 months')::date);
insert into public.ghi_danh(id, lop_id, trang_thai) values
 ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001','dang_hoc'),
 ('bbbbbbbb-0000-0000-0000-000000000002','aaaaaaaa-0000-0000-0000-000000000001','dang_hoc'),
 ('bbbbbbbb-0000-0000-0000-000000000003','aaaaaaaa-0000-0000-0000-000000000001','dang_hoc'),
 ('bbbbbbbb-0000-0000-0000-000000000004','aaaaaaaa-0000-0000-0000-000000000002','dang_hoc');
-- hợp đồng tạo TRƯỚC migration (dữ liệu cũ) -> phải được backfill
insert into public.hop_dong_hoc_phi(id, ghi_danh_id, gia_niem_yet, so_tien_giam, doanh_thu_thuan) values
 ('cccccccc-0000-0000-0000-000000000004','bbbbbbbb-0000-0000-0000-000000000004', 50000000, 0, 50000000);
`);
await db.exec(mig);

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error("FAIL:", m); } else console.log("ok:", m); };
const q = async (sql) => (await db.query(sql)).rows;
const as = async (uid, sql) => { await db.exec(`set app.uid='${uid}'; set role authenticated;`); try { return await q(sql); } finally { await db.exec(`reset role;`); } };
const asErr = async (uid, sql) => { try { await as(uid, sql); return null; } catch (e) { return e.message; } };

// Backfill
let r = await q(`select count(*)::int n, sum(gia_niem_yet)::bigint t from public.hop_dong_giai_doan where hop_dong_id='cccccccc-0000-0000-0000-000000000004'`);
ok(r[0].n === 1 && String(r[0].t) === "50000000", "backfill: hợp đồng cũ = 1 giai đoạn, số tiền y nguyên");

// Tạo giai đoạn cho lớp 24 tháng: GĐ1 = 12 tháng đầu
await db.exec(`insert into public.hop_dong_hoc_phi(id, ghi_danh_id, gia_niem_yet, loai_giam_gia, gia_tri_giam_gia, so_tien_giam, doanh_thu_thuan) values
 ('cccccccc-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001', 50000000, 'khong', 0, 0, 50000000),
 ('cccccccc-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000002', 50000000, 'khong', 0, 0, 50000000),
 ('cccccccc-0000-0000-0000-000000000003','bbbbbbbb-0000-0000-0000-000000000003', 50000000, 'khong', 0, 0, 50000000)`);
r = await q(`select count(*)::int n from public.hop_dong_giai_doan where hop_dong_id in ('cccccccc-0000-0000-0000-000000000001','cccccccc-0000-0000-0000-000000000002','cccccccc-0000-0000-0000-000000000003')`);
ok(r[0].n === 3, "hợp đồng mới tự có giai đoạn 1 (code cũ không cần biết)");

let e = await asErr(U(3), `select public.tao_giai_doan_lop('aaaaaaaa-0000-0000-0000-000000000001')`);
ok(e && /Chỉ Master/.test(e), "GV không tạo được giai đoạn cho lớp");
r = await as(U(4), `select public.tao_giai_doan_lop('aaaaaaaa-0000-0000-0000-000000000001') n`);
ok(r[0].n === 3, "tạo giai đoạn lớp: sinh 3 giai đoạn dự kiến cho 3 hợp đồng");
r = await q(`select so_gd, tu_ngay, den_ngay from public.lop_giai_doan where lop_id='aaaaaaaa-0000-0000-0000-000000000001' order by so_gd`);
ok(r.length === 2 && r[1].tu_ngay > r[0].den_ngay, "GĐ1 = 12 tháng đầu, GĐ2 nối tiếp đến ngày kết thúc");
e = await asErr(U(4), `select public.tao_giai_doan_lop('aaaaaaaa-0000-0000-0000-000000000002')`);
ok(e && /chỉ có 1 giai đoạn/.test(e), "lớp 12 tháng: chỉ 1 giai đoạn");

// Chưa có giá -> không kích hoạt được
e = await asErr(U(2), `select public.kich_hoat_giai_doan((select id from public.hop_dong_giai_doan where hop_dong_id='cccccccc-0000-0000-0000-000000000001' and so_gd=2))`);
ok(e && /chưa có giá/.test(e), "thiếu giá dự kiến: không kích hoạt");

// Đặt giá 60tr, HĐ1: giảm 10% riêng GĐ2; HĐ2 học bổng cố định 60tr (miễn toàn phần)
r = await as(U(2), `select public.dat_gia_giai_doan_lop('aaaaaaaa-0000-0000-0000-000000000001', 2, 60000000) n`);
ok(r[0].n === 3, "đặt giá GĐ2 hàng loạt cho cả lớp");
await as(U(2), `update public.hop_dong_giai_doan set loai_giam_gia='phan_tram', gia_tri_giam_gia=10 where hop_dong_id='cccccccc-0000-0000-0000-000000000001' and so_gd=2`);
await as(U(2), `update public.hop_dong_giai_doan set loai_giam_gia='co_dinh', gia_tri_giam_gia=60000000 where hop_dong_id='cccccccc-0000-0000-0000-000000000002' and so_gd=2`);
e = await asErr(U(3), `update public.hop_dong_giai_doan set gia_du_kien=1 where so_gd=2`);
ok(e !== null || (await q(`select count(*)::int n from public.hop_dong_giai_doan where gia_du_kien=1`))[0].n === 0, "GV không sửa được giá giai đoạn");
e = await asErr(U(2), `update public.hop_dong_giai_doan set doanh_thu_thuan=1 where so_gd=2`);
ok(e && /permission denied/.test(e), "không sửa trực tiếp cột doanh thu của giai đoạn");

// HĐ3: học viên nghỉ sau GĐ1 -> admin đóng riêng GĐ2
await as(U(4), `select public.dong_giai_doan((select id from public.hop_dong_giai_doan where hop_dong_id='cccccccc-0000-0000-0000-000000000003' and so_gd=2), 'Học viên nghỉ sau GĐ1')`);
ok((await q(`select trang_thai t from public.hop_dong_giai_doan where hop_dong_id='cccccccc-0000-0000-0000-000000000003' and so_gd=2`))[0].t === "da_dong", "admin đóng GĐ2 của 1 học viên");

// Tự kích hoạt đến hạn (GĐ1 đã kết thúc)
r = await q(`select public.kich_hoat_giai_doan_den_han() j`);
ok(r[0].j.da_kich_hoat === 2, "tự kích hoạt GĐ2 cho 2 học viên đủ điều kiện (bỏ qua học viên đã đóng GĐ2)");
r = await q(`select h.gia_niem_yet g, h.so_tien_giam gm, h.doanh_thu_thuan d from public.hop_dong_hoc_phi h where h.id='cccccccc-0000-0000-0000-000000000001'`);
ok(String(r[0].g) === "110000000" && String(r[0].gm) === "6000000" && String(r[0].d) === "104000000", "HĐ1: tổng = 50tr + 60tr, giảm 10% chỉ GĐ2 (6tr), doanh thu thuần 104tr");
r = await q(`select doanh_thu_thuan d, so_tien_giam gm, trang_thai t from public.hop_dong_giai_doan where hop_dong_id='cccccccc-0000-0000-0000-000000000001' order by so_gd`);
ok(String(r[0].d) === "50000000" && String(r[1].d) === "54000000" && r[0].t === "hoan_thanh" && r[1].t === "kich_hoat", "HĐ1: GĐ1 hoàn thành 50tr; GĐ2 kích hoạt 54tr");
r = await q(`select count(*)::int n, max(so_tien_du_kien)::bigint m from public.ky_dong_hoc_phi where hop_dong_id='cccccccc-0000-0000-0000-000000000001' and giai_doan_so=2`);
ok(r[0].n === 1 && String(r[0].m) === "54000000", "HĐ1: tạo kỳ đóng GĐ2 = 54tr");
r = await q(`select h.doanh_thu_thuan d from public.hop_dong_hoc_phi h where h.id='cccccccc-0000-0000-0000-000000000002'`);
ok(String(r[0].d) === "50000000", "HĐ2: học bổng toàn phần GĐ2 → doanh thu GĐ2 = 0, hợp đồng vẫn 50tr");
ok((await q(`select count(*)::int n from public.ky_dong_hoc_phi where hop_dong_id='cccccccc-0000-0000-0000-000000000002' and giai_doan_so=2`))[0].n === 0, "HĐ2: không tạo kỳ đóng cho GĐ2 = 0đ");
r = await q(`select gia_niem_yet g from public.hop_dong_hoc_phi where id='cccccccc-0000-0000-0000-000000000003'`);
ok(String(r[0].g) === "50000000", "HĐ3 (nghỉ sau GĐ1): hợp đồng giữ 50tr, không có công nợ GĐ2");
r = await q(`select public.kich_hoat_giai_doan_den_han() j`);
ok(r[0].j.da_kich_hoat === 0, "chạy lần 2: idempotent, không kích hoạt thêm");

// Tổng giai đoạn luôn = hợp đồng
r = await q(`select count(*)::int n from public.hop_dong_hoc_phi h where deleted_at is null and (select coalesce(sum(doanh_thu_thuan),0) from public.hop_dong_giai_doan s where s.hop_dong_id=h.id) <> h.doanh_thu_thuan`);
ok(r[0].n === 0, "bất biến: Σ doanh thu giai đoạn = doanh thu hợp đồng (mọi hợp đồng)");

await db.exec("set app.uid=''");
// Đường cũ: tất toán/sửa hợp đồng bằng code cũ dồn vào giai đoạn hiện hành
await db.exec(`update public.hop_dong_hoc_phi set so_tien_mien_cong_no = 4000000, doanh_thu_thuan = doanh_thu_thuan - 4000000, trang_thai='hoan_thanh' where id='cccccccc-0000-0000-0000-000000000001'`);
r = await q(`select doanh_thu_thuan d, so_tien_mien_cong_no m from public.hop_dong_giai_doan where hop_dong_id='cccccccc-0000-0000-0000-000000000001' and so_gd=2`);
ok(String(r[0].m) === "4000000" && String(r[0].d) === "50000000", "tất toán bằng code cũ: miễn công nợ dồn vào giai đoạn hiện hành (GĐ2)");

// Đóng giai đoạn cả lớp
await db.exec(`insert into public.ghi_danh(id, lop_id) values ('bbbbbbbb-0000-0000-0000-000000000005','aaaaaaaa-0000-0000-0000-000000000001');
 insert into public.hop_dong_hoc_phi(id, ghi_danh_id, gia_niem_yet, doanh_thu_thuan) values ('cccccccc-0000-0000-0000-000000000005','bbbbbbbb-0000-0000-0000-000000000005',50000000,50000000)`);
r = await as(U(1), `select public.dong_giai_doan_lop('aaaaaaaa-0000-0000-0000-000000000001', 2, 'Admin đóng lớp theo yêu cầu') n`);
ok(r[0].n === 1, "admin đóng GĐ2 cả lớp: học viên chưa kích hoạt chuyển da_dong");
e = await asErr(U(3), `select public.kich_hoat_giai_doan_den_han()`);
ok(e && /permission denied/.test(e), "GV không gọi được hàm tự động");
ok((await q(`select count(*)::int n from public.nhat_ky where hanh_dong in ('kich_hoat_giai_doan','dong_giai_doan','dong_giai_doan_lop')`))[0].n >= 4, "có ghi nhật ký kích hoạt/đóng giai đoạn");

if (fail) { console.error(`\n${fail} test FAIL`); process.exit(1); }
console.log("\nTất cả test đạt.");
