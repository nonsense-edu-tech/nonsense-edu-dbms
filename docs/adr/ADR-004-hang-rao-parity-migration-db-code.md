# ADR-004: Hàng rào chống lệch DB↔code (parity migration)

**Status:** Accepted
**Date:** 2026-07-27
**Deciders:** Nguyen (Hiệu trưởng)
**Quan hệ với ADR-002/003:** Không thay đổi bất kỳ luật nghiệp vụ/schema nào của ADR-002/003. ADR này chỉ định **quy trình** đưa migration vào các môi trường — bổ sung, không thay thế.

---

## 1. Sự cố (2026-07-27)

DB production đã được migrate UUID (ADR-003, 8 phase) từ 2026-07-23, nhưng
branch `main` (code chạy thật trên Vercel production) dừng ở commit `cf89ed3`
ngày 2026-07-21 — **trước cả khi ADR-003 được quyết định**. Code và DB trôi
lệch độc lập suốt 4 ngày mà không có gì phát hiện hay chặn lại, tới khi phát
hiện qua kiểm tra thủ công bằng Supabase MCP. Hệ quả xác nhận thật trên
production trước khi vá: sửa/xoá lớp-học sinh-học phí báo lỗi "Thiếu ID..."
(frontend còn `Number()` parse uuid); `tao_hoc_sinh()` insert `id_old`
(bigint) vào cột uuid → **tạo học sinh mới hoàn toàn không chạy được**; RLS
`p_write` xoá mềm bị Postgres từ chối. Chi tiết đầy đủ: xem `CHANGELOG.md`
mục 2026-07-27.

### Nguyên nhân gốc

Migration DB tới được production bằng **con đường khác** với pipeline ship
code: `supabase db push` / SQL Editor chạy tay, không qua merge → CI → deploy
như code. Hai con đường độc lập, không con đường nào biết con đường kia đã đi
tới đâu → **DB đi trước code mà không có gì chặn lại.**

**Bằng chứng lệch đang tồn tại NGAY LÚC VIẾT ADR NÀY** (xác nhận qua Supabase
MCP `list_migrations` trên cả hai project, không phải suy đoán): production
đang thiếu `0017_van_hanh_lop_hoc_chi_phi`, `0018_danh_sach_gv`,
`0033_fix_stt_solop_va_rls_phong_buoi_hoc`,
`0034_fix_ro_ri_deleted_at_qua_policy_all`,
`0035_revert_split_ve_for_all_va_giai_thich` so với staging (một phần được
thay thế bằng migration production-riêng trong
`supabase/migrations/production-followups/`, phần còn lại — 0033-0035 — đơn
giản là **chưa được đưa lên production**). Ngoài ra staging có 5 migration
(`0021_uuidv7_pin_search_path`, `0024_fix_tao_hoc_sinh_id_old`,
`0025_drop_old_bigint_overloads`, `0026_fix_tao_lop_cap_hoc_id_chuong_trinh_id`,
`0027_restore_security_invoker_views`) **không có file tương ứng trong repo**
— hotfix áp tay trong lúc chạy ADR-003, chưa từng được ghi lại. Đây chính là
loại lệch mà Lớp 3 (Mục 3) phải bắt được.

---

## 2. Ba lớp phòng thủ — lớp nào chịu lực

| Lớp | Cơ chế | Vai trò |
|---|---|---|
| 1. Guidance | Luật ghi trong `CLAUDE.md` | Phụ trợ — chỉ có tác dụng nếu ai đó (người hoặc Claude Code) đọc nó tại đúng thời điểm |
| 2. Discipline | Checklist tay trước khi merge lên `main` | Phụ trợ — chỉ có tác dụng nếu người deploy nhớ tick |
| 3. **Enforcement** | GitHub Action tự kiểm parity, chạy dù mọi người quên | **Chịu lực** — chạy độc lập với trí nhớ của bất kỳ ai, kể cả khi không ai đọc ADR này |

Lớp 1 và 2 vá **trí nhớ con người** — chính trí nhớ con người là thứ đã thất
bại trong sự cố 2026-07-27 (không ai "nhớ" là DB đã đi trước code, vì không
có quy trình nào yêu cầu kiểm tra). Lớp 3 lấy phép kiểm tra sống-còn (DB và
repo có khớp không) ra khỏi trí nhớ, đặt vào một tiến trình chạy tự động,
**chặn** khi phát hiện lệch thay vì chỉ cảnh báo. Nếu phải bỏ bớt, bỏ Lớp 1
hoặc 2 trước — không bao giờ bỏ Lớp 3.

