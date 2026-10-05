import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Kiểm thử quy trình đề xuất → phê duyệt sửa hợp đồng (0054 + 0055) trên PGlite với schema giả lập
// — KHÔNG đụng DB thật. Chạy: npm run test:yeu-cau-sua-hop-dong
const dir = path.dirname(fileURLToPath(import.meta.url));
const m54 = fs.readFileSync(path.join(dir, "../migrations/0054_master_sua_hop_dong_va_nhat_ky.sql"), "utf8");
const m55 = fs.readFileSync(path.join(dir, "../migrations/0055_quy_trinh_de_xuat_phe_duyet_sua_hop_dong.sql"), "utf8");

const db = new PGlite();
await db.exec(`
create schema auth;
create role authenticated; create role anon;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
create function public.uuidv7() returns uuid language sql as $$ select gen_random_uuid() $$;
create function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create table public.users(id uuid primary key, vai_tro text, ho_ten text, trang_thai text default 'active');
create function public.auth_role() returns text language sql stable security definer as $$
  select vai_tro from public.users where id = auth.uid() and trang_thai = 'active' $$;
create table public.nhat_ky(id uuid primary key default gen_random_uuid(), nguoi_dung_id uuid references public.users(id),
  hanh_dong text not null, doi_tuong text not null, doi_tuong_id uuid, truoc jsonb, sau jsonb, created_at timestamptz not null default clock_timestamp());
create table public.hop_dong_hoc_phi(
  id uuid primary key default gen_random_uuid(), ghi_danh_id uuid not null, goi_hoc_phi_id uuid,
  gia_niem_yet bigint not null, loai_giam_gia text not null default 'khong', gia_tri_giam_gia bigint not null default 0,
  so_tien_giam bigint not null default 0, doanh_thu_thuan bigint not null,
  hinh_thuc_dong text not null, trang_thai text not null default 'nhap', ghi_chu text,
  nguoi_duyet uuid, kich_hoat_luc timestamptz, deleted_at timestamptz, updated_at timestamptz not null default now(),
  constraint chk_hop_dong_doanh_thu check (doanh_thu_thuan = gia_niem_yet - so_tien_giam),
  constraint chk_hop_dong_giam check (so_tien_giam <= gia_niem_yet));
create table public.phieu_thu(id uuid primary key default gen_random_uuid(), hop_dong_id uuid, so_tien bigint);
create table public.ky_dong_hoc_phi(id uuid primary key default gen_random_uuid(), hop_dong_id uuid, so_tien_du_kien bigint);
`);
await db.exec(m54);
await db.exec(m55);
await db.exec(m54); await db.exec(m55); // idempotent

let fail = 0;
const ok = (cond, msg) => { if (!cond) { fail++; console.error("FAIL:", msg); } else console.log("ok:", msg); };
const loi = async (sql) => { try { await db.exec(sql); return null; } catch (e) { return String(e.message); } };
const q = async (sql) => (await db.query(sql)).rows;
const as = (uid) => `select set_config('app.uid', '${uid}', false);`;

