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

## 2026-10-05 — Form học sinh: "Trường học" và "Khối thi/kỳ thi" có ô gợi ý

**Tóm tắt:** Đổi nhãn "Trường THPT" → "Trường học", "Khối thi" → "Khối thi/kỳ thi" (placeholder `khối A01, V-ACT, Nội trú Nội - Nhi,...`) ở form Tạo học sinh, modal Sửa, bảng và CSV xuất. Hai ô thành ô nhập có gợi ý (`<datalist>`, vẫn gõ tự do): kỳ thi gồm 5 mục (V-ACT, SAT, Nội trú Nội-Nhi/Ngoại-Sản UMP, Thạc sĩ UMP); trường học gồm ~1.500 trường THPT lấy từ Wikipedia (đầy đủ ở ~16 tỉnh/thành, các tỉnh khác mới có trường chuyên/nổi tiếng — chưa phải danh mục chính thức) và 38 trường đại học Y Dược công/tư. Cột CSDL `truong_thpt`/`khoi_thi` giữ nguyên.

**Migration:** không có (chỉ đổi code frontend).

**Staging:** — (không dùng)

**Production:** 🔲 chưa — lên production qua PR này.

**Commit:** xem PR.

---

## 2026-10-05 — Quy trình đề xuất → phê duyệt khi sửa hợp đồng (Admin Tuyển sinh → Master Admin), mọi bước đều log

**Tóm tắt:** Admin Tuyển sinh không sửa trực tiếp mà "Đề xuất sửa" (bắt buộc nêu lý do) ở trang Hợp đồng; Master Admin xem tại
`/dashboard/hoc-phi/yeu-cau-sua` và Phê duyệt hoặc Từ chối (đều bắt buộc lý do); người đề xuất có thể Rút. Duyệt = áp ngay vào
hợp đồng. Mỗi hợp đồng tối đa 1 yêu cầu chờ duyệt. Đề xuất/duyệt/từ chối/rút và thay đổi hợp đồng do duyệt (`sua_hop_dong_theo_yeu_cau`)
đều vào `nhat_ky` (hiện trong nút "Lịch sử" của Master). DB chặn sửa cột tài chính của hợp đồng không-nháp ngoài hai đường
RPC (`sua_hop_dong_master`, duyệt yêu cầu) đối với người dùng đăng nhập — kể cả `ke_toan`/`admin_ts`/`master_admin` UPDATE trực tiếp.

- **Migration:** `0055_quy_trinh_de_xuat_phe_duyet_sua_hop_dong.sql` (tag `expand`: bảng `yeu_cau_sua_hop_dong` + RLS chỉ-đọc, trigger
  nhật ký/bất biến, trigger chặn sửa tài chính trực tiếp, RPC `de_xuat_sua_hop_dong`/`xu_ly_yeu_cau_sua_hop_dong`/`rut_yeu_cau_sua_hop_dong`).
  Test PGlite: `npm run test:yeu-cau-sua-hop-dong` (45 kiểm tra, đã thêm vào CI).
- **Code:** `HopDongEditModal` (chế độ `de_xuat`), `YeuCauSuaTable`, trang `yeu-cau-sua`, actions `deXuatSuaHopDong`/`xuLyYeuCauSua`/`rutYeuCauSua`,
  liên kết "Yêu cầu sửa" trên sub-nav học phí.
- **Lưu ý:** chỉ `admin_ts` được đề xuất; SQL Editor/service role không bị chặn nhưng vẫn được trigger ghi log. Cần reviewer xác nhận phân loại
  `expand` cho 2 trigger chặn (nhat_ky append-only ở 0054 và chặn sửa tài chính ở 0055).
