# ADR-003: Chuyển đổi toàn bộ khóa chính sang UUIDv7

**Status:** Accepted
**Date:** 2026-07-22
**Deciders:** Nguyen (Hiệu trưởng)
**Supersedes:** **CHỈ** luật #1 của ADR-002 ("bigint cho mọi bảng, không dùng UUID"). Mọi luật khác của ADR-002 (#2-#8: định dạng mã bất biến, tiền là bigint, RBAC 3 bảng phạm vi, tài chính gắn `hop_dong_hoc_phi`, RLS chỉ thêm không sửa, ẩn chi phí...) **giữ nguyên hiệu lực, không đổi.**

---

## 1. Bối cảnh — vì sao đổi ý so với ADR-002

ADR-002 chọn bigint vì hệ thống lúc đó thuần nội bộ (chỉ nhân viên dùng). Kế hoạch sắp tới có **LMS tự build cho học sinh đăng nhập** và **cổng phụ huynh xem học phí/report** — hệ thống mở ra bên ngoài, nhiều frontend/dev hơn chạm vào bề mặt công khai. Rủi ro "lộ ID tuần tự qua API" (lý do gốc từng cân nhắc rồi gạt bỏ vì khi đó chưa có use-case) giờ có cơ sở thật. **UUIDv7** được chọn thay vì v4/v6 vì: đơn giản hơn để tự viết hàm (Postgres 17 hiện tại chưa có sẵn), không rò rỉ thông tin node/MAC như v6, và là khuyến nghị mặc định của RFC 9562 cho hệ thống mới.

**Xác nhận qua Supabase MCP (`list_tables`, 22/07/2026, project `DBMS Project (Jul2026)`):** đã lấy đầy đủ, chính xác 24 bảng + toàn bộ cột/PK/FK — không có bảng nào còn là ẩn số. Tổng dữ liệu hiện có toàn hệ thống chỉ **~186 dòng** (chi tiết Mục 3) — đây là thời điểm rẻ nhất để đổi.

**Quyết định phạm vi (đã chốt):** chuyển đổi **triệt để**, bao gồm cả 5 bảng danh mục đang dùng **mã nghiệp vụ làm khóa chính** (`cap_hoc`, `chuong_trinh`, `mon_hoc`, `hinh_thuc`, `dang_cau`) — thêm UUID làm PK mới, đổi toàn bộ FK liên quan (khoảng 8 bảng khác) sang trỏ UUID thay vì mã.

---

## 2. Quyết định (luật thay thế ADR-002 luật #1)

> **Khóa chính: UUIDv7 (qua hàm `public.uuidv7()` tự viết) cho MỌI bảng, không ngoại lệ — kể cả bảng đang dùng mã nghiệp vụ làm khóa tự nhiên.**

Nguyên tắc đi kèm (nhắc lại, không đổi so với ADR-002):

- **Mã nghiệp vụ hiển thị giữ nguyên tuyệt đối** — `ma_lop`, `ma_hoc_sinh`, `ma_cau_hoi`, và `ma` của 5 bảng danh mục. Chỉ thêm UUID làm khóa kỹ thuật song song, **không đổi định dạng/giá trị** mã hiển thị.
- **Cột `GENERATED`** (`lop.cap_hoc_ma`/`chuong_trinh_ma`/`nam_hoc`/`so_lop`, `hoc_sinh.stt`, `cau_hoi.cap_hoc`/`chuong_trinh`/`mon_hoc`/`hoc_phan`/`bai_hoc`/`chu_de`/`dang_cau`/`stt_cau`) **giữ nguyên, không đụng** — chúng tính từ chuỗi mã (`ma_lop`/`ma_hoc_sinh`/`ma_cau_hoi`), hoàn toàn độc lập với việc đổi kiểu cột `id`.
- **Tiền vẫn `bigint`** — ngoài phạm vi ADR này.

---

## 3. Baseline schema đã xác nhận — phân loại theo độ phức tạp chuyển đổi

### Nhóm A — Đã là UUID, không cần làm gì
- `users.id` (đã UUID, tham chiếu `auth.users.id`)

### Nhóm B — Surrogate `bigint identity` → UUID (đổi kiểu trực tiếp, không đổi cấu trúc)

