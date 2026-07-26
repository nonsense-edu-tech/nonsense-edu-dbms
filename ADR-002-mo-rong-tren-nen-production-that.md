# ADR-002: Mở rộng trên nền production thật (v2 — thay thế bản Greenfield ban đầu)

**Status:** Accepted
**Date:** 2026-07-22
**Deciders:** Nguyen (Hiệu trưởng)
**Supersedes:** ADR-002 v1 (giả định "tái cấu trúc toàn bộ + UUIDv7 cho mọi bảng") — **bị bác bỏ** sau khi đối chiếu trực tiếp bằng SQL với production thật (project `DBMS Project (Jul2026)`).
**Quan hệ với ADR-001:** Giữ nguyên 6 luật bất di về học thuật/tài chính (Model C, đơn giá đồng nhất theo buổi, chi phí chính xác theo buổi). ADR này chỉ định lại **cách hiện thực hóa** cho đúng với những gì đã có sẵn và đã được xác minh.

---

## 1. Vì sao ADR-002 v1 bị bác bỏ

ADR-002 v1 giả định hệ thống hiện tại là nợ kỹ thuật cần đập đi xây lại (ID mã hóa ngữ nghĩa, khóa tự nhiên, PK không nhất quán). Sau khi đối chiếu trực tiếp bằng SQL với production, bằng chứng cho thấy **điều ngược lại**:

- Cột `GENERATED` trên `lop`/`hoc_sinh` khớp **chính xác từng vị trí ký tự** với đặc tả — thiết kế có chủ đích, phục vụ giới hạn phần cứng **Hikvision** (Person ID ≤16 ký tự, chấp nhận số 0 đầu).
- `pg_advisory_xact_lock` chống trùng số lớp/STT, 5 trigger khóa sửa/xóa theo đúng phân quyền, Supabase Advisors đã được dùng để vá lỗi bảo mật thật (migration `0012`) — văn hóa kỹ thuật đã tốt sẵn.
- Đa chi nhánh (4 cơ sở năm sau) **không đòi hỏi UUID** — một Postgres trung tâm duy nhất, không phải nhiều node ghi độc lập.
- Lo ngại "lộ ID tuần tự qua API" giải quyết bằng cách dùng `ma_lop`/`ma_hoc_sinh` (mã nghiệp vụ) ở route công khai thay vì `id` nội bộ — không cần đổi kiểu khóa để đạt lợi ích này.

→ **Quyết định sửa lại:** giữ nguyên toàn bộ cấu trúc, quy ước ID, và kiểu khóa hiện có. Chỉ **thêm** những gì thật sự còn thiếu (theo dõi chi phí theo buổi, ghi nhận doanh thu, đa chi nhánh).

---

## 2. Quyết định (luật bất di — thay thế toàn bộ luật của ADR-002 v1)

