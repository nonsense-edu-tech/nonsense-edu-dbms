# Nonsense Edu — Module Quản lý Học phí & Tài chính

Bộ tài liệu đặc tả cho **module quản lý học phí, thu tiền và dashboard tài chính** của Nonsense Edu.
Viết để con người đọc *và* để Claude Code đọc–hiểu–sinh code. Đọc theo thứ tự số file.

## Mục lục

| File | Nội dung |
|---|---|
| `01-roadmap.md` | Lộ trình 4 giai đoạn, phạm vi + tiêu chí nghiệm thu từng giai đoạn |
| `02-domain-and-financial-logic.md` | Khái niệm nghiệp vụ, 5 tầng con số tài chính, quy tắc bất biến (invariants) |
| `03-erd.md` | Sơ đồ ERD (Mermaid) + mô tả từng thực thể |
| `04-rbac-permissions.md` | 5 vai trò (gồm **thu ngân**, **kế toán** mới) + ma trận phân quyền |
| `05-dashboard-spec.md` | Bộ lọc, thẻ chỉ số, pie chart, danh sách đóng thiếu/chậm |
| `06-workflows-and-ui.md` | Luồng: Ghi danh → Hợp đồng → Chia kỳ (sửa tay + alert) → Thu tiền (đính kèm + modal) |
| `07-schema-phase1.sql` | DDL PostgreSQL cho Giai đoạn 1 (chạy được ngay) |

## Nguyên tắc xuyên suốt (đọc kỹ trước khi code)

1. **Tách "sự thật" và "suy ra".** Con người CHỈ nhập: (a) thỏa thuận ban đầu (giá gói, discount, lịch kỳ) và (b) số tiền THỰC NHẬN mỗi lần. Mọi con số tổng (doanh thu thuần, thực thu, phải thu…) đều do hệ thống **tính**, không ai gõ tay.
2. **Phiếu thu là append-only.** Không sửa, không xoá. Nhập sai → tạo *phiếu đảo* (reversing entry). Đây là điều kiện bắt buộc để liên thông kế toán sau này.
3. **Tiền = số nguyên VND (BIGINT).** Không dùng float. Đơn vị nhỏ nhất là 1 đồng. Làm tròn tập trung một chỗ.
4. **Snapshot giá tại thời điểm ký hợp đồng.** Đổi bảng giá không được làm thay đổi hợp đồng cũ.
5. **Học phí gắn với LƯỢT GHI DANH (enrollment), không gắn trực tiếp với học sinh.** Một học sinh → nhiều lượt ghi danh → nhiều hợp đồng học phí (học lại, học song song nhiều chương trình).

## Stack tham chiếu (khuyến nghị, không bắt buộc)

- **DB: PostgreSQL** — cần cho ràng buộc toàn vẹn, `CHECK`, JSON, và (giai đoạn sau) sổ cái kép.
- **Backend/Frontend:** linh hoạt. Gợi ý **Supabase** (Postgres + Auth + Storage) vì: RBAC qua Row-Level Security, và **Storage** để lưu file biên lai (jpg/png/heic/pdf) khớp đúng yêu cầu. Schema trong repo này viết chuẩn Postgres nên đổi nền tảng vẫn dùng được.
- Toàn bộ tiền lưu `BIGINT` (VND). Toàn bộ khoá chính `UUID`.

## Trạng thái hiện tại của trung tâm (đầu vào Giai đoạn 1)

- Đã có: **bảng gói học phí theo chương trình + hình thức đóng**.
- Đã có: **số liệu thu học phí thật của năm học này**.
- Mục tiêu ngay: nhập được các dữ liệu nền này và hiển thị **dashboard tổng quan** cho master admin.
