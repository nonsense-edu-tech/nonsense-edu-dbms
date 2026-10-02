# Yêu cầu bổ sung: bộ gõ công thức (LaTeX) trong form tạo câu hỏi

**Trạng thái:** ghi nhận yêu cầu, chưa làm (ngày 02/10/2026). Phần *hiển thị* và *xuất .docx* công thức đã có sẵn trong module Đề thi (migration `0049`); phần còn thiếu là *nhập* công thức dễ dàng.

## 1. Bối cảnh
Nội dung câu hỏi (đề bài, lời giải, lựa chọn, ngữ liệu) có công thức toán/lý/hoá. Hiện người soạn phải tự gõ mã LaTeX bằng tay vào ô nhập văn bản; dễ sai cú pháp, không thấy kết quả khi đang gõ.

## 2. Quy ước lưu trữ (đã áp dụng, KHÔNG đổi khi làm bộ gõ)
Nội dung vẫn là HTML tối giản (`<b> <i> <u> <br>`, xem `src/lib/van-ban-dinh-dang.ts`). Công thức là **văn bản nằm trong đó**, đặt trong dấu phân cách:

| Dạng | Cú pháp | Ví dụ |
|---|---|---|
| Trong dòng | `$ ... $` | `Tính $\frac{a}{b}$` |
| Đứng riêng | `$$ ... $$` | `$$\int_0^1 x\,dx$$` |
| Cũng chấp nhận | `\( ... \)`, `\[ ... \]` | |
| Ký tự đô-la thật | `\$` | `Giá \$5` |

- Dữ liệu cũ không có `$` nên không bị ảnh hưởng. Văn bản có `$` thật (giá tiền) phải viết `\$`.
- Hiển thị: `src/lib/toan.ts` (`tachToan`, `htmlCoToan`) → MathML (thư viện `temml`), component `NoiDungToan`. Công thức lỗi cú pháp hiện nguyên mã, tô đỏ (không làm hỏng trang).
- Xuất Word: `src/lib/docx/noi-dung.ts` → MathML → OMML (`mathml2omml`) → công thức Word thật (sửa được trong Word). Công thức dạng `$$…$$` hiện đang xuất như công thức trong dòng.
- Trình soạn văn bản `RichTextEditor` đã làm sạch HTML nhưng **không đụng** tới `$…$` nên bộ gõ chỉ cần chèn đúng chuỗi này.

## 3. Yêu cầu cho bộ gõ
1. **Nút "Σ" / "Chèn công thức"** trên thanh công cụ B/I/U của `RichTextEditor` (đề bài, lời giải, lựa chọn, ngữ liệu). Mở hộp soạn công thức; xác nhận thì chèn `$…$` tại con trỏ (có tuỳ chọn "đứng riêng" → `$$…$$`).
2. **Xem trước trực tiếp** ngay trong hộp: render cùng bộ `temml` với trang hiển thị để thấy đúng kết quả cuối; báo lỗi cú pháp tại chỗ, không cho chèn công thức lỗi.
3. **Bảng ký hiệu thường dùng** (click để chèn): phân số, căn, luỹ thừa/chỉ số, tổng/tích/tích phân/giới hạn, chữ Hy Lạp, ≤ ≥ ≠ ≈ ±, vectơ, hệ phương trình, ma trận, đơn vị/hoá học (`\ce{}` nếu cần — cân nhắc thêm gói mhchem).
4. **Sửa lại công thức đã có:** click vào công thức (hoặc đặt con trỏ trong `$…$`) → mở lại hộp soạn với mã hiện có.
5. **Phím tắt**: `Ctrl+M` mở hộp công thức; gõ nhanh `$` rồi nội dung `$` vẫn hoạt động như văn bản thường (không bắt buộc dùng hộp).
6. **Hiển thị trong ô soạn**: tuỳ chọn hiển thị công thức đã dựng ngay trong ô (WYSIWYG) hoặc xem trước dưới ô — chọn phương án đơn giản hơn trước (xem trước dưới ô).
7. **Nhập từ file (Excel/CSV)**: giữ nguyên chuỗi `$…$`; cảnh báo nếu có `$` lẻ (số lượng dấu `$` lẻ) khi import.
8. **Xoá ký tự điều khiển / giới hạn độ dài** một công thức (đề xuất ≤ 2000 ký tự) để tránh dữ liệu rác.

## 4. Việc cần quyết định khi làm
- Dùng MathLive (`<math-field>`, nhập kiểu WYSIWYG, xuất LaTeX) hay tự làm hộp LaTeX + xem trước `temml`? Khuyến nghị: bắt đầu bằng hộp LaTeX + bảng ký hiệu (rẻ, không thêm phụ thuộc nặng), nâng cấp MathLive sau nếu giáo viên thấy gõ LaTeX khó.
- Có cần hiển thị công thức ở **màn Trợ giảng** và **danh sách câu hỏi** (hiện dùng `NoiDungHtml`, chưa render công thức) → đổi sang `NoiDungToan`. Nên làm cùng đợt với bộ gõ.
- Hoá học (mhchem) và đồ thị có thuộc phạm vi không.

## 5. Tiêu chí nghiệm thu
- Soạn một câu có phân số + căn + tích phân bằng hộp công thức, lưu, mở lại sửa được.
- Câu đó hiển thị đúng ở danh sách câu hỏi, trang xem trước đề và file .docx (công thức Word thật).
- Dữ liệu cũ không có `$` hiển thị y như trước.
