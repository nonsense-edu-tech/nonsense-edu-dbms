# Nonsense Edu — Hệ thống quản lý doanh nghiệp nội bộ (ERP giáo dục)

Hệ thống ERP nội bộ cho chuỗi trung tâm luyện thi Nonsense Edu (đang mở rộng đa
chi nhánh), tổ chức theo **5 khối nghiệp vụ**:

| Khối | Phạm vi | Trạng thái |
|---|---|---|
| 1. Quản lý nhân sự (internal user) | Vai trò, phân quyền theo phạm vi (cấp học/môn học/bài học/chi nhánh) | ✅ Đã có, đang mở rộng (`quan_ly_chi_nhanh`) |
| 2. Học sinh & Enrollment | ID lớp/học sinh thống nhất, ghi danh, điểm danh khuôn mặt (Hikvision) | ✅ Lõi đã xong; điểm danh Hikvision đang tới |
| 3. Tài liệu & học thuật | Bảng mã gốc (cấp/chương trình/môn/học phần/bài), ngân hàng câu hỏi | 🟡 Ngân hàng câu hỏi đã có schema, chưa nhập nội dung; thiếu bảng nối chương_trình↔môn (Model C, ADR-001) |
| 4. Tài chính | Hợp đồng học phí, trả góp, phiếu thu, sắp tới: chi phí theo buổi, ghi nhận doanh thu | 🟡 Nền tảng đã có (`hop_dong_hoc_phi`/`ky_dong_hoc_phi`/`phieu_thu`); đang mở rộng theo ADR-002 |
| 5. Bảo mật | RLS theo vai trò + phạm vi, audit log | 🟡 RLS theo vai trò đã có; audit log tổng quát chưa có |

Đây **không phải chỉ là "hệ thống ID"** — quy ước ID (lớp/học sinh/câu hỏi) là
nền tảng của Khối 2-3, nhưng Khối 1/4/5 là các mảng nghiệp vụ độc lập, ngang
hàng, không phụ thuộc vào ID system. Tích hợp Hikvision (điểm danh khuôn mặt)
thuộc Khối 2.

## Tech stack

- **Next.js** (App Router) + React, TypeScript.
- **Supabase** (PostgreSQL + Auth + RLS) làm backend/CSDL.
- **Vercel** deploy: branch `main` = production, `develop` = staging.
- Supabase có 2 project: `DBMS Project (Jul2026)` = **production**,
  `nonsense-edu-staging` = **staging** — **hiện INACTIVE và chủ dự án quyết
  định KHÔNG bật lại (03/10/2026)**. Đừng tự restore/bật staging, đừng viết
  quy trình dựa vào staging. Migration được kiểm bằng test PGlite local
  (`supabase/tests/*.test.mjs`), rồi đi vào production **chỉ qua PR → merge →
  CI** (ADR-004/005); chủ dự án test trực tiếp trên production sau merge. Vẫn
  CẤM áp migration tay lên production (SQL Editor, `supabase db push`, MCP
  `apply_migration`) và migration phải Expand/tương thích ngược với code cũ.
- Đăng nhập bằng **email + mật khẩu** (Supabase Auth).
  ⚠️ **KHÔNG dùng Google OAuth** — đã quyết định bỏ. Đừng tự thêm lại.

## Cấu trúc repo

- `src/app/login/` — trang đăng nhập (đã xong, đang chạy thật trên production).
- `src/app/dashboard/` — lớp, học sinh, users; đang mở rộng.
- `src/lib/supabase/` — `client.ts` (browser) + `server.ts` (SSR).
- `src/middleware.ts` — chặn route khi chưa đăng nhập.
- `docs/adr/` — **quyết định kiến trúc chính thức, đọc trước khi động vào schema.**
- `docs/dac-ta-he-thong.md` — đặc tả quy ước ID (có 1 chỗ sai đã biết, xem dưới).
- `docs/roadmap.md` — lộ trình + nợ kỹ thuật đã ghi nhận.
- `supabase/migrations/` — SQL migration, đặt tên `NNNN_mo_ta.sql` tăng dần.
- `AGENTS.md` — **chưa được đối chiếu với `CLAUDE.md` này, đọc cả hai và báo nếu có mâu thuẫn trước khi bắt đầu.**

## Nguồn sự thật kiến trúc

