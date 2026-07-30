-- =============================================================================
-- NONSENSE EDU — QA TẦNG NHẸ: ĐÁNH GIÁ CHẤT LƯỢNG ĐÀO TẠO (Học bạ số)
-- Roadmap song song ERP/Vận hành, mã E1.1-1 đến E1.1-4.
--
-- Chỉ dựng SCHEMA — không mở UI nhập liệu thật (E1.4, chờ rubric chính thức
-- từ BGH), không tạo nang_luc/cau_hoi_nang_luc/bai_lam (E1.2, phụ thuộc
-- khung năng lực chưa ban hành). tieu_chi_danh_gia tạo xong sẽ RỖNG, BGH/tổ
-- chuyên môn điền nội dung sau.
--
-- Không phải CRM tuyển sinh (vẫn ở Lark Base) — đây là dữ liệu quản trị chất
-- lượng đào tạo, gắn thẳng vào hoc_sinh_id, dùng chung RLS/phân quyền với
-- toàn hệ thống.
--
-- 1 bảng sự kiện dùng chung cho "theo bài" lẫn "theo kỳ tổng hợp" (phân biệt
-- bằng loai_danh_gia), không tách hai bảng vì cấu trúc giống hệt nhau. Chưa
-- tự động tính điểm kỳ tổng hợp từ điểm theo bài — cố ý để đơn giản.
--
-- PK dùng public.uuidv7() cho MỌI bảng, kể cả bảng mã tieu_chi_danh_gia
-- (ADR-003 — không còn ngoại lệ bigint identity cho bảng mã mới, khác bản
-- draft tham khảo ban đầu).
--
-- set_updated_at() đã tồn tại từ trước (kiểm tra qua Supabase MCP trên
-- production, hàm plpgsql, không tham số) — tái sử dụng, không tạo lại.
-- auth_role() thật cũng đã kiểm tra qua MCP: trả về users.vai_tro của
-- auth.uid() (users.trang_thai = 'active'), 8 giá trị hợp lệ: master_admin,
-- admin_ts, admin_ht, truong_bm, gv, ke_toan, thu_ngan, quan_ly_chi_nhanh
-- (không phải 7 như ghi trong draft/CLAUDE.md, đối chiếu qua
-- users_vai_tro_check).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) TIÊU CHÍ ĐÁNH GIÁ — bảng mã rubric (BGH/tổ chuyên môn điền nội dung sau)
-- -----------------------------------------------------------------------------
create table public.tieu_chi_danh_gia (
    id            uuid primary key default public.uuidv7(),

    -- Trục mà tiêu chí này thuộc về — dùng để lọc/nhóm khi hiển thị checklist
    truc          text not null
                  check (truc in ('kien_thuc', 'ky_nang', 'thai_do')),

    ma            text unique not null,   -- mã ngắn, vd 'TD01', dùng nội bộ
    noi_dung      text not null,          -- vd "Tích cực phát biểu xây dựng bài"
    thu_tu        smallint not null default 0,   -- thứ tự hiển thị trong checklist

    deleted_at    timestamptz,   -- ẩn tiêu chí cũ mà không xoá lịch sử, khớp quy
                                  -- ước bảng mã thật (cap_hoc/mon_hoc/dang_cau/
                                  -- hinh_thuc đều dùng deleted_at, không dùng cờ
                                  -- boolean riêng — khác bản draft tham khảo)
    created_at    timestamptz not null default now()
);

comment on table public.tieu_chi_danh_gia is
    'Bảng mã rubric — danh sách tiêu chí đánh giá (checklist). RỖNG khi tạo, cần BGH/tổ chuyên môn điền nội dung thật trước khi GV dùng được (E1.1-4, việc khác).';

create index idx_tieu_chi_truc on public.tieu_chi_danh_gia (truc) where deleted_at is null;

