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

## 2026-09-29 — Phân trang bảng (PR1: nền + 10 bảng danh mục + bảng "quá hạn")

**Tóm tắt:** Bắt đầu áp phân trang cho mọi bảng để giảm tải dữ liệu: mặc định
10 dòng/trang, chọn được 10/15/20/50, **server ép tối đa 50** (`?size=500` →
50, giá trị lạ → 10). Trạng thái nằm trên URL (`?page=&size=`), số dòng/trang
người dùng chọn được nhớ bằng `localStorage`. Không có migration DB — chỉ
frontend. Đây là PR1 trong kế hoạch `claude/ke-hoach-phan-trang-bang.md` (Project);
các bảng lớn (học sinh, câu hỏi, hợp đồng, phiếu thu, lớp, buổi học, trợ giảng)
làm ở các PR sau nên **hiện vẫn còn giới hạn cứng cũ**.

- **`src/lib/phan-trang.ts` (mới)**: `parsePhanTrang`, ép giá trị hợp lệ,
  `duongDanTrangCuoi` (trang vượt tổng → lùi về trang cuối), rút gọn dãy số trang.
- **`src/components/PhanTrang.tsx` (mới)**: thanh phân trang (Hiển thị x–y / tổng,
  chọn số dòng, Trước/Sau, số trang); `useCatTrangCucBo` cho bảng dữ liệu đã nằm
  hết ở client.
- **Phân trang phía server** (`.range()` + `count: "exact"`, thêm `.order("id")`
  làm thứ tự ổn định): Chi nhánh, Phòng học, Loại phòng, Gói học phí, Chương
  trình–Môn học (khoá ghép vì không có `id`), Học phần, Bài học, Chủ đề, Người
  dùng (2 bảng: `?page/?size` và `?xoa_page/?xoa_size`).
- **Cắt trang phía client**: bảng "Đóng thiếu / chậm thu" ở dashboard học phí
  (dashboard tính tổng hợp trên toàn bộ dữ liệu nên đã tải hết về client).
- Ngoại lệ có chủ đích: bảng "quyền quản lý" trong mỗi dòng Chi nhánh vẫn tải
  toàn bộ `user_chi_nhanh` (bảng nối nhỏ) — sẽ xem lại nếu lớn dần.

- **Staging**: 🔲 chưa
- **Production**: 🔲 chưa
- **Commit**: `dd9db28` (nhánh `feat/phan-trang-bang-nen-danh-muc`, chưa merge)

---

## 2026-09-29 — Header + sidebar dùng chung, đồng nhất theme indigo, breadcrumb rút gọn

**Tóm tắt:** Đồng nhất navigation bar + theme trên toàn bộ `/dashboard/**`
(19 trang) theo mockup đã duyệt (canvas
`https://claude.ai/artifact/FZZyb1vHu3WTaVu48njre3`, artboard 4/5). Không có
migration DB — chỉ frontend.

- **`src/app/dashboard/layout.tsx` (mới)**: bọc toàn bộ trang con, chứa
  header (logo mới + breadcrumb + user/đăng xuất) và `<Sidebar>` dùng chung —
  thay cho việc mỗi trang tự dựng header + 19 lần lặp lại theo cùng 1 pattern
  `header/title/backLink`.
- **`src/components/Sidebar.tsx` (mới)**: thay thế hoàn toàn khối "Khối
  nghiệp vụ" từng nằm trên thân trang `/dashboard` (`ModuleClustersAdmin` +
  cụm inline của GV/Trợ giảng) — cùng nội dung 3 cụm Vận hành/Học thuật/Tài
  chính, lọc theo `nhomGiaoDien(vaiTro)` (đúng quy tắc "ẩn hẳn, không hiện
  khoá" đã chốt 2026-09-28). Có toggle thu gọn (240px ↔ 64px icon-only), lưu
  trạng thái vào `localStorage`.
- **`src/components/Breadcrumb.tsx` (mới)**: đường dẫn điều hướng click được
  trong header, map route → nhãn tiếng Việt. Rút gọn khi không đủ chỗ: luôn
  giữ icon Trang chủ + 2 bước gần nhất, phần giữa gộp vào nút "···" (dropdown
  liệt kê các bước bị ẩn).
- **`src/lib/vai-tro.ts` (mới)**: gom `ADMIN_TIER`/`GV_TIER`/`TRO_GIANG_TIER`
  + `nhomGiaoDien()` dùng chung giữa `layout.tsx`/`page.tsx`/`Sidebar.tsx`
  (trước đó chỉ có trong `page.tsx`, tránh lệch danh sách vai trò).
- **Theme**: `--accent` toàn hệ thống (`globals.css`) đổi từ cam-vàng sang
  indigo `#5468D4` (trùng màu dashboard trước đó chỉ áp cục bộ qua
  `--db-accent`) — áp dụng luôn cho trang đăng nhập và mọi form dùng
  `--accent`/`--accent-dim` sẵn có. Bỏ override `--db-accent*` trong
  `dashboard.module.css`.
- **Logo**: thay logo cũ (`nonsense-edu-logo-horizontal.png`) bằng cặp ảnh
  mới đã tách nền trong suốt — `public/brand/nonsense-edu-mascot-navy-transparent.png`
  (panda) + `public/brand/nonsense-edu-wordmark-white-transparent.png` (chữ
  "NONSENSE EDUCATION" màu trắng) — dựng từ file gốc người dùng gửi (bản đầu
  bị lỗi thiếu chữ "A", đã dùng bản gửi lại).
- **19 trang con**: bỏ `<h1>` + back-link tự dựng riêng lẻ (breadcrumb thay
  thế); `subNav` (tab điều hướng anh em trong `hoc-phi`/`hoc-lieu`/`van-hanh`)
  giữ nguyên — vai trò khác với breadcrumb (ancestor) và sidebar (module cấp
  1). Trang `/dashboard/tro-giang`'s trước có card trùng lặp với mục sidebar
  → bỏ card, chỉ còn text hướng dẫn.
- Migration: không có.
- **Gộp với PR #28** (module "Quản lý người dùng", đã lên `main` sau khi
  nhánh này tách ra): `src/app/dashboard/page.tsx` xoá hẳn
  `ModuleClustersAdmin`/`ModuleCard`/`ModuleCluster` (trùng nội dung, chuyển
  hết vào `Sidebar.tsx`); `src/app/dashboard/users/page.tsx` gộp thêm nhánh
  `admin_ht` (cấp tài khoản) + bảng đã xoá mềm của PR #28, đồng thời bỏ
  back-link cũ. Logic ẩn mục "Người dùng" khỏi vai trò không có quyền đọc
  bảng `users` (trước nằm trong `ModuleClustersAdmin`, đã xoá) chuyển sang
  hằng số `NGUOI_DUNG_TIER` (`src/lib/vai-tro.ts`) dùng trong `Sidebar.tsx`,
  giữ đúng quy tắc "role không liên quan thì không thấy chức năng" đã chốt
  2026-09-28.

