# 01 — Roadmap (4 giai đoạn)

Nguyên tắc chia giai đoạn: **làm mỏng nhưng chừa sẵn móc nối.** Giai đoạn 1 giải quyết đúng nhu cầu trước mắt (nhập dữ liệu đã có + dashboard tổng quan). Nhưng schema thiết kế từ đầu đã có chỗ cho ghi nhận doanh thu và sổ cái kép, để không phải đập đi làm lại.

Cột "DB" cho biết bảng nào được đưa vào ở giai đoạn đó (chi tiết ở `03-erd.md`).

---

## Giai đoạn 1 — MVP: Nhập liệu nền + Dashboard tổng quan  ⬅️ ưu tiên cao nhất

**Mục tiêu:** Master admin nhập/nạp được dữ liệu đã có và nhìn thấy bức tranh tài chính.

**Phạm vi:**
- Nhập/nạp: học sinh, chương trình, **gói học phí (versioned)**, lượt ghi danh, hợp đồng (giá gốc + discount 1-trong-2 → doanh thu thuần), phiếu thu.
- 3 tầng số đầu: **doanh thu thuần / thực thu / còn phải thu**.
- Dashboard: thẻ chỉ số + **2 pie chart** (đã thu/thuần, chưa thu/thuần) + **bộ lọc** (khoảng thời gian, chương trình) + **danh sách đóng thiếu/chậm**.
- RBAC ở mức khung: 5 vai trò định nghĩa sẵn, hiện một người (admin tuyển sinh) kiêm nhiệm.

**DB:** `users`, `students`, `programs`, `fee_packages`, `enrollments`, `contracts`, `payment_schedules`, `receipts`, `attachments`, `audit_logs`.

**KHÔNG làm ở GĐ1:** ghi nhận doanh thu theo tiến độ, chốt sổ, sổ cái kép, hoá đơn điện tử.

**Tiêu chí nghiệm thu:**
- [ ] Nạp được toàn bộ số liệu thu học phí năm nay, tổng thực thu trên dashboard = tổng phiếu thu đã nhập.
- [ ] Tạo 1 hợp đồng có discount %, 1 hợp đồng discount cố định → `net_amount` đúng công thức.
- [ ] Lọc theo chương trình + "30 ngày trước" → mọi số và pie chart cập nhật đồng bộ.
- [ ] Danh sách "đóng thiếu/chậm" liệt kê đúng hợp đồng có kỳ quá hạn hoặc thu thiếu.
- [ ] Không có ô nhập tay nào cho các số tổng (chỉ nhập giá gói, discount, số thực nhận).

---

## Giai đoạn 2 — Thu tiền có kiểm soát + Lịch đóng linh hoạt

**Mục tiêu:** Thay vì nạp dữ liệu quá khứ, admin thao tác thu tiền hằng ngày một cách chặt chẽ.

**Phạm vi:**
- **Chia kỳ:** hệ thống đề xuất chia đều → admin sửa từng kỳ → hệ thống tự tính tổng và **alert khi tổng các kỳ ≠ doanh thu thuần** (xem `06`).
- **Màn hình thu tiền:** nhập số thực thu, **đính kèm 01 file biên lai** (jpg/png/heic/pdf), **modal double-check** thông tin học sinh + số tiền trước khi lưu.
- Trạng thái kỳ tự cập nhật (`pending / partially_paid / paid / overdue`).
- **Phiếu đảo** (reversing entry) cho phiếu thu nhập sai.
- Audit log đầy đủ cho hành động nhạy cảm.

**DB bổ sung:** cột phiếu đảo trong `receipts` (đã có sẵn ở GĐ1 để không phải migrate); `adjustments` (hoàn/ghi giảm).

**Tiêu chí nghiệm thu:**
- [ ] Sửa số tiền 1 kỳ → tổng cập nhật; nếu tổng ≠ thuần → chặn lưu + hiển thị chênh lệch.
- [ ] Thu tiền có đính kèm file → file lưu đúng, mở lại xem được.
- [ ] Bấm "Lưu" luôn phải qua modal xác nhận.
- [ ] Đảo 1 phiếu thu → thực thu giảm đúng, phiếu gốc vẫn còn (không mất dữ liệu).

---

## Giai đoạn 3 — Ghi nhận doanh thu & Chốt sổ

**Mục tiêu:** Phân biệt "đã thu" với "đã dạy", phục vụ báo cáo nhà đầu tư và hoàn tiền đúng.

**Phạm vi:**
- Tầng 4–5: **doanh thu ghi nhận** (theo tiến độ khoá học đã giao) và **doanh thu chưa thực hiện** (đã thu, chưa dạy — TK 3387).
- **Chốt kỳ (period close):** khoá quá khứ; sửa sau chốt phải qua bút toán điều chỉnh.
- **Đối soát:** tổng thực thu ↔ sao kê ngân hàng.
- Hoàn tiền khi nghỉ giữa chừng: chỉ hoàn phần **chưa thực hiện**.

**DB bổ sung:** `revenue_recognition`, `period_closes`, `reconciliations`.

**Tiêu chí nghiệm thu:**
- [ ] Một hợp đồng thu trước 100%, mới dạy 40% → doanh thu ghi nhận = 40%, chưa thực hiện = 60%.
- [ ] Sau khi chốt tháng, không sửa được phiếu trong tháng đó (chỉ điều chỉnh).

---

## Giai đoạn 4 — Liên thông kế toán

**Mục tiêu:** Nói cùng "ngôn ngữ" với phần mềm kế toán VN.

**Phạm vi:**
- **Sổ cái kép (double-entry ledger):** mỗi phiếu thu / ghi nhận doanh thu sinh một cặp Nợ–Có cân bằng.
- **Ánh xạ tài khoản (Chart of Accounts)** theo TT200/TT133: 111/112, 131, 511, **3387**…
- **Sẵn sàng hoá đơn điện tử:** phiếu thu đủ trường (MST, tên, mặt hàng "học phí…"), có **ID ổn định + idempotency key** để đẩy API không tạo trùng.

**DB bổ sung:** `chart_of_accounts`, `ledger_transactions`, `ledger_entries`, `einvoice_exports`.

**Tiêu chí nghiệm thu:**
- [ ] Mọi giao dịch tài chính đều có bút toán cân bằng (Σ Nợ = Σ Có).
- [ ] Xuất được file/entry đối chiếu với phần mềm kế toán mà không lệch tổng.

---

## Bản đồ phụ thuộc

```
GĐ1 (dữ liệu nền + dashboard)
  └─ GĐ2 (thu tiền + chia kỳ)   ← cần contracts/schedules/receipts của GĐ1
       └─ GĐ3 (ghi nhận DT + chốt sổ)  ← cần receipts append-only của GĐ2
            └─ GĐ4 (kế toán)   ← cần period close + revenue recognition của GĐ3
```
Chỉ được bỏ qua GĐ nếu chấp nhận nợ kỹ thuật ở khâu tương ứng. **Không** bỏ qua append-only (GĐ1/2) và versioned price (GĐ1) — đó là hai thứ đắt nhất khi sửa về sau.