`user_pham_vi`, `hoc_phan`, `bai_hoc`, `user_bai_hoc`, `lop`, `hoc_sinh`, `ghi_danh`, `ngu_lieu`, `cau_hoi`, `lua_chon`, `de`, `de_cau_hoi`, `goi_hoc_phi`, `hop_dong_hoc_phi`, `ky_dong_hoc_phi`, `tep_dinh_kem`, `phieu_thu`, `nhat_ky_tai_chinh`, `chi_nhanh`, `user_chi_nhanh` (19 bảng).

**Số dòng hiện có** (quyết định bảng nào cần backfill cẩn thận, bảng nào có thể đổi thẳng vì đang rỗng):

| Bảng | Số dòng | Cách xử lý |
|---|---:|---|
| `hoc_sinh` | 69 | Cần backfill cẩn thận (Mục 4) |
| `ghi_danh` | 69 | Cần backfill cẩn thận |
| `lop` | 6 | Cần backfill cẩn thận |
| `goi_hoc_phi` | 3 | Cần backfill cẩn thận |
| Tất cả bảng còn lại trong Nhóm B | 0 | **Đổi kiểu trực tiếp**, không cần backfill (không có dữ liệu để mất) |

### Nhóm C — Khóa tự nhiên → thêm UUID PK mới (thay đổi cấu trúc lớn hơn)

| Bảng | PK hiện tại | Số dòng | Ghi chú |
|---|---|---:|---|
| `cap_hoc` | `ma` (smallint) | 2 | |
| `chuong_trinh` | `ma` (char(3)) | 4 | |
| `mon_hoc` | PK kép `(ma, cap_hoc_ma)` | 18 | Sau khi có `id` UUID, các bảng tham chiếu chỉ cần 1 cột FK thay vì 2 |
| `hinh_thuc` | `ma` (smallint) | 5 | Hiện chưa có bảng nào FK tới đây (module tài liệu GĐ3 chưa xây) |
| `dang_cau` | `ma` (smallint) | 8 | Hiện chưa có bảng nào FK tới đây (`cau_hoi.dang_cau` là cột GENERATED từ `ma_cau_hoi`, không phải FK) |

**Cột FK cần thêm mới** (thay thế dần FK trỏ vào mã, theo quyết định "triệt để"):

| Bảng con | Cột FK cũ (trỏ vào mã) | Cột mới cần thêm | Trỏ tới |
|---|---|---|---|
| `mon_hoc` | `cap_hoc_ma` | `cap_hoc_id` | `cap_hoc.id` |
| `lop` | `cap_hoc_ma` (cột GENERATED, giữ nguyên) | `cap_hoc_id` | `cap_hoc.id` |
| `lop` | `chuong_trinh_ma` (cột GENERATED, giữ nguyên) | `chuong_trinh_id` | `chuong_trinh.id` |
| `user_pham_vi` | `cap_hoc_ma` | `cap_hoc_id` | `cap_hoc.id` |
| `user_pham_vi` | `mon_hoc_ma` | `mon_hoc_id` | `mon_hoc.id` |
| `hoc_phan` | `cap_hoc_ma` + `mon_hoc_ma` | `mon_hoc_id` (gộp 2 cột cũ thành 1) | `mon_hoc.id` |
| `goi_hoc_phi` | `chuong_trinh_ma` | `chuong_trinh_id` | `chuong_trinh.id` |
| `ngu_lieu` | `cap_hoc_ma` + `mon_hoc_ma` (hiện KHÔNG có FK constraint, chỉ là cột thường) | `mon_hoc_id` | `mon_hoc.id` — **OQ-12 đã chốt: chính thức hóa thành FK thật** trong đợt này (trước đây chỉ là tham chiếu lỏng, không được CSDL enforce) |

> **Quan trọng:** `lop.cap_hoc_ma`/`chuong_trinh_ma` là cột `GENERATED` nhưng **vẫn có FK constraint thật** (`fk_lop_cap_hoc`, `fk_lop_chuong_trinh` — Postgres cho phép FK trên cột generated). **Giữ nguyên các FK này song song**, chỉ thêm cột `cap_hoc_id`/`chuong_trinh_id` mới bên cạnh, không xóa gì của hệ ID cũ.

### Trường hợp đặc biệt cần xử lý riêng, không đoán bừa

