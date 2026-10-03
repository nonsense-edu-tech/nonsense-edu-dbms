import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Kiểm thử migration 0050 (ngữ liệu nhóm câu hỏi) trên Postgres WASM (PGlite) — KHÔNG đụng DB thật.
// Chạy: npm run test:ngu-lieu

const db = new PGlite();
const mig = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../migrations/0050_ngu_lieu_nhom_cau_hoi.sql"), "utf8");

await db.exec(`
create schema auth;
create table auth.users(id uuid primary key);
create role authenticated; create role anon;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true),'')::uuid $$;
create function public.uuidv7() returns uuid language sql as $$ select gen_random_uuid() $$;
create table public.users(id uuid primary key, vai_tro text);
create function public.auth_role() returns text language sql stable security definer as $$ select vai_tro from public.users where id = auth.uid() $$;
create table public.user_pham_vi(id uuid default gen_random_uuid(), user_id uuid, cap_hoc_ma smallint, mon_hoc_ma smallint);
create function public.co_quyen_mon(m smallint, c smallint) returns boolean language sql stable security definer as $$
 select exists(select 1 from public.user_pham_vi u where u.user_id=auth.uid() and u.cap_hoc_ma=c and (u.mon_hoc_ma is null or u.mon_hoc_ma=m)) $$;
-- danh mục (cột theo CSDL thật)
create table public.mon_hoc(id uuid primary key default gen_random_uuid(), ma smallint, cap_hoc_ma smallint, ten text, deleted_at timestamptz);
create table public.hoc_phan(id uuid primary key default gen_random_uuid(), ma smallint, mon_hoc_id uuid references public.mon_hoc(id), deleted_at timestamptz);
create table public.bai_hoc(id uuid primary key default gen_random_uuid(), ma smallint, hoc_phan_id uuid references public.hoc_phan(id), deleted_at timestamptz);
create table public.chu_de(id uuid primary key default gen_random_uuid(), ma smallint, mon_hoc_id uuid references public.mon_hoc(id), deleted_at timestamptz);
-- ngu_lieu / cau_hoi như CSDL thật TRƯỚC 0050
create table public.ngu_lieu(id uuid primary key default gen_random_uuid(), loai text not null, tieu_de text, noi_dung text not null, du_lieu jsonb,
  cap_hoc_ma smallint, mon_hoc_ma smallint, hoc_phan_id uuid references public.hoc_phan(id), bai_hoc_id uuid references public.bai_hoc(id),
  nguoi_tao uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  mon_hoc_id uuid not null references public.mon_hoc(id));
create table public.cau_hoi(
 id uuid primary key default gen_random_uuid(),
 ma_cau_hoi char(17) not null unique,
 cap_hoc smallint generated always as (substring(ma_cau_hoi from 1 for 1)::smallint) stored,
 chuong_trinh smallint generated always as (substring(ma_cau_hoi from 2 for 3)::smallint) stored,
 mon_hoc smallint generated always as (substring(ma_cau_hoi from 5 for 2)::smallint) stored,
 hoc_phan smallint generated always as (substring(ma_cau_hoi from 7 for 2)::smallint) stored,
 bai_hoc smallint generated always as (substring(ma_cau_hoi from 9 for 2)::smallint) stored,
 chu_de smallint generated always as (substring(ma_cau_hoi from 11 for 2)::smallint) stored,
 dang_cau smallint generated always as (substring(ma_cau_hoi from 13 for 1)::smallint) stored,
 ngu_lieu_id uuid references public.ngu_lieu(id) on delete set null,
 noi_dung text not null, deleted_at timestamptz);
create table public.de(id uuid primary key default gen_random_uuid(), ten text);
create table public.de_cau_hoi(id uuid primary key default gen_random_uuid(), de_id uuid references public.de(id), cau_hoi_id uuid references public.cau_hoi(id));
`);

await db.exec(mig);
console.log("migration OK");

let loi = 0;
const ok = (c, m) => { if (c) console.log("  ✓", m); else { console.log("  ✗", m); loi++; } };
async function loiKhi(sql) { try { await db.exec(sql); return null; } catch (e) { return String(e.message); } }