const MASTER = "00000000-0000-0000-0000-0000000000a1";
const KETOAN = "00000000-0000-0000-0000-0000000000a2";
const ADMINTS = "00000000-0000-0000-0000-0000000000a3";
const ADMINTS2 = "00000000-0000-0000-0000-0000000000a4";
const HD = "00000000-0000-0000-0000-0000000000b1";
const HDN = "00000000-0000-0000-0000-0000000000b2"; // hợp đồng nháp
const HDH = "00000000-0000-0000-0000-0000000000b3"; // hợp đồng đã huỷ
await db.exec(`
insert into public.users(id, vai_tro, ho_ten) values ('${MASTER}','master_admin','Master'),('${KETOAN}','ke_toan','Ke toan'),
  ('${ADMINTS}','admin_ts','Admin TS 1'),('${ADMINTS2}','admin_ts','Admin TS 2');
insert into public.hop_dong_hoc_phi(id, ghi_danh_id, gia_niem_yet, so_tien_giam, doanh_thu_thuan, hinh_thuc_dong, trang_thai)
  values ('${HD}', gen_random_uuid(), 25000000, 0, 25000000, 'hang_thang', 'dang_hoat_dong'),
         ('${HDN}', gen_random_uuid(), 10000000, 0, 10000000, 'mot_lan', 'nhap'),
         ('${HDH}', gen_random_uuid(), 10000000, 0, 10000000, 'mot_lan', 'da_huy');
insert into public.phieu_thu(hop_dong_id, so_tien) values ('${HD}', 8500000);
`);
const DX = (hd, gia, loai, gt, ht, gc, ly) => `select public.de_xuat_sua_hop_dong('${hd}', ${gia}, '${loai}', ${gt}, '${ht}', ${gc === null ? "null" : `'${gc}'`}, '${ly}')`;
const XL = (id, quyet, ly) => `select public.xu_ly_yeu_cau_sua_hop_dong('${id}', '${quyet}', '${ly}')`;

// --- Quyền đề xuất
await db.exec(as(KETOAN));
let e = await loi(DX(HD, 25000000, "co_dinh", 1500000, "hang_thang", null, "Phụ huynh xin giảm"));
ok(e && e.includes("Chỉ Admin Tuyển sinh"), "ke_toan KHÔNG đề xuất được");
await db.exec(as(MASTER));
e = await loi(DX(HD, 25000000, "co_dinh", 1500000, "hang_thang", null, "Phụ huynh xin giảm"));
ok(e && e.includes("Chỉ Admin Tuyển sinh"), "master_admin KHÔNG dùng đường đề xuất (sửa trực tiếp)");

// --- Kiểm tra đầu vào
await db.exec(as(ADMINTS));
e = await loi(DX(HD, 25000000, "co_dinh", 1500000, "hang_thang", null, "  "));
ok(e && e.includes("lý do"), "thiếu lý do đề xuất bị từ chối");
e = await loi(DX(HD, 25000000, "khong", 0, "hang_thang", null, "Không đổi gì cả"));
ok(e && e.includes("không khác gì"), "đề xuất không khác hiện tại bị từ chối");
e = await loi(DX(HD, 25000000, "phan_tram", 101, "hang_thang", null, "Giảm quá tay"));
ok(e && e.includes("100"), "phần trăm > 100 bị từ chối");
e = await loi(DX(HDH, 1, "khong", 0, "mot_lan", null, "Hợp đồng đã huỷ"));
ok(e && e.includes("đã huỷ"), "hợp đồng đã huỷ không đề xuất được");
let n = (await q(`select count(*)::int n from public.yeu_cau_sua_hop_dong`))[0].n;
ok(n === 0, "các đề xuất bị từ chối KHÔNG tạo yêu cầu");

// --- Đề xuất hợp lệ
let yc = (await q(`${DX(HD, 25000000, "co_dinh", 1500000, "hang_thang", "Thỏa thuận riêng", "Phụ huynh được giảm 1,5tr theo thỏa thuận")} id`))[0].id;
let r1 = (await q(`select * from public.yeu_cau_sua_hop_dong where id='${yc}'`))[0];
ok(r1.trang_thai === "cho_duyet" && r1.nguoi_de_xuat === ADMINTS, "yêu cầu ở trạng thái chờ duyệt, ghi đúng người đề xuất");
ok(String(r1.truoc.gia_niem_yet) === "25000000" && String(r1.truoc.doanh_thu_thuan) === "25000000", "lưu ảnh chụp hợp đồng lúc đề xuất");
let hd = (await q(`select * from public.hop_dong_hoc_phi where id='${HD}'`))[0];
ok(String(hd.doanh_thu_thuan) === "25000000", "hợp đồng CHƯA đổi khi mới đề xuất");
let lg = await q(`select * from public.nhat_ky where doi_tuong='yeu_cau_sua_hop_dong' and doi_tuong_id='${yc}'`);
ok(lg.length === 1 && lg[0].hanh_dong === "de_xuat_sua_hop_dong" && lg[0].ly_do.includes("thỏa thuận") && lg[0].nguoi_dung_id === ADMINTS, "đề xuất được ghi nhật ký (người + lý do)");
ok(lg[0].sau.hop_dong_id === HD, "nhật ký đề xuất gắn hop_dong_id để tra theo hợp đồng");

