# 06 — Luồng nghiệp vụ & UI

Mô tả các flow ở mức đủ để sinh code. Mỗi flow ghi: đầu vào, các bước, validation, kết quả DB.

---

## 6.1 Flow A — Ghi danh → Lập hợp đồng (admissions)

**Sau khi tuyển sinh thành công:**

1. Chọn học sinh (hoặc tạo mới nếu chưa có).
2. Tạo **lượt ghi danh**: chọn chương trình + ngày ghi danh → `enrollments` (status `active`).
3. Chọn **gói học phí** đang hiệu lực của chương trình đó (`fee_packages` với `effective_to IS NULL`).
   - Hệ thống bơm `list_price` (chỉ đọc) và `payment_type` từ gói.
4. Chọn **discount** — *1 trong 2 hình thức* (radio):
   - `Không giảm` / `Giảm theo %` (nhập %) / `Giảm số tiền cố định` (nhập VND).
   - Hệ thống tính `discount_amount`, `net_amount` ngay (§02.3) và hiển thị.
   - Nếu vượt hạn mức của vai trò → cảnh báo "sẽ cần duyệt".
5. Lưu hợp đồng ở `status = draft`.

**Kết quả DB:** `enrollments` (1 dòng) + `contracts` (1 dòng, snapshot giá & net).

---

## 6.2 Flow B — Chia kỳ (payment schedule) 🟡 GĐ2

**Đầu vào:** một `contract` đã có `net_amount` và `payment_type`.

**Bước 1 — Xác định số kỳ `n`:**
- `one_time` → n = 1.
- `monthly` → n = số tháng khoá học (nhập hoặc suy từ chương trình).
- `quarterly` → n = số quý.
- `installment` → admin nhập n (2 hoặc 3).

**Bước 2 — Hệ thống ĐỀ XUẤT chia đều (chia hết tuyệt đối, không lệch do làm tròn):**
```
base = net_amount // n          // chia nguyên
rem  = net_amount %  n          // phần dư
for i in 1..n:
    planned[i] = base + (1 if i <= rem else 0)   // rem kỳ đầu +1đ để Σ = net chính xác
    due_date[i] = due_date_of_first + (i-1) * step   // step = 1 tháng / 1 quý / do admin đặt
```
Bảo đảm `Σ planned[i] = net_amount` ngay từ đề xuất.

**Bước 3 — Admin SỬA từng kỳ:**
- Mỗi dòng kỳ: `due_date` + `planned_amount` chỉnh tay được.
- Sau mỗi lần sửa, hệ thống **tự tính lại tổng** `Σ planned` và hiển thị:
  - `Tổng các kỳ: 12.000.000đ  /  Doanh thu thuần: 12.000.000đ  ✅ Khớp`
  - Hoặc: `⚠️ Lệch 500.000đ (thiếu)` — nền đỏ.

**Bước 4 — Validation khi lưu / kích hoạt (INV-3):**
```
if Σ planned_amount ≠ contract.net_amount:
    → CHẶN lưu (hoặc chỉ cho lưu draft, KHÔNG cho activate)
    → hiện chênh lệch = net_amount − Σ planned  (âm = thừa, dương = thiếu)
```
Chỉ khi khớp mới cho `contract.status → active`.

**Kết quả DB:** `payment_schedules` (n dòng). Kích hoạt hợp đồng: `contracts.status='active'`, `activated_at=now()`.

**Ghi chú UX:** nút "Chia đều lại" để reset về đề xuất hệ thống bất kỳ lúc nào (hữu ích sau khi sửa lung tung).

---

## 6.3 Flow C — Thu tiền (cashier / admissions kiêm nhiệm) 🟡 GĐ2

Đây là flow bạn nhấn mạnh: tick số lần đã đóng + số thực nhận, đính kèm biên lai, modal double-check.

**Màn hình:** mở hợp đồng → thấy danh sách kỳ với trạng thái (`paid / partially_paid / overdue / pending`) và số đã thu / số dự kiến của từng kỳ.

**Bước 1 — Chọn kỳ cần thu**, bấm "Thu tiền".

