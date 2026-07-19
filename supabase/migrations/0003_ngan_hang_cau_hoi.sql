-- =============================================================================
-- NONSENSE EDU — SCHEMA NGÂN HÀNG CÂU HỎI (GĐ3)
-- Đích: Supabase / PostgreSQL 15+
-- Theo bản đặc tả "Dac_ta_he_thong_ID_NonsenseEdu.md" (bản 3, 16/07/2026)
--
-- Gồm 5 bảng lõi: ngu_lieu, cau_hoi, lua_chon, de, de_cau_hoi
-- Nguyên tắc:
--   * Khóa nghiệp vụ = chuỗi ID (CHAR, giữ số 0 đầu, CHECK toàn chữ số, UNIQUE).
--   * Khóa kỹ thuật = bigint identity, dùng cho mọi FK.
--   * ID câu hỏi 16 số là NHÁNH ĐỘC LẬP từ gốc (không nối vào ID tài liệu).
--   * Độ khó / đáp án / lời giải = metadata, KHÔNG mã hóa vào ID.
--   * "Câu này ở đề nào" = quan hệ, nằm ở bảng nối de_cau_hoi.
--
-- Phụ thuộc GĐ1 (tùy chọn): bảng dang_cau (bảng mã dạng câu hỏi). Các FK tới
-- dang_cau được để dạng comment; bật lên sau khi GĐ1 tạo bảng đó.
-- =============================================================================

-- Chạy trước 1 lần cho gen_random_uuid (nếu cần); Supabase đã bật sẵn.
-- create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) NGỮ LIỆU — đề dẫn dùng chung (bài đọc CORE / bảng số liệu / tình huống logic)
--    Một ngữ liệu gắn nhiều câu hỏi. Không mã hóa vào ID câu hỏi.
-- -----------------------------------------------------------------------------
create table ngu_lieu (
    id            bigint generated always as identity primary key,

    -- Loại ngữ liệu: 'doc_core' | 'so_lieu' | 'logic' | 'khac'
    loai          text not null
                  check (loai in ('doc_core', 'so_lieu', 'logic', 'khac')),

    tieu_de       text,
    noi_dung      text not null,          -- văn bản/markdown; bảng số liệu có thể lưu markdown/JSON
    du_lieu       jsonb,                  -- tùy chọn: bảng số liệu/biểu đồ ở dạng cấu trúc

    -- Vị trí giáo án (để tra cứu, KHÔNG dùng để dựng ID)
    mon_hoc       smallint,               -- 1 chữ số
    hoc_phan      smallint,
    bai_hoc       smallint,
    chu_de        smallint,

    nguoi_tao     uuid references auth.users (id),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

comment on table ngu_lieu is
    'Đề dẫn dùng chung cho nhiều câu hỏi (đặc thù V-ACT). Thực thể độc lập, không mã hóa vào ID câu hỏi.';

-- -----------------------------------------------------------------------------
-- 2) CÂU HỎI — nhánh ID thứ 4, 16 số, rẽ thẳng từ gốc
--    Cấu trúc ID 16 số (vị trí 1..16):
--      [1]      Cấp học
--      [2-4]    Chương trình
--      [5]      Môn học
--      [6-7]    Học phần
--      [8-9]    Bài học
--      [10-11]  Chủ đề
--      [12]     Dạng câu hỏi
--      [13-16]  STT câu hỏi (mỗi tổ hợp tối đa 9999/dạng)
-- -----------------------------------------------------------------------------
create table cau_hoi (
    id            bigint generated always as identity primary key,

    -- Khóa nghiệp vụ: 16 chữ số, giữ số 0 đầu
    ma_cau_hoi    char(16) not null unique
                  check (ma_cau_hoi ~ '^[0-9]{16}$'),

    -- Cột suy diễn từ chuỗi ID (STORED) → lọc/thống kê nhanh, tự nhất quán.
    cap_hoc       smallint  generated always as (substring(ma_cau_hoi from 1  for 1)::smallint) stored,
    chuong_trinh  smallint  generated always as (substring(ma_cau_hoi from 2  for 3)::smallint) stored,
    mon_hoc       smallint  generated always as (substring(ma_cau_hoi from 5  for 1)::smallint) stored,
    hoc_phan      smallint  generated always as (substring(ma_cau_hoi from 6  for 2)::smallint) stored,
    bai_hoc       smallint  generated always as (substring(ma_cau_hoi from 8  for 2)::smallint) stored,
    chu_de        smallint  generated always as (substring(ma_cau_hoi from 10 for 2)::smallint) stored,
    dang_cau      smallint  generated always as (substring(ma_cau_hoi from 12 for 1)::smallint) stored,
    stt_cau       integer   generated always as (substring(ma_cau_hoi from 13 for 4)::integer)  stored,

    -- FK tới bảng mã dạng câu (bật sau khi GĐ1 tạo bảng dang_cau):
    -- , constraint fk_cauhoi_dangcau foreign key (dang_cau) references dang_cau (ma)

    ngu_lieu_id   bigint references ngu_lieu (id) on delete set null,  -- nullable: câu đứng một mình

    noi_dung      text not null,          -- đề bài / thân câu hỏi
    dap_an_text   text,                   -- đáp án cho dạng điền khuyết/trả lời ngắn/tự luận
    loi_giai      text,                   -- metadata, KHÔNG vào ID

    -- Độ khó = metadata, cập nhật theo thống kê; KHÔNG vào ID.
    do_kho        smallint check (do_kho between 1 and 5),
    ti_le_dung    numeric(5,2),           -- % làm đúng, cập nhật tự động

    tags          text[],
    nguoi_tao     uuid references auth.users (id),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

comment on column cau_hoi.ma_cau_hoi is 'ID câu hỏi 16 số (nhánh độc lập từ gốc). Vị trí 12 = dạng câu, 13-16 = STT.';
comment on column cau_hoi.dap_an_text is 'Đáp án cho dạng KHÔNG phải MCQ. MCQ dùng cờ la_dap_an ở bảng lua_chon.';
comment on column cau_hoi.do_kho     is 'Metadata, không mã hóa vào ID (đổi khi thống kê thay đổi).';

-- Index phục vụ lọc theo tổ hợp nội dung và ghép đề
create index idx_cau_hoi_to_hop  on cau_hoi (mon_hoc, hoc_phan, bai_hoc, chu_de, dang_cau);
create index idx_cau_hoi_nguon    on cau_hoi (ngu_lieu_id);
create index idx_cau_hoi_do_kho   on cau_hoi (do_kho);

-- -----------------------------------------------------------------------------
-- 3) LỰA CHỌN — phương án cho câu MCQ (và các dạng có phương án)
-- -----------------------------------------------------------------------------
create table lua_chon (
    id            bigint generated always as identity primary key,
    cau_hoi_id    bigint not null references cau_hoi (id) on delete cascade,

    thu_tu        smallint not null,      -- 1,2,3,4... (A,B,C,D)
    noi_dung      text not null,
    la_dap_an     boolean not null default false,

    created_at    timestamptz not null default now(),

    constraint uq_luachon_thutu unique (cau_hoi_id, thu_tu)
);