// --- Chỉ 1 yêu cầu chờ
await db.exec(as(ADMINTS2));
e = await loi(DX(HD, 24000000, "khong", 0, "hang_thang", null, "Người khác cũng đề xuất"));
ok(e && e.includes("đang có một yêu cầu chờ duyệt"), "hợp đồng đang có yêu cầu chờ → không gửi thêm được");

// --- Rút yêu cầu
e = await loi(`select public.rut_yeu_cau_sua_hop_dong('${yc}')`);
ok(e && e.includes("Chỉ người đã đề xuất"), "người khác KHÔNG rút được yêu cầu của người đề xuất");

// --- Quyền xử lý
await db.exec(as(ADMINTS));
e = await loi(XL(yc, "duyet", "Tự duyệt đề xuất của mình"));
ok(e && e.includes("Chỉ Master Admin"), "admin_ts KHÔNG tự duyệt");
await db.exec(as(KETOAN));
e = await loi(XL(yc, "duyet", "Kế toán duyệt thử nhé"));
ok(e && e.includes("Chỉ Master Admin"), "ke_toan KHÔNG duyệt");
await db.exec(as(MASTER));
e = await loi(XL(yc, "duyet", "  "));
ok(e && e.includes("phê duyệt"), "duyệt thiếu lý do bị từ chối");
e = await loi(XL(yc, "tu_choi", "ok"));
ok(e && e.includes("từ chối"), "từ chối thiếu lý do bị từ chối");
e = await loi(XL(yc, "xem_xet", "Quyết định lạ lùng"));
ok(e && e.includes("Quyết định không hợp lệ"), "quyết định không hợp lệ bị từ chối");

// --- Duyệt
await db.exec(XL(yc, "duyet", "Đã đối chiếu thỏa thuận với phụ huynh"));
hd = (await q(`select * from public.hop_dong_hoc_phi where id='${HD}'`))[0];
ok(String(hd.so_tien_giam) === "1500000" && String(hd.doanh_thu_thuan) === "23500000" && hd.ghi_chu === "Thỏa thuận riêng", "duyệt → hợp đồng được cập nhật đúng");
r1 = (await q(`select * from public.yeu_cau_sua_hop_dong where id='${yc}'`))[0];
ok(r1.trang_thai === "da_duyet" && r1.nguoi_xu_ly === MASTER && r1.ly_do_xu_ly.includes("đối chiếu") && r1.xu_ly_luc, "yêu cầu chuyển da_duyet, ghi người + lý do + thời điểm xử lý");
lg = await q(`select * from public.nhat_ky where doi_tuong='hop_dong_hoc_phi' and doi_tuong_id='${HD}' and hanh_dong='sua_hop_dong_theo_yeu_cau'`);
ok(lg.length === 1 && lg[0].ly_do.includes("Phụ huynh được giảm") && lg[0].ly_do.includes("đối chiếu thỏa thuận") && lg[0].ly_do.includes(yc), "nhật ký hợp đồng ghi cả lý do đề xuất, lý do duyệt và mã yêu cầu");
lg = await q(`select * from public.nhat_ky where doi_tuong='yeu_cau_sua_hop_dong' and doi_tuong_id='${yc}' and hanh_dong='duyet_yeu_cau_sua_hop_dong'`);
ok(lg.length === 1 && lg[0].nguoi_dung_id === MASTER && lg[0].ly_do.includes("đối chiếu"), "nhật ký yêu cầu ghi bước duyệt");
e = await loi(XL(yc, "duyet", "Duyệt lần thứ hai nữa"));
ok(e && e.includes("đã được xử lý"), "không xử lý lại yêu cầu đã xử lý");
await db.exec(as(ADMINTS));
e = await loi(`select public.rut_yeu_cau_sua_hop_dong('${yc}')`);
ok(e && e.includes("đã được xử lý"), "không rút yêu cầu đã duyệt");

