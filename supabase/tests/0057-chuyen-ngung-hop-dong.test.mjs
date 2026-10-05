import { PGlite } from "@electric-sql/pglite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Kiểm thử migration 0057 (chuyển "ngưng hợp đồng" cũ sang so_tien_mien_cong_no) trên PGlite — KHÔNG đụng DB thật.
// Chạy: npm run test:chuyen-ngung-hop-dong
const dir = path.dirname(fileURLToPath(import.meta.url));
const mig = fs.readFileSync(path.join(dir, "../migrations/0057_chuyen_ngung_hop_dong_sang_mien_cong_no.sql"), "utf8");

const db = new PGlite();
await db.exec(`
create table public.hop_dong_hoc_phi(
  id text primary key, gia_niem_yet bigint not null, loai_giam_gia text not null default 'khong', gia_tri_giam_gia bigint not null default 0,
  so_tien_giam bigint not null default 0, so_tien_mien_cong_no bigint not null default 0, doanh_thu_thuan bigint not null,
  trang_thai text not null, ghi_chu text, deleted_at timestamptz,
  constraint chk_hop_dong_doanh_thu check (doanh_thu_thuan = gia_niem_yet - so_tien_giam - so_tien_mien_cong_no));
insert into public.hop_dong_hoc_phi(id, gia_niem_yet, so_tien_giam, doanh_thu_thuan, trang_thai, ghi_chu) values
 ('chau', 7500000, 1500000, 6000000, 'hoan_thanh', 'Học sinh nghỉ học: ngưng hợp đồng, chỉ ghi nhận số đã thu (6.000.000đ)'),
 ('ngoc', 5000000, 0, 5000000, 'hoan_thanh', 'Học sinh nghỉ học: ngưng hợp đồng, chỉ ghi nhận số đã thu'),
 ('giang', 25000000, 1000000, 24000000, 'dang_hoat_dong', 'Sheet ghi học phí 24,000,000đ nhưng đóng theo tháng thu đủ 25M → công nợ'),
 ('giamthat', 10000000, 1000000, 9000000, 'hoan_thanh', 'Học sinh nghỉ học: ngưng hợp đồng, nhưng đây là giảm giá thật');
update public.hop_dong_hoc_phi set loai_giam_gia='co_dinh', gia_tri_giam_gia=1000000 where id='giamthat';
`);
await db.exec(mig);
await db.exec(mig); // idempotent

let fail = 0;
const ok = (c, m) => { if (!c) { fail++; console.error("FAIL:", m); } else console.log("ok:", m); };
const row = async (id) => (await db.query(`select * from public.hop_dong_hoc_phi where id='${id}'`)).rows[0];

let r = await row("chau");
ok(String(r.so_tien_giam) === "0" && String(r.so_tien_mien_cong_no) === "1500000", "Khánh Châu: 1,5tr chuyển từ giảm giá sang miễn công nợ (chạy 2 lần vẫn đúng, không cộng dồn)");
ok(String(r.doanh_thu_thuan) === "6000000", "doanh thu thuần KHÔNG đổi");
for (const id of ["ngoc", "giang", "giamthat"]) {
  r = await row(id);
  ok(String(r.so_tien_mien_cong_no) === "0", `${id}: không bị đụng`);
}
r = await row("giamthat");
ok(String(r.so_tien_giam) === "1000000", "giảm giá thật (co_dinh) giữ nguyên dù ghi chú giống");
process.exit(fail ? 1 : 0);