- `docs/adr/ADR-004-hang-rao-parity-migration-db-code.md` (Status: **Accepted**) — quy trình đưa migration vào staging/production, sau sự cố production DB đi trước code không ai biết (2026-07-27). **Đọc TRƯỚC khi áp bất kỳ migration nào** — không thay đổi luật nghiệp vụ/schema của ADR-002/003, chỉ định lại quy trình. Tóm tắt 3 luật cứng ở mục "Quy tắc bắt buộc — migration & deploy" bên dưới.
- `docs/adr/ADR-003-chuyen-doi-uuid-toan-bo.md` (Status: **Accepted**) — quyết định MỚI NHẤT về schema, thay thế riêng luật #1 (khóa chính) của ADR-002. Đọc file này TRƯỚC khi làm việc với bất kỳ PK/FK nào.
- `docs/adr/ADR-002-mo-rong-tren-nen-production-that.md` (Status: **Accepted**) — vẫn đúng cho MỌI luật khác (định dạng mã bất biến, tiền là bigint, RBAC 3 bảng phạm vi, tài chính gắn `hop_dong_hoc_phi`, RLS chỉ thêm không sửa, ẩn chi phí khỏi vận hành). **Chỉ luật #1 (PK) đã bị ADR-003 thay.**
- `docs/adr/ADR-001-mo-hinh-du-lieu-hoc-thuat-tai-chinh.md` chỉ tham khảo cho 6 luật nghiệp vụ tài chính gốc — **KHÔNG dùng DDL của ADR-001**, đã bị ADR-002 thay thế.

## Quy tắc bắt buộc — migration & deploy (ADR-004, sau sự cố 2026-07-27)

Sự cố gốc: DB production được migrate UUID bằng cách áp tay, code trên `main`
không hề biết, lệch nhau 4 ngày không ai phát hiện cho tới khi kiểm tra thủ
công. Từ nay:

1. **Migration chỉ vào mỗi môi trường qua pipeline ship code** (merge → CI).
   **Cấm áp migration tay lên production DB** (SQL Editor, `supabase db push`
   từ máy cá nhân, MCP `apply_migration` trực tiếp lên production). Thử trên
   staging thì được, nhưng bất kỳ gì giữ lại phải thành file migration trong
   repo trước khi coi là xong.
2. **Migration phá huỷ (Contract — đổi tên/kiểu cột, `DROP`) chỉ chạy trên
   production SAU KHI** code phụ thuộc đã live thật trên production.
3. **Migration Expand (thêm cột/bảng/hàm) phải backward-compatible** — code
   CŨ đang chạy trên production vẫn phải chạy được bình thường trên schema
   mới, cho tới khi code mới lên.

Lớp chặn thật (không dựa vào ai nhớ luật trên): GitHub Action
`.github/workflows/db-parity-check.yml` tự so migration trong repo với
migration đã áp trên production, FAIL nếu lệch — chạy khi push `main` và mỗi
ngày. Chi tiết đầy đủ + nợ kỹ thuật đã biết: xem ADR-004.

## Quy ước ID (BẤT BIẾN — nhớ kỹ, có hệ thống ngoài phụ thuộc)

ID là **chuỗi chữ số ghép liền**, padding `0` ở đầu. **Luôn lưu dạng CHAR/text.**

- **Gốc 4 số** = Cấp học(1, giá trị 1-9) + Chương trình(3).
- **ID Lớp học — 9 số** = Gốc + Năm học(2) + Số lớp(3). `so_lop` đếm **chung
  toàn hệ thống** theo tổ hợp (cấp học, chương trình, năm học) — **không**
  phân biệt chi nhánh (quyết định đã chốt, xem ADR-002).
- **ID Học sinh — 12 số** = ID Lớp học + STT(3). Gắn theo **lớp nhập học đầu
  tiên**, **cố định vĩnh viễn** (trigger `forbid_hoc_sinh_id_change` chặn sửa).
- **ID Câu hỏi — 17 số** = Cấp học(1) + Chương trình(3) + **Môn học(2)** +
  Học phần(2) + Bài học(2) + Chủ đề(2) + Dạng câu(1) + STT câu(4). **Từ ADR-006: chương trình luôn `000`, học phần/bài học/chủ đề = `00` ("Chung") khi không phân loại — câu hỏi thuộc môn, chương trình gom các môn.** Xác nhận
  chính xác qua cột `GENERATED` thật trên `cau_hoi` (22/07/2026) — khác
  `docs/dac-ta-he-thong.md` bản cũ (ghi 16 số, môn học chỉ 1 số).

Lý do các mã này giữ nguyên định dạng: **Hikvision** (điểm danh khuôn mặt) tiêu
thụ trực tiếp `ma_hoc_sinh` làm Person ID (giới hạn ≤16 ký tự, chấp nhận số 0
đầu) — đây KHÔNG phải nợ kỹ thuật, là thiết kế có chủ đích.