const AD = "00000000-0000-0000-0000-000000000004";
const GV = "00000000-0000-0000-0000-000000000001";
await db.exec(`
insert into auth.users values ('${AD}'),('${GV}');
insert into public.users values ('${AD}','master_admin'),('${GV}','gv');
insert into public.user_pham_vi(user_id,cap_hoc_ma,mon_hoc_ma) values ('${GV}',1,5);
insert into public.mon_hoc(id,ma,cap_hoc_ma,ten) values ('11111111-1111-1111-1111-111111111111',5,1,'Môn 5'),('22222222-2222-2222-2222-222222222222',6,1,'Môn 6');
insert into public.hoc_phan(id,ma,mon_hoc_id) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',3,'11111111-1111-1111-1111-111111111111'),('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',3,'22222222-2222-2222-2222-222222222222');
insert into public.bai_hoc(id,ma,hoc_phan_id) values ('cccccccc-cccc-cccc-cccc-cccccccccccc',4,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
insert into public.chu_de(id,ma,mon_hoc_id) values ('dddddddd-dddd-dddd-dddd-dddddddddddd',2,'11111111-1111-1111-1111-111111111111'),('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',2,'22222222-2222-2222-2222-222222222222');
`);

// mã 17 số: cap(1)+ctr(3)+mon(2)+hp(2)+bai(2)+cd(2)+dang(1)+stt(4)
const maCau = (mon, hp, bai, cd, dang, stt) => `1000${String(mon).padStart(2, "0")}${String(hp).padStart(2, "0")}${String(bai).padStart(2, "0")}${String(cd).padStart(2, "0")}${dang}${String(stt).padStart(4, "0")}`;

console.log("1) số hiệu NL tự tăng");
await db.exec(`
insert into public.ngu_lieu(id,loai,noi_dung,mon_hoc_id,cap_hoc_ma,mon_hoc_ma,hoc_phan_id,bai_hoc_id,chu_de_id) values
 ('10000000-0000-0000-0000-000000000001','doc_core','Bài đọc 1','11111111-1111-1111-1111-111111111111',1,5,'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-cccc-cccc-cccccccccccc','dddddddd-dddd-dddd-dddd-dddddddddddd'),
 ('10000000-0000-0000-0000-000000000002','logic','Logic','11111111-1111-1111-1111-111111111111',1,5,null,null,null);`);
const sh = (await db.query("select so_hieu from public.ngu_lieu order by so_hieu")).rows.map((r) => r.so_hieu);
ok(sh.join() === "NL-0001,NL-0002", `số hiệu = ${sh.join()}`);

console.log("2) học phần/chủ đề phải đúng môn (trigger ngu_lieu)");
let e = await loiKhi(`insert into public.ngu_lieu(loai,noi_dung,mon_hoc_id,hoc_phan_id) values ('khac','x','11111111-1111-1111-1111-111111111111','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')`);
ok(e && /Học phần không thuộc môn/.test(e), "học phần môn khác bị chặn");
e = await loiKhi(`insert into public.ngu_lieu(loai,noi_dung,mon_hoc_id,bai_hoc_id) values ('khac','x','11111111-1111-1111-1111-111111111111','cccccccc-cccc-cccc-cccc-cccccccccccc')`);
ok(e && /phải chọn học phần/.test(e), "bài học thiếu học phần bị chặn");
e = await loiKhi(`insert into public.ngu_lieu(loai,noi_dung,mon_hoc_id,chu_de_id) values ('khac','x','11111111-1111-1111-1111-111111111111','eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee')`);
ok(e && /Chủ đề không thuộc môn/.test(e), "chủ đề môn khác bị chặn");

console.log("3) vi_tri_ngu_lieu");
const vt = (await db.query("select * from public.vi_tri_ngu_lieu('10000000-0000-0000-0000-000000000001')")).rows[0];
ok(vt.cap_hoc === 1 && vt.mon_hoc === 5 && vt.hoc_phan === 3 && vt.bai_hoc === 4 && vt.chu_de === 2, `vị trí NL1 = ${JSON.stringify(vt)}`);
const vt2 = (await db.query("select * from public.vi_tri_ngu_lieu('10000000-0000-0000-0000-000000000002')")).rows[0];
ok(vt2.hoc_phan === 0 && vt2.bai_hoc === 0 && vt2.chu_de === 0, "NL2 'Chung' → 0/0/0");

