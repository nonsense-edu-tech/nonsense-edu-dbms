import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Kiểm thử migration 0052 (phân công giảng dạy + RLS theo lớp + duyệt học phần + RPC tạo user)
// trên PGlite với schema giả lập — KHÔNG đụng DB thật. Chạy: npm run test:phan-cong
const dir = path.dirname(fileURLToPath(import.meta.url));
const mig = fs.readFileSync(path.join(dir, "../migrations/0052_phan_cong_giang_day_rls_gv_duyet_hoc_phan.sql"), "utf8");

const db = new PGlite();
await db.exec(`
create schema auth;
create table auth.users(id uuid primary key);
create role authenticated; create role anon;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
create function public.uuidv7() returns uuid language sql as $$ select gen_random_uuid() $$;
create table public.users(id uuid primary key, vai_tro text, ho_ten text, deleted_at timestamptz);
create function public.auth_role() returns text language sql stable security definer as $$ select vai_tro from public.users where id = auth.uid() $$;
create table public.cap_hoc(id uuid primary key default gen_random_uuid(), ma smallint unique, deleted_at timestamptz);
create table public.mon_hoc(id uuid primary key default gen_random_uuid(), cap_hoc_ma smallint, ma smallint, deleted_at timestamptz);
create table public.chi_nhanh(id uuid primary key default gen_random_uuid(), deleted_at timestamptz);
create table public.user_chi_nhanh(user_id uuid, chi_nhanh_id uuid, unique(user_id, chi_nhanh_id));
create table public.user_pham_vi(id uuid primary key default gen_random_uuid(), user_id uuid, cap_hoc_ma smallint, mon_hoc_ma smallint, cap_hoc_id uuid, mon_hoc_id uuid);
create function public.co_quyen_mon(m smallint, c smallint) returns boolean language sql stable security definer as $$
 select exists(select 1 from public.user_pham_vi u where u.user_id=auth.uid() and u.cap_hoc_ma=c and (u.mon_hoc_ma is null or u.mon_hoc_ma=m)) $$;
create function public.can_manage_mon_hoc(c smallint, m smallint) returns boolean language sql stable as $$ select public.co_quyen_mon(m, c) $$;
create function public.can_manage_cap_hoc(c smallint) returns boolean language sql stable security definer as $$
 select exists(select 1 from public.user_pham_vi u where u.user_id=auth.uid() and u.cap_hoc_ma=c) $$;
create table public.nhat_ky(id uuid primary key default gen_random_uuid(), nguoi_dung_id uuid, hanh_dong text, doi_tuong text, doi_tuong_id uuid, truoc jsonb, sau jsonb);
create table public.lop(id uuid primary key default gen_random_uuid(), ma_lop text, ten_lop text, cap_hoc_ma smallint, chi_nhanh_id uuid, deleted_at timestamptz);
create table public.hoc_sinh(id uuid primary key default gen_random_uuid(), ma_hoc_sinh text, ho_ten text, sdt text, deleted_at timestamptz);
create table public.ghi_danh(id uuid primary key default gen_random_uuid(), hoc_sinh_id uuid, lop_id uuid, trang_thai text default 'dang_hoc', deleted_at timestamptz);
create table public.phong_hoc(id uuid primary key default gen_random_uuid(), ten text, deleted_at timestamptz);
create table public.buoi_hoc(id uuid primary key default gen_random_uuid(), lop_id uuid, mon_hoc_ma smallint, gv_id uuid, deleted_at timestamptz);
create table public.danh_gia_hoc_sinh(id uuid primary key default gen_random_uuid(), hoc_sinh_id uuid, deleted_at timestamptz);
create table public.hoc_phan(id uuid primary key default gen_random_uuid(), mon_hoc_id uuid, cap_hoc_ma smallint not null, mon_hoc_ma smallint not null,
  ma smallint not null, ten text, mo_ta text, nguoi_tao uuid, deleted_at timestamptz);
create table public.bai_hoc(id uuid primary key default gen_random_uuid(), hoc_phan_id uuid, ma smallint not null, ten text, nguoi_tao uuid, deleted_at timestamptz);
create table public.user_bai_hoc(user_id uuid, bai_hoc_id uuid);
do $$ declare t text; begin
 foreach t in array array['lop','hoc_sinh','ghi_danh','phong_hoc','buoi_hoc','danh_gia_hoc_sinh','hoc_phan','bai_hoc'] loop
  execute format('alter table public.%I enable row level security', t);
 end loop; end $$;
create policy p_read on public.lop for select to authenticated using (true);
create policy p_read on public.ghi_danh for select to authenticated using (true);
create policy p_read on public.hoc_sinh for select to authenticated using (true);
create policy p_read_buoi_hoc on public.buoi_hoc for select to authenticated using (true);
create policy p_write_buoi_hoc_gv on public.buoi_hoc for all to authenticated using (true);
create policy p_read_phong_hoc on public.phong_hoc for select to authenticated using (true);
create policy p_read_danh_gia on public.danh_gia_hoc_sinh for select to authenticated using (true);
create policy p_write_danh_gia on public.danh_gia_hoc_sinh for all to authenticated using (true);
create policy p_read on public.hoc_phan for select to authenticated using (true);
create policy p_write on public.hoc_phan for all to authenticated using (true);
create policy p_read on public.bai_hoc for select to authenticated using (true);
create policy p_write on public.bai_hoc for all to authenticated using (true);
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on schema auth to authenticated;
grant execute on all functions in schema auth to authenticated;
`);
await db.exec(mig);
// Supabase mặc định cấp quyền bảng public cho authenticated; PGlite thì không → cấp lại cho bảng mới của migration.
await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;`);
console.log("migration OK");

const ok = (c, m) => { if (c) console.log("PASS", m); else { console.log("FAIL", m); process.exitCode = 1; } };
const U = {
  ma: "00000000-0000-0000-0000-00000000000a", gv: "00000000-0000-0000-0000-000000000001", gv2: "00000000-0000-0000-0000-000000000002",
  tbm: "00000000-0000-0000-0000-000000000003", moi: "00000000-0000-0000-0000-000000000004", moi2: "00000000-0000-0000-0000-000000000005",
};
const LA = "11111111-1111-1111-1111-111111111111", LB = "22222222-2222-2222-2222-222222222222";
const HA = "33333333-3333-3333-3333-333333333331", HB = "33333333-3333-3333-3333-333333333332";
const CN = "44444444-4444-4444-4444-444444444444";
await db.exec(`
insert into auth.users values ('${U.ma}'),('${U.gv}'),('${U.gv2}'),('${U.tbm}'),('${U.moi}'),('${U.moi2}');
insert into public.users(id,vai_tro,ho_ten) values ('${U.ma}','master_admin','MA'),('${U.gv}','gv','GV'),('${U.gv2}','gv','GV2'),('${U.tbm}','truong_bm','TBM'),('${U.moi}','gv',null),('${U.moi2}','ke_toan',null);
insert into public.cap_hoc(ma) values (1);
insert into public.mon_hoc(cap_hoc_ma,ma) values (1,10),(1,11);
insert into public.chi_nhanh(id) values ('${CN}');
insert into public.user_pham_vi(user_id,cap_hoc_ma,mon_hoc_ma) values ('${U.gv}',1,10),('${U.gv2}',1,11),('${U.tbm}',1,10);
insert into public.lop(id,ma_lop,ten_lop,cap_hoc_ma) values ('${LA}','000000001','Lớp A',1),('${LB}','000000002','Lớp B',1);
insert into public.hoc_sinh(id,ma_hoc_sinh,ho_ten,sdt) values ('${HA}','1','HS A','0900000001'),('${HB}','2','HS B','0900000002');
insert into public.ghi_danh(hoc_sinh_id,lop_id) values ('${HA}','${LA}'),('${HB}','${LB}');
insert into public.phong_hoc(ten) values ('P1');
`);
async function q(sql, uid) {
  await db.exec(`reset role; select set_config('app.uid','${uid ?? ""}',false);` + (uid ? "set role authenticated;" : ""));
  return db.query(sql);
}
async function loi(fn) { try { await fn(); return null; } catch (e) { if (process.env.DEBUG_TEST) console.log("   ->", e.message); return e.message; } }

// --- Phân công
ok(!(await loi(() => q(`insert into public.phan_cong_giang_day(user_id,lop_id,mon_hoc_ma) values ('${U.gv}','${LA}',10)`, U.ma))), "MA phân công gv → lớp A môn 10");
ok(/chưa được phân môn/.test((await loi(() => q(`insert into public.phan_cong_giang_day(user_id,lop_id,mon_hoc_ma) values ('${U.gv}','${LA}',11)`, U.ma))) ?? ""), "phân công môn ngoài phạm vi bị chặn");
ok(/Chỉ phân công lớp/.test((await loi(() => q(`insert into public.phan_cong_giang_day(user_id,lop_id,mon_hoc_ma) values ('${U.moi2}','${LA}',10)`, U.ma))) ?? ""), "không phân công cho vai trò ngoài gv/tg/tbm");
ok(!!(await loi(() => q(`insert into public.phan_cong_giang_day(user_id,lop_id,mon_hoc_ma) values ('${U.gv}','${LB}',10)`, U.gv))), "gv không tự phân công");

// --- RLS đọc theo lớp
ok((await q(`select count(*)::int n from public.lop`, U.gv)).rows[0].n === 1, "gv chỉ thấy 1 lớp được phân");
ok((await q(`select count(*)::int n from public.ghi_danh`, U.gv)).rows[0].n === 1, "gv chỉ thấy ghi danh của lớp mình");
ok((await q(`select count(*)::int n from public.hoc_sinh`, U.gv)).rows[0].n === 0, "gv không đọc trực tiếp bảng hoc_sinh (SĐT…)");
ok((await q(`select count(*)::int n from public.phong_hoc`, U.gv)).rows[0].n === 0, "gv không thấy phòng học (Vận hành)");
const rpc = (await q(`select * from public.hoc_sinh_cua_toi()`, U.gv)).rows;
ok(rpc.length === 1 && rpc[0].ho_ten === "HS A" && !("sdt" in rpc[0]), "RPC hoc_sinh_cua_toi chỉ trả tên+mã+lớp của lớp mình");
ok((await q(`select count(*)::int n from public.hoc_sinh_cua_toi()`, U.gv2)).rows[0].n === 0, "gv chưa được phân lớp thấy 0 học sinh");
ok((await q(`select count(*)::int n from public.lop`, U.ma)).rows[0].n === 2, "master_admin vẫn thấy mọi lớp");
ok((await q(`select count(*)::int n from public.lop`, U.tbm)).rows[0].n === 1, "TBM thấy lớp có phân công thuộc môn trong phạm vi của mình");

// --- Buổi học
ok(!(await loi(() => q(`insert into public.buoi_hoc(lop_id,mon_hoc_ma,gv_id) values ('${LA}',10,'${U.gv}')`, U.gv))), "gv tạo buổi học lớp×môn được phân");
ok(!!(await loi(() => q(`insert into public.buoi_hoc(lop_id,mon_hoc_ma,gv_id) values ('${LB}',10,'${U.gv}')`, U.gv))), "gv không tạo buổi học lớp chưa được phân");

// --- Học phần: GV đề xuất, TBM duyệt
ok(!(await loi(() => q(`insert into public.hoc_phan(mon_hoc_id,cap_hoc_ma,mon_hoc_ma,ma,ten,nguoi_tao,trang_thai) values (null,1,10,null,'HP gv','${U.gv}','cho_duyet')`, U.gv))), "gv tạo học phần chờ duyệt (chưa có mã)");
ok(!!(await loi(() => q(`insert into public.hoc_phan(cap_hoc_ma,mon_hoc_ma,ma,ten,nguoi_tao,trang_thai) values (1,10,5,'HP lậu','${U.gv}','da_duyet')`, U.gv))), "gv không tạo thẳng học phần đã duyệt");
ok(!!(await loi(() => q(`insert into public.hoc_phan(cap_hoc_ma,mon_hoc_ma,ma,ten,nguoi_tao,trang_thai) values (1,11,null,'HP môn khác','${U.gv}','cho_duyet')`, U.gv))), "gv không tạo học phần môn ngoài phạm vi");
const hp = (await q(`select id from public.hoc_phan where ten='HP gv'`, U.ma)).rows[0].id;
ok(!!(await loi(() => q(`update public.hoc_phan set trang_thai='da_duyet' where id='${hp}'`, U.gv))), "gv không tự duyệt");
ok(!(await loi(() => q(`update public.hoc_phan set trang_thai='da_duyet' where id='${hp}'`, U.tbm))), "TBM duyệt học phần");
ok((await q(`select ma from public.hoc_phan where id='${hp}'`, U.ma)).rows[0].ma === 1, "mã học phần cấp khi duyệt (=1)");

// --- Bài học
const bh = (ten, uid, hpid) => q(`insert into public.bai_hoc(hoc_phan_id,ten,nguoi_tao) values ('${hpid}','${ten}','${uid}')`, uid);
ok(!(await loi(() => bh("BH 1", U.gv, hp))), "gv tạo bài học dưới học phần đã duyệt (mã tự cấp)");
ok((await q(`select ma from public.bai_hoc where ten='BH 1'`, U.ma)).rows[0].ma === 1, "mã bài học tự cấp = 1");
await q(`insert into public.hoc_phan(cap_hoc_ma,mon_hoc_ma,ma,ten,nguoi_tao,trang_thai) values (1,10,null,'HP cho','${U.gv}','cho_duyet')`, U.gv);
const hpCho = (await q(`select id from public.hoc_phan where ten='HP cho'`, U.ma)).rows[0].id;
ok(!!(await loi(() => bh("BH 2", U.gv, hpCho))), "gv không tạo bài học dưới học phần chưa duyệt");

// --- RPC tạo user
const goiRpc = (uid, id, vt, cn, pv, pc) =>
  q(`select public.master_admin_tao_nguoi_dung('${id}','Tên mới','${vt}','${JSON.stringify(cn).replace("[", "{").replace("]", "}").replace(/"/g, "")}'::uuid[],'${JSON.stringify(pv)}'::jsonb,'${JSON.stringify(pc)}'::jsonb)`, uid);
ok(!(await loi(() => goiRpc(U.ma, U.moi, "gv", [CN], [{ cap_hoc_ma: 1, mon_hoc_ma: 10 }], [{ lop_id: LA, mon_hoc_ma: 10 }]))), "RPC tạo gv đủ chi nhánh + môn + lớp");
ok((await q(`select count(*)::int n from public.phan_cong_giang_day where user_id='${U.moi}'`, U.ma)).rows[0].n === 1, "RPC đã ghi phân công lớp");
ok(/bắt buộc phân môn học/.test((await loi(() => goiRpc(U.ma, U.moi2, "gv", [CN], [], []))) ?? ""), "RPC: gv thiếu môn học bị chặn");
ok(/Chỉ Master Admin/.test((await loi(() => goiRpc(U.tbm, U.moi2, "ke_toan", [], [], []))) ?? ""), "RPC: người không phải Master Admin bị chặn");
ok(/đã được thiết lập/.test((await loi(() => goiRpc(U.ma, U.moi, "gv", [CN], [{ cap_hoc_ma: 1, mon_hoc_ma: 10 }], []))) ?? ""), "RPC: không chạy lại trên tài khoản đã cấu hình");
