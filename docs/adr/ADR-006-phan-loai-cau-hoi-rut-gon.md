# ADR-006: Phân loại câu hỏi rút gọn — câu hỏi thuộc Môn học, Chương trình chỉ gom các môn

**Status:** Accepted
**Date:** 2026-10-02
**Deciders:** Nguyen (Hiệu trưởng)
**Quan hệ với ADR cũ:** Không đổi định dạng mã câu hỏi 17 số (ADR-002, "BẤT BIẾN") — chỉ bổ sung hai
quy ước giá trị mặc định (mục 3). Phù hợp mô hình C của ADR-001 (bảng nối `chuong_trinh_mon_hoc`).

## 1. Bối cảnh

Form tạo câu hỏi bắt chọn 7 cấp phụ thuộc nhau (cấp học → chương trình → môn → học phần → bài học →
chủ đề → dạng câu) vì mã 17 số cần đủ các thành phần và hàm `cap_ma_cau_hoi()` bắt học phần, bài học,
chủ đề phải tồn tại. Hệ quả: môn chưa nhập đủ danh mục (ví dụ Tiếng Anh chưa có chủ đề) thì không tạo
được câu hỏi nào.

Mô hình nghiệp vụ đúng: **câu hỏi thuộc một môn học (+ học phần / bài học / chủ đề kiến thức chứa nó)**.
Khi cần, đơn vị đào tạo tạo một **chương trình giảng dạy gồm nhiều môn**; câu hỏi đi theo môn vào chương
trình. Chương trình không phải thuộc tính của câu hỏi.

## 2. Quyết định

1. Form chỉ bắt buộc **Môn học** (cấp học tự suy ra từ môn) và **Dạng câu**. Học phần, Bài học, Chủ đề
   là **tuỳ chọn**; chọn bài học thì học phần tự điền.
2. Bỏ ô Cấp học / Chương trình khỏi form và khỏi template import.
3. Mã câu hỏi **giữ nguyên 17 số**, thêm quy ước:
   - Chương trình (3 số) = **`000`** cho câu hỏi mới — "không gắn chương trình cụ thể".
   - Học phần / Bài học / Chủ đề (mỗi phần 2 số) = **`00`** — "Chung / chưa phân loại". Bài học khác 00
     bắt buộc kèm học phần khác 00. Giá trị khác 00 kiểm tra như cũ.
   Các mã thật hiện có đều ≥ 1 (chương trình: 010, 021, 022, 030…), không đụng `000`/`00`.
4. Quan hệ chương trình ↔ câu hỏi đi qua **môn**: lọc theo chương trình trong danh sách câu hỏi dùng
   `chuong_trinh_mon_hoc` (chương trình → các môn của nó), không đọc cột `cau_hoi.chuong_trinh`.
   Một môn thuộc nhiều chương trình thì câu hỏi xuất hiện ở tất cả.

## 3. Hệ quả

- Migration `0048_cap_ma_cau_hoi_phan_loai_rut_gon.sql` (Expand: `CREATE OR REPLACE` giữ nguyên chữ ký;
  code cũ vẫn chạy vì luôn truyền giá trị khác 0).
- Cột sinh sẵn `cau_hoi.chuong_trinh/hoc_phan/bai_hoc/chu_de` có thể bằng 0 — giao diện hiển thị "Chung".
- Phân loại câu hỏi vẫn **không sửa được** sau khi tạo (mã bất biến). Muốn đổi học phần/chủ đề phải tạo
  câu mới (không đổi so với trước).
- Đã bỏ qua phương án rút mã còn 14 số: phải sửa cột sinh sẵn, rủi ro cao hơn lợi ích.
