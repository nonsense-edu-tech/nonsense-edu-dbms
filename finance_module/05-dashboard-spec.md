# 05 — Đặc tả Dashboard (Master admin)

Dashboard là **read-only**. Không sửa được số nào từ đây (INV-7).

## 5.1 Bộ lọc (filter bar)

Áp cho toàn dashboard, kết hợp AND.

### Lọc theo khoảng thời gian
Preset + custom:
- `last_30_days` (30 ngày trước → nay)
- `last_1_month`, `last_2_months`, `last_3_months`, `last_6_months`
- `this_year` (mặc định)
- `custom` (from–to)

**Chiều thời gian áp vào đâu?** (điểm dễ nhầm — phải chốt rõ trong code):
- **Doanh thu thuần** lọc theo `contract.activated_at` (hoặc `enrollment.enrolled_at` nếu chưa có activated) trong khoảng.
- **Thực thu** lọc theo `receipt.paid_at` trong khoảng.
- → Vì hai chỉ số dùng hai mốc khác nhau, dashboard nên ghi chú nhỏ "doanh thu theo ngày ký / thực thu theo ngày nhận" để tránh hiểu nhầm khi tỉ lệ pie không khớp trực giác.
- Cung cấp toggle `revenue_basis = contract_date | payment_date` cho người dùng nâng cao (mặc định như trên).

### Lọc theo chương trình
- Multi-select các `program`. Mặc định: tất cả.

## 5.2 Thẻ chỉ số (KPI cards) — hàng trên cùng

| Thẻ | Giá trị | Nguồn |
|---|---|---|
| Doanh thu thuần | `Σ contract.net_amount` (đã lọc) | §02 tầng 1 |
| Thực thu | `Σ collected` (đã lọc) | §02 tầng 2 |
| Còn phải thu | `thuần − thực thu` | §02 tầng 3 |
| Số hợp đồng active | `count(contracts active)` | — |
| (GĐ3) Doanh thu chưa thực hiện | tầng 5 | §02 |

Mỗi thẻ hiển thị số VND định dạng có phân tách nghìn (vd `1.250.000 đ`) và % thay đổi so với kỳ trước (tuỳ chọn).

## 5.3 Hai biểu đồ tròn (pie charts)

Đặt cạnh nhau. Tổng mẫu số của cả hai đều là **doanh thu thuần**.

**Pie 1 — Đã thu / Doanh thu thuần**
```
slices = [
  { label: "Đã thu",     value: collected },
  { label: "Chưa thu",   value: net_revenue − collected }   // = receivable
]
```

**Pie 2 — Chưa thu / Doanh thu thuần**
```
slices = [
  { label: "Chưa thu",   value: receivable },
  { label: "Đã thu",     value: collected }
]
```
(Hai pie là hai góc nhìn của cùng dữ liệu — theo đúng yêu cầu. Có thể nhấn mạnh slice tương ứng ở mỗi pie: pie 1 highlight "Đã thu", pie 2 highlight "Chưa thu".)

Hiển thị kèm % và số tuyệt đối trên legend. Xử lý mẫu số = 0 → hiện "Chưa có dữ liệu".

## 5.4 Danh sách "Đóng thiếu / Chậm thu"

Hiển thị hai dạng, người dùng chuyển đổi: **list** (mặc định, dày dữ liệu) và **carousel** (lướt nhanh trên mobile).

**Điều kiện vào danh sách** (xem §02.3): hợp đồng có ≥1 kỳ `due_date < today AND paid_in_period < planned_amount`.

**Mỗi item hiển thị:**
- Tên học sinh + mã, chương trình.
- Số tiền chậm = `Σ (planned − paid)` trên các kỳ quá hạn.
- Số ngày trễ của kỳ trễ nhất.
- SĐT phụ huynh (để gọi nhắc) — chỉ hiện với role có quyền.
- Nút "Xem hợp đồng".

**Sắp xếp mặc định:** số ngày trễ giảm dần (trễ nhất lên đầu). Cho phép đổi sang "số tiền chậm giảm dần".

## 5.5 Câu SQL tham chiếu (Postgres, GĐ1)

Giả định có view `v_contract_finance` tổng hợp mỗi hợp đồng. Dùng để render nhanh.

```sql
-- Thực thu ròng theo hợp đồng (đã trừ phiếu đảo)
CREATE VIEW v_contract_collected AS
SELECT c.id AS contract_id,
       COALESCE(SUM(CASE WHEN r.is_reversal THEN -r.amount ELSE r.amount END), 0) AS collected
FROM contracts c
LEFT JOIN receipts r ON r.contract_id = c.id
GROUP BY c.id;

-- Tài chính mỗi hợp đồng
CREATE VIEW v_contract_finance AS
SELECT c.id AS contract_id,
       c.enrollment_id,
       e.program_id,
       c.net_amount,
       col.collected,
       (c.net_amount - col.collected) AS receivable,
       c.activated_at
FROM contracts c
JOIN enrollments e ON e.id = c.enrollment_id
JOIN v_contract_collected col ON col.contract_id = c.id
WHERE c.status IN ('active','completed');

-- Tổng cho dashboard (áp filter chương trình + thời gian ở tầng app hoặc thêm WHERE)
-- SELECT SUM(net_amount), SUM(collected), SUM(receivable) FROM v_contract_finance
--   WHERE program_id = ANY($programs) AND activated_at BETWEEN $from AND $to;
```

```sql
-- Danh sách đóng thiếu/chậm
CREATE VIEW v_overdue_contracts AS
SELECT c.id AS contract_id, s.full_name, s.code, p.name AS program_name,
       SUM(GREATEST(ps.planned_amount - COALESCE(paid.paid_in_period,0), 0)) AS overdue_amount,
       MAX(CURRENT_DATE - ps.due_date) AS max_days_late
FROM contracts c
JOIN enrollments e ON e.id = c.enrollment_id
JOIN students s ON s.id = e.student_id
JOIN programs p ON p.id = e.program_id
JOIN payment_schedules ps ON ps.contract_id = c.id
LEFT JOIN (
    SELECT schedule_id,
           SUM(CASE WHEN is_reversal THEN -amount ELSE amount END) AS paid_in_period
    FROM receipts WHERE schedule_id IS NOT NULL GROUP BY schedule_id
) paid ON paid.schedule_id = ps.id
WHERE c.status = 'active'
  AND ps.due_date < CURRENT_DATE
  AND COALESCE(paid.paid_in_period,0) < ps.planned_amount
GROUP BY c.id, s.full_name, s.code, p.name
ORDER BY max_days_late DESC;
```