// --- Từ chối
let yc2 = (await q(`${DX(HD, 20000000, "khong", 0, "mot_lan", null, "Xin đổi sang đóng một lần 20tr")} id`))[0].id;
await db.exec(as(MASTER));
await db.exec(XL(yc2, "tu_choi", "Chưa có xác nhận của phụ huynh"));
hd = (await q(`select * from public.hop_dong_hoc_phi where id='${HD}'`))[0];
ok(String(hd.doanh_thu_thuan) === "23500000" && hd.hinh_thuc_dong === "hang_thang", "từ chối → hợp đồng KHÔNG đổi");
lg = await q(`select * from public.nhat_ky where doi_tuong='yeu_cau_sua_hop_dong' and doi_tuong_id='${yc2}' order by created_at, id`);
ok(lg.length === 2 && lg[1].hanh_dong === "tu_choi_yeu_cau_sua_hop_dong" && lg[1].ly_do.includes("xác nhận của phụ huynh"), "từ chối được ghi nhật ký kèm lý do");
r1 = (await q(`select * from public.yeu_cau_sua_hop_dong where id='${yc2}'`))[0];
ok(r1.trang_thai === "tu_choi", "yêu cầu chuyển tu_choi");

// --- Rút, rồi gửi lại
await db.exec(as(ADMINTS));
let yc3 = (await q(`${DX(HD, 22000000, "khong", 0, "hang_thang", null, "Đề xuất lần ba")} id`))[0].id;
await db.exec(`select public.rut_yeu_cau_sua_hop_dong('${yc3}')`);
r1 = (await q(`select * from public.yeu_cau_sua_hop_dong where id='${yc3}'`))[0];
ok(r1.trang_thai === "da_rut" && r1.nguoi_xu_ly === ADMINTS, "người đề xuất rút được yêu cầu đang chờ");
lg = await q(`select hanh_dong from public.nhat_ky where doi_tuong_id='${yc3}' order by created_at, id`);
ok(lg.map((x) => x.hanh_dong).join() === "de_xuat_sua_hop_dong,rut_yeu_cau_sua_hop_dong", "đề xuất + rút đều có nhật ký");
let yc4 = (await q(`${DX(HD, 22000000, "khong", 0, "hang_thang", null, "Gửi lại sau khi rút")} id`))[0].id;
ok(!!yc4, "sau khi rút gửi lại được yêu cầu mới");

// --- Xung đột: hợp đồng bị đổi sau khi đề xuất
await db.exec(as(MASTER));
await db.exec(`select public.sua_hop_dong_master('${HD}', 25000000, 'co_dinh', 2000000, 'hang_thang', 'Thỏa thuận riêng', 'Master tự điều chỉnh giảm 2tr')`);
e = await loi(XL(yc4, "duyet", "Duyệt đề xuất đã cũ"));
ok(e && e.includes("đã thay đổi kể từ lúc đề xuất"), "hợp đồng đã đổi sau đề xuất → không duyệt đè được");
r1 = (await q(`select trang_thai from public.yeu_cau_sua_hop_dong where id='${yc4}'`))[0];
ok(r1.trang_thai === "cho_duyet", "duyệt thất bại → yêu cầu vẫn chờ (giao dịch hoàn tác)");
await db.exec(XL(yc4, "tu_choi", "Hợp đồng đã được điều chỉnh trước đó"));