console.log("4) câu con: khớp vị trí + thứ tự");
const NL1 = "10000000-0000-0000-0000-000000000001";
e = await loiKhi(`insert into public.cau_hoi(ma_cau_hoi,noi_dung,ngu_lieu_id) values ('${maCau(5, 3, 4, 2, 1, 1)}','c1','${NL1}')`);
ok(e && /thu_tu_ngu_lieu_check/.test(e), "có ngữ liệu mà thiếu thứ tự → bị chặn bởi CHECK");
e = await loiKhi(`insert into public.cau_hoi(ma_cau_hoi,noi_dung,ngu_lieu_id,thu_tu_trong_ngu_lieu) values ('${maCau(5, 3, 4, 2, 1, 1)}','c1','${NL1}',1)`);
ok(e === null, "câu con đúng vị trí → lưu được");
e = await loiKhi(`insert into public.cau_hoi(ma_cau_hoi,noi_dung,ngu_lieu_id,thu_tu_trong_ngu_lieu) values ('${maCau(5, 0, 0, 0, 1, 2)}','sai vị trí','${NL1}',2)`);
ok(e && /cùng môn\/học phần/.test(e), "câu con lệch vị trí → bị chặn");
e = await loiKhi(`insert into public.cau_hoi(ma_cau_hoi,noi_dung,ngu_lieu_id,thu_tu_trong_ngu_lieu) values ('${maCau(5, 3, 4, 2, 1, 3)}','trùng thứ tự','${NL1}',1)`);
ok(e && /uq_cau_hoi_thu_tu_ngu_lieu/.test(e), "trùng thứ tự trong ngữ liệu → bị chặn");
await db.exec(`insert into public.cau_hoi(ma_cau_hoi,noi_dung,ngu_lieu_id,thu_tu_trong_ngu_lieu) values ('${maCau(5, 3, 4, 2, 2, 4)}','c2','${NL1}',2),('${maCau(5, 3, 4, 2, 1, 5)}','c3','${NL1}',3)`);
e = await loiKhi(`insert into public.cau_hoi(ma_cau_hoi,noi_dung) values ('${maCau(5, 3, 4, 2, 1, 6)}','đứng một mình')`);
ok(e === null, "câu đứng một mình (không ngữ liệu) vẫn lưu bình thường");
const tk = (await db.query(`select public.thu_tu_ke_tiep_ngu_lieu('${NL1}') as t`)).rows[0].t;
ok(Number(tk) === 4, `thứ tự kế tiếp = ${tk}`);

console.log("5) câu con không tách / đổi ngữ liệu; không gắn thêm cho câu cũ");
e = await loiKhi(`update public.cau_hoi set ngu_lieu_id = null, thu_tu_trong_ngu_lieu = null where noi_dung='c1'`);
ok(e && /không được tách/.test(e), "tách câu con khỏi ngữ liệu bị chặn");
e = await loiKhi(`update public.cau_hoi set ngu_lieu_id='10000000-0000-0000-0000-000000000002', thu_tu_trong_ngu_lieu=9 where noi_dung='c1'`);
ok(e && /không được tách|chuyển sang/.test(e), "chuyển sang ngữ liệu khác bị chặn");
e = await loiKhi(`update public.cau_hoi set ngu_lieu_id='${NL1}', thu_tu_trong_ngu_lieu=9 where noi_dung='đứng một mình'`);
ok(e && /Không gắn thêm ngữ liệu/.test(e), "gắn ngữ liệu cho câu đã tạo bị chặn");
e = await loiKhi(`delete from public.ngu_lieu where id='${NL1}'`);
ok(e && /foreign key|violates/.test(e), "xóa cứng ngữ liệu còn câu con bị chặn (RESTRICT)");

console.log("6) khóa vị trí ngữ liệu khi đã có câu con");
e = await loiKhi(`update public.ngu_lieu set chu_de_id = null where id='${NL1}'`);
ok(e && /không đổi vị trí/.test(e), "đổi vị trí NL có câu con bị chặn");
e = await loiKhi(`update public.ngu_lieu set tieu_de='Tiêu đề mới', noi_dung='Nội dung mới' where id='${NL1}'`);
ok(e === null, "sửa tiêu đề/nội dung vẫn được");
e = await loiKhi(`update public.ngu_lieu set chu_de_id='dddddddd-dddd-dddd-dddd-dddddddddddd' where id='10000000-0000-0000-0000-000000000002'`);
ok(e === null, "NL chưa có câu con đổi vị trí được");