comment on table lua_chon is 'Phương án MCQ. Dạng "đúng/sai từng ý" cũng dùng bảng này (mỗi ý 1 dòng, la_dap_an = đúng/sai).';

create index idx_lua_chon_cau_hoi on lua_chon (cau_hoi_id);

-- -----------------------------------------------------------------------------
-- 4) ĐỀ — bộ đề / đề thi
-- -----------------------------------------------------------------------------
create table de (
    id            bigint generated always as identity primary key,
    ma_de         text unique,            -- mã đề tùy quy ước (có thể để null lúc nháp)
    ten           text not null,
    mo_ta         text,
    nguoi_tao     uuid references auth.users (id),
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- 5) DE_CAU_HOI — bảng nối nhiều-nhiều giữa đề và câu hỏi
--    Nơi thể hiện "câu này ở đề nào" + cho phép tái sử dụng câu ở nhiều đề.
-- -----------------------------------------------------------------------------
create table de_cau_hoi (
    id            bigint generated always as identity primary key,
    de_id         bigint not null references de (id)       on delete cascade,
    cau_hoi_id    bigint not null references cau_hoi (id)  on delete restrict,

    thu_tu        integer not null,       -- thứ tự câu trong đề
    diem          numeric(5,2),           -- điểm câu này trong đề (tùy chọn)

    created_at    timestamptz not null default now(),

    -- Một câu không bị thêm trùng vào cùng một đề
    constraint uq_de_cau unique (de_id, cau_hoi_id),
    -- Thứ tự câu trong 1 đề không trùng
    constraint uq_de_thutu unique (de_id, thu_tu)
);

comment on table de_cau_hoi is 'Bảng nối M-N. on delete restrict ở cau_hoi_id để không lỡ xóa câu đang nằm trong đề.';

create index idx_de_cau_hoi_de   on de_cau_hoi (de_id);
create index idx_de_cau_hoi_cau  on de_cau_hoi (cau_hoi_id);

-- =============================================================================
-- TRIGGER cập nhật updated_at
-- =============================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_ngu_lieu_updated before update on ngu_lieu
    for each row execute function set_updated_at();
create trigger trg_cau_hoi_updated  before update on cau_hoi
    for each row execute function set_updated_at();
create trigger trg_de_updated       before update on de
    for each row execute function set_updated_at();

-- =============================================================================
-- (TÙY CHỌN) Ràng buộc toàn vẹn: MCQ phải có đúng ≥1 đáp án đúng.
-- Kiểm ở tầng ứng dụng thì linh hoạt hơn; nếu muốn chặt ở CSDL, dùng trigger:
-- =============================================================================
-- create or replace function check_mcq_co_dap_an() ... (dựng khi cần)

-- =============================================================================
-- ROW LEVEL SECURITY (Supabase) — khung mẫu, tinh chỉnh theo bảng users/vai trò
-- Vai trò: Admin & GV/Trợ giảng được tạo/sửa; mọi người đăng nhập được đọc.
-- Giả định có hàm auth_role() trả về vai trò từ bảng users (dựng ở GĐ1).
-- =============================================================================
alter table ngu_lieu   enable row level security;
alter table cau_hoi    enable row level security;
alter table lua_chon   enable row level security;
alter table de         enable row level security;
alter table de_cau_hoi enable row level security;

-- Đọc: mọi user đã đăng nhập
create policy p_read_ngu_lieu   on ngu_lieu   for select to authenticated using (true);
create policy p_read_cau_hoi    on cau_hoi    for select to authenticated using (true);
create policy p_read_lua_chon   on lua_chon   for select to authenticated using (true);
create policy p_read_de         on de         for select to authenticated using (true);
create policy p_read_de_cau_hoi on de_cau_hoi for select to authenticated using (true);

-- Ghi: chỉ Admin / GV & Trợ giảng.
-- Thay điều kiện dưới bằng hàm phân quyền thực tế của GĐ1, ví dụ:
--   using ( auth_role() in ('admin','gv') )  với cả with check tương ứng.
-- Ví dụ policy ghi cho cau_hoi (nhân bản cho các bảng còn lại):
-- create policy p_write_cau_hoi on cau_hoi for all to authenticated
--   using ( auth_role() in ('admin','gv') )
--   with check ( auth_role() in ('admin','gv') );

-- =============================================================================
-- HẾT
-- =============================================================================