## Quy ước bắt buộc (đã xác nhận qua SQL thật)

- **Khóa chính: `UUIDv7` (qua hàm `public.uuidv7()` tự viết) cho MỌI bảng, không
  ngoại lệ — kể cả bảng đang dùng mã nghiệp vụ làm khóa tự nhiên
  (`cap_hoc`/`chuong_trinh`/`mon_hoc`/`hinh_thuc`/`dang_cau`). **Quyết định
  MỚI NHẤT (ADR-003), thay thế quyết định bigint trước đó (ADR-002 luật #1).**
  Xem ADR-003 để biết kế hoạch chuyển đổi chi tiết theo 8 phase. **Đã áp dụng
  cả staging lẫn production (23/07/2026)** — mọi bảng trong phạm vi ADR-003
  (26 bảng) đều đã dùng `uuid` làm PK trên cả hai môi trường, đối chiếu số
  dòng/dữ liệu mẫu khớp tuyệt đối sau mỗi phase.
- **Tiền luôn là `bigint`** (VNĐ nguyên, không thập phân) — khớp
  `hop_dong_hoc_phi` đã có.
- **Giữ nguyên** các cột `GENERATED` đã có trên `lop`/`hoc_sinh` — không tạo
  cột `GENERATED` tách chuỗi ID kiểu này cho bảng mới, nhưng cũng không xóa/sửa
  cột cũ.
- **Thêm quyền/vai trò mới KHÔNG được sửa RLS policy đang chạy** — chỉ thêm
  policy mới (RLS cộng dồn theo OR). Không đụng `p_write`, `p_write_hop_dong`
  và các policy gốc khác.
- **Chi phí luôn ẩn khỏi vai trò vận hành/giảng dạy** (`gv`,
  `quan_ly_chi_nhanh`) — chỉ `ke_toan`/`master_admin` thấy cột `thu_lao_gv`,
  `chi_phi_phong`, đơn giá `loai_phong`. Dùng view/`GRANT` cột, không dựa vào
  RLS hàng (RLS không lọc được theo cột).
- **Trước khi viết migration mới, luôn kiểm tra cấu trúc bảng/RLS thật qua SQL
  Editor** (`information_schema.columns`, `pg_policies`, `pg_constraint`) —
  không tin file migration cũ hay tài liệu đặc tả khi có nghi ngờ. Lịch sử dự
  án đã từng có schema tạo thẳng trên production không qua migration file.
- **Mọi module mới (và mọi module sửa lại từ nay) PHẢI gắn toast thông báo**
  cho từng action tạo/sửa/xoá — dùng `useToast()` từ
  `src/components/ToastProvider.tsx` (đã gắn sẵn ở `src/app/layout.tsx`, dùng
  được toàn app không cần import provider riêng). Gọi `showToast({type:
  "success", message: "..."})` khi thành công và `showToast({type: "error",
  message: "<Tên hành động> thất bại: " + result.error})` khi thất bại — bổ
  sung THÊM vào khung lỗi/thành công inline hiện có (không thay thế). Xem các
  component ở `lop`/`hoc-sinh`/`chi-nhanh`/`van-hanh`/`hoc-phi` làm mẫu.
- **Mọi bảng danh sách mới (và bảng sửa lại từ nay) PHẢI phân trang**: mặc định
  10 dòng, chọn được 10/15/20/50, tối đa 50 — dùng `parsePhanTrang()` từ
  `src/lib/phan-trang.ts` + `.range(pp.from, pp.to)` với `count: "exact"` ở
  trang server, và `<PhanTrang>` từ `src/components/PhanTrang.tsx`. Luôn thêm
  `.order("id")` sau cột sắp xếp chính (thứ tự phải ổn định giữa các trang) và
  gọi `duongDanTrangCuoi()` + `redirect()` khi trang vượt tổng. Không dùng
  `.limit(N)` cứng cho danh sách hiển thị (sẽ cắt dữ liệu âm thầm).
- **Sau MỖI lần deploy (áp dụng migration DB, hoặc đổi hành vi/RLS đáng kể)
  PHẢI ghi 1 mục mới vào `CHANGELOG.md`** ở gốc dự án — nêu rõ tóm tắt, tên
  file migration (nếu có), và trạng thái riêng cho staging (`yxfgwzdxoxuoaulcjlcf`)
  và production (`pdyerenojwrtejyhlcbs`) vì hai môi trường không luôn đồng bộ.
  Xem đầu file `CHANGELOG.md` để biết cấu trúc mục cần ghi.

## Trạng thái & lộ trình

- ✅ Đăng nhập, `users` + RLS phân quyền (7 vai trò gốc), `lop`/`hoc_sinh`/
  `ghi_danh` + hàm tự sinh ID, ngân hàng câu hỏi, module hợp đồng học phí cơ
  bản (`hop_dong_hoc_phi`/`ky_dong_hoc_phi`/`phieu_thu`) — **migration
  `0001`-`0014` đã áp dụng trên CẢ staging lẫn production.**
- ✅ **`0015`-`0018` (chi nhánh, vai trò `quan_ly_chi_nhanh`) — đã áp dụng
  thật**, xác nhận qua `Supabase:list_tables` ngày 22/07/2026. Viết ban đầu
  bằng `bigint` (đúng quy ước tại thời điểm đó) — đã được cuốn theo Phase 1-3
  của ADR-003 và chuyển sang UUID cùng đợt.
- ✅ **ADR-003 đã hoàn tất** (chuyển toàn bộ PK sang UUIDv7, 8 phase theo
  đúng thứ tự phụ thuộc FK) — **đã áp dụng cả staging lẫn production**
  (23/07/2026), xác nhận số liệu khớp sau từng phase trên cả hai môi trường.
- 🔲 Sau ADR-003: `loai_phong`, `phong_hoc`, `chuong_trinh_mon_hoc`,
  `buoi_hoc` (viết mới bằng UUID luôn, kèm RLS ẩn chi phí ngay từ đầu) →
  `chi_phi_co_dinh`/`phan_bo_chi_phi_lop` → mở rộng `hop_dong_hoc_phi` +
  `ghi_nhan_doanh_thu_buoi`.

## Nợ kỹ thuật đã ghi nhận (xem `docs/roadmap.md` để biết chi tiết)

- ✅ **`0033`-`0035` đã ghi nhận vào lịch sử migration production** (27/07/2026,
  xem CHANGELOG) — chỉ là lỗi sổ sách, schema/RLS thật đã khớp sẵn từ trước.
  `0017`/`0018` vẫn không có trong lịch sử production (đã có bản thay thế
  tương đương qua `0030_create_van_hanh_tables_production`) — chấp nhận được,
  không phải lệch cần vá, xem ADR-004 Mục 6.
- `admin_ts`/`quan_ly_chi_nhanh` chưa bị chặn ở CSDL khi tự duyệt hợp đồng học
  phí (`trang_thai: nhap→cho_duyet`) — hiện chỉ là quy ước UI.
- ~~`docs/dac-ta-he-thong.md` ghi sai `ma_cau_hoi` là 16 số~~ **ĐÃ XÁC NHẬN
  CHÍNH XÁC (22/07/2026, qua cột `GENERATED` thật trên `cau_hoi`):** 17 số —
  cấp học(1) + chương trình(3) + **môn học(2, không phải 1 như bản cũ)** +
  học phần(2) + bài học(2) + chủ đề(2) + dạng câu(1) + STT câu(4). Cần cập
  nhật `docs/dac-ta-he-thong.md` mục 2.4 theo đúng bảng này.

## Trạng thái quyết định (Open Questions)

- **OQ-3 (TT200 vs TT133): CHƯA CHỐT** — không code phần hạch toán tài khoản
  cho tới khi có quyết định. Mọi câu hỏi khác (PK, RBAC, ID, chi nhánh) đã
  chốt, xem ADR-002.

## Quy ước làm việc

- Trả lời & comment code bằng **tiếng Việt**.
- Tên bảng/cột **tiếng Việt không dấu** (vd `hoc_sinh`, `ma_cau_hoi`).
- Trước khi động vào cấu trúc ID hoặc CSDL, **đọc `docs/adr/ADR-002-...md`
  trước, `docs/dac-ta-he-thong.md` sau** (ADR ưu tiên cao hơn nếu mâu thuẫn).
- Mọi thay đổi CSDL viết thành **migration SQL** trong `supabase/migrations/`,
  đặt tên `NNNN_mo_ta.sql` tăng dần, kiểm bằng test PGlite local rồi đưa lên **production qua PR/CI** (staging không dùng — xem trên).
- Commit dưới tài khoản tổ chức (`git config user.email "it@nonsense.edu.vn"`).
- **Không tự ý nhảy cóc bước trong roadmap.** Dừng lại chờ xác nhận sau mỗi
  bước, trừ khi được yêu cầu làm liên tục.