// --- Chốt chặn sửa trực tiếp cột tài chính
await db.exec(as(ADMINTS));
e = await loi(`update public.hop_dong_hoc_phi set gia_niem_yet = 1000, doanh_thu_thuan = 1000 where id='${HD}'`);
ok(e && e.includes("phải được đề xuất"), "admin_ts KHÔNG sửa trực tiếp giá hợp đồng đang hoạt động");
await db.exec(as(KETOAN));
e = await loi(`update public.hop_dong_hoc_phi set hinh_thuc_dong = 'mot_lan' where id='${HD}'`);
ok(e && e.includes("phải được đề xuất"), "ke_toan KHÔNG sửa trực tiếp hình thức đóng");
await db.exec(as(MASTER));
e = await loi(`update public.hop_dong_hoc_phi set gia_niem_yet = 1000, doanh_thu_thuan = 1000 where id='${HD}'`);
ok(e && e.includes("phải được đề xuất"), "master cũng phải đi qua công cụ sửa có lý do (không UPDATE thẳng)");
await db.exec(as(ADMINTS));
ok((await loi(`update public.hop_dong_hoc_phi set ghi_chu = 'ghi chú mới' where id='${HD}'`)) === null, "cột không tài chính (ghi_chu) vẫn sửa được");
ok((await loi(`update public.hop_dong_hoc_phi set gia_niem_yet = 12000000, doanh_thu_thuan = 12000000 where id='${HDN}'`)) === null, "hợp đồng NHÁP vẫn sửa giá tự do");
await db.exec(as(""));
ok((await loi(`update public.hop_dong_hoc_phi set gia_niem_yet = 25000000, so_tien_giam = 1000000, doanh_thu_thuan = 24000000 where id='${HD}'`)) === null, "SQL Editor/service role (không JWT) không bị chặn…");
lg = await q(`select hanh_dong, nguoi_dung_id from public.nhat_ky where doi_tuong_id='${HD}' order by created_at desc, id desc limit 1`);
ok(lg[0].hanh_dong === "cap_nhat_hop_dong" && lg[0].nguoi_dung_id === null, "…nhưng vẫn được nhật ký ghi lại (không rõ người)");

// --- Bất biến yêu cầu
e = await loi(`delete from public.yeu_cau_sua_hop_dong`);
ok(e && e.includes("không được xoá"), "không xoá được yêu cầu");
e = await loi(`update public.yeu_cau_sua_hop_dong set ly_do_xu_ly = 'sửa lén lý do' where id='${yc2}'`);
ok(e && e.includes("đã được xử lý"), "yêu cầu đã xử lý là bất biến");
await db.exec(as(ADMINTS));
// HD đang là 24tr (SQL Editor vừa sửa) → đề xuất mới hợp lệ để thử sửa lõi
const yc5 = (await q(`${DX(HD, 23000000, "khong", 0, "hang_thang", null, "Đề xuất để thử sửa lõi")} id`))[0].id;
e = await loi(`update public.yeu_cau_sua_hop_dong set gia_niem_yet = 1 where id='${yc5}'`);
ok(e && e.includes("không được sửa sau khi gửi"), "nội dung đề xuất không sửa được sau khi gửi");

// --- Quyền thực thi / ghi
const pr = await q(`select
  has_table_privilege('authenticated','public.yeu_cau_sua_hop_dong','insert') i,
  has_table_privilege('authenticated','public.yeu_cau_sua_hop_dong','update') u,
  has_table_privilege('authenticated','public.yeu_cau_sua_hop_dong','delete') d,
  has_function_privilege('anon','public.de_xuat_sua_hop_dong(uuid,bigint,text,bigint,text,text,text)','execute') a1,
  has_function_privilege('anon','public.xu_ly_yeu_cau_sua_hop_dong(uuid,text,text)','execute') a2,
  has_function_privilege('anon','public.rut_yeu_cau_sua_hop_dong(uuid)','execute') a3,
  has_function_privilege('authenticated','public.xu_ly_yeu_cau_sua_hop_dong(uuid,text,text)','execute') u2`);
ok(!pr[0].i && !pr[0].u && !pr[0].d, "client không có quyền INSERT/UPDATE/DELETE trực tiếp lên bảng yêu cầu");
ok(!pr[0].a1 && !pr[0].a2 && !pr[0].a3 && pr[0].u2, "anon không execute được 3 hàm; authenticated có");

process.exit(fail ? 1 : 0);