---

## 3. Ba luật cứng (áp dụng từ 2026-07-27)

### (a) Migration chỉ vào mỗi môi trường qua pipeline ship code

Cấm áp migration tay lên **production DB** (SQL Editor, `supabase db push`
chạy từ máy cá nhân, hay bất kỳ đường nào không qua merge → CI apply). Con
đường DUY NHẤT: viết file trong `supabase/migrations/`, merge vào `main`, để
CI (Lớp 3 xác nhận trạng thái, chưa tự động apply — xem Mục 4) hoặc quy trình
release áp migration như một bước của việc ship code, không phải một hành
động tách rời.

Ngoại lệ duy nhất: migration thử nghiệm trên **staging** để kiểm tra trước
khi viết file chính thức — nhưng bất kỳ thay đổi nào giữ lại phải được ghi
thành file migration trong repo **trước khi** coi là xong, không được để tồn
tại "chỉ trên DB" (đây chính xác là lỗi gây ra 5 migration mồ côi ở Mục 1).

### (b) Migration phá huỷ (Contract) chỉ chạy trên prod SAU KHI code phụ thuộc đã live

Migration kiểu đổi tên cột, đổi kiểu cột, hoặc `DROP` (bảng/cột/hàm cũ) —
tức bước "Contract" trong vòng đời expand/contract — **chỉ được áp lên
production sau khi** code trên `main` phụ thuộc vào schema mới đã chạy thật
trên production (đã deploy, đã xác nhận hoạt động). Không áp Contract trước,
"để sẵn cho code sau" — đó chính xác là lỗi gây sự cố 2026-07-27.

### (c) Migration Expand phải backward-compatible

Migration kiểu thêm cột/bảng/hàm mới (bước "Expand") phải để code CŨ (đang
chạy trên production) tiếp tục chạy được bình thường trên schema MỚI, cho
tới khi code MỚI lên. Cụ thể: cột mới thêm phải nullable hoặc có default;
không đổi kiểu cột đang được code cũ đọc/ghi; không đổi tên cột/bảng cũ
(thêm cột/bảng mới thay vì rename). Nhờ luật này, DB có thể đi trước code
một khoảng thời gian ngắn (staging luôn vậy) mà không sập — miễn là chưa
chạm bước Contract của luật (b).

---

## 4. Lớp 3 — GitHub Action kiểm parity

**File:** `.github/workflows/db-parity-check.yml`

**Kiểm CHÍNH (bắt buộc):** so danh sách migration đã apply trên production DB
(qua Supabase Management API — tương đương `supabase migration list --linked`)
với danh sách file trong `supabase/migrations/*.sql` ở repo. Bất kỳ migration
nào có trong repo mà **không** có trong danh sách đã apply trên production →
**FAIL**. Dùng thẳng `supabase migration list --linked` (công cụ chính thức
của vendor) rồi parse bảng kết quả — **không** tự viết logic so khớp theo tên
(cân nhắc rồi bỏ, xem Mục 6: `migration list` so theo **giá trị số tuyệt đối**
của cột `version`, không so theo tên).

**Kiểm PHỤ (best-effort):** so commit `main` hiện tại với commit mà Vercel
production đang chạy (qua Vercel API, đọc biến môi trường sẵn có nếu
project đã link Git — không tự phình thêm cơ chế phức tạp nếu API không có
sẵn cách đơn giản; nếu vướng, job này SKIP thay vì fail, và được báo lại cho
người dùng).

**Trigger:** `on: push` tới `main`, và `schedule` (cron) chạy 1 lần/ngày —
để bắt cả trường hợp không ai push gì mà DB bị đổi tay (đúng kịch bản sự cố
gốc, DB đổi mà không có push code nào đi kèm).

**Nguyên tắc thiết kế:** đơn giản nhất có thể — một job, không ma trận, không
matrix build, không phụ thuộc ngoài `curl`/`jq` gọi thẳng REST API của
Supabase/Vercel. Lý do: người vận hành hệ thống này không xuất thân IT — một
Action phức tạp là một Action dễ bị tắt khi thấy phiền, và một hàng rào bị
tắt thì vô dụng ngay từ định nghĩa (nêu ở Mục 2).

---

## 5. Lớp 2 — Checklist deploy (`.github/pull_request_template.md`)

Checklist tick tay xuất hiện tự động trên mỗi PR nhắm vào `main`, ép người
merge tự xác nhận trạng thái migration/backward-compat trước khi bấm merge.
Đây là lớp phụ trợ — không chặn được nếu không ai đọc, nhưng đứng cùng Lớp 3
để bắt các trường hợp Lớp 3 không kiểm được (ví dụ tính backward-compatible
của một migration Expand, việc mà máy không tự đánh giá được).

