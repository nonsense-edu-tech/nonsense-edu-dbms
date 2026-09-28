# Lộ trình triển khai — Nonsense Edu (ERP giáo dục, tổ chức theo 5 khối)

Nguồn: bảng theo dõi tiến độ gốc (71 đầu việc, 5 giai đoạn GĐ0-GĐ4). **Tổ chức
lại theo 5 khối nghiệp vụ** (khớp `CLAUDE_new_22.07.26.md`) thay vì theo giai đoạn thời gian,
vì hệ thống đã được xác định là ERP đa khối, không chỉ là "hệ thống ID" theo 4
giai đoạn tuyến tính ban đầu. Cập nhật trạng thái ở đây khi hoàn thành để
Claude Code nắm được đang ở đâu.

**Lưu ý:** có một roadmap RIÊNG, song song — "roadmap song song ERP/Vận
hành" (file Excel `roadmap_song_song_ERP_va_van_hanh`, sheet "Roadmap chi
tiết", mã việc dạng `E<số>.<số>-<số>`) — không nằm trong repo này, chỉ được
người dùng nhắc tới qua chat. File `roadmap.md` này KHÔNG theo dõi các mã
`E*` đó; khi 1 việc từ roadmap song song đó có ảnh hưởng tới schema/code
trong repo (ví dụ `E1.1` → migration `0036`), chỉ ghi tắt 1 dòng tham chiếu
ở đúng khối liên quan, không tái tạo toàn bộ roadmap Excel ở đây.

## Bản đồ: giai đoạn cũ (GĐ0-GĐ4) ↔ 5 khối (để tra cứu lịch sử)

| Giai đoạn cũ | Nội dung | Khối tương ứng |
|---|---|---|
| GĐ0 | Chuẩn bị ID, Hikvision, dữ liệu học viên | Khối 2, 3 |
| GĐ1 | Nhân sự/RLS + lớp/học sinh + điểm danh Hikvision | Khối 1, 2 |
| GĐ2 | Chấm công, báo cáo phụ huynh, CRM tuyển sinh | Khối 2 |
| GĐ3 | Ngân hàng câu hỏi, tài liệu | Khối 3 |
| GĐ4 | QA, đa chi nhánh, scale, nhật ký | Khối 2, 4, 5 |
| *(ngoài GĐ, làm sau)* | Module hợp đồng học phí, chi nhánh | Khối 4, 5 |

## Trạng thái tổng quan

- ✅ Trang đăng nhập (email/password) — đã deploy Vercel, **đã xác nhận đăng nhập
  thành công thật trên production** (19/07/2026). Trước đó từng tưởng xong nhưng
  thực chất chưa chạy được, do 2 lỗi: (1) code nằm ở project con
  `nonsense-edu-login-fe/` tách biệt, Vercel build nhầm project gốc (đã gộp vào
  `src/`); (2) `NEXT_PUBLIC_SUPABASE_URL` trên Vercel bị dư đuôi `/rest/v1`
  (đã sửa lại đúng Project URL trần). Cả hai đã fix ở commit `50796f0` + cấu
  hình lại env var.
- ✅ 2 project Supabase: `DBMS Project (Jul2026)` = **production**,
  `nonsense-edu-staging` = **staging** (email đăng ký nền tảng:
  `it@nonsense.edu.vn` — KHÔNG phải tài khoản đăng nhập app; tài khoản đăng
  nhập app thật là `nguyen@nonsense.edu.vn` = `master_admin`).
- ⚠️ **QUAN TRỌNG — phát hiện 19/07/2026, vẫn còn hiệu lực:** toàn bộ schema
  gốc (`cap_hoc`, `chuong_trinh`, `mon_hoc`, `hinh_thuc`, `dang_cau`,
  `hoc_phan`, `bai_hoc`, `users`, `user_pham_vi`, `user_bai_hoc`, `lop`,
  `hoc_sinh`, `ghi_danh`, `ngu_lieu`, `cau_hoi`, `lua_chon`, `de`,
  `de_cau_hoi`) **đã được tạo thẳng trên Supabase production qua một phiên
  chat Claude khác, KHÔNG đi qua migration file trong repo này.** Từ giờ,
  trước khi viết migration mới, **luôn kiểm tra cấu trúc bảng thật qua SQL
  Editor** (`information_schema.columns`, `pg_policies`, `pg_constraint`)
  thay vì tin vào `docs/dac-ta-he-thong.md` hay các file migration cũ — cả
  hai đều từng lệch so với thực tế (xem "Ghi chú migration" cuối file).