**Bước 2 — Form nhập:**
| Trường | Kiểu | Ràng buộc |
|---|---|---|
| Số tiền thực nhận | số nguyên VND | `> 0`. Mặc định gợi ý = phần còn thiếu của kỳ. |
| Ngày nhận | date | `≤ today` |
| Hình thức | radio | `Tiền mặt / Chuyển khoản` |
| File biên lai | upload | **01 file**, `jpg/png/heic/pdf`, ≤ 10MB (tuỳ chọn nhưng khuyến khích) |
| Ghi chú | text | tuỳ chọn |

**Validation nhập:**
- Nếu số nhập > phần còn thiếu của kỳ → **cảnh báo** (không chặn cứng, vì có thể đóng bù trước): "Số này vượt phần còn lại của kỳ (x đ). Phần dư sẽ tính vào thực thu hợp đồng." Cho phép tiếp tục hoặc sửa.
- File sai định dạng/size → báo lỗi ngay ở client.

**Bước 3 — Modal DOUBLE-CHECK (bắt buộc trước khi Save):**
Hiển thị lại để mắt người đối chiếu:
```
┌─ Xác nhận thu học phí ────────────────────────┐
│ Học sinh:   Nguyễn Văn A  (HS-0231)          │
│ Chương trình: V-ACT Tư duy khoa học          │
│ Kỳ:         Kỳ 2 / 3                          │
│ Dự kiến kỳ: 4.000.000 đ                       │
│ Số THỰC NHẬN: **4.000.000 đ**                 │
│ Hình thức:  Chuyển khoản                      │
│ Ngày:       19/07/2026                         │
│ Biên lai:   bien_lai_A_k2.jpg ✔               │
│                                               │
│   [ Huỷ ]              [ Xác nhận & Lưu ]      │
└───────────────────────────────────────────────┘
```
- Nút "Xác nhận & Lưu" là hành động ghi. Không có đường tắt bỏ qua modal.

**Bước 4 — Khi xác nhận:**
1. Upload file → tạo `attachments` (nếu có file).
2. Sinh `receipt_no` (vd `PT-<năm>-<seq>`).
3. INSERT `receipts` (append-only) với `schedule_id`, `amount`, `method`, `attachment_id`, `collected_by`, `paid_at`.
4. Cập nhật `payment_schedules.status` của kỳ (tính lại theo §02.3).
5. Ghi `audit_logs`.
6. (Tuỳ chọn) xuất biên nhận cho phụ huynh.

**Kết quả:** thực thu / phải thu của hợp đồng và dashboard tự cập nhật (đều là số suy ra).

---

## 6.4 Flow D — Sửa sai bằng phiếu đảo (accountant/master_admin) 🟡 GĐ2

KHÔNG sửa/xoá phiếu gốc (INV-2). Thay vào đó:
1. Mở phiếu thu sai → "Tạo phiếu đảo".
2. Hệ thống tạo `receipts` mới: `is_reversal=true`, `amount = số cần huỷ`, `reverses_receipt_id = phiếu gốc`, `paid_at = now`.
3. Thực thu tự giảm; lịch sử giữ cả hai dòng.
4. Nếu cần thu lại số đúng → tạo phiếu thu mới bình thường (Flow C).

---

## 6.5 Nạp dữ liệu quá khứ (Giai đoạn 1)

Trung tâm đã có số thu thật năm nay. Cách nạp an toàn:
1. Import `programs`, `fee_packages` (versioned) trước.
2. Import `students` → `enrollments` → `contracts` (chọn gói, nhập discount nếu có → net_amount).
3. Import `receipts` cho từng hợp đồng: có thể để `schedule_id = NULL` nếu không có thông tin kỳ, hệ thống vẫn tính đúng thực thu ở cấp hợp đồng.
4. (Tuỳ chọn) Nếu có lịch kỳ → nhập `payment_schedules` rồi map receipt vào kỳ để dashboard "chậm/thiếu" chạy chính xác.
5. Đối chiếu: tổng thực thu hệ thống = tổng bảng thu tay của trung tâm. **Chỉ đi tiếp khi khớp.**

> Gợi ý: viết một script import (CSV → INSERT) đọc thẳng file Excel hiện có của trung tâm. Có thể nhờ Claude Code sinh script này sau khi bạn đưa mẫu cột của file.