- **`nhat_ky_tai_chinh.doi_tuong_id`** — cột **đa hình** (không có FK constraint chính thức), tham chiếu ID của nhiều bảng khác nhau tùy giá trị cột `doi_tuong` (text, ví dụ `'hop_dong_hoc_phi'`, `'phieu_thu'`...). Đổi kiểu bigint→UUID được, nhưng **CSDL không tự kiểm tra tính đúng đắn** — Claude Code cần đọc code ứng dụng đang ghi vào cột này để đảm bảo logic tương ứng cũng đổi theo, không dựa vào FK constraint (không có).
- **`phieu_thu.phieu_dao_cua_id`** — tự tham chiếu (self-referencing FK, trỏ về chính `phieu_thu.id`) — xử lý đúng thứ tự trong bước "contract" (Mục 4) để không vi phạm ràng buộc tạm thời khi bảng đang tự trỏ vào chính nó.
- **`hop_dong_hoc_phi.ghi_danh_id`** có ràng buộc `UNIQUE` (1-1) — giữ nguyên khi đổi kiểu, không được mất.

---

## 4. Chiến lược kỹ thuật bắt buộc: Expand — Backfill — Contract — Verify

**Không đổi kiểu cột bằng một câu `ALTER COLUMN TYPE` duy nhất** cho bảng có dữ liệu — rủi ro mất khớp FK giữa chừng. Với bảng **có dữ liệu** (`cap_hoc`, `chuong_trinh`, `mon_hoc`, `hinh_thuc`, `dang_cau`, `lop`, `hoc_sinh`, `ghi_danh`, `goi_hoc_phi`), mỗi bảng đi qua 4 bước:

1. **EXPAND:** thêm cột mới `id_new UUID DEFAULT public.uuidv7()` (không `NOT NULL` vội) — với bảng Nhóm C, thêm `id UUID DEFAULT public.uuidv7()` (tên chính thức luôn, vì đây là cột hoàn toàn mới, không phải đổi tên PK cũ).
2. **BACKFILL:** bảng cha tự sinh `id_new` qua `DEFAULT` khi đã có cột; bảng con populate cột FK mới bằng join theo giá trị cũ, ví dụ:
   ```sql
   update lop set cap_hoc_id = (select id from cap_hoc where ma = lop.cap_hoc_ma);
   ```
3. **CONTRACT** (trong 1 transaction cho từng nhóm bảng liên quan trực tiếp): xóa FK cũ trỏ vào `id` cũ (giữ nguyên FK trỏ vào mã như đã nói ở Mục 3), đổi tên `id` cũ → `id_old` (không xóa ngay, giữ để rollback), đổi tên `id_new` → `id`, thêm lại PK/FK/`UNIQUE` trên cột mới, thêm `NOT NULL`.
4. **VERIFY:** đối chiếu số dòng trước/sau, đối chiếu vài bản ghi mẫu nối đúng quan hệ cũ↔mới (ví dụ: học sinh X vẫn thuộc đúng lớp Y sau khi đổi).

Với bảng **đang rỗng** (0 dòng — 15/19 bảng Nhóm B) — **không cần bước BACKFILL**, có thể đổi kiểu cột `id` trực tiếp rồi thêm lại `DEFAULT public.uuidv7()`, vì không có dữ liệu nào để mất khớp.

---

## 5. Thứ tự chuyển đổi (theo đúng đồ thị phụ thuộc FK — cha trước con)

**Phase 1** (độc lập, không phụ thuộc bảng nào khác đang chuyển đổi):
`chi_nhanh`, `cap_hoc`, `chuong_trinh`, `hinh_thuc`, `dang_cau`, `tep_dinh_kem`, `de`

**Phase 2** (phụ thuộc Phase 1):
`mon_hoc` (phụ thuộc `cap_hoc`), `user_chi_nhanh` (phụ thuộc `chi_nhanh`, `users`), `goi_hoc_phi` (phụ thuộc `chuong_trinh`)

**Phase 3** (phụ thuộc Phase 1-2):
`user_pham_vi` (phụ thuộc `cap_hoc`, `mon_hoc`, `users`), `hoc_phan` (phụ thuộc `mon_hoc`), `lop` (phụ thuộc `cap_hoc`, `chuong_trinh`, `chi_nhanh`, `users`)

**Phase 4:**
`bai_hoc` (phụ thuộc `hoc_phan`), `hoc_sinh` (phụ thuộc `lop`, `users`)