-- -----------------------------------------------------------------------------
-- 2) ĐÁNH GIÁ HỌC SINH — bảng sự kiện chính, dùng chung "theo bài" và "theo kỳ"
-- -----------------------------------------------------------------------------
create table public.danh_gia_hoc_sinh (
    id              uuid primary key default public.uuidv7(),

    hoc_sinh_id     uuid not null references public.hoc_sinh (id) on delete cascade,

    -- Lớp tại thời điểm đánh giá — lưu riêng (denormalized) vì học sinh có thể
    -- chuyển lớp sau đó; không dùng "lớp hiện tại" để báo cáo lịch sử bị sai.
    lop_id          uuid references public.lop (id),

    loai_danh_gia   text not null
                    check (loai_danh_gia in ('bai_kiem_tra', 'tong_hop_ky')),

    ten_dot         text not null,   -- vd "Kiểm tra giữa kỳ - Tư duy khoa học"
                                     --     hoặc "Tổng hợp tháng 7/2026"
    thoi_diem       date not null,

    -- Vị trí giáo án (tuỳ chọn). Lưu ý: mon_hoc.ma (smallint) không unique một
    -- mình — unique thật là (ma, cap_hoc_ma) — nên KHÔNG enforce FK trực tiếp
    -- tới mon_hoc(ma) ở đây, chỉ lưu tham khảo. Bật lại khi có nhu cầu lọc
    -- theo môn thật.
    mon_hoc         smallint,

    -- Liên kết tuỳ chọn tới đề cụ thể trong ngân hàng câu hỏi (Khối 3).
    -- de.id là uuid (đã qua ADR-003) — draft tham khảo ghi bigint là sai,
    -- đối chiếu qua information_schema trên production.
    de_id           uuid references public.de (id) on delete set null,

    diem_kien_thuc  numeric(3,1) check (diem_kien_thuc between 0 and 10),
    diem_ky_nang    numeric(3,1) check (diem_ky_nang between 0 and 10),
    diem_thai_do    numeric(3,1) check (diem_thai_do between 0 and 10),

    ghi_chu         text,   -- ghi chú tự do, bổ sung cho checklist rubric

    -- references public.users, không phải auth.users — khớp quy ước thật
    -- (vd lop.nguoi_tao), đối chiếu qua pg_constraint trên production.
    nguoi_danh_gia  uuid references public.users (id),

    deleted_at      timestamptz,   -- khớp quy ước soft-delete của các bảng sự
                                   -- kiện khác (hop_dong_hoc_phi/ghi_danh/de)
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table public.danh_gia_hoc_sinh is
    'Học bạ số — 1 dòng = 1 lần đánh giá (theo bài kiểm tra hoặc theo kỳ tổng hợp), 3 trục điểm Kiến thức/Kỹ năng/Thái độ. Không phải CRM tuyển sinh.';
comment on column public.danh_gia_hoc_sinh.lop_id is
    'Lớp tại thời điểm đánh giá, KHÔNG phải lớp hiện tại — giữ đúng lịch sử khi học sinh chuyển lớp.';
comment on column public.danh_gia_hoc_sinh.de_id is
    'Liên kết tuỳ chọn tới đề trong ngân hàng câu hỏi (Khối 3). Để trống nếu chưa có nội dung.';

-- Index phục vụ truy vấn xu hướng theo học sinh và theo lớp
create index idx_danhgia_hocsinh on public.danh_gia_hoc_sinh (hoc_sinh_id, thoi_diem) where deleted_at is null;
create index idx_danhgia_lop     on public.danh_gia_hoc_sinh (lop_id, thoi_diem) where deleted_at is null;
create index idx_danhgia_loai    on public.danh_gia_hoc_sinh (loai_danh_gia) where deleted_at is null;

-- -----------------------------------------------------------------------------
-- 3) ĐÁNH GIÁ ↔ TIÊU CHÍ — bảng nối nhiều-nhiều (checklist đã chọn cho 1 lần
--    đánh giá). Bảng nối thuần (như user_chi_nhanh) — không có deleted_at,
--    khớp quy ước bảng nối thật trên production.
-- -----------------------------------------------------------------------------
create table public.danh_gia_tieu_chi (
    id            uuid primary key default public.uuidv7(),
    danh_gia_id   uuid not null references public.danh_gia_hoc_sinh (id) on delete cascade,
    tieu_chi_id   uuid not null references public.tieu_chi_danh_gia (id),

    created_at    timestamptz not null default now(),

    constraint uq_danhgia_tieuchi unique (danh_gia_id, tieu_chi_id)
);

comment on table public.danh_gia_tieu_chi is
    'Bảng nối M-N: các tiêu chí rubric được chọn (tick) cho một lần đánh giá cụ thể.';

create index idx_danhgiatieuchi_danhgia on public.danh_gia_tieu_chi (danh_gia_id);
create index idx_danhgiatieuchi_tieuchi on public.danh_gia_tieu_chi (tieu_chi_id);

-- =============================================================================
-- TRIGGER cập nhật updated_at — tái sử dụng set_updated_at() đã có sẵn từ
-- migration ngân hàng câu hỏi (đã xác nhận tồn tại qua MCP trên production)
-- =============================================================================
create trigger trg_danhgia_hocsinh_updated before update on public.danh_gia_hoc_sinh
    for each row execute function public.set_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY — dùng đúng auth_role() thật đang chạy trên production
-- (text, không tham số, đọc users.vai_tro). Đọc: mọi user đã đăng nhập, chỉ
-- thấy dòng chưa xoá mềm — khớp pattern p_read của cau_hoi/de/hoc_sinh/lop.
-- Ghi: master_admin/admin_ht/truong_bm/gv — khớp p_write của cau_hoi/de
-- (bảng nội dung học thuật do GV/tổ chuyên môn quản lý). Riêng rubric
-- (tieu_chi_danh_gia) không cho gv ghi — chỉ BGH/tổ chuyên môn, đúng ý định
-- ban đầu trong draft. Không cấp quyền ghi cho quan_ly_chi_nhanh/admin_ts/
-- ke_toan/thu_ngan — QA giáo viên nằm ngoài phạm vi vận hành chi nhánh/tài
-- chính của các vai trò này, không phải nợ kỹ thuật cần vá thêm ở đây.
-- =============================================================================
alter table public.tieu_chi_danh_gia enable row level security;
alter table public.danh_gia_hoc_sinh  enable row level security;
alter table public.danh_gia_tieu_chi  enable row level security;

create policy p_read_tieu_chi on public.tieu_chi_danh_gia for select to authenticated
    using (deleted_at is null);

create policy p_write_tieu_chi on public.tieu_chi_danh_gia for all to authenticated
    using (deleted_at is null and auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm']))
    with check (auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm']));

create policy p_read_danh_gia on public.danh_gia_hoc_sinh for select to authenticated
    using (deleted_at is null);

create policy p_write_danh_gia on public.danh_gia_hoc_sinh for all to authenticated
    using (deleted_at is null and auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm', 'gv']))
    with check (auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm', 'gv']));

create policy p_read_danhgia_tc on public.danh_gia_tieu_chi for select to authenticated
    using (true);

create policy p_write_danhgia_tc on public.danh_gia_tieu_chi for all to authenticated
    using (auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm', 'gv']))
    with check (auth_role() = any (array['master_admin', 'admin_ht', 'truong_bm', 'gv']));

commit;