console.log("7) đổi thứ tự lên/xuống");
const thuTu = async () => (await db.query(`select noi_dung from public.cau_hoi where ngu_lieu_id='${NL1}' order by thu_tu_trong_ngu_lieu`)).rows.map((r) => r.noi_dung).join();
const idC = async (nd) => (await db.query(`select id from public.cau_hoi where noi_dung='${nd}'`)).rows[0].id;
ok((await thuTu()) === "c1,c2,c3", "ban đầu c1,c2,c3");
await db.query(`select public.doi_thu_tu_cau_con('${await idC("c3")}','len')`);
ok((await thuTu()) === "c1,c3,c2", "c3 lên → c1,c3,c2");
await db.query(`select public.doi_thu_tu_cau_con('${await idC("c1")}','len')`);
ok((await thuTu()) === "c1,c3,c2", "câu đầu bấm lên → không đổi");
await db.query(`select public.doi_thu_tu_cau_con('${await idC("c1")}','xuong')`);
ok((await thuTu()) === "c3,c1,c2", "c1 xuống → c3,c1,c2");
e = await loiKhi(`select public.doi_thu_tu_cau_con('${await idC("đứng một mình")}','len')`);
ok(e && /không thuộc ngữ liệu/.test(e), "câu đứng một mình không đổi thứ tự được");

console.log("8) xóa mềm ngữ liệu kèm câu con");
await db.exec(`reset role; select set_config('app.uid','${AD}',false);`);
await db.exec(`insert into public.de(id,ten) values ('99999999-9999-9999-9999-999999999999','Đề 1'); insert into public.de_cau_hoi(de_id,cau_hoi_id) select '99999999-9999-9999-9999-999999999999', id from public.cau_hoi where noi_dung='c2'`);
e = await loiKhi(`select public.xoa_mem_ngu_lieu('${NL1}')`);
ok(e && /đã nằm trong đề/.test(e), "có câu con nằm trong đề → không xóa");
await db.exec(`delete from public.de_cau_hoi`);
await db.exec(`select set_config('app.uid','${GV}',false)`);
await db.exec(`insert into public.ngu_lieu(id,loai,noi_dung,mon_hoc_id,cap_hoc_ma,mon_hoc_ma) values ('10000000-0000-0000-0000-000000000003','khac','Môn 6','22222222-2222-2222-2222-222222222222',1,6)`);
e = await loiKhi(`select public.xoa_mem_ngu_lieu('10000000-0000-0000-0000-000000000003')`);
ok(e && /quyền với môn/.test(e), "GV ngoài phạm vi môn bị chặn");
e = await loiKhi(`select public.xoa_mem_ngu_lieu('10000000-0000-0000-0000-000000000002')`);
ok(e === null, "GV đúng phạm vi môn xóa được ngữ liệu (không câu con)");
await db.exec(`select set_config('app.uid','${AD}',false)`);
await db.query(`select public.xoa_mem_ngu_lieu('${NL1}')`);
const con = (await db.query(`select count(*)::int c from public.cau_hoi where ngu_lieu_id='${NL1}' and deleted_at is null`)).rows[0].c;
const nl = (await db.query(`select deleted_at is not null d from public.ngu_lieu where id='${NL1}'`)).rows[0].d;
ok(con === 0 && nl === true, "xóa mềm ngữ liệu + toàn bộ câu con");
const doc = (await db.query(`select count(*)::int c from public.cau_hoi where noi_dung='đứng một mình' and deleted_at is null`)).rows[0].c;
ok(doc === 1, "câu đứng một mình không bị ảnh hưởng");
await db.exec(`select set_config('app.uid','',false)`);
e = await loiKhi(`select public.xoa_mem_ngu_lieu('10000000-0000-0000-0000-000000000003')`);
ok(e && /không có quyền/.test(e), "người không đăng nhập/không có vai trò bị chặn");

console.log(loi === 0 ? "\nTẤT CẢ ĐẠT" : `\n${loi} KIỂM TRA LỖI`);
process.exit(loi === 0 ? 0 : 1);