---

## 6. Nợ kỹ thuật đã ghi nhận (xem `docs/roadmap.md`)

- ✅ **Đã xử lý (27-29/07/2026), 2 đợt:**
  1. (27/07) `0033`-`0035` thiếu trong lịch sử migration production — đã áp
     đúng nội dung 3 file gốc qua Supabase MCP để có mặt trong lịch sử (khi đó
     version vẫn là timestamp tự sinh, chưa đúng số file).
  2. (29/07, khi verify Action thật lần đầu — xem Mục 4): phát hiện
     `supabase migration list --linked` so Local/Remote bằng **so sánh số
     nguyên tuyệt đối** của `version`. Remote lấy version từ
     `supabase_migrations.schema_migrations.version` — nhưng vì production áp
     migration qua Supabase MCP `apply_migration` (không qua `supabase db
     push`), version bị tự sinh dạng timestamp 14 số, không liên quan gì tới
     tên file → **0/33 migration khớp**, kể cả 3 cái vừa áp ở đợt 1. Đã dùng
     đúng SQL của lệnh `supabase migration repair` (`DELETE` + `INSERT` trên
     `schema_migrations`, lấy từ source `apps/cli-go/pkg/migration/history.go`)
     để sửa version của **20 migration có tương ứng 1-1 rõ ràng**: `0011`-
     `0016`, `0019`-`0029`, `0033`-`0035` → khớp đúng tên file. Chi tiết đầy
     đủ: CHANGELOG.md 2026-07-29.
- ⚠️ **13 migration còn lại KHÔNG xử lý, chấp nhận là gap vĩnh viễn** (không
  phải lệch cần vá — mở rộng đúng tiền lệ đã có cho `0017`/`0018`):
  - `0017`, `0018` — có bản thay thế tương đương
    (`0030_create_van_hanh_tables_production` tạo lại đúng các bảng đó từ đầu
    bằng UUID), không cần replay 2 file bigint cũ.
  - `0030`, `0031`, `0032` — nội dung file local (top-level) và nội dung thật
    đã chạy trên production (`production-followups/*_production.sql`) **khác
    nhau thật sự** (đặc biệt `0030` là 2 migration hoàn toàn khác nhau) — ép
    khớp version sẽ ghi sai lịch sử, nên giữ nguyên 3 dòng này với tên/version
    gốc (`0030_create_van_hanh_tables_production` v.v., version vẫn là
    timestamp tự sinh).
  - `0003`-`0010` — chưa từng có dòng lịch sử migration nào trên production
    (áp dụng từ trước khi project dùng cơ chế `schema_migrations` để track);
    `docs/roadmap.md` tự cảnh báo không tin file `0003` khớp production thật
    — không đủ cơ sở để backfill an toàn, để nguyên.
  - **Hệ quả:** Action `db-parity-check` sẽ **FAIL cho tới khi thêm allowlist**
    cho đúng 13 tên này vào workflow (chưa làm — xem Mục 7). Không phải bug,
    là nợ kỹ thuật lịch sử đã biết rõ nguồn gốc.
- ⚠️ 5 migration mồ côi trên staging (Mục 1, `0021_uuidv7_pin_search_path`
  và 4 file khác) chưa được ghi lại thành file chính thức trong repo — nợ kỹ
  thuật lịch sử, không chặn Lớp 3 (vì đã áp cả hai môi trường theo cách khác
  nhau, không lệch giữa staging/prod ở các bảng liên quan) nhưng nên dọn để
  lịch sử migration phản ánh đúng thực tế DB.

---

## 7. Open Questions

- Chưa quyết định: có tự động hoá bước **apply** migration lên production
  trong CI hay không (hiện tại Lớp 3 chỉ **kiểm tra**, chưa **thi hành**).
  Để ngỏ vì tự động apply DDL lên production không giám sát mang rủi ro
  riêng — cần bàn riêng nếu muốn đi tiếp bước này.
- **Chưa làm:** thêm allowlist 13 migration đã biết (Mục 6) vào
  `.github/workflows/db-parity-check.yml` để Action có thể thật sự PASS —
  hiện tại nó sẽ FAIL cho 13 tên này ở lần chạy đầu tiên, đúng dự kiến, không
  phải bug. Cần quyết định cách thể hiện allowlist trong workflow (mảng tên
  cứng kèm comment giải thích từng dòng, ưu tiên đơn giản — xem Mục 4).
