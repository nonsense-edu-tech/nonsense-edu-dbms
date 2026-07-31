# ADR-005: CI tự động áp migration Expand lên production (đóng Open Question ADR-004 §7)

**Status:** Accepted
**Date:** 2026-07-30
**Deciders:** Nguyen (Hiệu trưởng)
**Quan hệ với ADR-004:** Không thay đổi 3 luật cứng (a)/(b)/(c) — ADR này chỉ
định nghĩa **cách thi hành** luật (a) (migration chỉ vào production qua
pipeline ship code) mà trước đây CI mới chỉ kiểm tra, chưa thực hiện. Đóng
thẳng Open Question ở ADR-004 Mục 7.

---

## 1. Bối cảnh

ADR-004 luật (a) quy định: migration chỉ được vào production qua "merge →
CI apply" — cấm mọi hình thức áp tay (SQL Editor, `supabase db push` từ máy
cá nhân, MCP `apply_migration` trực tiếp lên production). Nhưng tới thời
điểm này, `db-parity-check.yml` mới **kiểm tra** (Lớp 3, xem ADR-004 Mục 4)
chứ chưa **thi hành** apply — để ngỏ ở Mục 7 vì lo ngại chạy DDL không giám
sát lên production.

Hệ quả thực tế phát sinh khi merge migration `0036` (schema QA đánh giá chất
lượng đào tạo, PR #3) vào `main`: `db-parity-check` báo migration thiếu trên
production như thiết kế, nhưng **không có con đường nào hợp luật** để đưa nó
lên production — mọi cách áp tay đều bị luật (a) cấm, còn CI thì chưa biết
tự apply. Đây là khoảng trống thật giữa "phải làm gì" (luật (a)) và "vận
hành ra sao" (chưa định nghĩa), không phải lỗi tuân thủ.

## 2. Vì sao không tự động hoá 100%

Luật (b) ADR-004: migration **Contract** (đổi tên/kiểu cột, `DROP`) chỉ được
áp lên production **sau khi** code phụ thuộc schema mới đã chạy thật, ổn
định trên production. "Đã chạy thật, ổn định" là **phán đoán của con người**
(đã deploy xong chưa, có lỗi runtime nào không, đã thử qua các luồng chính
chưa) — không có tín hiệu máy nào đủ tin cậy để tự xác nhận điều này. Vì
vậy CI **không thể** tự động áp Contract một cách an toàn.

Ngược lại, migration **Expand** (thêm bảng/cột/hàm, backward-compatible
theo đúng định nghĩa luật (c)) không phụ thuộc thứ tự trước/sau so với code
deploy — an toàn để tự động, miễn còn một lớp giám sát cuối.

## 3. Quyết định

Thêm 2 job mới vào `.github/workflows/db-parity-check.yml`, tách theo loại
migration:

- **`classify-pending-migrations`** — chạy trên mọi `push`/`schedule` (không
  chạy khi trigger là `workflow_dispatch`). Tìm các migration có trong repo
  nhưng chưa áp lên production (tái dùng đúng logic parse của job
  `migration-parity` đã có), loại bỏ allowlist nợ kỹ thuật lịch sử (ADR-004
  Mục 6). Với mỗi migration còn lại, đọc 15 dòng đầu file tìm comment chuẩn
  `-- adr004-type: expand`. Không có tag, hoặc tag khác `expand` → mặc định
  coi là **contract** (an toàn hơn — bắt buộc duyệt tay).

- **`apply-migration-expand`** — chỉ chạy khi `classify-pending-migrations`
  xác nhận **có** migration đang chờ và **tất cả** đều tag `expand`. Chạy
  `supabase db push --linked`. Gate bằng GitHub Environment `production-db`
  (yêu cầu 1 người duyệt trong GitHub UI trước khi job thật sự thực thi) —
  lưới an toàn cuối, không dựa hoàn toàn vào tag tự khai.

- **`apply-migration-contract-manual`** — chỉ chạy qua trigger
  `workflow_dispatch` thủ công, với 2 input bắt buộc: `apply_migration` (số
  migration, để ghi log/đối chiếu) và `confirm_code_live` (phải gõ đúng
  chuỗi cố định `code-da-live-tren-production`). Sai chuỗi xác nhận → job
  fail ngay, không chạm DB. Cũng gate qua Environment `production-db`.

- Job `migration-parity` (đã có, giữ nguyên logic) chạy **sau** 2 job apply
  (`needs: [...]`, `if: always()`) — trở thành bước xác nhận cuối, không còn
  là bước duy nhất.

Migration nào không khai báo tag `adr004-type` (toàn bộ file cũ, và mọi file
mới nếu quên) mặc định rơi vào nhánh **contract** — nghĩa là **không** tự
động, luôn cần duyệt tay + xác nhận rõ ràng. Đây là lựa chọn cố ý: an toàn
hơn là tự động nhầm.

## 4. Việc con người cần làm 1 lần

Tạo GitHub Environment tên `production-db` trong Settings → Environments,
thêm **required reviewers** (ít nhất 1 người, ví dụ chủ dự án). Không có
bước này, `environment: production-db` trong job sẽ tự tạo environment
không có bảo vệ — mất hết ý nghĩa gate. Đây là bước KHÔNG thể làm qua công
cụ MCP/CLI hiện có, cần thao tác tay trên GitHub UI.

## 5. Hệ quả

- Migration Expand (đa số các trường hợp thường gặp — thêm bảng/cột mới)
  không còn kẹt lại sau khi merge: CI tự phát hiện, tự chạy `db push`, chỉ
  cần 1 cú duyệt trên GitHub thay vì một quy trình áp tay không có đường đi
  hợp luật như trước ADR này.
- Migration Contract vẫn đúng tinh thần luật (b) — luôn cần người xác nhận
  rõ ràng bằng thao tác gõ tay, không thể bấm nhầm hay quên.
- `migration-parity` vẫn là lưới cuối cùng xác nhận trạng thái thật sau khi
  các job apply chạy (hoặc không chạy) — không có gì thay đổi ở lớp kiểm
  tra đã verify hoạt động đúng từ trước.

## 6. Ghi chú áp dụng cho migration đang chờ

Migration `0036_danh_gia_chat_luong_dao_tao.sql` (PR #3, đã merge vào
`main`) là **Expand** thuần — được gắn tag `-- adr004-type: expand` trong
cùng đợt thay đổi này, dùng làm ca thử nghiệm đầu tiên của pipeline mới.