- ✅ **CẬP NHẬT 31/07/2026 (xác nhận trực tiếp qua Supabase MCP, không suy
  đoán từ tài liệu cũ):** migration `0001`-`0036` **đã áp dụng đầy đủ trên
  CẢ staging lẫn production**, không còn khối nào "chỉ ở staging" như các
  bản ghi cũ hơn của file này từng nói. Bao gồm cả `0017`-`0032` (vận hành
  lớp học/loại phòng/phòng học/buổi học/**ADR-003 chuyển UUID 8 phase**) —
  các đoạn dưới đây của file này (Khối 2, Khối 4) từng ghi "chỉ có trên
  staging" cho các mục này, nay **không còn đúng**, xem ghi chú cập nhật tại
  từng mục. `0036` (schema QA tầng nhẹ — đánh giá chất lượng đào tạo, việc
  khác ngoài 5 khối ERP gốc, xem `CLAUDE.md` phần "roadmap song song
  ERP/Vận hành") cũng đã lên production, xem Khối 2. Xem `docs/CHANGELOG.md`
  để biết chi tiết từng migration + lịch sử các lần vá lệch sổ sách.
- 📄 Kiến trúc chính thức: `docs/adr/ADR-002-mo-rong-tren-nen-production-that.md`
  (luật PK đã bị `docs/adr/ADR-003-chuyen-doi-uuid-toan-bo.md` thay — xem
  CLAUDE_new_22.07.26.md).
- 📄 **Nhật ký từng lần deploy: `docs/CHANGELOG.md`** — bắt buộc cập nhật sau
  MỖI lần áp dụng migration hoặc thay đổi đáng kể, ghi rõ đã lên staging hay
  production hay cả hai. Đọc file này trước khi báo cáo trạng thái chung.

---

## Khối 1 — Quản lý nhân sự

- ⚠️ **Vai trò thật khác đặc tả cũ:** `master_admin` (quyền cao nhất) →
  `admin_ht` (theo cấp học, qua `user_pham_vi`) → `truong_bm` (theo cấp
  học+môn học) → `gv` (theo bài học, qua `user_bai_hoc`); cộng `admin_ts`
  (tuyển sinh, ngang hàng master_admin cho riêng `lop`/`hoc_sinh`/`ghi_danh`),
  `ke_toan`/`thu_ngan` (tài chính). `trang_thai` chỉ `active`/`disabled`
  (không có "chờ duyệt"). Mọi bảng dùng **xoá mềm** (`deleted_at`).
- ✅ Bảng `users`, `user_pham_vi`, `user_bai_hoc` + RLS theo vai trò — có sẵn
  trên production.
- ✅ **CẬP NHẬT 29/09/2026 — Module "Quản lý người dùng" hoàn chỉnh, đã lên
  production** (migration `0042`, xem `CHANGELOG.md`): thay hẳn mô tả cũ bên
  dưới.
  - `/dashboard/users` (gate `master_admin`): danh sách + sửa nhanh
    `vai_tro`/`trang_thai`, trang chi tiết từng tài khoản (gán/gỡ
    `user_pham_vi` + `user_chi_nhanh` qua UI — **không còn phải qua SQL
    Editor**), lịch sử thao tác (bảng `nhat_ky` mới, dùng chung toàn hệ
    thống).
  - **Tạo tài khoản qua UI** (không còn mời qua Supabase Dashboard): 2 luồng
    — master_admin tạo mọi vai trò (xác thực mật khẩu 2 lần khi tạo thêm
    master_admin mới); admin_ht tự cấp GV/Trợ giảng cho đúng chi nhánh mình
    quản lý qua RPC `admin_ht_tao_nhan_su` (SECURITY DEFINER, tự kiểm tra
    quyền, không tin tầng ứng dụng). Mật khẩu mặc định cố định
    `NonsenseEdu@123`, bắt đổi ở lần đăng nhập đầu (`phai_doi_mat_khau`).
  - **Đã bỏ hẳn "khoá cứng qua UI"** — thay bằng trigger CSDL
    `trg_chan_mat_master_admin_cuoi` (chặn tự hạ vai trò/khoá/xoá mềm
    master_admin cuối cùng, ở tầng CSDL, không phải quy ước UI) + **không
    còn policy DELETE nào trên `users`** (quyết định 28/09/2026: không ai
    xoá cứng tài khoản, kể cả master_admin — dùng xoá mềm/khôi phục).
- ✅ **Vai trò `quan_ly_chi_nhanh` + bảng `user_chi_nhanh`** (phụ trách tuyển
  sinh/giáo vụ/phòng học cho 1 chi nhánh) — code xong ở migration
  `0016_vai_tro_quan_ly_chi_nhanh.sql`, **đã áp dụng thật trên cả staging lẫn
  production**. RLS thêm dạng policy MỚI (không sửa policy
  `admin_ts`/`master_admin` đang chạy).
- ✅ **CẬP NHẬT 31/07/2026:** bảng mã gốc đã có dữ liệu thật trên production
  (xác nhận qua Supabase MCP) — `cap_hoc` (2 dòng), `chuong_trinh` (4 dòng),
  `mon_hoc` (18 dòng), `hinh_thuc` (5 dòng), `dang_cau` (8 dòng). Mục "🔲 chưa
  có dữ liệu thật" trước đây không còn đúng.
- 🔲 Cấu hình đăng nhập (giới hạn theo domain trung tâm nếu cần).
- 🔲 Kiểm thử phân quyền qua **giao diện web thật** (đã kiểm qua SQL Editor,
  chưa test UI — cần chạy migration `0004` trước, xem Khối 2).

## Khối 2 — Học sinh & Enrollment

**Trạng thái tổng quan (CẬP NHẬT 31/07/2026): phần lõi (CRUD + vòng đời ghi
danh) đã hoàn thiện và đã lên CẢ staging lẫn production** — xác nhận qua
Supabase MCP: `lop` (6 dòng), `hoc_sinh` (69 dòng), `ghi_danh` (69 dòng) đều
có dữ liệu thật trên production, không còn "chỉ ở staging" như bản ghi
24/07/2026 trước đây. Đây là khối tiến bộ nhiều nhất tính đến nay.

- ✅ Bảng `lop`/`hoc_sinh`/`ghi_danh` — khóa chính đã là `uuid` (ADR-003,
  xem Khối 5). Mã nghiệp vụ (`ma_lop` 9 số, `ma_hoc_sinh` 12 số, cột
  `GENERATED`) giữ nguyên định dạng, không đổi.
- ✅ **Tạo ID lớp/học sinh** — `tao_lop()`/`tao_hoc_sinh()` (advisory lock
  chống trùng, trigger bất biến mã, tự tạo `ghi_danh`) đã chạy đúng trên cả
  staging lẫn production. Đã vá 1 lỗi thật phát hiện qua test: tính STT/so_lop
  tiếp theo trước đây bỏ qua dòng đã xoá mềm → đụng mã cũ sau khi xoá rồi tạo
  lại; đã sửa để không bao giờ tái sử dụng mã (đúng nguyên tắc "cố định vĩnh
  viễn").
- ✅ **CRUD đầy đủ `lop`/`hoc_sinh`** (staging) — sửa/xoá hoạt động đúng cho
  mọi cột, gồm cả 11 cột bổ sung học sinh (`0007`: `ngay_sinh`, `gioi_tinh`,
  `email`, `sdt_hoc_sinh`, `cccd`, `truong_thpt`, `khoi_thi`, `nv1`,
  `ten_phu_huynh`, `dia_chi`, `tinh_trang_dang_ky`) và cột lớp (`0009`:
  `ngay_khai_giang`, `ngay_ket_thuc`, `tinh_trang` multi-select).
- ✅ **Luồng chuyển lớp** (mới, staging) — hàm `chuyen_lop()`: đóng `ghi_danh`
  cũ (trạng thái mới `da_chuyen_lop`), mở `ghi_danh` mới cho lớp đích, cập
  nhật `hoc_sinh.lop_hien_tai_id` — `lop_nhap_hoc_id`/`ma_hoc_sinh` bất biến.
- ✅ **Quản lý trạng thái ghi danh** (staging) — đổi trực tiếp trong bảng
  (`dang_hoc`/`da_nghi`/`bao_luu`/`hoan_thanh`/`da_chuyen_lop`), tự đóng/mở
  `ngay_ket_thuc` theo trạng thái.
- ✅ **UI cho vai trò `quan_ly_chi_nhanh`** (staging) — tạo/sửa lớp + học
  sinh đúng phạm vi chi nhánh được gán. RLS đọc (`p_read`) vốn mở cho mọi vai
  trò (chỉ ghi mới bị khoá theo chi nhánh) nên việc "chỉ thấy đúng phạm vi"
  được lọc thêm ở tầng ứng dụng (không dựa được vào RLS cho phần hiển thị).
- ✅ Lọc/tìm kiếm học sinh theo lớp, chi nhánh, trạng thái ghi danh.
- ✅ **Toast thông báo** thành công/thất bại cho mọi action (quy ước bắt buộc
  từ nay, xem `CLAUDE_new_22.07.26.md`).
- ✅ Vá xong lỗi RLS nghiêm trọng phát hiện qua test thật: policy ghi
  (`FOR ALL`) có `deleted_at IS NULL` trong `USING` từng làm Postgres từ chối
  toàn bộ thao tác xoá mềm (vì USING của `FOR ALL` cũng chi phối SELECT) —
  chi tiết kỹ thuật xem `docs/CHANGELOG.md`.
- ✅ **CẬP NHẬT 31/07/2026:** migration `0031`-`0035` + code frontend liên
  quan **đã lên production**, đối chiếu số liệu qua Supabase MCP khớp với
  staging. Cảnh báo "chỉ mới trên staging" trước đây không còn đúng.
- ✅ **Học bạ số / QA tầng nhẹ (migration `0036`, 31/07/2026)** — 3 bảng mới
  `tieu_chi_danh_gia` (bảng mã rubric, **RỖNG** — chờ BGH/tổ chuyên môn điền
  nội dung), `danh_gia_hoc_sinh` (sự kiện đánh giá 3 trục Kiến thức/Kỹ
  năng/Thái độ), `danh_gia_tieu_chi` (nối M-N checklist) — đã lên CẢ staging
  lẫn production, RLS đã bật đúng thiết kế (6 policy). Đây là mục E1.1 của
  **roadmap song song ERP/Vận hành** (file Excel riêng, ngoài phạm vi 5 khối
  ERP gốc trong file này) — chưa mở UI nhập liệu thật (E1.4, chờ rubric
  chính thức) và chưa có `nang_luc`/`cau_hoi_nang_luc`/`bai_lam` (E1.2, phụ
  thuộc khung năng lực chưa ban hành). Xem `CHANGELOG.md` 2026-07-30/31 và
  `docs/adr/ADR-004-hang-rao-parity-migration-db-code.md` (Mục 6, đợt cập
  nhật 31/07) / `docs/adr/ADR-005-ci-tu-dong-apply-migration-expand.md` để
  biết quá trình vá 3 lớp blocker khi đưa lên production (bug parity-check +
  2 lớp bookkeeping).
- 🔲 Tra cứu ID; xuất file (ID, tên, ảnh) đúng định dạng Hikvision.
- 🔲 Import vào Hikvision, test nhận diện khuôn mặt, nghiệm thu.
- 🔲 Kéo/nhập dữ liệu chấm công (API HikCentral), bảng log điểm danh.
- 🔲 Báo cáo chuyên cần cho phụ huynh (Zalo OA / email); báo cáo phụ huynh
  đầy đủ (chuyên cần + học tập), tự động gửi định kỳ.
- 🔲 CRM tuyển sinh (Lark Base): pipeline lead → tư vấn → học thử → chốt.
- 🔲 Mapping ClassIn (cột `classin_uid`).
- 🔲 Chuẩn bị scale đa chi nhánh: lớp ảo (`000` = chưa xếp lớp), mã mới khi
  cần — **lưu ý: `so_lop` đếm CHUNG toàn hệ thống, không phân biệt chi
  nhánh, quyết định đã chốt (xem ADR-002), không tự đổi.**

## Khối 3 — Tài liệu & học thuật

- ✅ Bảng mã gốc `cap_hoc`, `chuong_trinh`, `mon_hoc`, `hinh_thuc`, `dang_cau`
  — có cấu trúc sẵn trên production, **đã có dữ liệu thật** (xem Khối 1,
  cập nhật 31/07/2026). Riêng `hoc_phan`/`bai_hoc` — có cấu trúc, **vẫn
  chưa có dữ liệu** (0 dòng, xác nhận qua Supabase MCP 31/07/2026).
- ✅ Ngân hàng câu hỏi: `ngu_lieu`, `cau_hoi`, `lua_chon`, `de`, `de_cau_hoi`
  — schema đã tồn tại trên production (không hoàn toàn khớp file
  `0003_ngan_hang_cau_hoi.sql` trong repo, xem "Ghi chú migration").
  ⚠️ `ma_cau_hoi` thật là **17 số** (`CHECK (ma_cau_hoi ~ '^[0-9]{17}$')`),
  không phải 16 số như `docs/dac-ta-he-thong.md` và file `0003` mô tả — vị
  trí ký tự nào hấp thụ thêm 1 số **chưa xác định**, cần đối chiếu thêm
  trước khi sửa tài liệu (xem hướng dẫn trong `docs/dac-ta-he-thong.md`).
- ✅ **CẬP NHẬT 31/07/2026:** bảng nối `chuong_trinh_mon_hoc` (Model C,
  ADR-001) **đã tồn tại và có dữ liệu thật trên production** (4 dòng, xác
  nhận qua Supabase MCP) — mục "🔲 chưa tồn tại" trước đây không còn đúng.
- 🔲 Bảng `tai_lieu` (ID 14 số) + UNIQUE; chức năng tạo ID; lưu file + metadata.
- 🔲 Tạo ID câu hỏi qua UI, tự đánh STT theo tổ hợp; form nhập đủ 8 dạng câu.
- 🔲 Ghép đề qua UI: `de` + `de_cau_hoi`.
- 🔲 Nhập kho nội dung V-ACT (CORE, số liệu, logic) + y dược.
- 🔲 Thống kê tỉ lệ đúng, cập nhật độ khó tự động (metadata, không đổi ID).

## Khối 4 — Tài chính

- ✅ Module học phí giai đoạn 1 (migration `0011`): `hop_dong_hoc_phi` (hợp
  đồng, quy trình `nhap→cho_duyet→dang_hoat_dong`, giảm giá, `doanh_thu_thuan`
  — tất cả tiền là `bigint`), `ky_dong_hoc_phi` (lịch trả góp), `phieu_thu`
  (append-only, có "phiếu đảo" khi cần điều chỉnh) + 3 view báo cáo.
- ✅ Vá bảo mật theo Supabase Advisors (migration `0012`): view báo cáo bật
  `security_invoker`; hàm mới cố định `search_path`.
- ✅ Đính kèm biên lai cho phiếu thu (migration `0013`): tối đa 2 file, bucket
  Storage riêng (`bien-lai`, private, 10MB, jpg/png/heic/pdf).
- ✅ Snapshot tên người thu ngay trên `phieu_thu` (migration `0014`) — vì RLS
  của `users` không cho đọc tên người khác, nên chốt tên tại thời điểm tạo.
- ✅ **Vận hành lớp học** (`loai_phong`, `phong_hoc`, `buoi_hoc`,
  `buoi_hoc_chi_phi`) — đã build, RLS ẩn đơn giá/chi phí khỏi
  `quan_ly_chi_nhanh`/`gv` đúng như ADR-002 Mục 4 yêu cầu. Đã vá lỗi kiểu ID
  (`number`→`uuid`) và cùng lỗi RLS xoá mềm như `lop`/`hoc_sinh`.
  **CẬP NHẬT 31/07/2026:** đã lên CẢ staging lẫn production (xác nhận qua
  Supabase MCP) — cảnh báo "chỉ có trên staging, KHÔNG có trên production"
  trước đây không còn đúng.
- ✅ Toast thông báo thành công/thất bại cho `goi_hoc_phi`/`hop_dong_hoc_phi`/
  `phieu_thu`.
- 🟡 Đang rà soát xem `hoc-phi/*` (gói/hợp đồng/thu tiền) có dính cùng lỗi
  kiểu ID (`number` thay vì `uuid`) như các module khác từng gặp hay không —
  phát hiện qua đọc code, CHƯA xác nhận/sửa thực tế.
- 🔲 **Còn lại theo ADR-002 Mục 4** (chưa viết migration): `chi_phi_co_dinh` +
  `phan_bo_chi_phi_lop` (chi phí gián tiếp), mở rộng `hop_dong_hoc_phi`
  (`tong_so_buoi_du_kien`, `don_gia_mot_buoi`) + `ghi_nhan_doanh_thu_buoi`.
- ⚠️ **OQ-3 (ADR-001) chưa chốt:** chế độ kế toán TT200 hay TT133 — không
  code phần hạch toán tài khoản cho tới khi có quyết định.

## Khối 5 — Bảo mật

- ✅ RLS theo vai trò trên mọi bảng dữ liệu (xem Khối 1).
- ✅ Bảng `chi_nhanh` + FK cho `lop.chi_nhanh_id` (migration `0015`) và
  RLS phạm vi chi nhánh cho `quan_ly_chi_nhanh` (migration `0016`) — **đã
  áp dụng trên cả staging lẫn production** (xem Khối 1).
- ✅ **ADR-003 (chuyển toàn bộ PK sang UUIDv7, 8 phase)** — **đã áp dụng cả
  staging lẫn production** (23/07/2026), đối chiếu số dòng/dữ liệu mẫu khớp
  tuyệt đối sau mỗi phase trên cả hai môi trường. Xem
  `docs/adr/ADR-003-chuyen-doi-uuid-toan-bo.md`.
- ✅ **Phát hiện + vá lỗi RLS nghiêm trọng (24/07/2026):** policy ghi khai báo
  `FOR ALL` với `deleted_at IS NULL` trong `USING` khiến PostgreSQL từ chối
  MỌI thao tác xoá mềm (UPDATE khiến dòng "biến mất" khỏi phạm vi chính sách
  — Postgres yêu cầu dòng sau update vẫn phải được 1 policy có phạm vi SELECT
  chấp nhận thì UPDATE mới thành công, kể cả không có RETURNING). Thử tách
  `FOR ALL` thành `FOR INSERT`+`FOR UPDATE` riêng để vá đúng phạm vi nhưng
  KHÔNG khả thi (Postgres vẫn từ chối) — giải pháp cuối: giữ `FOR ALL`, chuyển
  trách nhiệm ẩn dòng đã xoá sang tầng ứng dụng (filter `deleted_at IS NULL`
  tường minh trong query). Ảnh hưởng `lop`, `hoc_sinh`, `phong_hoc`,
  `buoi_hoc` — đã vá cả 4. **Bài học cho migration sau này: khi thêm/sửa
  policy ghi có liên quan `deleted_at`, PHẢI test bằng UPDATE thật (mô phỏng
  session qua `request.jwt.claims`), không chỉ đọc định nghĩa SQL.**
- ✅ **Hệ thống toast thông báo** (`src/components/ToastProvider.tsx`) —
  thành công/thất bại cho mọi action tạo/sửa/xoá, đã ghi thành quy ước bắt
  buộc cho mọi module từ nay (xem `CLAUDE_new_22.07.26.md`).
- 🔲 Bảng `nhat_ky` / audit log tổng quát (hiện chỉ có audit riêng cho tài
  chính qua `nhat_ky_tai_chinh`, chưa có bản tổng quát xuyên khối).
- 🔲 Kiểm tra backup & thử di dời `pg_dump --schema-only` để đưa schema thật
  vào git làm baseline (hiện schema thật vẫn lệch một phần khỏi migration
  file trong repo, xem cảnh báo đầu file).

---

## Nợ kỹ thuật cần xử lý sau (chưa làm, không chặn việc khác)

- ⚠️ **Chưa ép cứng ở CSDL: `admin_ts`/`quan_ly_chi_nhanh` đang có thể tự
  duyệt hợp đồng học phí của chính mình**
  (`hop_dong_hoc_phi.trang_thai: nhap → cho_duyet → dang_hoat_dong`). RLS
  hiện tại chỉ kiểm tra *ai được ghi vào bảng*, không kiểm tra *được đổi cột
  `trang_thai` sang giá trị nào* — "chỉ tạo, không duyệt" hiện chỉ là quy ước
  UI. Cần một trigger kiểu `forbid_hop_dong_tu_duyet()` (tương tự các trigger
  `forbid_*` đã có) chặn `admin_ts`/`quan_ly_chi_nhanh` tự đổi `trang_thai`
  sang `cho_duyet` trở lên — chỉ `master_admin`/`ke_toan` được phép. Phát
  hiện 22/07/2026 khi thiết kế vai trò `quan_ly_chi_nhanh`.
- ⚠️ `docs/dac-ta-he-thong.md` ghi sai `ma_cau_hoi` là 16 số (thật 17 số) —
  cần xác định vị trí ký tự chính xác qua SQL rồi sửa tài liệu.
- ✅ **CẬP NHẬT 27/07/2026:** `0030`-`0035` đều đã ghi nhận trên production
  (xem CHANGELOG 27/07/2026, 2 mục cùng ngày). `0033`-`0035` từng bị thiếu
  trong lịch sử migration production — xác nhận qua Supabase MCP đây chỉ là
  lỗi sổ sách (schema/RLS thật đã khớp sẵn), đã áp đúng 3 file gốc để lịch sử
  khớp lại. GitHub Action `db-parity-check` (ADR-004, Lớp 3) giờ chạy trên
  nền lịch sử đã khớp — nếu Action FAIL sau lần này nghĩa là có lệch MỚI,
  không phải nợ cũ.
- ⚠️ **Nghi ngờ `hoc-phi/*` dính cùng lỗi kiểu ID `number`→`uuid`** như các
  module khác (phát hiện qua đọc code, chưa xác nhận thực tế) — có task nền
  đang kiểm tra.

## Ghi chú migration

**Lịch sử rối — đọc kỹ trước khi thêm migration mới:**

- `0003_ngan_hang_cau_hoi.sql`: schema đề xuất cho ngân hàng câu hỏi (phiên
  trước). Schema **thật** trên production cho
  `cau_hoi`/`ngu_lieu`/`lua_chon`/`de`/`de_cau_hoi` đã tồn tại nhưng **khác**
  file này ở ít nhất 1 điểm đã biết: `ma_cau_hoi` thật là **17 số**
  (`CHECK (ma_cau_hoi ~ '^[0-9]{17}$')`), không phải 16 số như file `0003` và
  `docs/dac-ta-he-thong.md` mô tả. Chưa đối chiếu toàn bộ — đừng giả định
  file `0003` đúng với production.
- `0001_bang_ma_va_users.sql`, `0002_lop_hoc_sinh.sql`: bản nháp của phiên
  19/07/2026, **đã xoá khỏi repo** vì viết trước khi phát hiện schema thật đã
  tồn tại sẵn trên production (soft-delete, vai trò
  master_admin/admin_ts/admin_ht/truong_bm/gv, bảng `ghi_danh` riêng...).
  Phần logic còn dùng được (hàm tự sinh ID) đã viết lại đúng schema thật
  trong `0004`.
- `0004_tao_id_lop_hoc_sinh.sql` + `0005` (vá lỗi insert nhầm cột
  `GENERATED`): **migration đầu tiên khớp đúng schema production thật.** Chỉ
  thêm phần còn thiếu (hàm `tao_lop()`/`tao_hoc_sinh()`, trigger bất biến ID,
  vài index) — không tạo lại bảng nào (đã có sẵn ngoài git).
- `0006`-`0010`: các vá nhỏ liên tiếp (gỡ trigger hỏng trên `users`, bổ sung
  cột học sinh/lớp, chặn xoá mềm non-master, đổi `tinh_trang_dang_ky` sang
  multi-select) — đều đã khớp schema thật tại thời điểm viết.
- `0011`-`0014`: module tài chính giai đoạn 1 — xem Khối 4.
- `0015`-`0016`: chi nhánh + vai trò `quan_ly_chi_nhanh` — viết dựa trên đối
  chiếu SQL trực tiếp với production (`DBMS Project (Jul2026)`) ngày
  22/07/2026. **CẬP NHẬT:** đã áp dụng trên cả staging lẫn production từ lâu
  (xem Khối 1) — ghi chú "chưa áp dụng lên bất kỳ môi trường nào" ở đây là
  từ thời điểm viết file gốc, không còn đúng.

**Việc nên làm sau này (chưa làm, không nằm trong phạm vi tính năng gấp hôm
nay):** dùng `supabase db pull` (khi có Supabase CLI) hoặc
`pg_dump --schema-only` để đưa toàn bộ schema thật vào git làm baseline.