**Staging**: — (không có migration DB; xác nhận qua Vercel Preview build của
PR #31, `npx tsc --noEmit`/`npx eslint`/`npx next build` sạch trước khi merge).
**Production**: ✅ đã áp dụng (29/09/2026) — merge PR #31 vào `main`, Vercel
tự deploy theo pipeline.
**Commit**: `a80b768` (PR #31, merge commit `f4f7498` gộp `origin/main`).

---

## 2026-09-28 — Module "Quản lý người dùng" (CRUD, phạm vi, chi nhánh, mật khẩu)

**Tóm tắt:** Xây mới hoàn chỉnh Khối 1 — module quản lý tài khoản nội bộ,
theo 5 quyết định người dùng chốt trong ngày (phân quyền master_admin/
admin_ht, mật khẩu mặc định `NonsenseEdu@123`, bảng nhật ký chung, không
giới hạn đuôi email, cho phép tạo thêm master_admin có xác nhận mật khẩu
2 lần) và quyết định bổ sung: **bỏ hẳn quyền xoá cứng tài khoản** — không
ai, kể cả master_admin, xoá cứng qua REST.

- **`users`**: thêm cột `phai_doi_mat_khau` (bắt đổi mật khẩu lần đăng nhập
  đầu, mặc định `true` cho tài khoản mới, backfill `false` cho tài khoản cũ
  đang dùng thật); tách `p_write` (đang `FOR ALL`, âm thầm áp cả SELECT —
  đúng bài học Khối 5) thành `p_insert_users`/`p_update_users` riêng, **bỏ
  hẳn** mọi policy DELETE.
- **Trigger CSDL** `trg_chan_mat_master_admin_cuoi`: chặn tự đổi vai trò của
  chính mình khỏi master_admin, và chặn hạ vai trò/khoá/xoá mềm master_admin
  **cuối cùng** còn hoạt động — bảo vệ ở tầng CSDL, không dựa quy ước UI.
- **Bảng `nhat_ky`** (append-only, RLS: đọc = master_admin, ghi =
  master_admin/admin_ht) — nhật ký chung cho toàn hệ thống, bắt đầu từ
  module này.
- **RPC `admin_ht_tao_nhan_su`**: admin_ht cấp tài khoản GV/Trợ giảng, tự
  kiểm tra chi nhánh đích nằm trong `user_chi_nhanh` của chính người gọi
  (SECURITY DEFINER, không tin tầng ứng dụng).
- **RPC `danh_dau_da_doi_mat_khau`**: mọi người dùng tự tắt cờ bắt đổi mật
  khẩu của chính mình sau khi đổi thật qua Supabase Auth.
- UI: danh sách + sửa nhanh + trang chi tiết (phạm vi/chi nhánh/lịch sử) cho
  master_admin; trang tạo tài khoản 2 luồng (master_admin toàn quyền có xác
  thực mật khẩu 2 lần khi tạo master_admin mới; admin_ht giới hạn GV/Trợ
  giảng trong chi nhánh mình); trang bắt buộc đổi mật khẩu lần đầu qua
  `proxy.ts`; xoá mềm/khôi phục thay cho xoá cứng.
- Tiện thể sửa 4 bug có sẵn: thiếu `tro_giang` trong danh sách vai trò UI,
  card "Người dùng" hiện sai cho vai trò không có quyền, danh sách "quản lý
  chi nhánh" lẫn cả gv/tro_giang do dùng chung `user_chi_nhanh`, và loại bỏ
  một sửa đổi migration sai dự định ban đầu (`user_chi_nhanh.id_old` thật ra
  là `GENERATED ALWAYS AS IDENTITY`, không phải cột lỗi).
- Đã dry-run toàn bộ migration + 9 kịch bản test trong transaction
  `ROLLBACK` trên production trước khi merge, và re-verify 6 kịch bản bảo vệ
  master_admin/DELETE ngay sau khi áp thật — tất cả đúng thiết kế.

**Migration:** `supabase/migrations/0042_module_quan_ly_nguoi_dung.sql`
(tag `expand`, tự áp qua CI theo ADR-005, đã duyệt qua GitHub Environment
`production-db`).
**Staging:** — (bỏ qua theo quyết định người dùng, thử thẳng qua pipeline
CI vào production).
**Production:** ✅ đã áp dụng (28/09/2026) — xác nhận qua
`information_schema`/`pg_policies`/`pg_trigger`/`pg_proc` thật.
**Commit:** `faf562f` (PR #28, merge `6aca1b3d`).

---

## 2026-09-28 — Quy tắc "ẩn hẳn, không hiện dạng khoá" cho UI theo vai trò

**Tóm tắt:** Người dùng phản hồi không muốn GV/Trưởng bộ môn/Trợ giảng nhìn
thấy các khối chức năng không liên quan đến họ trên dashboard — kể cả ở dạng
mờ/khoá kèm ghi chú "chưa được cấp quyền" (PR #27 trước đó có làm vậy). Đã
sửa lại: bỏ hẳn khỏi UI, không còn trạng thái "locked" nào nữa.

- **Trưởng bộ môn/GV**: không còn hiện cụm "Tài chính" (trước đó hiện dạng
  khoá); thẻ "Kỳ đóng quá hạn" trong nhóm Học phí của Admin cũng ẩn hẳn cho
  `quan_ly_chi_nhanh` thay vì hiện khoá (nhóm chỉ còn 2 thẻ, lưới 2 cột).
- **Trợ giảng**: khối nghiệp vụ chỉ còn đúng 1 cụm "Học thuật" (1 thẻ Trợ
  giảng) — bỏ hẳn cụm Vận hành/Tài chính từng hiện dạng khoá.
- **Admin**: nhóm "Ngân hàng câu hỏi" không còn hiện dạng khoá cho vai trò
  không có quyền đọc `cau_hoi` (ke_toan/thu_ngan/admin_ts/quan_ly_chi_nhanh)
  — ẩn hẳn.
- Xoá `locked`/`lockedNote` khỏi `ModuleCard`/`ModuleItem` và các class CSS
  `.lockedCard`/`.moduleCardLocked`/`.welcomeCardLocked` không còn dùng.
- **Đã lưu thành quy tắc cố định vào memory dự án**
  (`principles-and-practices.md`): "role không liên quan đến chức năng thì
  không được nhìn thấy chức năng đó" — áp dụng cho mọi màn hình sau này,
  không riêng dashboard.

**Migration:** không có (chỉ đổi code frontend, không đổi schema/RLS).
**Staging:** — (không dùng, theo quyết định của người dùng).
**Production:** 🔲 chưa — cần PR merge vào `main` qua CI theo ADR-004.
**Commit:** (điền sau khi commit)

---

## 2026-09-28 — Khối nghiệp vụ dashboard chia 3 cụm (Vận hành/Học thuật/Tài chính)

**Tóm tắt:** Theo yêu cầu người dùng, chia lại lưới "khối nghiệp vụ" trên
`/dashboard` thành 3 cụm cố định — **Vận hành** (Chi nhánh, Lớp học, Học
sinh, Vận hành, Người dùng), **Học thuật** (Học liệu, Trợ giảng), **Tài
chính** (Học phí) — dùng đúng 1 cấu trúc cho cả 3 giao diện theo vai trò,
thay vì mỗi vai trò một danh sách rời rạc như trước.

- Thêm component dùng chung `ModuleCluster`/`ModuleCard` (hỗ trợ trạng thái
  `locked` — mục ngoài phạm vi vai trò hiện mờ/khoá kèm ghi chú, thay vì ẩn
  hẳn hoặc hiện nhầm như đang dùng được) trong `src/app/dashboard/page.tsx`.
- **Admin**: cả 3 cụm active đầy đủ.
- **Trưởng bộ môn/GV**: cụm Vận hành chỉ còn 3 mục liên quan (không có Chi
  nhánh/Người dùng — lược hẳn, không phải locked); cụm Tài chính hiện
  **locked** "Học phí" (trước đây không hiện gì) — để nhất quán cấu trúc
  3 cụm với các dashboard khác, không phải mở thêm quyền truy cập thật.
- **Trợ giảng**: 3 cụm đều hiện, chỉ cụm Học thuật active, 2 cụm còn lại
  locked (trước đây chỉ có 2 thẻ phẳng không theo cụm).
- Mô tả thiết kế đã cập nhật trong project docs.

**Migration:** không có (chỉ đổi code frontend, không đổi schema/RLS).
**Staging:** — (không dùng, theo quyết định của người dùng).
**Production:** 🔲 chưa — cần PR merge vào `main` qua CI theo ADR-004.
**Commit:** (điền sau khi commit)

---

## 2026-09-28 — Thiết kế lại trang dashboard theo vai trò

**Tóm tắt:** Viết lại hoàn toàn `/dashboard` (trang ngay sau đăng nhập) —
dùng logo chính thức + theme màu indigo lấy từ logo (chỉ áp dụng riêng trang
này), và chia làm 3 giao diện khác nhau theo vai trò thay vì 1 giao diện
chung chung như trước.

- **Admin** (`master_admin`/`admin_ts`/`admin_ht`/`ke_toan`/`thu_ngan`/
  `quan_ly_chi_nhanh`): nhiều số liệu nhất (tài chính, học phí, vận hành,
  ngân hàng câu hỏi) — nhưng **mỗi nhóm chỉ hiện nếu vai trò đó thật sự có
  RLS policy SELECT trên bảng liên quan** (đối chiếu `pg_policies` production
  trực tiếp, không suy đoán theo tên vai trò) — vd `admin_ht` không có policy
  đọc `hop_dong_hoc_phi`/`phieu_thu`/`ky_dong_hoc_phi` nên không thấy 2 nhóm
  Tài chính/Học phí; `quan_ly_chi_nhanh` không đọc được `phieu_thu`/
  `ky_dong_hoc_phi` nên riêng thẻ "kỳ đóng quá hạn" bị khoá dù vẫn thấy hợp
  đồng học phí (được RLS tự giới hạn theo chi nhánh của họ).
- **Trưởng bộ môn / GV** (`truong_bm`/`gv`): chỉ số liệu "học sinh đang phụ
  trách" (qua buổi học có `gv_id` = chính họ) + "học liệu của mình đang quản
  lý" (câu hỏi lọc theo `nguoi_tao` = chính họ) — không có số liệu tài
  chính/học phí, lưới khối nghiệp vụ thu gọn còn 4 mục liên quan.
- **Trợ giảng** (`tro_giang`): không có thẻ số liệu nào, chỉ khối nghiệp vụ
  (lối vào trang tra cứu câu hỏi RPC-only của Bước 5.6, các khối khác hiện
  khoá/mờ).
- Vai trò chưa được ánh xạ (tương lai) → fallback về giao diện giống Trợ
  giảng (an toàn, không lộ số liệu) thay vì lỗi trắng trang.
- 2 khung biểu đồ (đường/cột) vẫn ở dạng chờ — chưa nối số liệu thật, đúng
  yêu cầu ban đầu "chừa chỗ hiển thị biểu đồ sau này".
- Logo chính thức lưu tại `public/brand/` (không đổi `--accent` cam-vàng
  dùng chung các trang khác — theme indigo chỉ định nghĩa cục bộ trong
  `dashboard.module.css`).
- Mô tả thiết kế đầy đủ đã lưu vào project docs
  (`thiet-ke-dashboard-theo-vai-tro.md`) để tham khảo sau này.

**Migration:** không có (chỉ đổi code frontend, không đổi schema/RLS).
**Staging:** — (không dùng, theo quyết định của người dùng).
**Production:** ✅ đã merge vào `main` (PR #26) — lưu ý PR #25 ban đầu lỡ
merge nhầm base (`feat/tro-giang-tra-cuu` thay vì `main`) nên chưa lên thật
lần đầu; đã mở PR #26 sửa lại đúng base và merge bù.
**Commit:** `c7561b0` (nội dung), merge commit `8f41bb9` trên `main`.

---

## 2026-09-28 — Bước 5.6: trang riêng cho trợ giảng (RPC-only)

**Tóm tắt:** Thêm trang mới `/dashboard/tro-giang` — tra cứu câu hỏi cho vai
trò `tro_giang` (và gv/truong_bm/admin_ht/master_admin trong phạm vi môn
được phân công): chọn môn học → xem danh mục câu hỏi → xem chi tiết 1 câu.

- Đọc dữ liệu **chỉ qua 2 RPC `SECURITY DEFINER` đã có sẵn trên production**
  (`danh_muc_cau_hoi_tro_giang(p_mon_hoc)`, `xem_mot_cau_hoi(p_id)`) — xác
  nhận qua SQL trực tiếp 28/09/2026, không phải migration của repo này.
  **Không đọc trực tiếp bảng `cau_hoi`/`lua_chon`** — RLS `p_read` trên 2
  bảng này cố tình KHÔNG cấp quyền cho vai trò `tro_giang`, đúng như tên
  bước ("RPC-only"): trợ giảng chỉ nhìn qua "cửa sổ" do RPC kiểm soát.
- Với vai trò `tro_giang`, RPC `xem_mot_cau_hoi` tự trả `dap_an_text`/
  `loi_giai` = null (ẩn đáp án/lời giải) — trang hiển thị đúng theo đó, ghi
  chú rõ "ẩn theo thiết kế, không phải lỗi" thay vì để trống gây hiểu nhầm.
- Danh sách môn học khả dụng lấy từ `user_pham_vi` của chính người dùng
  (đọc trực tiếp — đây là bảng phân quyền, không phải nội dung câu hỏi, nên
  không vi phạm nguyên tắc RPC-only ở trên).
- Không cần migration — cả 2 RPC và RLS liên quan đã tồn tại sẵn.

**Staging:** — (staging đang được chủ động để inactive).
**Production:** 🔲 chưa — đang mở PR, chờ merge (không có migration).
**Commit:** `721b977`.

---

## 2026-09-28 — Bước 5.5: gắn năng lực cho câu hỏi (cau_hoi_nang_luc)

**Tóm tắt:** Thêm modal "Năng lực" trên mỗi dòng câu hỏi ở
`/dashboard/hoc-lieu/cau-hoi`, cho phép:

- Sửa `cau_hoi.tien_trinh` (P1/P2/P3, cột đơn trên `cau_hoi`, chưa từng có UI
  trước đây dù đã tồn tại từ migration `0038`).
- Gắn/gỡ nhiều năng lực cho 1 câu hỏi qua bảng `cau_hoi_nang_luc`, đánh dấu
  đúng 1 năng lực "Chính" (`la_chinh`) — DB chưa có ràng buộc chỉ-1-la_chinh
  nên tự đảm bảo ở tầng server action (bỏ đánh dấu các dòng khác trước khi
  gắn dòng mới là chính); chặn gắn trùng 1 năng lực 2 lần cho cùng câu hỏi.

**Không cần migration** — bảng `nang_luc`/`tien_trinh`/`cau_hoi_nang_luc` và
RLS (cùng 4 vai trò ghi như `cau_hoi`) đã có sẵn từ `0038`, đúng như thiết kế
"lớp gắn thẻ năng lực hấp thụ thay đổi khung qua cập nhật dữ liệu, không qua
migration" (xem `areas/khung-nang-luc.md` trong bộ nhớ dự án).

**⚠️ PHÁT HIỆN QUAN TRỌNG (xác nhận qua SQL trực tiếp trên production,
28/09/2026):** bảng `nang_luc` đang **RỖNG (0 dòng)** — bộ 20 mã năng lực
v0.13 (TV/TA/TOAN/TD) nêu trong brief `KHUNG_NANG_LUC_ERP_BRIEF.md` **chưa
được nhập vào CSDL**. `tien_trinh` đã có seed (P1/P2/P3, đúng như tài liệu).
Tính năng gắn năng lực hoạt động đúng nhưng dropdown chọn năng lực sẽ trống
cho tới khi có người nhập seed data thật — **không tự bịa tên/mô tả hành vi
năng lực** (ERP không được tự sáng tác ngoài xác nhận từ dự án khung năng
lực). Cần: lấy nội dung đầy đủ 20 mã (ma_nang_luc, mien, ten, mo_ta_hanh_vi,
nguon_tham_chieu, phien_ban_khung="v0.13") từ brief thật rồi viết migration
seed riêng.

**Staging:** — (staging đang được chủ động để inactive).
**Production:** 🔲 chưa — đang mở PR, chờ merge (không có migration, chỉ code
frontend/server action).
**Commit:** `159fc86`.

---

## 2026-09-28 — Bước 5.4: luồng nộp duyệt/duyệt câu hỏi

**Tóm tắt:** Thêm luồng trạng thái `nhap → cho_duyet → da_duyet` cho câu hỏi
trong ngân hàng câu hỏi, với 3 hành động mới trên `/dashboard/hoc-lieu/cau-hoi`:

- **Nộp duyệt** (Nháp → Chờ duyệt): bất kỳ vai trò ghi nào (master_admin/
  admin_ht/truong_bm/gv), khớp quy ước sửa/xoá hiện có (không giới hạn theo
  người tạo).
- **Duyệt** (Chờ duyệt → Đã duyệt): chỉ Admin học thuật/Trưởng bộ môn/Master
  Admin — nút "Duyệt" ẩn/disable với gv và với chính người tạo câu hỏi đó
  (không tự duyệt được).
- **Từ chối** (Chờ duyệt → Nháp): trả về để người tạo sửa lại; chưa lưu lý do
  từ chối (không có cột phù hợp — `cau_hoi.tien_trinh` là khoá ngoại của
  khung năng lực, không phải ghi chú duyệt) — ghi nợ kỹ thuật nếu cần sau.

**Migration `0041_chan_gv_tu_duyet_cau_hoi.sql`:** thêm trigger
`trg_cau_hoi_chan_gv_tu_duyet` chặn chuyển `trang_thai` sang `da_duyet` nếu
vai trò người thực hiện không phải master_admin/admin_ht/truong_bm — vá lỗ
hổng: policy `p_write_update` (0040) hiện cho cả gv UPDATE mọi cột kể cả
`trang_thai`, và trigger tự duyệt cũ (`trg_chan_tu_duyet_cau_hoi`, 0038) chỉ
chặn tự duyệt chứ không chặn gv duyệt câu hỏi người khác. Cùng khuôn với
`chan_tu_duyet_hop_dong_hoc_phi` (0037). Expand thuần — không đổi cột/policy
nào, code cũ không bị ảnh hưởng. Server action (`nopDuyetCauHoi`/`duyetCauHoi`/
`tuChoiDuyetCauHoi`) tự kiểm tra `trang_thai` hiện tại + kiểm tra tự duyệt
trước khi gọi DB (thông báo tiếng Việt rõ ràng) — trigger DB vẫn là lớp chặn
thật, đề phòng gọi thẳng qua API.

**Staging:** — (staging đang được chủ động để inactive).
**Production:** 🔲 chưa — migration chỉ vào qua pipeline khi merge (ADR-004),
chờ PR merge.
**Commit:** `e17d27a`.

---

## 2026-09-28 — Bước 5.3: sửa câu hỏi (edit)

**Tóm tắt:** Thêm chức năng sửa câu hỏi trong ngân hàng câu hỏi (nút "Sửa"
trên mỗi dòng ở `/dashboard/hoc-lieu/cau-hoi`, mở modal). Phạm vi sửa: **nội
dung, độ khó, lời giải, đáp án** — **KHÔNG** cho sửa phân loại (cấp học/
chương trình/môn/học phần/bài học/chủ đề/dạng câu), vì `ma_cau_hoi` gắn cố
định theo phân loại lúc tạo (giống quy ước `ma_hoc_sinh`/`ma_lop` bất biến).
Server action `suaCauHoi` tự lấy `dang_cau` thật từ DB (không tin form) để
biết đúng cấu trúc đáp án cần đọc/validate.

- Đáp án dạng lựa chọn/mệnh đề (Trắc nghiệm 1 đáp án / nhiều đáp án / Đúng-Sai
  từng ý): sửa bằng chiến lược xoá hết `lua_chon` cũ của câu hỏi rồi chèn lại
  danh sách mới — xác nhận qua SQL thật là RLS bảng `lua_chon` đã có sẵn
  policy `p_write_delete` (vai trò master_admin/admin_ht/truong_bm/gv), nên
  **không cần migration/policy mới**.
- Đáp án Điền khuyết: parse lại `dap_an_text` (join bằng ` | `) để prefill
  từng ô, ghi đè bằng danh sách mới khi lưu.
- Trích xuất `DapAnFields` (component dùng chung cho cả form tạo lẫn modal
  sửa) từ code trước đó nằm rời rạc trong `CauHoiForm` — tránh lệch logic UI
  giữa tạo/sửa, giống nguyên tắc đã áp dụng cho `dangCauOptions.ts`.
- Modal sửa có toast (`useToast`) cho cả thành công/thất bại, đúng quy ước dự
  án.

**Migration:** không có (chỉ đổi code frontend + server action, RLS đã đủ).
**Staging:** — (staging đang được chủ động để inactive).
**Production:** 🔲 chưa — đang mở PR, chờ merge.
**Commit:** `ea8aa21`.

---

## 2026-09-28 — Đẩy bản vá 5.2 lên production (PR #19, vá lỗ hổng merge PR #18)

**Tóm tắt:** PR #18 (trang tạo câu hỏi, commit `3a72546`) bị merge vào `main`
**trước khi** commit bản vá `d26cde3` (sửa UI đáp án theo dạng câu, xem mục
bên dưới) kịp đẩy lên cùng nhánh — tức production đã chạy bản có lỗ hổng
"Trắc nghiệm 1 đáp án cho tick nhiều đáp án" trong một khoảng thời gian ngắn.
Mở PR #19 từ cùng nhánh `feat/hoc-lieu-cau-hoi-tao` (lúc này đã có thêm commit
`d26cde3` phía trên `3a72546`) để đưa nốt bản vá vào `main`, merge qua đúng
pipeline (không áp tay) — khớp ADR-004. Xác nhận Vercel build production
thành công sau merge (`fdd58b7`).

Không phải lỗi quy trình ADR-004 (migration/schema) — chỉ là thứ tự merge PR
code frontend bị lệch với thứ tự push commit trong cùng 1 phiên làm việc.
Ghi lại để nhắc: **luôn xác nhận PR đã có đủ commit muốn merge trước khi bấm
merge**, tránh lặp lại tình huống merge nhánh cũ hơn commit mới nhất đã push.

**Migration:** không có.
**Staging:** — (staging đang được chủ động để inactive).
**Production:** ✅ đã build & deploy thành công (`fdd58b7`).
**Commit:** `fdd58b7` (merge PR #19 trên `main`).

---

## 2026-09-28 — Bước 5.2 (bản vá): UI đáp án theo đúng từng dạng câu

**Tóm tắt:** Phát hiện qua kiểm thử thủ công (trên PR #18 chưa merge): đổi
"Dạng câu" không đổi UI phần đáp án — lỗ hổng rõ nhất là **Trắc nghiệm 1 đáp
án** vẫn cho tick nhiều đáp án đúng (sai ngữ nghĩa). Vá lại theo yêu cầu:

- **Trắc nghiệm 1 đáp án** (`dang_cau.ma=1`): lựa chọn đổi sang radio (chỉ
  chọn được 1), server validate đúng 1 đáp án đúng, ≥2 lựa chọn.
- **Trắc nghiệm nhiều đáp án** (`ma=2`): giữ checkbox, server validate ≥1 đáp
  án đúng, ≥2 lựa chọn (trước đó không validate).
- **Đúng/Sai (từng ý)** (`ma=3`): UI mới — danh sách mệnh đề, mỗi mệnh đề tick
  Đúng/Sai riêng. Tái dùng nguyên cấu trúc bảng `lua_chon` (chỉ đổi nhãn/diễn
  giải phía UI), không cần migration.
- **Điền khuyết** (`ma=4`): UI mới — danh sách "đáp án cho từng chỗ trống"
  (thêm/bớt động, không có checkbox), nối bằng ` | ` rồi lưu vào `dap_an_text`
  (không có bảng riêng cho từng chỗ trống — chấp nhận encoding đơn giản này ở
  MVP, ghi nợ kỹ thuật nếu sau cần tách rời từng đáp án).
- **Trả lời ngắn/Tự luận** (`ma=7,8`): giữ nguyên 1 ô `dap_an_text` tự do.
- **Nối/ghép cặp** (`ma=5`), **Sắp xếp thứ tự/kéo thả** (`ma=6`): **ẩn khỏi
  dropdown** theo yêu cầu — cấu trúc dữ liệu 2 dạng này khác hẳn (cần mô hình
  "cặp nối" / "thứ tự đúng", có thể cần bảng mới) nên chưa làm vội. Ghi chú
  nợ kỹ thuật ở `src/components/dangCauOptions.ts` (hằng số
  `DANG_CAU_CHUA_HO_TRO`) — server cũng chặn nếu cố gửi thẳng (phòng thủ, dù
  UI đã ẩn). **Việc cần làm sau:** thiết kế cấu trúc lưu (bảng
  `cap_noi`?/`thu_tu_dung`? hay JSON trên `cau_hoi`), rồi bật lại 2 dạng này
  trong `DANG_CAU_CHUA_HO_TRO`.

Logic phân loại dạng câu → kiểu UI/validate gom vào 1 file dùng chung
`src/components/dangCauOptions.ts` (import cả ở `CauHoiForm.tsx` client và
`cau-hoi/actions.ts` server) để 2 bên luôn khớp nhau, tránh lệch UI/validate
như module cũ.

Không có migration mới — chỉ code frontend, vẫn dùng `lua_chon`/`dap_an_text`
đã có sẵn.

**Migration:** không có.
**Staging:** — (staging đang được chủ động để inactive).
**Production:** ✅ chỉ là code — không đụng schema/RLS.
**Commit:** `2c94b5f`.

---

## 2026-09-28 — Bước 5.2: trang tạo câu hỏi (`/dashboard/hoc-lieu/cau-hoi`)

**Tóm tắt:** Trang chính của ngân hàng câu hỏi GĐ3 — tạo câu hỏi mới với
cascading select đầy đủ 7 tầng (cấp học → chương trình → môn học, scope theo
`chuong_trinh_mon_hoc` → học phần → bài học → chủ đề → dạng câu), gọi RPC
`cap_ma_cau_hoi()` để cấp mã 17 số (RPC tự xác nhận học phần/bài học/chủ đề
thật sự thuộc đúng môn/cấp học đã chọn, chặn dữ liệu rác ngay ở tầng DB).
`stt_cau` lưu lại từ 4 số cuối mã trả về để tiện truy vấn sau này.

Hỗ trợ 2 kiểu đáp án song song (DB không ràng buộc bắt buộc 1 trong 2):
**lựa chọn** (`lua_chon`, thêm/bớt động, đánh dấu 1 hoặc nhiều đáp án đúng —
dùng cho trắc nghiệm) và **đáp án dạng văn bản** (`dap_an_text` — dùng cho
điền khuyết/trả lời ngắn/tự luận); giáo viên tự chọn theo dạng câu, không ép
logic cứng theo `dang_cau` để tránh làm phức tạp hoá form giai đoạn đầu.
Ghi `lua_chon` là bước insert riêng sau khi tạo `cau_hoi` (không có transaction
qua PostgREST) — nếu insert `lua_chon` lỗi thì xoá lại `cau_hoi` vừa tạo
(best-effort rollback), tránh để lại câu hỏi rỗng lựa chọn.

Quyền tạo: `master_admin`/`admin_ht`/`truong_bm`/`gv` (khớp `p_write_insert`
trên `cau_hoi`, rộng hơn các module chủ đề/học phần/bài học vì RLS cho phép
giáo viên tạo câu hỏi trực tiếp). Danh sách câu hỏi hiển thị đã ghép tên
cấp học/môn/học phần/bài học/chủ đề/dạng câu (bảng `cau_hoi` lưu mã số
denormalized, không phải UUID FK, nên phải tự dựng map để join phía
frontend) + badge trạng thái (Nháp/Chờ duyệt/Đã duyệt/Lưu trữ). Chỉ có tạo +
xoá mềm ở bước này — sửa câu hỏi và luồng nộp duyệt/duyệt để ở Bước 5.3-5.4
(có trigger DB `chan_tu_duyet_cau_hoi`/`chan_sua_cau_hoi_da_phat_hanh` cần xử
lý UI phù hợp, không làm vội).

Không có migration mới — chỉ dùng bảng/RLS/RPC đã có sẵn (`0038`/ADR-002).

**Migration:** không có (chỉ code frontend).
**Staging:** — (staging đang được chủ động để inactive).
**Production:** ✅ chỉ là code — không đụng schema/RLS.
**Commit:** `d14c5fb`.

---

## 2026-09-28 — Bước 5.1b: giao diện quản lý Học phần & Bài học (`/dashboard/hoc-lieu/hoc-phan`, `/bai-hoc`)

**Tóm tắt:** Tiếp nối Bước 5.1 (Chủ đề). Trong lúc chuẩn bị trang tạo câu hỏi
(5.2), phát hiện `hoc_phan` và `bai_hoc` đang **rỗng hoàn toàn trên production**
(0 dòng mỗi bảng) — hai bảng này là điều kiện bắt buộc cho cascading select
của form tạo câu hỏi và cho RPC `cap_ma_cau_hoi()` (cần học phần + bài học tồn
tại thật để sinh mã 17 số hợp lệ). Vì vậy làm thêm 2 module CRUD trước khi
làm trang câu hỏi, đúng tinh thần đã làm với Chủ đề ở 5.1.

Module `hoc-lieu/hoc-phan/` (theo đúng pattern `chu_de`: `actions.ts` +
`HocPhanForm`/`HocPhanTable`/`HocPhanEditModal`) — form chọn môn học (gộp cấp
học), nhập mã 1-99 + tên + mô tả; gửi kèm `cap_hoc_ma`/`mon_hoc_ma` (hidden
input, suy ra từ môn học đã chọn) vì `hoc_phan` có khoá ngoại tổ hợp
`fk_hocphan_mon(cap_hoc_ma, mon_hoc_ma)` bên cạnh `mon_hoc_id`. Module
`hoc-lieu/bai-hoc/` tương tự, scope theo `hoc_phan_id` (dropdown hiển thị cấp
học — môn học — tên học phần để dễ phân biệt). Cả hai xoá mềm (`deleted_at`),
chặn xoá khi còn dữ liệu con tham chiếu (báo lỗi tiếng Việt qua
`mapDbError()`), quyền ghi `master_admin`/`admin_ht`/`truong_bm` khớp RLS hiện
có, mọi action gắn `useToast()`. Cập nhật `subNav` ở `hoc-lieu/` và `chu-de/`
để có đủ 4 mục: Tổng quan | Chủ đề | Học phần | Bài học.

Không có migration mới — chỉ dùng bảng/RLS đã có sẵn từ trước (`0038`/ADR-002).

**Migration:** không có (chỉ code frontend, bảng/RLS `hoc_phan`/`bai_hoc` đã có sẵn).
**Staging:** — (staging đang được chủ động để inactive, không thử ở đây).
**Production:** ✅ chỉ là code — không đụng schema/RLS, không cần migration riêng.
**Commit:** `b98ea00`.

---

## 2026-09-28 — Bước 5.1: giao diện quản lý Chủ đề (`/dashboard/hoc-lieu/chu-de`)

**Tóm tắt:** Bắt đầu Bước 5 (giao diện nhập liệu ngân hàng câu hỏi GĐ3) bằng
module quản lý **Chủ đề** — bảng mã gốc `chu_de` (thêm ở migration `0038`,
xem mục riêng khi PR đó merge) là điều kiện bắt buộc để RPC `cap_ma_cau_hoi()`
cấp mã câu hỏi 17 số hoạt động, nên làm trước trang nhập câu hỏi.

Module mới `src/app/dashboard/hoc-lieu/` (trang tổng quan + `chu-de/`), theo
đúng pattern thật của repo (Server Actions trong `actions.ts`, CSS Modules,
`useToast()` cho mọi action tạo/sửa/xoá) — không dùng react-hook-form/zod/
shadcn như dự kiến ban đầu (giả định sai, đã sửa lại kế hoạch trước khi code).
Form tạo chủ đề chọn môn học (gộp hiển thị cấp học), nhập mã 1-99 + tên + mô
tả; bảng tra cứu có sửa/xoá mềm. Quyền ghi: `master_admin`/`admin_ht`/
`truong_bm` (khớp policy `p_write_chu_de`); đọc mở cho mọi vai trò đã đăng
nhập (khớp `p_read_chu_de`, không hạn chế theo phạm vi môn vì danh mục chủ đề
không nhạy cảm). Thêm class `.textarea` dùng chung vào `Form.module.css`
(module đầu tiên cần ô nhập nhiều dòng).

`npm run build` qua, không lỗi TypeScript/ESLint trong các file mới.

**Migration:** không có (chỉ code frontend, dùng bảng `chu_de` đã có từ `0038`).
**Staging:** không áp dụng (không có migration).
**Production:** không áp dụng (không có migration) — chờ deploy qua Vercel khi
merge `main` như thường lệ.
**Commit:** `d2aff69`.

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
**Commit:** `954d425` (merge `96b9617` trên `main`, PR #15).

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
**Commit:** `ea8aa21`.

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
