# 02 — Khái niệm nghiệp vụ & Logic tài chính

## 2.1 Từ điển thực thể

| Thực thể | Tiếng Việt | Vai trò |
|---|---|---|
| `student` | Học sinh | Một người. Bất biến qua các lần học. |
| `program` | Chương trình | V-ACT, SAT… |
| `fee_package` | Gói học phí | Chương trình + hình thức đóng + giá niêm yết, **có phiên bản theo thời gian**. |
| `enrollment` | Lượt ghi danh | Một lần học sinh vào một chương trình. **Một học sinh có nhiều lượt.** |
| `contract` | Hợp đồng học phí | Thực thể trung tâm. Chốt: giá gốc → discount → **doanh thu thuần**. Gắn 1–1 với một lượt ghi danh. |
| `payment_schedule` | Lịch đóng / kỳ | Các kỳ phải đóng của một hợp đồng. |
| `receipt` | Phiếu thu | Một lần nhận tiền thực tế. **Append-only.** |
| `attachment` | File biên lai | 01 file ảnh/pdf gắn với phiếu thu. |
| `adjustment` | Điều chỉnh | Hoàn tiền / ghi giảm (GĐ2+). |

**Quan hệ then chốt:**
```
student 1 ── n enrollment 1 ── 1 contract 1 ── n payment_schedule 1 ── n receipt 1 ── 0..1 attachment
```
Học phí **gắn với enrollment**, không gắn thẳng với student. Học lại / học song song = tạo enrollment mới + contract mới.

---

## 2.2 Năm tầng con số tài chính

Đây là phần dễ sai nhất. Phải phân biệt rạch ròi. GĐ1 làm 3 tầng đầu; tầng 4–5 làm ở GĐ3.

| # | Chỉ số | Ý nghĩa | Công thức | Tài khoản (GĐ4) |
|---|---|---|---|---|
| 1 | **Doanh thu thuần** (giá trị hợp đồng) | Tổng cam kết phải thu | `list_price − discount_amount` | — |
| 2 | **Thực thu** | Tiền đã thực sự vào | `Σ phiếu thu (không đảo) − Σ phiếu đảo` | 111 / 112 |
| 3 | **Còn phải thu** (công nợ) | Còn thiếu | `doanh thu thuần − thực thu` | 131 |
| 4 | **Doanh thu ghi nhận** | Phần đã "dạy xong" | theo tiến độ khoá học đã giao | 511 |
| 5 | **Doanh thu chưa thực hiện** | Đã thu, chưa dạy | `thực thu − doanh thu ghi nhận` | 3387 |

Ghi chú: nếu bỏ tầng 5, báo cáo sẽ "phồng" doanh thu (học phí thu trước, dạy sau) và không khớp kế toán. Tầng 5 cũng là căn cứ hoàn tiền khi nghỉ giữa chừng.

---

## 2.3 Công thức & quy ước tính toán (đặc tả cho code)

Tất cả tiền là số nguyên VND (BIGINT). Làm tròn về **đồng** tại một hàm tập trung `roundVnd(x) = Math.round(x)`.

### Discount — chọn 1 trong 2 hình thức
`discount_type ∈ { none, percent, fixed }`

```
if discount_type = 'none'    → discount_amount = 0
if discount_type = 'percent' → discount_amount = roundVnd(list_price * discount_value / 100)
if discount_type = 'fixed'   → discount_amount = discount_value        // đơn vị VND
net_amount = list_price − discount_amount
```
Ràng buộc: `0 ≤ discount_amount ≤ list_price`, `net_amount ≥ 0`.
`discount_amount` và `net_amount` được **snapshot lưu vào contract** (không tính lại mỗi lần đọc).

### Thực thu của một hợp đồng
```
collected(contract) = Σ r.amount  where r.contract_id = contract.id AND r.is_reversal = false
                    − Σ r.amount  where r.contract_id = contract.id AND r.is_reversal = true
```

### Còn phải thu
```
receivable(contract) = contract.net_amount − collected(contract)
```

### Trạng thái một kỳ (payment_schedule)
```
paid_in_period    = Σ receipt.amount (net of reversal) where schedule_id = period.id
if paid_in_period ≥ planned_amount              → 'paid'
elif paid_in_period > 0 AND due_date ≥ today    → 'partially_paid'
elif paid_in_period > 0 AND due_date <  today   → 'partially_paid' (và tính là "chậm/thiếu")
elif paid_in_period = 0 AND due_date <  today   → 'overdue'
else                                            → 'pending'
```

### "Đóng thiếu / chậm thu" (cho dashboard)
Một hợp đồng vào danh sách nếu tồn tại ít nhất một kỳ:
```
(due_date < today) AND (paid_in_period < planned_amount)
```
Số tiền chậm = `Σ (planned_amount − paid_in_period)` trên các kỳ quá hạn của hợp đồng đó.

---

## 2.4 Bất biến hệ thống (invariants — bắt buộc enforce)

Các bất biến này phải được bảo vệ ở **tầng DB (CHECK/constraint/trigger) + tầng ứng dụng**, không chỉ ở UI:

| ID | Bất biến | Cách enforce |
|---|---|---|
| INV-1 | `net_amount = list_price − discount_amount` và `net_amount ≥ 0` | `CHECK` trên `contracts` |
| INV-2 | Phiếu thu không sửa/không xoá | Không expose UPDATE/DELETE; sửa = phiếu đảo. (GĐ2: trigger chặn) |
| INV-3 | Tổng các kỳ = doanh thu thuần khi kích hoạt hợp đồng | Validate ở app khi `status → active`; alert nếu lệch (GĐ2) |
| INV-4 | Thu không âm; phiếu đảo phải trỏ tới phiếu gốc | `CHECK amount > 0`; `reverses_receipt_id` NOT NULL khi `is_reversal` |
| INV-5 | Giá hợp đồng là snapshot, độc lập với thay đổi gói về sau | Copy `list_price` vào `contracts` lúc tạo |
| INV-6 | Discount trong hạn mức theo vai trò | Kiểm ở app; vượt → `status = pending_approval` |
| INV-7 | Mọi số tổng là suy ra, không có cột "tổng do người nhập" | Thiết kế schema: không có cột tổng nhập tay |
| INV-8 | Một enrollment có tối đa một contract | `UNIQUE(enrollment_id)` trên `contracts` |

---

## 2.5 Vì sao append-only (giải thích để không ai "tối ưu" nhầm)

Nếu cho phép sửa/xoá phiếu thu:
- Không đối soát được với sao kê ngân hàng (số đã đổi, không còn dấu vết).
- Không khớp được với phần mềm kế toán (kế toán VN yêu cầu bút toán không đảo ngược tuỳ tiện).
- Không truy trách nhiệm được khi lệch quỹ.

Vì vậy: nhập sai → tạo **phiếu đảo** (một dòng mới, `is_reversal = true`, `amount` bằng số cần huỷ, trỏ về phiếu gốc). Thực thu tự giảm đúng. Lịch sử giữ nguyên.