**Phase 5:**
`user_bai_hoc` (phụ thuộc `bai_hoc`, `users`), `ngu_lieu` (phụ thuộc `hoc_phan`, `bai_hoc`, `mon_hoc` — **thêm `mon_hoc_id UUID NOT NULL REFERENCES mon_hoc(id)` là FK THẬT, khác với `cap_hoc_ma`/`mon_hoc_ma` cũ vốn không có ràng buộc, OQ-12 đã chốt**), `ghi_danh` (phụ thuộc `hoc_sinh`, `lop`)

**Phase 6:**
`cau_hoi` (phụ thuộc `ngu_lieu`), `hop_dong_hoc_phi` (phụ thuộc `ghi_danh`, `goi_hoc_phi`)

**Phase 7:**
`lua_chon`, `de_cau_hoi` (phụ thuộc `cau_hoi`, `de`), `ky_dong_hoc_phi` (phụ thuộc `hop_dong_hoc_phi`)

**Phase 8** (cuối cùng, phức tạp nhất — có self-reference và cột đa hình):
`phieu_thu` (phụ thuộc `hop_dong_hoc_phi`, `ky_dong_hoc_phi`, `tep_dinh_kem`, tự tham chiếu `phieu_dao_cua_id`), `nhat_ky_tai_chinh` (cột đa hình, xử lý thủ công riêng — xem Mục 3)

---

## 6. Rà soát hàm/trigger đã có — bắt buộc, không đoán

Trước khi coi migration hoàn tất, đọc lại từng hàm sau, xem có khai báo tham số/biến ép kiểu `bigint` tường minh không (nếu có, phải sửa sang `uuid`):

`tao_lop()`, `tao_hoc_sinh()`, `forbid_hoc_sinh_id_change()`, `forbid_hoc_sinh_soft_delete_by_non_master()`, `forbid_lop_soft_delete_by_non_master()`, `forbid_hop_dong_soft_delete_by_non_master()`, `forbid_phieu_thu_mutation()`, `tao_ma_phieu_thu()`, `auth_role()`.

Đặc biệt chú ý `tao_lop()`/`tao_hoc_sinh()` có tham số kiểu `bigint` (`p_chi_nhanh_id bigint`) — cần đổi sang `uuid` khớp cột mới.

---

## 7. Điều kiện tiên quyết (thứ tự bắt buộc)

1. Viết + kiểm thử hàm `public.uuidv7()` — **mức Trung bình** đã chốt trước đây (không trùng lặp ở quy mô lớn + đúng thứ tự tăng dần dưới ghi đồng thời).
2. Tạo Supabase branch riêng cho toàn bộ kịch bản này (không dùng chung branch thử nghiệm cũ của `0015`/`0016`, vì đây là thay đổi diện rộng hơn nhiều).
3. Chạy **toàn bộ 8 phase trên branch/staging trước**, đối chiếu số liệu từng phase, rồi mới lên production.
4. Backup/snapshot production trước khi bắt đầu (dù dữ liệu nhỏ, vẫn nên có điểm khôi phục).

---

## 8. Cập nhật cần thiết cho `CLAUDE_new_22.07.26.md`

- Đổi dòng "Khóa chính: `bigint`..." thành "Khóa chính: **UUIDv7** cho mọi bảng qua `public.uuidv7()`."
- Thêm dòng trỏ tới `docs/adr/ADR-003-...md` bên cạnh ADR-002 (ADR-002 vẫn đúng cho mọi luật khác, chỉ luật PK bị ADR-003 thay).
- Cập nhật "Đã xây xong": `0015`-`0018` (chi nhánh, `quan_ly_chi_nhanh`) đã dùng `bigint` khi tạo — **sẽ được cuốn theo Phase 1-3 của kế hoạch này**, không cần viết riêng.

---

## 9. Open Questions

- **OQ-3** (kế thừa ADR-001) — vẫn mở, không liên quan ADR này.
- ~~**OQ-12:** chính thức hóa FK cho `ngu_lieu`/`cau_hoi` → `mon_hoc`?~~ **ĐÃ CHỐT (22/07/2026): Làm luôn trong đợt này.** `ngu_lieu.mon_hoc_id` sẽ là FK thật (`NOT NULL REFERENCES mon_hoc(id)`), thay cho cột `cap_hoc_ma`/`mon_hoc_ma` cũ không có ràng buộc — xem Phase 5, Mục 5.

**Sau quyết định này, ADR-003 không còn câu hỏi mở nào (ngoài OQ-3 kế thừa) — sẵn sàng giao cho Claude Code thực hiện.**