1. **Khóa chính: `bigint generated always as identity` cho MỌI bảng, kể cả bảng mới hoàn toàn.** Không dùng UUID ở bất kỳ đâu. Hai lý do ban đầu để chọn UUID (chống lộ ID qua API; sẵn sàng multi-node) đều đã được giải quyết bằng cách khác hoặc không áp dụng cho kiến trúc một-database-trung-tâm này. Loại bỏ hoàn toàn nhu cầu viết hàm `uuidv7()` tự chế (đóng OQ-10).
2. **Định dạng mã nghiệp vụ (`ma_lop` 9 số, `ma_hoc_sinh` 12 số, `ma_cau_hoi` 17 số) giữ nguyên tuyệt đối** — đã xác nhận qua SQL thật (`CHECK (ma_cau_hoi ~ '^[0-9]{17}$')`). Không đổi định dạng, không đổi cách đếm (`so_lop` đếm chung toàn hệ thống theo tổ hợp cấp học+chương trình+năm học, **không** phân biệt chi nhánh — quyết định đã chốt).
3. **Tiền luôn là `bigint`** (VNĐ nguyên, không thập phân) — khớp quy ước thật đã xác nhận trên `hop_dong_hoc_phi` (`gia_niem_yet`, `doanh_thu_thuan`... đều `bigint`, không phải `numeric`). Mọi bảng tài chính mới phải theo đúng quy ước này.
4. **Tầng tài chính: `hop_dong_hoc_phi` (đã có) là gốc duy nhất của mọi dòng tiền.** Không tạo `hoa_don` song song. Combo (nhiều lớp) thể hiện qua 1 `hop_dong_hoc_phi` ↔ nhiều `ghi_danh` (đã đúng theo thiết kế thật hiện có).
5. **Chi phí luôn chính xác theo buổi/lớp con** (kế thừa ADR-001 luật #6): bảng mới `buoi_hoc` mang `thu_lao_gv`, `chi_phi_phong` theo từng buổi cụ thể; chi phí gián tiếp (trợ giảng lương tháng, LMS, tài liệu) qua `chi_phi_co_dinh` + `phan_bo_chi_phi_lop`.
6. **RBAC = vai trò (`users.vai_tro`, CHECK cứng) + BA bảng phạm vi riêng theo đúng domain** — không gộp chung, không có khái niệm "nhánh" (đã xác nhận không tồn tại trong production, loại bỏ khỏi thiết kế):
   - `user_pham_vi` (cấp học + môn học) — phạm vi **nội dung**, dùng cho `admin_ht`/`truong_bm`.
   - `user_bai_hoc` (bài học) — phạm vi nội dung chi tiết hơn, dùng cho `gv`.
   - `user_chi_nhanh` (chi nhánh, **mới**) — phạm vi **vận hành**, dùng cho `quan_ly_chi_nhanh`.
7. **Vai trò `quan_ly_chi_nhanh` (mới, đã thêm vào `users.vai_tro`):** phụ trách tuyển sinh + giáo vụ + phòng học cho **một chi nhánh**. Ghi được `lop`/`hoc_sinh` (scope theo `lop_hien_tai_id`)/`ghi_danh`/`hop_dong_hoc_phi` (chỉ tạo, không duyệt) trong phạm vi chi nhánh mình; **không thấy đơn giá phòng** (`loai_phong`); khi tạo `buoi_hoc` không thấy cột chi phí (`thu_lao_gv`/`chi_phi_phong`) — cùng nguyên tắc ẩn chi phí áp dụng cho `gv`.
8. **Thêm quyền mới KHÔNG được sửa policy RLS đang chạy thật** — chỉ thêm policy mới (RLS cộng dồn theo OR), để không có rủi ro làm hỏng quyền hiện có của `admin_ts`/`master_admin`.

---

## 3. Đã xây xong (migration đã viết, chờ hoặc đã áp dụng)

- **`0015_chi_nhanh.sql`** — bảng `chi_nhanh` (bigint identity), FK cho `lop.chi_nhanh_id` (cột đã có sẵn từ `0004` nhưng chưa có bảng đích), RLS đọc-mọi-người/ghi-master_admin.
- **`0016_vai_tro_quan_ly_chi_nhanh.sql`** — thêm `quan_ly_chi_nhanh` vào `users.vai_tro`; bảng `user_chi_nhanh` (phạm vi chi nhánh); 5 policy MỚI (không sửa policy cũ) cho `lop`/`hoc_sinh`/`ghi_danh`/`hop_dong_hoc_phi` (đọc + ghi), scope theo chi nhánh qua `lop_hien_tai_id`/`lop_id`/join qua `ghi_danh→lop`.

---

## 4. Còn lại phải làm (chưa viết migration)

### 4.1. Khối vận hành lớp học + chi phí (hoàn toàn mới, cùng quy ước bigint)

```sql
create table loai_phong (
    id bigint generated always as identity primary key,
    ten text not null,
    don_gia_thue_gio bigint not null,
    don_gia_dien_nuoc_gio bigint not null,
    don_gia_khau_hao_gio bigint not null default 0,
    hieu_luc_tu date not null,
    hieu_luc_den date,
    deleted_at timestamptz
);

create table phong_hoc (
    id bigint generated always as identity primary key,
    ten text not null,
    chi_nhanh_id bigint not null references chi_nhanh(id),
    loai_phong_id bigint not null references loai_phong(id),
    deleted_at timestamptz
);

create table chuong_trinh_mon_hoc (   -- trục Model C (ADR-001), chưa tồn tại
    chuong_trinh_ma text not null,     -- kiểu khớp chuong_trinh thật (char(3) theo 0003)
    mon_hoc_ma      smallint not null,
    primary key (chuong_trinh_ma, mon_hoc_ma)
);

create table buoi_hoc (
    id bigint generated always as identity primary key,
    lop_id bigint not null references lop(id),
    mon_hoc_ma smallint not null,
    gv_id uuid references users(id),
    phong_hoc_id bigint references phong_hoc(id),
    ngay date not null,
    gio_bat_dau time,
    gio_ket_thuc time,
    thu_lao_gv bigint,        -- CHI PHÍ, chính xác theo buổi (snapshot)
    chi_phi_phong bigint,     -- CHI PHÍ, chính xác theo buổi (snapshot)
    trang_thai text not null default 'du_kien' check (trang_thai in ('du_kien','da_day','huy')),
    deleted_at timestamptz,
    unique (lop_id, mon_hoc_ma, ngay)
);
```

**RLS cần thiết kế ngay từ đầu (không vá sau):** `quan_ly_chi_nhanh` và `gv` được ghi `buoi_hoc` (chọn GV/phòng/giờ) nhưng **cột `thu_lao_gv`/`chi_phi_phong` chỉ `ke_toan`/`master_admin` được đọc** — dùng view riêng (`security_invoker`) hoặc tách quyền cột bằng `GRANT`/`REVOKE` theo cột, không dựa vào RLS hàng (RLS không lọc được theo cột).

### 4.2. Chi phí gián tiếp theo kỳ

```sql
create table chi_phi_co_dinh (
    id bigint generated always as identity primary key,
    loai text not null,        -- 'lms' | 'tro_giang_thang' | 'tai_lieu_hoc_sinh' | ...
    ky date not null,
    tong_so_tien bigint not null,
    phuong_thuc_phan_bo text not null check (phuong_thuc_phan_bo in ('deu_theo_so_lop_active','theo_so_hoc_sinh')),
    ngay_thanh_toan_vendor date
);

create table phan_bo_chi_phi_lop (
    id bigint generated always as identity primary key,
    chi_phi_id bigint not null references chi_phi_co_dinh(id),
    lop_id bigint not null references lop(id),
    so_hoc_sinh_tai_thoi_diem int,
    so_tien bigint not null
);
```

### 4.3. Ghi nhận doanh thu theo buổi (gắn vào `hop_dong_hoc_phi` đã có, không tạo `hoa_don`)

```sql
alter table hop_dong_hoc_phi
    add column if not exists tong_so_buoi_du_kien int,
    add column if not exists don_gia_mot_buoi bigint;   -- = doanh_thu_thuan / tong_so_buoi_du_kien

create table ghi_nhan_doanh_thu_buoi (
    id bigint generated always as identity primary key,
    hop_dong_id bigint not null references hop_dong_hoc_phi(id),
    buoi_hoc_id bigint not null references buoi_hoc(id),
    so_tien bigint not null,
    ky date not null,
    unique (hop_dong_id, buoi_hoc_id)
);
```

---

## 5. Nợ kỹ thuật đã ghi nhận, chưa xử lý (xem `roadmap.md`)

- ⚠️ `admin_ts`/`quan_ly_chi_nhanh` chưa bị chặn ở CSDL khi tự đổi `hop_dong_hoc_phi.trang_thai` sang `cho_duyet`/`dang_hoat_dong` — hiện chỉ là quy ước UI. Cần trigger `forbid_hop_dong_tu_duyet()` sau này (đã ghi vào `roadmap.md`, không chặn việc khác).
- ⚠️ `dac-ta-he-thong.md` vẫn ghi `ma_cau_hoi` 16 số — sai so với thật (17 số, đã xác nhận SQL). Cần sửa tài liệu.

---

## 6. Open Questions

- **OQ-3 (kế thừa ADR-001) — câu hỏi mở DUY NHẤT còn lại:** Chế độ kế toán TT200 hay TT133? Không code phần hạch toán tài khoản (`tai_khoan_no`/`tai_khoan_co`) cho tới khi có quyết định.
- ~~OQ-9, OQ-10, OQ-11~~ — đã đóng hoàn toàn. OQ-10 (kiểm thử `uuidv7()`) **không còn cần thiết** vì đã bỏ UUID khỏi thiết kế.