- **Staging:** 🔲 chưa áp (staging không truy cập được)
- **Production:** 🔲 chưa áp — chờ merge, CI áp qua Environment `production-db`.
- **Commit:** (xem PR #59)

---

## 2026-10-05 — Công cụ sửa hợp đồng (Master Admin) + nhật ký thay đổi hợp đồng

**Tóm tắt:** Master Admin sửa được giá niêm yết, giảm giá, hình thức đóng, ghi chú của hợp đồng học phí
ngay trên `/dashboard/hoc-phi/hop-dong` (nút "Sửa"), bắt buộc nhập lý do, có xem trước doanh thu thuần/còn phải
thu và cảnh báo thu dư. Mọi thay đổi trên `hop_dong_hoc_phi` (kể cả kích hoạt/huỷ/sửa trực tiếp bằng SQL) được
trigger tự ghi vào `nhat_ky` (cặp trước/sau chỉ gồm cột thật sự đổi, người thao tác, lý do); nút "Lịch sử" xem lại
dòng thời gian. `nhat_ky` thành bảng chỉ-thêm (chặn UPDATE/DELETE). Ca khởi nguồn: hợp đồng 101026001002 (sheet
23,5tr, hệ thống 25tr).

- **Migration:** `0054_master_sua_hop_dong_va_nhat_ky.sql` (tag `expand`: cột `nhat_ky.ly_do`, 2 trigger, RPC
  `sua_hop_dong_master`). Test PGlite: `npm run test:hop-dong-nhat-ky` (25 kiểm tra, đã thêm vào CI cùng
  `test:hop-dong-unique`).
- **Code:** `HopDongEditModal`, `HopDongLichSuModal`, actions `suaHopDongMaster`/`layLichSuHopDong`, bổ sung CSS
  modal vào `hoc-phi.module.css` (trước đó `GoiHocPhiDoiGiaModal` dùng class modal chưa được định nghĩa ở file này).
- **Giới hạn đã biết:** sửa giá KHÔNG tự cập nhật lịch kỳ đóng và không đổi phiếu thu; RPC trả về tổng kỳ để
  giao diện cảnh báo lệch. Chưa có công cụ sửa kỳ đóng; không sửa hợp đồng đã huỷ.
- **Staging:** 🔲 chưa áp (staging timeout khi kiểm tra kết nối ngày 05/10/2026)
- **Production:** 🔲 chưa áp — chờ merge, CI áp qua Environment `production-db`.
- **Commit:** (xem PR)

---

## 2026-10-04 — Sửa lỗi: hủy hợp đồng học phí xong không tạo lại được hợp đồng mới

**Tóm tắt:** `hop_dong_hoc_phi` có `UNIQUE (ghi_danh_id)` cho mọi trạng thái nên hợp đồng `da_huy` vẫn chiếm chỗ ghi danh; dropdown "Tạo hợp đồng mới" cũng loại mọi ghi danh có bất kỳ hợp đồng nào. Sửa: ràng buộc duy nhất chỉ tính hợp đồng đang mở (chưa hủy, chưa xóa mềm) + dropdown lọc theo cùng điều kiện. Học sinh 202126002010 được mở khóa, hợp đồng đã hủy giữ lại làm vết. Test PGlite: `npm run test:hop-dong-unique`.

**Migration:** `0053_hop_dong_unique_chi_tinh_hop_dong_mo.sql` (Expand, nới ràng buộc; có `DROP CONSTRAINT` nên người duyệt xác nhận lại phân loại).

**Staging:** — (không dùng)

**Production:** ✅ đã áp dụng thủ công bằng MCP ngày 04/10/2026 (vi phạm ADR-004, ghi nhận trung thực); file migration viết idempotent, lịch sử production đã đổi version → 0053 để parity khớp. Code frontend (`hop-dong/page.tsx`, `database.types.ts`) lên production qua PR này.

**Commit:** xem PR.

---

## 2026-10-03 — Phân công giảng dạy: GV chỉ thấy lớp/học sinh mình phụ trách, duyệt học phần, tạo user một bước

**Tóm tắt:** Thêm bảng phân công giảng dạy (lớp × môn). Giáo viên / trợ giảng / trưởng bộ môn chỉ thấy lớp được phân công; học sinh chỉ hiện tên + lớp (không SĐT, qua RPC `hoc_sinh_cua_toi`); không còn thấy cụm Vận hành và tab Học liệu ở sidebar (chặn cả truy cập URL). GV đề xuất học phần → Trưởng bộ môn/quản trị duyệt (mã cấp khi duyệt); GV tạo bài học dưới học phần đã duyệt trong môn mình. Master Admin tạo người dùng trong một bước (email, tên, vai trò, chi nhánh, môn/cấp học, phân lớp tuỳ chọn). Chi tiết và ngoại lệ ADR-002: `docs/adr/ADR-007-phan-cong-giang-day-va-rls-theo-lop.md`. Test PGlite: `npm run test:phan-cong`.

**Migration:** `0052_phan_cong_giang_day_rls_gv_duyet_hoc_phan.sql` (Expand; có thay thế policy SELECT — xem ADR-007).

**Staging:** — (không dùng)

**Production:** ✅ đã áp dụng thủ công 03/10/2026 trước khi có PR (sai lệch ADR-004, ghi trong ADR-007); file migration là bản sao nguyên văn, lịch sử migration remote đồng bộ về `0052`. Code giao diện: 🔲 chưa — chờ merge PR.

---

## 2026-10-03 — CI kiểm tra PR + dọn lỗi lint + luật tag migration

**Tóm tắt:** (1) Sự cố 0050: file thiếu dòng `-- adr004-type: expand` nên CI không tự áp, job parity fail sau merge — đã bổ sung tag (PR #50) và ghi luật bắt buộc vào `CLAUDE.md` (migration phải có tag ở dòng 1). (2) PR #53 thêm `.github/workflows/ci.yml` chạy trên mọi PR vào `main`: kiểm tag migration, ESLint, `tsc`, test PGlite (đề thi, ngữ liệu, đề × ngữ liệu). (3) PR #51 sửa toàn bộ lỗi ESLint (từ 7 lỗi + 8 cảnh báo còn 0 lỗi + 2 cảnh báo): Sidebar, SearchableSelect, biểu đồ tròn Học phí, trang Vận hành, test 0049.

**Migration:** không có (0050 chỉ được thêm tag ở dòng 1, nội dung SQL giữ nguyên).

**Staging:** — (không dùng)

**Production:** ✅ đã merge `main` (PR #50, #51, #53); job parity xanh trên các lần push. Việc còn lại cho chủ dự án: bật "Require status checks" cho 2 job của `ci.yml` ở GitHub Settings → Branches để chặn merge cứng. Nên bấm thử: thu gọn Sidebar + F5, ô chọn có tìm kiếm, biểu đồ tròn Học phí.

---

## 2026-10-03 — Giao diện ngữ liệu: tạo nằm trong "Tạo câu hỏi", danh sách ngữ liệu có tìm kiếm + bộ lọc

**Tóm tắt:** Tab "Tạo câu hỏi" có thêm mục **Tạo ngữ liệu** (từng ngữ liệu / nhập từ file). Tab "Ngữ liệu" đổi thành **Danh sách ngữ liệu**, có ô tìm kiếm (số hiệu, tiêu đề, nội dung) và bộ lọc cấp học, môn, học phần, bài học, chủ đề, loại, giống Danh sách câu hỏi. Trang `/ngu-lieu/tao-moi` cũ tự chuyển hướng. Chỉ đổi code giao diện.

**Migration:** không có.

**Staging:** — (không dùng)

**Production:** ✅ đã merge `main` (PR #55, 03/10/2026); chỉ đổi code, không có migration.

---

## 2026-10-03 — Đề thi × ngữ liệu: câu con đúng thứ tự soạn + "Bỏ câu này" trong đề nháp

**Tóm tắt:** Trong đề sinh từ ma trận, các câu con của một ngữ liệu nay xếp theo thứ tự đã soạn ở tab Ngữ liệu (trước đây theo mã câu hỏi nên đổi ↑/↓ không có tác dụng), vẫn liền nhau ở mọi mã đề. Ở xem trước đề nháp thêm nút **Bỏ câu này** để GV bỏ bớt câu con (cụm còn ≥ 1 câu).

**Migration:** `0051_de_thi_nhom_ngu_lieu.sql` (Expand: `create or replace danh_so_lai_de`, hàm mới `bo_cau_con_khoi_de`). Test PGlite: `npm run test:de-ngu-lieu`.

**Staging:** — (không dùng)

**Production:** ✅ đã merge (PR #54) + CI áp `0051` (xác nhận qua lịch sử migration production, 03/10/2026).

---

## 2026-10-03 — Sửa form đổi mật khẩu bắt buộc: thêm ô "Mật khẩu hiện tại"

**Tóm tắt:** Supabase Auth đang bật "yêu cầu mật khẩu hiện tại khi đổi mật khẩu" nên form đổi mật khẩu lần đầu (thiếu ô này) luôn báo `Current password required when setting new password`, người dùng mới bị kẹt ở trang đổi mật khẩu. Thêm ô "Mật khẩu hiện tại" (gửi `current_password`), dịch lỗi Auth sang tiếng Việt, và nếu bước đánh dấu `phai_doi_mat_khau` lỗi thì bấm lại chỉ gọi lại bước đó. Đăng nhập không đổi.

**Migration:** không có.

**Staging:** — (không dùng)

**Production:** ✅ đã merge `main` (PR #52, 03/10/2026); chỉ đổi code, không có migration. Cần xác nhận bằng tài khoản mới: đăng nhập → nhập mật khẩu mặc định ở ô hiện tại + mật khẩu mới.

---

## 2026-10-03 — Ngữ liệu: nhóm câu hỏi (1 ngữ liệu + nhiều câu con), nhập tay và nhập từ file

**Tóm tắt:** Thêm tab **Ngữ liệu** trong Ngân hàng câu hỏi: tạo/sửa ngữ liệu (số hiệu `NL-0001…`, nhãn môn học, loại, nội dung có công thức), trang chi tiết thêm/sắp xếp/xoá câu hỏi con (câu con không tồn tại độc lập, cùng vị trí với ngữ liệu, tối đa 30). **Nhập từ file** riêng (xlsx 2 sheet, có file mẫu, xem trước, nhập từng nhóm), tách khỏi import câu hỏi thường. Chưa làm: kéo cả nhóm vào đề khi soạn đề; ảnh trong ngữ liệu.

**Migration:** `0050_ngu_lieu_nhom_cau_hoi.sql` (Expand: `ngu_lieu.so_hieu`, `ngu_lieu.chu_de_id`, `cau_hoi.thu_tu_trong_ngu_lieu`, trigger kiểm vị trí, hàm `vi_tri_ngu_lieu`, `thu_tu_ke_tiep_ngu_lieu`, `doi_thu_tu_cau_con`, `xoa_mem_ngu_lieu`; FK `cau_hoi.ngu_lieu_id` → RESTRICT). Test PGlite: `npm run test:ngu-lieu`.

**Staging:** — (không dùng; kiểm bằng PGlite)

**Production:** ✅ PR #49 merge, nhưng 0050 thiếu tag `-- adr004-type: expand` nên CI xếp là contract, không tự áp và job parity báo lỗi; PR #50 bổ sung tag → CI áp `0050` (xác nhận qua lịch sử migration production, 03/10/2026).

---

## 2026-10-02 — Đề thi theo ma trận đề (soạn ma trận → sinh đề → xem trước → chốt → xuất .docx)

**Tóm tắt:** Giáo viên/Trưởng bộ môn/Admin soạn **ma trận đề** (mỗi dòng: câu độc lập hoặc cụm ngữ liệu; lọc theo dạng câu, học phần, bài học, chủ đề, tiến trình; khoảng độ khó; tuỳ chọn nới độ khó ±1 khi thiếu). Hệ thống **xáo trộn có seed** và chọn câu/cụm từ ngân hàng (chỉ câu **Đã duyệt**, trong phạm vi môn của người dùng), ưu tiên câu chưa dùng trong N đề đã chốt gần nhất (chống lặp, thiếu mới dùng lại và đánh dấu). Xem trước có công thức LaTeX, **khoá** / **đổi cụm**, sinh lại giữ phần đã khoá. **Chốt đề** chụp lại nội dung (không đổi theo ngân hàng nữa), sinh **nhiều mã đề** (101, 102…, hoán vị cụm/câu và đáp án A–D, lưu bố cục để xuất lại y hệt). Xuất **.docx** (Đề / Đáp án / Lời giải; công thức là công thức Word thật; ảnh nhúng) hoặc .zip cả bộ. Mục menu "Đề thi" cho master_admin, admin_ht, truong_bm, gv (trợ giảng và vai trò khác ẩn hẳn). Nội dung câu hỏi nay hiểu cú pháp công thức `$…$` / `$$…$$` (xem `docs/yeu-cau-bo-go-latex.md` — bộ gõ nhập công thức là việc tiếp theo).

**Migration:** `0049_de_thi_theo_ma_tran.sql` (Expand: bảng `ma_tran_de`, `ma_tran_dong`, `de_cau_hoi_ban_chup`, `de_ma_de`; cột mới trên `de`/`de_cau_hoi`; policy INSERT/UPDATE/DELETE tách riêng; trigger khoá đề/ma trận đã chốt; hàm `pool_dong`, `do_phu_ma_tran`, `sinh_de`, `khoa_don_vi`, `goi_y_cum`, `doi_cum`, `chot_de`, `tao_ma_de`, `luu_ma_tran`, `nhan_ban_ma_tran`). Mã đề (`de.ma_de`) hiện tạm dạng `DTyymm-nnn` — chờ chốt quy ước ID tài liệu 14 hay 19 số. Thư viện mới: `temml`, `mathml2omml`.

**Staging:** — (không dùng)

**Production:** ✅ CI áp `0049` (xác nhận qua lịch sử migration production, 03/10/2026) + code đã merge (PR #48).

**Commit:** xem PR `feat/de-thi-theo-ma-tran`.

---

## 2026-10-02 — Định dạng văn bản trong câu hỏi (in đậm / in nghiêng / gạch chân)

**Tóm tắt:** Nội dung câu hỏi, lời giải, lựa chọn/mệnh đề và đáp án (điền khuyết, trả lời ngắn) có thanh công cụ **B / I / U** (và phím tắt Ctrl+B/I/U). Lưu dưới dạng HTML tối giản chỉ cho phép `<b> <i> <u> <br>`, làm sạch ở cả client lẫn server; danh sách câu hỏi và màn Trợ giảng hiển thị đúng định dạng. Dữ liệu cũ (văn bản thuần) hiển thị bình thường. Riêng nội dung câu hỏi và lời giải có thêm nút **thụt lề đầu dòng** (→ / Tab, giảm bằng ← / Shift+Tab; lưu bằng 2 ký tự em-space). Import từ file vẫn là văn bản thuần (được escape an toàn).

**Migration:** không có (cột `text` hiện có đã đủ).

**Staging:** — (không dùng)

**Production:** 🔲 chờ merge + deploy (chỉ đổi code).

**Commit:** xem PR `feat/dinh-dang-van-ban-cau-hoi`.

---

## 2026-10-02 — Rút gọn phân loại câu hỏi: chỉ cần Môn học + Dạng câu (ADR-006)

**Tóm tắt:** Câu hỏi thuộc **môn học**; chương trình giảng dạy chỉ gom các môn và kéo câu hỏi theo môn. Form tạo câu hỏi bỏ ô Cấp học/Chương trình
(cấp học tự suy ra từ môn); Học phần, Bài học, Chủ đề thành tuỳ chọn (để trống = "Chung"). Mã câu hỏi **giữ nguyên 17 số**: chương trình luôn `000`,
học phần/bài học/chủ đề = `00` khi để trống. Bộ lọc chương trình trong danh sách đi qua `chuong_trinh_mon_hoc`. Template/import bỏ cột Chương trình,
học phần/bài học/chủ đề tuỳ chọn. Môn chưa có học phần/chủ đề (vd Tiếng Anh) tạo được câu hỏi ngay.

- **Migration:** `0048_cap_ma_cau_hoi_phan_loai_rut_gon.sql` (Expand, tag `expand`; `CREATE OR REPLACE` hàm `cap_ma_cau_hoi` giữ nguyên chữ ký, code cũ chạy bình thường).
- **Staging:** ✅ không áp dụng (môi trường staging đã đóng).
- **Production:** ✅ đã merge `main` + CI áp `0048` (xác nhận qua lịch sử migration production, 02/10/2026).
- **Commit:** (xem PR `feat/phan-loai-cau-hoi-rut-gon`). Quyết định: `docs/adr/ADR-006-phan-loai-cau-hoi-rut-gon.md`.

---

## 2026-10-02 — Ngân hàng câu hỏi: nhập từ file CSV/Excel + đính kèm hình ảnh

**Tóm tắt:** (1) Nhập câu hỏi hàng loạt từ file (tải template → điền → upload → xem trước → xác nhận; câu mới ở trạng thái Nháp,
tối đa 500 dòng/file, cảnh báo nghi trùng). (2) Đính kèm ảnh cho câu hỏi (đề bài, lời giải, từng lựa chọn; JPG/PNG/WebP ≤ 2MB) ở form
tạo/sửa và khi nhập từ file kèm zip ảnh; danh sách hiện ảnh đề. (3) Ô tải file kéo-thả thay nút "Choose File". Ảnh lưu ở Storage bucket private
`hinh-cau-hoi`, xem qua signed URL. Migration là Expand (chỉ thêm bảng/bucket/policy) nên code cũ trên production không bị ảnh hưởng.

- **Migration:** `0047_cau_hoi_hinh_anh.sql` (tag `expand` → CI tự áp sau khi duyệt Environment `production-db`, ADR-005).
- **Staging:** ✅ không áp dụng (môi trường staging đã đóng).
- **Production:** ✅ đã merge `main` + CI áp `0047` (xác nhận qua lịch sử migration production, 02/10/2026).
- **Commit:** (xem PR `feat/cau-hoi-hinh-anh`, gồm cả `feat/import-cau-hoi`).

---

## 2026-10-02 — Thêm ô tìm kiếm cho bảng Hợp đồng và bảng Phiếu thu (module Học phí)

**Tóm tắt:** Hai bảng có ô tìm kiếm phía server (`?q=`, gõ xong ~300ms mới truy vấn, đổi từ khoá về trang 1, giữ `?size`).
Hợp đồng: tên/mã học sinh, tên/mã lớp, tên gói. Phiếu thu: mã phiếu, tên/mã học sinh, người thu, ghi chú, số tiền (gõ toàn số).
Chỉ đổi code frontend/server, không đổi CSDL. Lưu ý: tìm theo ILIKE nên chưa bỏ dấu tiếng Việt (gõ "Nguyễn" mới ra "Nguyễn").

- **Migration:** không có.
- **Staging:** ✅ không cần (chỉ code).
- **Production:** ✅ đã merge `main` → Vercel deploy (02/10/2026).
- **Commit:** (xem PR `feat/hoc-phi-tim-kiem`).

---

## 2026-10-02 — Sửa lỗi không ghi được phiếu thu mới (`tao_ma_phieu_thu`)

**Tóm tắt:** Sau khi chèn tay phiếu đảo mã `PT-2026-000187-DAO`, mọi lần ghi phiếu thu mới đều lỗi
`invalid input syntax for type integer: "000187-DAO"`: hàm `tao_ma_phieu_thu()` ép phần sau tiền tố của MỌI
mã `PT-<năm>-%` sang số nguyên. Hàm nay chỉ xét mã đúng dạng `PT-<năm>-<chữ số>` nên bỏ qua mã có hậu tố.
Phiếu thu append-only (không sửa/xoá được mã lỗi) nên phải sửa hàm.

- **Migration:** `0046_fix_tao_ma_phieu_thu_bo_qua_ma_khong_thuan_so.sql` (tag `expand`, CI tự áp sau khi duyệt).
- Mã kế tiếp sau sửa (kiểm bằng SELECT chỉ đọc trên production): `PT-2026-000190`.
- Bài học: phiếu đảo nên lấy mã từ `tao_ma_phieu_thu()` (cùng dãy số), không tự đặt hậu tố.
- **Production**: 🔲 chưa merge. **Commit**: (xem git log nhánh `fix/tao-ma-phieu-thu-bo-qua-ma-dao`)

---

## 2026-10-02 — Dashboard Trang chủ khớp số liệu trang Học phí + biểu đồ thật

**Tóm tắt:** Trang chủ và trang Học phí từng cho hai con số công nợ khác nhau (385.000.000đ so với
1.727.750.000đ) vì mỗi nơi tự tính một kiểu. Nay công thức nằm ở `src/lib/tai-chinh.ts`, tách nguyên
văn từ `HocPhiDashboardClient` (trang Học phí là nguồn gốc, hành vi không đổi) và cả hai trang cùng gọi.
Hai khung biểu đồ chờ ở Trang chủ được thay bằng biểu đồ thật. Không có migration DB — chỉ frontend.

- "Công nợ chưa thu" → **"Còn phải thu"** = max(doanh thu thuần − thực thu, 0), toàn thời gian. Trước đây
  cộng `so_tien_du_kien` của các kỳ chưa đóng, bỏ sót 51/73 hợp đồng chưa có lịch kỳ đóng.
- "Doanh thu tháng này" → **"Thực thu tháng này"**: đổi tên cho đúng bản chất (đang cộng phiếu thu) và
  nay trừ phiếu đảo (`la_phieu_dao`) như trang Học phí; trước đây phiếu đảo bị cộng nhầm.
- "Kỳ đóng quá hạn" (đếm kỳ trạng thái `qua_han`) → **"Hợp đồng đóng thiếu / chậm"** đếm từ view
  `v_hop_dong_qua_han`, cùng nguồn với bảng "Đóng thiếu / chậm thu" ở trang Học phí.
- Thẻ đếm hợp đồng thêm điều kiện `deleted_at is null` cho khớp trang Học phí.
- Biểu đồ **Thực thu 6 tháng gần nhất** (đường; chỉ `master_admin`/`ke_toan`/`thu_ngan`/`admin_ts`, vai
  trò khác ẩn hẳn) và **Học sinh theo chi nhánh** (cột); dashboard GV có **Học sinh theo lớp tôi đang
  dạy**. SVG/HTML viết tay, không thêm thư viện; có crosshair + tooltip, điều hướng phím mũi tên, bảng
  ẩn cho trình đọc màn hình, trạng thái rỗng, xếp 1 cột trên màn hình hẹp.
- Biểu đồ chi nhánh lộ ra dữ liệu thiếu: 6/14 lớp chưa có `chi_nhanh_id` (86/153 học sinh đang học) —
  hiện thành nhóm "Chưa gán chi nhánh". Cần gán chi nhánh cho các lớp này (việc dữ liệu, không thuộc PR).
- Giới hạn đã biết (có sẵn từ trước, chưa xử lý): PostgREST cắt 1000 dòng/request — cả trang Học phí lẫn
  dashboard đều đọc thẳng `hop_dong_hoc_phi` + `phieu_thu`; hiện 154 hợp đồng, 177 phiếu thu, chưa vướng.
- **Production**: 🔲 chưa merge. **Commit**: (xem git log nhánh `feat/dashboard-khop-hoc-phi-bieu-do`)

---

## 2026-10-02 — Phân trang bảng Hợp đồng học phí (PR4)

**Tóm tắt:** Trang `hoc-phi/hop-dong` phân trang phía server (`?page&size`). Bỏ kiểu tải TOÀN BỘ
`ghi_danh`/`hoc_sinh`/`lop` rồi join bằng Map trong JS: tên học sinh, lớp, gói lấy bằng embed cho
đúng các hợp đồng của trang hiện tại; thực thu (`v_tai_chinh_hop_dong`) chỉ tra cho các hợp đồng
của trang. Không có migration DB — chỉ frontend (FK đã kiểm bằng SQL trên production: mỗi quan hệ
embed chỉ có 1 FK nên không mơ hồ).

- Dropdown "Tạo hợp đồng": vẫn là danh sách ghi danh đang học chưa có hợp đồng, nay lấy bằng 1 query
  riêng (embed hợp đồng để loại ghi danh đã có). Loại luôn học sinh đã xoá mềm (trước đây hiện "?").
  Giới hạn đã biết: PostgREST thường cắt ở 1000 dòng/request — nếu số học sinh đang học vượt 1000,
  dropdown cần đổi thành ô tìm kiếm (hiện 153 đang học, chưa vướng).
- **Production**: 🔲 chưa merge. **Commit**: (xem git log nhánh `feat/phan-trang-hop-dong`)

---

## 2026-10-02 — Danh sách học sinh phân trang phía server + view `v_hoc_sinh_danh_sach` (PR3b)

**Tóm tắt:** Danh sách học sinh hết giới hạn cứng 1000 dòng và hết lọc ở client: tìm kiếm,
lọc lớp/chi nhánh/trạng thái ghi danh và phân trang chạy ở server (URL `?q&lop&cn&tt&page&size`),
ô tìm kiếm debounce 300ms. Xuất CSV là server action, xuất TOÀN BỘ học sinh khớp bộ lọc
(tải theo lô 1000, tối đa 20.000 dòng). CSV có thêm chống chèn công thức (ô bắt đầu `= + - @`
được thêm dấu nháy; số điện thoại dạng `+84...` giữ nguyên).

- **Migration:** `0045_v_hoc_sinh_danh_sach.sql` — Expand (chỉ thêm view `security_invoker`,
  chỉ `SELECT` cho `authenticated`, thu hồi `anon`/`public`). Code CŨ không dùng view nên
  chạy bình thường khi migration lên trước.
- **Thứ tự bắt buộc (ADR-004):** merge PR migration (`feat/hoc-sinh-view-danh-sach`) và để
  pipeline áp lên production TRƯỚC; chỉ merge PR code (`feat/hoc-sinh-danh-sach-phan-trang`)
  sau khi view đã có trên production. Không áp tay.
- Đã kiểm: truy vấn của view chạy chỉ-đọc trên production → 160 học sinh, mỗi người đúng 1
  ghi danh (153 `dang_hoc`, 7 `da_nghi`), không nhân dòng. CHƯA chạy `get_advisors` sau khi
  view tồn tại (view chưa được tạo) — chạy sau khi pipeline áp migration.
- **Production**: migration `0045` ✅ đã áp dụng 02/10/2026 qua pipeline (PR #33 + sửa tag `adr004-type: expand`
  ở `fix/migration-0045-tag-expand`); view có `security_invoker=true`, `anon` không có quyền, `authenticated` đọc
  được 160 dòng. `get_advisors` (security + performance) sau khi áp: không có cảnh báo nào về view này. Ghi chú:
  `authenticated` còn giữ quyền ghi mặc định của Supabase trên view — vô hại vì view có join/lateral nên không
  ghi được; có thể thu hẹp bằng migration Expand sau. Code danh sách học sinh: 🔲 chưa merge.
- **Commit**: (xem git log hai nhánh trên)

---

## 2026-10-02 — Tab Học sinh tách 2 tab con: Tạo học sinh / Danh sách học sinh (PR3a)

**Tóm tắt:** Theo yêu cầu của Hiệu trưởng, trang Học sinh có 2 tab con. `/dashboard/hoc-sinh`
vẫn là Danh sách học sinh; form tạo học sinh chuyển sang `/dashboard/hoc-sinh/tao-moi`.
Không có migration DB — chỉ frontend. Xếp chồng trên PR2.

- Tab "Tạo học sinh" chỉ hiện với `master_admin`/`admin_ts`/`quan_ly_chi_nhanh`; vai trò
  khác vào thẳng `/tao-moi` sẽ bị chuyển về danh sách. `quan_ly_chi_nhanh` chỉ thấy lớp
  thuộc chi nhánh của mình trong ô chọn lớp.
- Danh sách học sinh chưa phân trang server-side (vẫn lọc phía client, `limit(1000)`) —
  làm ở PR3b vì cần view `v_hoc_sinh_danh_sach` (migration 0045) đi trước.

- **Staging**: 🔲 (không có migration; staging đang tạm dừng)
- **Production**: 🔲 chưa merge
- **Commit**: (xem git log nhánh `feat/hoc-sinh-tab-con-phan-trang`)

---

## 2026-10-02 — Phân trang bảng (PR2: Lớp, Buổi học, Câu hỏi, Phiếu thu)

**Tóm tắt:** Tiếp tục phân trang server-side (xem PR1 ở mục 2026-09-29): bỏ các
`limit` cứng đang cắt dữ liệu âm thầm. Không có migration DB — chỉ frontend.
Xếp chồng trên nhánh PR1 (`feat/phan-trang-bang-nen-danh-muc`), cần merge PR1 trước.

- **Phiếu thu** (`hoc-phi/thu-tien`): sửa lỗi hiển thị thật — production có 177
  phiếu thu (đối chiếu 02/10/2026) nhưng trang chỉ lấy `limit(100)`, tức 77 phiếu
  không hiện. Nay phân trang đủ. Tên học sinh + biên lai lấy bằng embed
  (`hop_dong_hoc_phi(ghi_danh(hoc_sinh))`, `tep_dinh_kem`) chỉ cho phiếu của trang
  hiện tại, thay cho việc tải toàn bộ `ghi_danh`/`hoc_sinh`/`tep_dinh_kem`. Hệ quả
  tốt: phiếu của hợp đồng đã hoàn tất/huỷ giờ hiện đúng tên (trước đây ra "?" vì
  chỉ tra trong danh sách hợp đồng đang hoạt động).
- **Lớp**: sĩ số đếm ngay trong query (embed `hoc_sinh!lop_hien_tai_id(count)`),
  bỏ cách cũ tải 2000 học sinh rồi đếm bằng JS.
- **Buổi học**: bỏ `limit(200)`; chi phí (thù lao GV/chi phí phòng) chỉ tải cho các
  buổi của trang hiện tại.
- **Câu hỏi**: phân trang (trước đây tải toàn bộ).
- Thêm `src/lib/embed.ts` (`motBanGhi`): `database.types.ts` chưa khai báo
  Relationships nên supabase-js suy kiểu embed nhiều-một thành mảng dù runtime
  trả object — helper chấp nhận cả hai.
- Chưa kiểm thử truy vấn embed trực tiếp với PostgREST (môi trường phát triển bị
  chặn gọi REST); đã đối chiếu tên khoá ngoại bằng SQL trên production. Cần bấm
  thử trang Lớp và Thu tiền trên Vercel preview.

- **Staging**: 🔲 chưa
- **Production**: 🔲 chưa
- **Commit**: (nhánh `feat/phan-trang-nhom-a-lop-buoi-hoc-cau-hoi-phieu-thu`, chưa merge)

---

## 2026-10-02 — Import Master sheet 2026-2027 + siết tự duyệt hợp đồng học phí

**Tóm tắt:** Nạp toàn bộ Master sheet lên production thay cho nhập tay: 14 lớp
(thêm 7 lớp Nội trú), 160 học sinh, 154 hợp đồng học phí, 177 phiếu thu, 201
kỳ đóng ĐGNL theo tháng, 13 gói học phí; doanh thu thuần 4.312.200.000, đã thu
2.584.450.000 (khớp 100% bản chạy thử). Mọi dòng import gắn `import_batch_id`.
Đồng thời vá lỗ hổng: trigger `chan_tu_duyet_hop_dong_hoc_phi` giờ chặn cả
`nhap`/`cho_duyet` → `hoan_thanh` (trước chỉ chặn → `dang_hoat_dong`), và
`import_batch` có policy chỉ `master_admin`.

- **Migration:** `0043_import_master_sheet_expand.sql`, `0044_chan_duyet_hop_dong_va_policy_import_batch.sql`
- **Staging:** 🔲 chưa áp (import chạy thử bằng transaction rollback trên production)
- **Production:** ✅ đã áp — **NGOÀI pipeline** (trái ADR-004 luật (a)): `0043` qua MCP
  `apply_migration` (ghi vào lịch sử với version `20261002045507`, không phải `0043`),
  `0044` thủ công qua SQL Editor. Import dữ liệu chạy bằng 1 khối DO có chốt kiểm số liệu.
  PR này chỉ ghi nhận lại file cho khớp; cả 2 file idempotent nên CI áp lại không hại.
- **Lưu ý parity:** lịch sử production có dòng lạ `20261002045507` và chưa có `0043`/`0044`
  → cần repair (xóa dòng lạ, ghi `0043`/`0044` đã áp) trước khi `supabase db push` chạy được.
- **Commit:** (xem PR)

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
