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
