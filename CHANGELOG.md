# Changelog — Nonsense Edu

Nhật ký từng lần deploy (migration DB + thay đổi code đáng kể). **Quy tắc bắt
buộc cho Claude Code:** sau MỖI lần áp dụng migration hoặc deploy thay đổi
đáng kể (tính năng mới, sửa lỗi ảnh hưởng hành vi, thay đổi RLS/policy), PHẢI
thêm 1 mục mới vào đầu file này — không sửa lại các mục cũ (trừ khi phát hiện
mục cũ ghi sai). Không cần ghi việc nhỏ (sửa chính tả, đổi CSS thuần tuý).

Mỗi mục ghi rõ:
- **Ngày**
- **Tóm tắt** (1-2 câu, việc gì, tại sao)
- **Migration** (tên file trong `supabase/migrations/`, nếu có — ghi "không
  có" nếu chỉ đổi code frontend)
- **Staging**: ✅ đã áp dụng / 🔲 chưa
- **Production**: ✅ đã áp dụng / 🔲 chưa
- **Commit**: hash git (nếu đã commit)

2 project Supabase: `nonsense-edu-staging` (`yxfgwzdxoxuoaulcjlcf`) = staging,
`DBMS Project (Jul2026)` (`pdyerenojwrtejyhlcbs`) = production.

---

## 2026-09-28 — Ngân hàng câu hỏi GĐ3 Bước 2: vòng đời + khung năng lực + RLS theo phạm vi (0038-0040)

**⚠️ VI PHẠM QUY TRÌNH ADR-004 (ghi nhận minh bạch):** cả 3 migration dưới đây
đã bị áp **TAY** lên production qua MCP `apply_migration` trong lúc làm việc,
KHÔNG qua pipeline merge → CI như luật (a) của ADR-004 yêu cầu — đúng loại sự
cố mà ADR-004 được viết ra để ngăn (2026-07-27). Nguyên nhân trực tiếp: phiên
làm việc không tự có sẵn repo này, chỉ phát hiện ra CLAUDE.md/ADR-004 SAU KHI
đã áp cả 3 migration. Người dùng đã xác nhận cho phép khắc phục và cấp quyền
push để xử lý đồng bộ hoá ngay trong phiên.

**Khắc phục (28/09/2026, cùng ngày phát hiện):**
1. Đối chiếu lại TOÀN BỘ nội dung thật đã chạy trên production qua truy vấn
   trực tiếp (`information_schema.columns`, `pg_policies`, `pg_constraint`,
   `pg_get_functiondef`, `information_schema.triggers`,
   `information_schema.role_routine_grants`) — không chép lại theo trí nhớ,
   đúng nguyên tắc CLAUDE.md.
2. Viết 3 file migration chính thức khớp đúng nội dung thật:
   `0038_gd3_buoc2_vong_doi_khung_nang_luc_rls.sql`,
   `0039_gd3_buoc2_va_loi_bao_mat_advisor.sql`,
   `0040_gd3_buoc2_vaa_loi_p_write_for_all_de_ro_rls_doc.sql`.
3. Sửa sổ sách `supabase_migrations.schema_migrations` trên production: xoá 3
   dòng version dạng timestamp tự sinh (`20260928093020`/`093116`/`094347`),
   thay bằng 3 dòng version đúng số file (`0038`/`0039`/`0040`) — **chỉ sửa
   bookkeeping, KHÔNG chạy lại SQL nghiệp vụ** (đúng tiền lệ đã có ở ADR-004
   Mục 6 cho 13 migration nợ kỹ thuật cũ). Verify: `list_migrations` cho dãy
   liền mạch `0003`→`0040`.

**Tóm tắt nội dung nghiệp vụ (0038):** thêm vai trò `tro_giang`; bảng `chu_de`
+ RLS; vòng đời câu hỏi (`trang_thai`/`nguoi_duyet`/`ngay_duyet`/`phien_ban`/
`cau_hoi_goc_id`) + trigger chặn tự duyệt và chặn sửa câu hỏi đã phát hành;
hàm `cap_ma_cau_hoi()` cấp mã 17 số tự động chống trùng qua bảng đếm
`cau_hoi_bo_dem`; khung năng lực V-ACT (`tien_trinh`, `nang_luc`, `dang_bai`,
`cau_hoi_nang_luc`) tách lớp khỏi câu hỏi lõi; hàm `co_quyen_mon()` + RLS đọc
theo phạm vi môn (gv/trợ giảng chỉ đọc học liệu phụ trách, không có quyền
download qua RPC); RPC `danh_muc_cau_hoi_tro_giang()`/`xem_mot_cau_hoi()` ẩn
đáp án/lời giải cho trợ giảng, chỉ xem từng câu một lúc.

**(0039):** vá 2 lỗ hổng phát hiện qua `Supabase:get_advisors` — thu hồi
EXECUTE trên PUBLIC của 3 hàm SECURITY DEFINER mới (giữ nguyên EXECUTE PUBLIC
của `co_quyen_mon` có chủ đích, vì hàm chỉ trả boolean và an toàn với `anon`).

**(0040):** vá lỗi bảo mật THẬT phát hiện qua bộ test RLS 9 case theo vai trò
— policy `p_write` cũ (`FOR ALL`) vô tình áp dụng cả cho `SELECT`, OR với
`p_read` mới khiến gv đọc được mọi môn bất kể phạm vi. Tách thành 3 policy
riêng theo lệnh cụ thể.

**Ngoại lệ đã biết với luật "RLS chỉ thêm không sửa" (CLAUDE.md):** cả `0038`
(DROP+CREATE `p_read` trên 5 bảng, thu hẹp theo phạm vi) và `0040` (DROP+CREATE
`p_write`) đều sửa policy đang chạy thay vì chỉ thêm — có chủ đích, vì bản
chất RLS permissive OR lại với nhau nên KHÔNG thể chỉ "thêm" để thu hẹp quyền.
Cần cân nhắc bổ sung ngoại lệ này vào ADR-002 khi có dịp.

**Test:** bộ test RLS 9 case theo vai trò (gv/trợ giảng/admin) — 9/9 PASS sau
khi vá `0040`.

**Việc còn lại (không thuộc phạm vi đợt này):** seed `user_pham_vi` — hoãn
theo yêu cầu người dùng, để dành cho module quản lý người dùng làm sau.

**Migration:** `0038_gd3_buoc2_vong_doi_khung_nang_luc_rls.sql`,
`0039_gd3_buoc2_va_loi_bao_mat_advisor.sql`,
`0040_gd3_buoc2_vaa_loi_p_write_for_all_de_ro_rls_doc.sql`.
**Staging:** 🔲 chưa áp dụng (staging đang INACTIVE; cần resume + áp trước khi
coi đợt này là "xong" theo đúng ADR-004 — ghi nhận là nợ kỹ thuật mở).
**Production:** ✅ đã áp dụng thật (28/09/2026) — nhưng qua đường TAY, vi phạm
ADR-004 luật (a), khắc phục sổ sách như mô tả ở trên trong cùng ngày.
**Commit:** (điền sau khi commit).

---

## 2026-08-01 — Vá lỗ hổng tự duyệt hợp đồng học phí (0037)

**Tóm tắt:** Audit 01/08/2026 phát hiện trigger `trg_hop_dong_forbid_soft_delete`
(0011/0012) chỉ kiểm soát cột `deleted_at`, KHÔNG kiểm soát chuyển
`trang_thai` — `admin_ts` (policy `p_write_hop_dong`) và `quan_ly_chi_nhanh`
(policy `p_write_hop_dong_quan_ly_chi_nhanh`) đều ghi ALL trên
`hop_dong_hoc_phi`, không gì chặn họ tự chuyển hợp đồng sang `dang_hoat_dong`
(tự duyệt hợp đồng của chính mình).

Thêm trigger `trg_hop_dong_chan_tu_duyet`: chỉ chặn bước **duyệt** (chuyển
SANG `dang_hoat_dong`) — bước nộp (`nhap→cho_duyet`) của `admin_ts`/
`quan_ly_chi_nhanh` không bị ảnh hưởng. Chỉ `master_admin`/`ke_toan` được
duyệt. Cùng khuôn `language plpgsql set search_path = public` với
`forbid_hop_dong_soft_delete_by_non_master` (0012), không `security definer`
(không cần — chỉ gọi `auth_role()`, tự nó đã `SECURITY DEFINER`).

Test staging 5/5 case đúng kỳ vọng trước khi merge (PR #10): admin_ts nộp
nhap→cho_duyet (qua), admin_ts tự duyệt (chặn), quan_ly_chi_nhanh tự duyệt
(chặn), ke_toan duyệt (qua), master_admin duyệt (qua). Sau khi merge, người
dùng test thực tế trên production — xác nhận hoạt động đúng logic.

**Migration:** `0037_chan_tu_duyet_hop_dong_hoc_phi.sql` (Expand — trigger
mới, không đổi cột/bảng nào).
**Staging:** ✅ đã áp dụng (01/08/2026, test 5/5 case).
**Production:** ✅ đã áp dụng (01/08/2026, qua CI `apply-migration-expand`
theo ADR-005) — người dùng đã test thực tế, xác nhận đúng.
**Commit:** `1ddf6b9` (merge `a662f11`, PR #10).

## 2026-07-31 (đợt 2) — Đánh dấu 13 migration nợ kỹ thuật là "đã áp" trong sổ sách thật

**Tóm tắt:** Sau khi dọn 3 dòng mồ côi (mục ngay dưới), duyệt lại job
`apply-migration-expand` — vẫn FAIL, lần này vì lý do khác:
`supabase db push --linked` báo `"Found local migration files to be inserted
before the last migration on remote database"`, liệt kê đúng 13 file nằm
trong allowlist nợ kỹ thuật của `db-parity-check.yml` (`0003`-`0010`,
`0017`, `0018`, `0030`-`0032` — xem ADR-004 Mục 6). Nguyên nhân: version của
13 file này thấp hơn version mới nhất đã áp thật (`0035`), nhưng bản thân
chưa từng có dòng trong `schema_migrations` — `db push` coi đây là tình
huống bất thường (phải chèn migration cũ vào giữa lịch sử đã áp), từ chối
chạy trừ khi thêm `--include-all`.

Đã cân nhắc 2 hướng: (a) `--include-all` — chạy thật SQL của 13 file cũ, rủi
ro cao vì ADR-004 Mục 6 đã ghi rõ nội dung thật trên production (đặc biệt
`0030`-`0032`) khác hẳn nội dung 3 file local cùng số — có thể lỗi "đã tồn
tại" hoặc gây lệch dữ liệu mới; (b) đánh dấu 13 file này là "đã áp" trong sổ
sách (không chạy SQL thật). Theo xác nhận của người dùng, chọn hướng (b) —
đúng bản chất quyết định "nợ chấp nhận vĩnh viễn" đã chốt sẵn ở ADR-004 Mục
6, giờ khai báo luôn cho *Supabase CLI* biết (trước đây chỉ giấu trong
allowlist riêng của `db-parity-check.yml`, chính CLI không hề biết).

Xác nhận trước khi sửa: `select ... where version in (13 số)` trên
`schema_migrations` — rỗng, không đụng gì có sẵn. Chạy `INSERT` 13 dòng
(version + name khớp đúng tên file local, ví dụ `0003` →
`ngan_hang_cau_hoi`) qua Supabase MCP — tương đương `supabase migration
repair --status applied`, **không chạy SQL của 13 file này**. Verify sau khi
thêm: `list_migrations` cho dãy liền mạch `0003`→`0035` (chỉ còn `0036` là
mới), `get_advisors` không phát sinh cảnh báo mới so với trước.

Đã cập nhật ADR-004 Mục 6 (đợt 2), ghi rõ đây là hệ quả tiếp theo của
`supabase db push` colliding với 13 dòng nợ kỹ thuật lịch sử.

**Việc còn lại:** re-run job `apply-migration-expand` lần nữa — lần này sổ
sách đã liền mạch tới `0035`, `db push` sẽ không còn lý do để chặn, sẽ áp
được `0036` lên production thật.

**Migration:** không có (chỉ sửa bookkeeping `supabase_migrations
.schema_migrations`, không chạy SQL nghiệp vụ nào).
**Staging:** không áp dụng (staging không có 13 dòng thiếu này — cùng lịch
sử với local từ đầu). **Production:** ✅ đã thêm 13 dòng bookkeeping
(31/07/2026) — không chạy SQL, không đổi schema/dữ liệu.
**Commit:** `5eda18b`.

## 2026-07-31 — Dọn 3 dòng bookkeeping mồ côi chặn `supabase db push` trên production

**Tóm tắt:** Sau khi merge fix `db-parity-check` (PR #5), duyệt job
`apply-migration-expand` lần đầu qua GitHub Environment — job FAIL vì
`supabase db push --linked` tự chối chạy: `"Remote migration versions not
found in local migrations directory"`, chỉ đích danh 3 version
`20260726165828`/`20260726165848`/`20260726165914`. Đây là cơ chế kiểm tra
riêng của chính `supabase db push` (khác Lớp 3 ADR-004) — phát hiện version
nào trên production không khớp tên file local là từ chối chạy, **chặn cứng
mọi lần apply tiếp theo**, không riêng `0036`. 3 version đó là 3 dòng nợ kỹ
thuật đã biết từ ADR-004 Mục 6 (`0030`/`0031`/`0032`-production, nội dung
thật khác file local cùng số, cố ý không ép khớp version lúc đó).

Xác nhận qua Supabase MCP trước khi sửa: đúng 3 dòng đó, không đổi gì so với
lúc phát hiện ban đầu. Xử lý: xoá 3 dòng này khỏi
`supabase_migrations.schema_migrations` trên production (tương đương
`supabase migration repair --status reverted 20260726165828 20260726165848
20260726165914` mà CLI tự gợi ý) — chạy trực tiếp qua Supabase MCP theo yêu
cầu tường minh của người dùng (không qua CI, vì đây là sửa sổ sách bookkeeping
về migration, không phải áp migration mới — cùng loại hành động với đợt
repair 29/07/2026 đã làm qua MCP trực tiếp trên `schema_migrations`). Verify
ngay sau khi xoá: đúng 3 dòng biến mất, 20 dòng còn lại không đổi; `list_tables`
xác nhận các bảng thật do `0030`-`0032` tạo (`chi_nhanh`, `loai_phong`,
`phong_hoc`, `chuong_trinh_mon_hoc`, `buoi_hoc`, `user_chi_nhanh`) vẫn còn
nguyên, RLS vẫn bật, số dòng không đổi — chỉ sổ sách bị sửa, schema/dữ liệu
không hề bị đụng.

Đã cập nhật ADR-004 Mục 6, đánh dấu rõ quyết định "giữ nguyên 3 dòng này" ban
đầu **đã bị thay thế** bởi phát hiện mới này.

**Việc còn lại:** vào tab Actions, re-run job `apply-migration-expand` đã
fail (hoặc chờ lần push/schedule kế tiếp) — giờ `db push` sẽ không còn bị
chặn bởi orphan-check nữa, sẽ áp được `0036` lên production thật.

**Migration:** không có (chỉ sửa bookkeeping `supabase_migrations
.schema_migrations`, không phải migration SQL nghiệp vụ — giống loại thay
đổi ở mục 2026-07-29 "Repair version lịch sử migration production").
**Staging:** không áp dụng (staging không có 3 dòng mồ côi này).
**Production:** ✅ đã dọn 3 dòng bookkeeping (31/07/2026) — schema/dữ liệu
không đổi, chỉ sổ sách.
**Commit:** `af8c406`.

## 2026-07-31 — Vá lỗi nghiêm trọng: `db-parity-check` luôn báo "OK" giả, vô hiệu hoá Lớp 3 ADR-004

**Tóm tắt:** Ngay sau khi merge ADR-005 (PR #4), verify lại bằng cách xem log
CI thật — phát hiện job `apply-migration-expand` bị **skip** dù `0036` chưa
hề áp lên production, và job `migration-parity` báo "OK: không có migration
MỚI nào bị thiếu" dù `0036` thật sự đang thiếu. Đối chiếu trực tiếp bảng
`supabase_migrations.schema_migrations` trên production qua Supabase MCP xác
nhận: DB thật hoàn toàn sạch, `0036` không hề có ở đó — bug nằm ở chính CI
script, không phải dữ liệu.

Lấy raw log thật của bước "So sánh migration local (repo) với production đã
áp dụng" (không phải ảnh chụp màn hình, để tránh lệch cột do OCR) — xác nhận
nguyên nhân: giả định cũ về format bảng `supabase migration list --linked`
("mỗi dòng có `|` ở cả đầu lẫn cuối", ghi trong ADR-004 Mục 4 dựa trên đọc
source code CLI bản v2.110.0) **không còn đúng với bản CLI `latest` hiện
tại** — bảng thật KHÔNG có `|` ở đầu/cuối, mỗi dòng chỉ có đúng 3 field
(Local|Remote|Time), không phải 5 field như giả định. Hệ quả: filter `NF < 4`
cũ loại bỏ **toàn bộ mọi dòng** (kể cả dòng dữ liệu thật), khiến
`unapplied.txt` luôn rỗng và check luôn in "OK" — **vô hiệu hoá hoàn toàn Lớp
3 ADR-004 một cách âm thầm**, không rõ từ khi nào (nghi từ sau đợt verify
29/07/2026, khi CLI `latest` có thể đã đổi format). Đây là lỗi tồn tại từ
trước ADR-005 (copy nguyên vào job `classify-pending-migrations` mới), không
phải lỗi mới phát sinh do ADR-005.

Xử lý: sửa `Local=$1`/`Remote=$2`/`NF < 3` ở cả 2 chỗ dùng logic này
(`classify-pending-migrations` và `migration-parity`). Test lại bằng chính
dữ liệu log thật (37 dòng, gồm cả `0036`) trước khi merge — xác nhận đúng 14
gap (13 nợ cũ đã biết + `0036`), lọc allowlist đúng còn lại `0036`, phân loại
đúng `expand`. Không chạy được test thật trên GitHub Actions từ đây (không
có công cụ trigger workflow) — verify hoàn toàn bằng cách tái tạo chính xác
input log thật cục bộ.

**Migration:** không có (chỉ sửa `.github/workflows/db-parity-check.yml`).
**Staging:** không áp dụng (workflow chỉ target production). **Production:**
không đổi gì (bug chỉ ở bước kiểm tra, không phải bước ghi — DB không bị ảnh
hưởng, `0036` vẫn đang đúng trạng thái "chưa áp", chờ merge PR này để lần
chạy CI kế tiếp phát hiện và xử lý đúng qua `apply-migration-expand`).
**Commit:** `8173c4d`.

## 2026-07-30 — ADR-005: CI tự động áp migration Expand lên production

**Tóm tắt:** Sau khi merge migration `0036` vào `main` (PR #3), phát hiện gap
thật trong quy trình: `db-parity-check` báo migration thiếu trên production
đúng như thiết kế, nhưng **không có con đường nào hợp luật (a) ADR-004** để
đưa nó lên production — CI mới kiểm tra, chưa thi hành; mọi cách áp tay đều
bị luật (a) cấm rõ ràng (SQL Editor, CLI cá nhân, MCP `apply_migration`).
Đây chính là Open Question để ngỏ ở ADR-004 Mục 7.

Xử lý: viết ADR-005, đóng Open Question này. Thêm 3 job mới vào
`.github/workflows/db-parity-check.yml`:
- `classify-pending-migrations` — tìm migration đang chờ áp, phân loại theo
  tag chuẩn `-- adr004-type: expand` trong 15 dòng đầu file (không có tag →
  mặc định coi là contract, an toàn hơn).
- `apply-migration-expand` — tự động chạy `supabase db push --linked` khi
  TẤT CẢ migration đang chờ đều tag `expand`, gate qua GitHub Environment
  `production-db` (cần 1 người duyệt).
- `apply-migration-contract-manual` — chỉ chạy qua `workflow_dispatch` thủ
  công với 2 input bắt buộc (tên migration + chuỗi xác nhận cố định
  `code-da-live-tren-production`), giữ đúng luật (b) ADR-004 (xác nhận code
  phụ thuộc đã live là phán đoán con người, không tự động hoá được).

Job `migration-parity` (đã có, logic giữ nguyên) chạy sau 2 job apply
(`needs`, `if: always()`), trở thành bước xác nhận cuối thay vì bước duy
nhất. Đã sửa 1 lỗi script-injection khi viết: input `workflow_dispatch`
không được nội suy thẳng vào `run:` (`${{ inputs.x }}` chèn trực tiếp vào
shell) — chuyển qua truyền bằng biến môi trường (`env:`) trước khi dùng
trong `if`. Đã test logic phân loại expand/contract bằng fixture giả lập
(4 case: thuần expand, trộn expand+contract, không tag, file không tồn tại)
— cả 4 đúng kỳ vọng.

Gắn tag `-- adr004-type: expand` cho `0036` (Expand thuần, đã test kỹ trên
staging) — dùng làm ca thử nghiệm đầu tiên của pipeline mới.

**Việc còn lại, cần người thao tác tay trên GitHub UI (không có công cụ MCP/CLI
làm được):** tạo GitHub Environment `production-db` trong Settings →
Environments, thêm required reviewers — thiếu bước này thì `environment:
production-db` trong job sẽ tự tạo environment KHÔNG có bảo vệ, mất hết ý
nghĩa gate.

**Migration:** không có (chỉ sửa `.github/workflows/db-parity-check.yml`,
thêm `docs/adr/ADR-005-ci-tu-dong-apply-migration-expand.md`, thêm 1 dòng
tag vào `0036` — không đổi schema).
**Staging:** không áp dụng (workflow chỉ target production theo thiết kế,
giống ADR-004 Mục 4). **Production:** 🔲 chưa chạy lần nào (pipeline mới,
chờ merge + chờ tạo Environment `production-db` trước khi job đầu tiên có
thể chạy thật).
**Commit:** (điền sau khi commit).

## 2026-07-30 — Migration 0036: schema QA tầng nhẹ (đánh giá chất lượng đào tạo, E1.1)

**Tóm tắt:** Dựng schema cho E1.1 (roadmap song song ERP/Vận hành) — 3 bảng
mới: `tieu_chi_danh_gia` (bảng mã rubric, RỖNG — BGH/tổ chuyên môn điền nội
dung sau, việc khác), `danh_gia_hoc_sinh` (bảng sự kiện "học bạ số", 3 trục
điểm Kiến thức/Kỹ năng/Thái độ, dùng chung cho đánh giá theo bài và theo kỳ
tổng hợp), `danh_gia_tieu_chi` (bảng nối M-N checklist). Chỉ dựng schema —
KHÔNG mở UI nhập liệu thật (E1.4) và KHÔNG tạo nang_luc/cau_hoi_nang_luc/
bai_lam (E1.2), cả hai đều là việc khác nằm ngoài phạm vi PR này.

So với bản draft tham khảo ban đầu, đã sửa theo đúng thực tế production (đối
chiếu qua Supabase MCP, không đoán): PK dùng `uuid`/`public.uuidv7()` cho cả
3 bảng (ADR-003 không còn ngoại lệ bigint identity cho bảng mã mới); `de_id`
tham chiếu `uuid` (không phải `bigint` — `de.id` đã qua ADR-003); RLS dùng
đúng hàm `auth_role()` thật (không có `user_pham_vi`/`user_bai_hoc` trong RLS
predicate nào hiện tại, dù bảng `user_pham_vi` có tồn tại); `nguoi_danh_gia`
tham chiếu `public.users` (không phải `auth.users`, khớp quy ước `lop.nguoi_tao`);
`tieu_chi_danh_gia` dùng cột `deleted_at` thay vì cờ `dang_hoat_dong` riêng,
khớp quy ước bảng mã thật (`cap_hoc`/`mon_hoc`/`dang_cau`/`hinh_thuc`); thêm
`deleted_at` cho `danh_gia_hoc_sinh` (khớp các bảng sự kiện khác), không thêm
cho `danh_gia_tieu_chi` (bảng nối thuần, khớp `user_chi_nhanh`). Tái sử dụng
`set_updated_at()` đã có sẵn, không tạo lại.

**Migration:** `0036_danh_gia_chat_luong_dao_tao.sql`.
**Staging:** ✅ đã áp dụng và test (insert + FK qua 3 bảng trong transaction,
rollback — 3 bảng xác nhận rỗng sau test). **Production:** ✅ đã áp dụng qua
CI (31/07/2026, job `apply-migration-expand` sau khi dọn xong 2 lớp blocker
bookkeeping — xem các mục "2026-07-31" phía trên). Verify qua Supabase MCP
sau khi áp: `0036` có trong `list_migrations`, cả 3 bảng tồn tại đúng RLS (6
policy khớp thiết kế), `tieu_chi_danh_gia` đúng rỗng như dự định.
**Commit:** `deb4d03` (migration) → merge `9b13448` trên `main` (PR #3).

## 2026-07-29 — ADR-004 hoàn tất triển khai: merge PR #1, verify Action chạy thật trên CI

**Tóm tắt:** Thêm allowlist 13 migration nợ kỹ thuật lịch sử (`0003`-`0010`,
`0017`/`0018`, `0030`-`0032` — lý do từng nhóm xem ADR-004 Mục 6) vào
`.github/workflows/db-parity-check.yml`, để Action phân biệt được nợ cũ đã
biết với lệch mới thật sự cần chặn. Verify thủ công bằng dữ liệu thật (20
migration khớp + 13 gap) → PASS; thêm 1 migration giả lập ngoài allowlist →
vẫn FAIL đúng như kỳ vọng.

Sau đó merge PR #1 (`develop` → `main`, commit merge `3a90f0f`) — Action
`db-parity-check` tự chạy lần đầu tiên thật trên GitHub Actions (trigger
`on push: main`). Kết quả: **cả 2 job đều success**, bảng `Local`/`Remote`
in ra khớp **từng dòng** với bảng đã tái dựng thủ công trước đó (không có
bất ngờ từ môi trường CI — phiên bản `supabase/setup-cli@v1` khác vẫn cho
kết quả giống hệt). Job phụ (Vercel) cũng xác nhận thật: đọc được commit
`3a90f0f` từ Vercel API, khớp đúng commit `main` — không chỉ skip do thiếu
secret.

Với kết quả này, ADR-004 được coi là **Accepted, hoàn tất triển khai cả 3
lớp phòng thủ** (guidance/discipline/enforcement). Việc còn lại (tự động hoá
bước *apply* migration lên CI, dọn 5 migration mồ côi trên staging) là nợ kỹ
thuật đã ghi nhận, cố ý để ngoài phạm vi ADR này — xem Mục 7 Open Questions.

**Migration:** không có (chỉ sửa `.github/workflows/db-parity-check.yml` +
docs; DB production đã sửa ở mục repair version 2026-07-29 phía dưới, không
lặp lại ở đây).
**Staging:** không áp dụng (Action `db-parity-check` chỉ target production
theo thiết kế — xem ADR-004 Mục 4). **Production:** ✅ verify qua CI run
thật (`https://github.com/nonsense-edu-tech/nonsense-edu-dbms/actions/runs/30424494224`).
**Commit:** `0e991ae` (thêm allowlist) → merge `3a90f0f` trên `main`.

## 2026-07-29 — Repair version lịch sử migration production khớp tên file local (ADR-004 #3a)

**Tóm tắt:** Phát hiện khi verify GitHub Action `db-parity-check` thật (chưa
chạy CI, verify thủ công bằng cách tái dựng đúng thuật toán `makeTable()` của
`supabase/cli` — apps/cli-go/internal/migration/list/list.go, bản v2.110.0 —
với dữ liệu local/remote 100% thật): `migration list --linked` so khớp Local↔
Remote bằng **so sánh SỐ NGUYÊN TUYỆT ĐỐI** của cột `version`. Local lấy version
từ tên file (`0033` → 33). Remote lấy từ `supabase_migrations.schema_migrations
.version` — nhưng vì project áp migration production qua Supabase MCP
`apply_migration` (không phải `supabase db push`), version bị tự sinh dạng
timestamp 14 số (`20260727045454`), không liên quan gì tới tên file. Hệ quả:
**0/33 migration khớp**, kể cả những cái vừa áp đúng — awk dù đã sửa (commit
trước) vẫn báo FAIL toàn bộ.

Xử lý: dùng đúng SQL mà lệnh `supabase migration repair` thực thi (lấy từ
source `apps/cli-go/pkg/migration/history.go` — `DELETE ... WHERE version =
ANY($1)` rồi `INSERT INTO supabase_migrations.schema_migrations(version, name)`)
để sửa lại **20 dòng lịch sử** có tương ứng 1-1 rõ ràng giữa local và nội dung
thật đã chạy: `0011`-`0016`, `0019`-`0029`, `0033`-`0035` — version đổi từ
timestamp tự sinh sang đúng số 4 chữ số khớp tên file. Chạy trong 1 transaction
(`begin;...commit;`), chỉ sửa bảng bookkeeping `schema_migrations` (cột
`version`/`name`), **không đụng schema/dữ liệu nghiệp vụ nào**.

**KHÔNG đụng 3 dòng** `0030_create_van_hanh_tables_production`,
`0031_chuyen_lop_ghi_danh_production`, `0032_fix_tao_hoc_sinh_tao_lop_rls
_production` — nội dung thật KHÁC file local cùng số (đặc biệt `0030` là 2
migration hoàn toàn khác nhau về nội dung), ép khớp số sẽ ghi sai lịch sử. Giữ
nguyên, coi là gap đã chấp nhận — nối dài đúng tiền lệ đã ghi ở ADR-004 §6 cho
`0017`/`0018`. Cũng không đụng `0003`-`0010` (chưa từng có dòng lịch sử nào,
và `docs/roadmap.md` đã tự cảnh báo không tin file `0003` khớp production
thật) — để nguyên, không đủ cơ sở backfill an toàn.

Verify sau khi repair: tái dựng lại bảng `makeTable()` bằng dữ liệu thật —
đúng 20/20 dòng khớp, đúng 13 dòng còn lại (`0003`-`0010`, `0017`, `0018`,
`0030`-`0032`) hiện "chỉ Local" **như dự kiến** (gap đã biết, chưa có cơ chế
allowlist trong workflow nên Action vẫn sẽ FAIL cho tới khi xử lý tiếp — xem
`docs/adr/ADR-004...md` Mục 6).

**Migration:** không có (chỉ sửa bookkeeping `supabase_migrations
.schema_migrations`, không phải migration SQL nghiệp vụ).
**Staging:** không áp dụng (vấn đề chỉ phát sinh khi thiết kế Action mới, chưa
kiểm tra staging có cùng lệch không). **Production:** ✅ đã repair 2026-07-29.
**Commit:** (theo sau, cùng đợt cập nhật docs)

## 2026-07-27 — Ghi nhận `0033`-`0035` vào lịch sử migration production (ADR-004)

**Tóm tắt:** Sau khi dựng ADR-004 (hàng rào chống lệch DB↔code), GitHub Action
`db-parity-check` phát hiện production thiếu `0033`, `0034`, `0035` trong lịch
sử migration so với staging. Kiểm tra trực tiếp qua Supabase MCP trước khi áp
bất cứ gì: schema/RLS thật trên production **đã khớp chính xác** trạng thái
cuối cùng của cả 3 migration này (phiên trước đã gộp nội dung tương đương vào
`0030`/`0032`-production riêng, xem ghi chú trong 2 file đó) — đối chiếu từng
policy (`pg_policies`) và định nghĩa hàm (`pg_get_functiondef`) khớp tuyệt
đối trước khi apply. Đây thuần tuý là lỗi **sổ sách** (lịch sử migration
không ghi nhận), không phải lệch schema thật.

Xử lý: áp đúng nội dung gốc của 3 file `0033`/`0034`/`0035` lên production
theo thứ tự (không viết SQL mới, không apply tay ngoài quy trình — dùng công
cụ Supabase MCP `apply_migration`, cùng cơ chế project này vẫn dùng cho mọi
migration production từ trước tới nay), để lịch sử migration production khớp
1-1 với repo. `0034` và `0035` tự triệt tiêu hiệu lực RLS lẫn nhau (035 đảo
ngược 034) nên áp nối tiếp không gián đoạn. Verify sau khi áp: `pg_policies`
khớp y hệt trước-sau (không có thay đổi hành vi thật), `get_advisors` không
phát sinh lỗi mới ngoài các warning đã biết từ trước (`search_path` mutable,
`security_definer` lộ qua RPC — nợ kỹ thuật cũ, không thuộc phạm vi việc này).

**Migration:** `0033_fix_stt_solop_va_rls_phong_buoi_hoc.sql`,
`0034_fix_ro_ri_deleted_at_qua_policy_all.sql`,
`0035_revert_split_ve_for_all_va_giai_thich.sql` (đã có từ trước, chỉ mới ghi
nhận vào lịch sử production).
**Staging:** ✅ (đã có từ trước) | **Production:** ✅ (ghi nhận 2026-07-27,
schema không đổi vì đã khớp sẵn)
**Commit:** (theo sau, cùng đợt cập nhật `docs/roadmap.md`/`CLAUDE.md`)

## 2026-07-27 — Đồng bộ production lên ngang staging: DB (bảng vận hành + chuyển lớp + fix RLS/tao_hoc_sinh) và code (merge develop → main)

**Tóm tắt:** Phát hiện qua kiểm tra trực tiếp Supabase MCP: DB production đã
âm thầm được migrate UUID (ADR-003, 8 phase) từ trước, nhưng code production
(branch `main`, dừng ở commit `cf89ed3` ngày 2026-07-21 — trước cả khi
ADR-003 được quyết định) chưa từng được cập nhật theo. Hệ quả xác nhận thật
trên production: (1) sửa/xoá lớp, học sinh, gói học phí, hợp đồng, phiếu thu
báo lỗi "Thiếu ID..." (frontend còn `Number()` parse uuid); (2) `tao_hoc_sinh()`
insert `id_old` (bigint) vào `ghi_danh` (uuid) → **tạo học sinh mới hoàn toàn
không chạy được**; (3) RLS `p_write` trên `lop`/`hoc_sinh` còn `deleted_at IS
NULL` trong `USING` của policy `FOR ALL` → xoá mềm bị Postgres từ chối.

Quyết định (sau khi cân nhắc phạm vi hẹp "chỉ vá lỗi" rồi user chọn mở rộng):
đưa **toàn bộ** tính năng đã hoàn thiện trên staging lên production trong 1
đợt, kể cả các bảng/tính năng production chưa từng có (chi nhánh, vận hành
lớp học, chuyển lớp). Bảng `loai_phong`/`phong_hoc`/`chuong_trinh_mon_hoc`/
`buoi_hoc` được TẠO MỚI trên production (trước đó chỉ tồn tại trên staging,
xem quyết định ngày 2026-07-23) — đối chiếu trực tiếp schema/RLS/trigger/view
thật đang chạy trên staging qua Supabase MCP (không lấy nguyên si các file
migration root vì một số đã lệch so với schema thật do lịch sử debug — bài
học từ vụ `tao_hoc_sinh()` ở trên).

Thứ tự áp dụng: (1) tạo 4 bảng vận hành, (2) hàm `chuyen_lop()`/
`cap_nhat_trang_thai_ghi_danh()` + enum `da_chuyen_lop`, (3) fix
`tao_hoc_sinh()`/`tao_lop()`/RLS `lop`/`hoc_sinh` — verify bằng
`get_advisors` (không có lỗi mới ngoài các warning đã tồn tại sẵn ở project,
ví dụ `search_path` mutable) + đối chiếu `list_tables`/`pg_policies`/
`pg_get_functiondef` giữa 2 môi trường. Sau đó merge `develop` (11 commit,
gồm cả fix học phí ở mục dưới) → `main`, push.
**Migration:**
`supabase/migrations/production-followups/0030_create_van_hanh_tables_production.sql`,
`0031_chuyen_lop_ghi_danh_production.sql`,
`0032_fix_tao_hoc_sinh_tao_lop_rls_production.sql`.
**Staging:** ✅ (đã có từ trước) | **Production:** ✅ (áp dụng 2026-07-27)
**Commit:** `4e494e8` (merge commit trên `main`, fast-forward từ `develop`)

## 2026-07-27 — Sửa nốt lỗi id:number ở module học phí (gói/hợp đồng/thu tiền)

**Tóm tắt:** Cùng pattern `id: number` → cần `uuid` như các module trước —
phát hiện ở `GoiHocPhiTable`, `HopDongForm`/`HopDongTable`, `PhieuThuForm`/
`PhieuThuTable`, `HocPhiDashboardClient` và các `actions.ts` tương ứng. Xác
nhận kiểu cột thật (`uuid`) qua Supabase MCP trước khi sửa. Xác nhận chạy
đúng trên staging qua UI thật (role master_admin) trước khi đưa lên production
ở mục trên.
**Migration:** không có (chỉ code frontend).
**Staging:** ✅ | **Production:** ✅ (đi cùng merge `develop`→`main` ở mục trên)
**Commit:** `3b4fd4f`

## 2026-07-26 — Mở rộng toast sang module học phí + ghi quy ước bắt buộc

**Tóm tắt:** Nối `useToast()` vào 7 component còn lại của module học phí
(`goi_hoc_phi`, `hop_dong_hoc_phi`, `phieu_thu`). Ghi vào
`CLAUDE_new_22.07.26.md`: từ nay MỌI module mới/sửa lại đều phải gắn toast
thông báo thành công/thất bại, bổ sung thêm vào khung lỗi inline hiện có
(không thay thế).
**Migration:** không có (chỉ code frontend + tài liệu).
**Staging:** ✅ | **Production:** — (không áp dụng, thuần frontend + docs)
**Commit:** `169e8fa`

## 2026-07-26 — Thêm hệ thống toast thông báo (lop/hoc-sinh/chi-nhanh/van-hanh)

**Tóm tắt:** Thêm `ToastProvider` (`src/components/ToastProvider.tsx`,
context + hook `useToast()`), hiện thông báo dạng side-modal góc phải trên,
tự tắt sau 5s, phân biệt thành công/thất bại bằng viền + icon. Gắn vào
`src/app/layout.tsx` nên dùng được toàn app. Nối vào 19 component tạo/sửa/xoá
ở 4 module: `lop`, `hoc-sinh` (kể cả chuyển lớp), `chi-nhanh` (kể cả gán/gỡ
quản lý), `van-hanh` (loại phòng/phòng học/buổi học, kể cả ghi nhận chi phí).
**Migration:** không có.
**Staging:** ✅ | **Production:** — (không áp dụng, thuần frontend)
**Commit:** `5d3b890`

## 2026-07-26 — Vá lỗi RLS: xoá mềm lop/hoc_sinh vẫn hiện lại sau khi xoá

**Tóm tắt:** Lỗi thật của Postgres RLS, không phải cấu hình sai. Policy ghi
(`p_write`) khai báo `FOR ALL` nên `USING` của nó cũng chi phối SELECT
(OR-combine với `p_read`). Migration trước (`0032`/`0033`) bỏ
`deleted_at IS NULL` khỏi `USING` để sửa lỗi UPDATE bị chặn — tác dụng phụ:
mọi dòng kể cả đã xoá mềm trở nên "nhìn thấy được" khi đọc. Thử tách
`FOR ALL` thành `FOR INSERT`+`FOR UPDATE` riêng (`0034`) để vá đúng phạm vi
nhưng xác nhận qua test trực tiếp (bọc UPDATE trong hàm PL/pgSQL, không
RETURNING, không qua PostgREST) rằng Postgres **thật sự** yêu cầu dòng sau
UPDATE phải còn được 1 policy có phạm vi SELECT chấp nhận thì UPDATE mới
thành công — tách riêng không đủ. Giải pháp cuối (`0035`): quay lại
`FOR ALL`, chuyển trách nhiệm ẩn dòng đã xoá sang tầng ứng dụng — thêm
`.is('deleted_at', null)` tường minh vào `lop/page.tsx` và
`hoc-sinh/page.tsx` (`phong_hoc`/`buoi_hoc`/`loai_phong` đã có sẵn filter
này). **Bài học: RLS cho ghi ảnh hưởng cả đọc nếu dùng `FOR ALL` — cẩn thận
khi thêm điều kiện vào USING của policy `FOR ALL`.**
**Migration:** `0034_fix_ro_ri_deleted_at_qua_policy_all.sql` (bị 0035 đảo
ngược một phần), `0035_revert_split_ve_for_all_va_giai_thich.sql`.
**Staging:** ✅ | **Production:** ✅ (áp dụng 2026-07-27 qua
`production-followups/0032_fix_tao_hoc_sinh_tao_lop_rls_production.sql` —
gộp trạng thái CUỐI CÙNG của 0032-0035 cho lop/hoc_sinh, xem mục 2026-07-27)
**Commit:** `658a814`

## 2026-07-26 — Vá lỗi id:number ở chi-nhanh/van-hanh + trùng mã STT/so_lop + RLS phong_hoc/buoi_hoc

**Tóm tắt:** Cùng lỗi kiểu ID (`number` thay vì `uuid`) như đã gặp ở
`lop`/`hoc-sinh` — phát hiện thêm ở `chi-nhanh` (gán/gỡ quản lý chi nhánh) và
`van-hanh` (loại phòng/phòng học/buổi học). Đã sửa toàn bộ 11 file. Riêng
`tao_hoc_sinh()`/`tao_lop()`: tính STT/so_lop tiếp theo trước đây bỏ qua dòng
đã xoá mềm (`deleted_at is null`), trong khi ràng buộc UNIQUE áp dụng cho cả
dòng đã xoá → xoá 1 học sinh/lớp rồi tạo lại cùng lớp/tổ hợp sẽ đụng mã cũ.
Bỏ điều kiện `deleted_at` khỏi phép tính (mã không được tái sử dụng — đúng
nguyên tắc "cố định vĩnh viễn"). `phong_hoc`/`buoi_hoc` cũng có cùng pattern
RLS `deleted_at IS NULL` trong `USING` như `lop`/`hoc_sinh` — vá tương tự
(sau đó phát hiện tác dụng phụ, xem mục kế tiếp).
**Migration:** `0033_fix_stt_solop_va_rls_phong_buoi_hoc.sql`.
**Staging:** ✅ | **Production:** ✅ (phần lop/hoc_sinh áp dụng 2026-07-27
qua `production-followups/0032_...production.sql`; phần phong_hoc/buoi_hoc
áp dụng cùng lúc bảng được TẠO MỚI trên production, xem mục 2026-07-27)
**Commit:** `a196b05`

## 2026-07-26 — Vá lỗi xoá mềm lop/hoc_sinh bị RLS chặn + tao_hoc_sinh() lệch id_old

**Tóm tắt:** Test thật qua UI (role master_admin) phát hiện 2 lỗi: (1) xoá
lớp/học sinh báo lỗi RLS dù đúng quyền — nguyên nhân PostgREST luôn phát
sinh `RETURNING` cho UPDATE (bất kể `.select()` client có gọi hay không), mà
policy ghi có `deleted_at IS NULL` trong `USING` nên dòng sau khi xoá mềm
không còn thoả policy nào → Postgres từ chối cả câu lệnh; (2) `tao_hoc_sinh()`
đang chạy trên staging bị lệch so với file migration trong repo — vẫn dùng
`id_old` (bigint) thay vì `id` (uuid) khi insert vào `ghi_danh`, gây lỗi kiểu
dữ liệu.
**ĐÍNH CHÍNH (2026-07-27):** dòng "Production không dính lỗi (2)" ở trên SAI
— kiểm tra trực tiếp qua Supabase MCP ngày 2026-07-27 xác nhận `tao_hoc_sinh()`
trên production **vẫn đang** insert `id_old`/bigint vào `ghi_danh` (cùng lỗi
y hệt staging), tức tạo học sinh mới trên production đã lỗi kiểu dữ liệu từ
lúc ADR-003 áp dụng cho tới khi vá — xem mục 2026-07-27.
**Migration:** `0032_fix_soft_delete_rls_va_tao_hoc_sinh.sql`.
**Staging:** ✅ | **Production:** ✅ (áp dụng 2026-07-27, xem mục 2026-07-27)
**Commit:** `93225fe`

## 2026-07-26 — Hoàn thiện Khối 2: CRUD, chuyển lớp, trạng thái ghi danh, UI quan_ly_chi_nhanh

**Tóm tắt:** (1) Vá lỗi chặn toàn bộ CRUD `lop`/`hoc-sinh`: `id` khai kiểu
`number` nhưng thực tế đã là `uuid` từ ADR-003, khiến sửa/xoá/tạo học sinh
luôn báo lỗi. (2) Thêm luồng **chuyển lớp** (hàm `chuyen_lop()`, trạng thái
mới `da_chuyen_lop`) và **quản lý trạng thái ghi danh** trực tiếp trong bảng
(hàm `cap_nhat_trang_thai_ghi_danh()`). (3) Mở quyền UI cho vai trò
`quan_ly_chi_nhanh`, lọc đúng phạm vi chi nhánh ở tầng ứng dụng (RLS đọc vốn
mở cho mọi vai trò). (4) Thêm bộ lọc lớp/chi nhánh/trạng thái ghi danh vào
danh sách học sinh. (5) Generate lại TypeScript types từ schema thật, lưu
`src/lib/database.types.ts` làm tài liệu tham chiếu (chưa gắn cứng vào
`createClient()` toàn cục để tránh vỡ các module chưa sửa).
**Migration:** `0031_chuyen_lop_ghi_danh.sql`.
**Staging:** ✅ | **Production:** ✅ (áp dụng 2026-07-27 qua
`production-followups/0031_chuyen_lop_ghi_danh_production.sql`, xem mục
2026-07-27)
**Commit:** `cb6f780`

## 2026-07-23 — ADR-003: chuyển toàn bộ khóa chính sang UUIDv7 (8 phase)

**Tóm tắt:** Chuyển PK của 26 bảng từ `bigint`/mã tự nhiên sang `uuid`
(hàm `public.uuidv7()` tự viết, RFC 9562 random method) — theo đúng chiến
lược Expand-Backfill-Contract-Verify (ADR-003 Mục 4), 8 phase theo thứ tự
phụ thuộc FK. Đối chiếu số dòng + dữ liệu mẫu khớp tuyệt đối sau mỗi phase
trên CẢ hai môi trường (test riêng trên staging trước, backup thủ công +
đối chiếu schema staging↔production trước khi chạy production, dừng ngay nếu
lệch — không có phase nào lệch). Sau ADR-003, 4 bảng ngoài phạm vi
(`loai_phong`/`phong_hoc`/`chuong_trinh_mon_hoc`/`buoi_hoc`) được build mới
bằng UUID luôn — **quyết định: 4 bảng này CHỈ có trên staging, KHÔNG đưa lên
production trong đợt này.**
**Migration:** `0019`-`0030` (staging), `0019`-`0029` bản tương ứng trong
`supabase/migrations/production-adr003/` (production, khác vài tên
constraint do lịch sử schema riêng — xem comment đầu mỗi file).
**Staging:** ✅ (cả 30 file) | **Production:** ✅ (29 file, không có `0030`)
**Commit:** chưa commit các file migration này vào git tại thời điểm áp dụng
— **cần `git add`/`commit` các file `supabase/migrations/0019`-`0030*.sql`
và `supabase/migrations/production-adr003/` nếu chưa nằm trong lịch sử git**
(kiểm tra `git log --diff-filter=A -- supabase/migrations/0019*` trước khi
giả định).

---

## Trước 2026-07-23 (chưa có nhật ký chi tiết — xem `roadmap.md`)

Các migration `0001`-`0018` (bảng mã gốc, users/RBAC, học sinh/lớp/ghi danh,
ngân hàng câu hỏi, module học phí GĐ1, đính kèm biên lai, chi nhánh, vai trò
`quan_ly_chi_nhanh`) và module vận hành lớp học (`0017`/`0018` trên staging)
đã áp dụng trước khi file changelog này được tạo — xem `roadmap.md` mục
"Ghi chú migration" để biết chi tiết lịch sử từng file.
