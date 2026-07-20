# 04 — Phân quyền (RBAC)

Nguyên tắc: **tách biệt trách nhiệm (segregation of duties)** — người nhập không tự duyệt, người thao tác nghiệp vụ không tự sửa số của mình.

Hiện tại trung tâm **chưa có** người giữ riêng vai trò *thu ngân* và *kế toán* — **admin tuyển sinh kiêm nhiệm**. Ta vẫn định nghĩa đủ 5 vai trò và cấp cho một user nhiều vai trò cùng lúc. Khi trung tâm tách người ra, chỉ cần gỡ vai trò khỏi user đó — **không phải viết lại code**.

## 4.1 Năm vai trò

| Vai trò (role) | Tiếng Việt | Bản chất |
|---|---|---|
| `master_admin` | Master admin / Quản trị | Toàn quyền cấu hình + xem tất cả. Có thể là bạn (hiệu trưởng kiêm). |
| `accountant` | **Kế toán** *(mới)* | Định nghĩa giá & quy tắc, duyệt discount lớn, tạo phiếu đảo/điều chỉnh, chốt sổ, xuất dữ liệu. |
| `cashier` | **Thu ngân** *(mới)* | Ghi phiếu thu, đính kèm biên lai. Không định nghĩa giá, không duyệt, không sửa phiếu cũ. |
| `admissions` | Admin tuyển sinh | Tạo lượt ghi danh + hợp đồng, chọn gói, áp discount trong hạn mức, lập lịch kỳ. |
| `principal` | Hiệu trưởng / Chủ đầu tư | **Read-only** toàn bộ dashboard. Không thao tác nghiệp vụ (giữ khách quan số liệu). |

**Kiêm nhiệm hiện tại:** một user thực tế = `{ admissions, cashier, accountant }` (và có thể cả `master_admin`). Hệ thống cấp quyền theo **hợp** (union) của các vai trò.

## 4.2 Ma trận phân quyền

`C=Create, R=Read, U=Update, D=Delete, A=Approve, X=không có quyền`
Với dữ liệu tài chính, "D" gần như không tồn tại — thay bằng đảo/điều chỉnh.

| Hành động | master_admin | accountant | cashier | admissions | principal |
|---|:--:|:--:|:--:|:--:|:--:|
| Xem dashboard tài chính | R | R | R | R (giới hạn) | R |
| Quản lý học sinh | CRU | R | R | CRU | R |
| Quản lý chương trình | CRU | CRU | R | R | R |
| **Định nghĩa/sửa gói học phí (giá)** | CRU | CRU | X | R | R |
| Tạo lượt ghi danh | CRU | R | R | CRU | R |
| **Tạo hợp đồng** (chọn gói) | C | C | X | C | X |
| **Áp discount trong hạn mức** | ✔ | ✔ | X | ✔ | X |
| **Duyệt discount vượt hạn mức** | A | A | X | X | X |
| Lập/sửa lịch kỳ (planned_amount) | CRU | CRU | X | CRU | X |
| Kích hoạt hợp đồng (`→ active`) | ✔ | ✔ | X | ✔* | X |
| **Ghi phiếu thu** (+đính kèm biên lai) | C | C | C | C | X |
| Sửa/xoá phiếu thu | X | X | X | X | X |
| **Tạo phiếu đảo (reversing)** | ✔ | ✔ | X | X | X |
| Tạo điều chỉnh/hoàn tiền (GĐ2+) | A | A | X | X | X |
| Chốt sổ kỳ (GĐ3) | ✔ | ✔ | X | X | X |
| Xuất dữ liệu / kế toán (GĐ4) | ✔ | ✔ | X | X | R |
| Quản lý người dùng & vai trò | CRU | X | X | X | X |
| Xem audit log | R | R | X | X | R |

`*` admissions kích hoạt được hợp đồng **chỉ khi** discount trong hạn mức; vượt hạn mức thì hợp đồng ở `pending_approval` cho tới khi accountant/master_admin duyệt.

## 4.3 Hạn mức discount theo vai trò (cấu hình được)

Đưa vào bảng cấu hình `role_limits` (hoặc hằng số ở GĐ1):

| Vai trò | Trần discount tự áp |
|---|---|
| admissions | ≤ 10% *hoặc* ≤ 500.000đ (số nhỏ hơn) — **ví dụ, chỉnh theo chính sách** |
| accountant / master_admin | không giới hạn (nhưng vẫn ghi log) |

Vượt trần → `contract.status = pending_approval`, chưa sinh nghĩa vụ thu, hiện trong hàng đợi duyệt của accountant.

## 4.4 Ghi log bắt buộc

Mọi hành động sau **phải** ghi `audit_logs` (ai, khi nào, before/after):
- Duyệt discount, kích hoạt hợp đồng.
- Ghi phiếu thu, tạo phiếu đảo, điều chỉnh, hoàn tiền.
- Sửa gói học phí (tạo version mới).
- Chốt sổ, xuất kế toán.

## 4.5 Gợi ý enforcement kỹ thuật

- **Tầng DB (nếu Supabase):** Row-Level Security theo `auth.uid()` + bảng `user_roles`. Chặn `UPDATE/DELETE` trên `receipts` bằng policy (không role nào được cấp).
- **Tầng ứng dụng:** middleware kiểm quyền theo action; hạn mức discount kiểm ở service layer.
- **Không tin UI:** UI ẩn nút chỉ là trải nghiệm; quyền thật enforce ở DB + API.
