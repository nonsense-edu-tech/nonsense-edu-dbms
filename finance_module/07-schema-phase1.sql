-- ============================================================
-- Nonsense Edu — Finance Module — SCHEMA GIAI ĐOẠN 1 (PostgreSQL)
-- Đơn vị tiền: BIGINT (VND, không thập phân). Khoá chính: UUID.
-- Nguyên tắc: số tổng KHÔNG lưu tay; phiếu thu append-only.
-- Xem docs 02 (logic), 03 (ERD), 04 (RBAC), 05 (dashboard), 06 (flows).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ---------- ENUM ----------
CREATE TYPE user_role       AS ENUM ('master_admin','accountant','cashier','admissions','principal');
CREATE TYPE payment_type    AS ENUM ('one_time','monthly','quarterly','installment');
CREATE TYPE discount_type   AS ENUM ('none','percent','fixed');
CREATE TYPE enrollment_stat AS ENUM ('active','completed','withdrawn','retake');
CREATE TYPE contract_stat   AS ENUM ('draft','pending_approval','active','completed','cancelled');
CREATE TYPE schedule_stat   AS ENUM ('pending','partially_paid','paid','overdue');
CREATE TYPE pay_method      AS ENUM ('cash','bank_transfer');

-- ---------- USERS ----------
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name   TEXT NOT NULL,
    email       TEXT NOT NULL UNIQUE,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Một user có thể mang nhiều vai trò (hiện tại một người kiêm nhiệm).
CREATE TABLE user_roles (
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role     user_role NOT NULL,
    PRIMARY KEY (user_id, role)
);

-- ---------- CATALOG ----------
CREATE TABLE students (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code           TEXT NOT NULL UNIQUE,
    full_name      TEXT NOT NULL,
    dob            DATE,
    guardian_name  TEXT,
    guardian_phone TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE programs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code       TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    active     BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gói học phí CÓ PHIÊN BẢN. Đổi giá = INSERT dòng mới + set effective_to cho dòng cũ.
CREATE TABLE fee_packages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id     UUID NOT NULL REFERENCES programs(id),
    name           TEXT NOT NULL,
    payment_type   payment_type NOT NULL,
    list_price     BIGINT NOT NULL CHECK (list_price >= 0),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to   DATE,                    -- NULL = đang áp dụng
    active         BOOLEAN NOT NULL DEFAULT true,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);
CREATE INDEX idx_fee_packages_current ON fee_packages(program_id) WHERE effective_to IS NULL;

-- ---------- ENROLLMENT & CONTRACT ----------
CREATE TABLE enrollments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL REFERENCES students(id),
    program_id  UUID NOT NULL REFERENCES programs(id),
    enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
    status      enrollment_stat NOT NULL DEFAULT 'active',
    note        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);

CREATE TABLE contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id   UUID NOT NULL UNIQUE REFERENCES enrollments(id),   -- INV-8: 1 enrollment ↔ 1 contract
    fee_package_id  UUID NOT NULL REFERENCES fee_packages(id),
    list_price      BIGINT NOT NULL CHECK (list_price >= 0),           -- INV-5: snapshot
    discount_type   discount_type NOT NULL DEFAULT 'none',
    discount_value  BIGINT NOT NULL DEFAULT 0 CHECK (discount_value >= 0), -- % hoặc VND tuỳ type
    discount_amount BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    net_amount      BIGINT NOT NULL CHECK (net_amount >= 0),
    payment_type    payment_type NOT NULL,
    status          contract_stat NOT NULL DEFAULT 'draft',
    created_by      UUID REFERENCES users(id),
    approved_by     UUID REFERENCES users(id),
    activated_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- INV-1: net = list - discount, và discount không vượt list
    CONSTRAINT chk_net  CHECK (net_amount = list_price - discount_amount),
    CONSTRAINT chk_disc CHECK (discount_amount <= list_price)
);
CREATE INDEX idx_contracts_status ON contracts(status);

-- ---------- PAYMENT SCHEDULE ----------
CREATE TABLE payment_schedules (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id    UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    period_no      INT  NOT NULL CHECK (period_no >= 1),
    due_date       DATE NOT NULL,
    planned_amount BIGINT NOT NULL CHECK (planned_amount >= 0),
    status         schedule_stat NOT NULL DEFAULT 'pending',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (contract_id, period_no)
);
CREATE INDEX idx_schedules_contract ON payment_schedules(contract_id);
CREATE INDEX idx_schedules_due ON payment_schedules(due_date);

-- ---------- ATTACHMENTS (file biên lai) ----------
CREATE TABLE attachments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name   TEXT NOT NULL,
    mime_type   TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/heic','application/pdf')),
    file_size   BIGINT CHECK (file_size IS NULL OR file_size > 0),
    storage_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- RECEIPTS (append-only) ----------
CREATE TABLE receipts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_no          TEXT NOT NULL UNIQUE,
    contract_id         UUID NOT NULL REFERENCES contracts(id),
    schedule_id         UUID REFERENCES payment_schedules(id),   -- NULL cho phép khi nạp dữ liệu quá khứ
    amount              BIGINT NOT NULL CHECK (amount > 0),
    paid_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    method              pay_method NOT NULL,
    attachment_id       UUID REFERENCES attachments(id),
    is_reversal         BOOLEAN NOT NULL DEFAULT false,
    reverses_receipt_id UUID REFERENCES receipts(id),
    note                TEXT,
    collected_by        UUID REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- INV-4: phiếu đảo phải trỏ tới phiếu gốc; phiếu thường thì không
    CONSTRAINT chk_reversal CHECK (
        (is_reversal = false AND reverses_receipt_id IS NULL) OR
        (is_reversal = true  AND reverses_receipt_id IS NOT NULL)
    )
);
CREATE INDEX idx_receipts_contract ON receipts(contract_id);
CREATE INDEX idx_receipts_schedule ON receipts(schedule_id);
CREATE INDEX idx_receipts_paid_at  ON receipts(paid_at);

-- INV-2: chặn UPDATE/DELETE trên receipts ở tầng DB (append-only cứng).
CREATE OR REPLACE FUNCTION forbid_receipt_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Phiếu thu là append-only: không được UPDATE/DELETE. Hãy tạo phiếu đảo.';
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_receipts_no_update BEFORE UPDATE ON receipts
    FOR EACH ROW EXECUTE FUNCTION forbid_receipt_mutation();
CREATE TRIGGER trg_receipts_no_delete BEFORE DELETE ON receipts
    FOR EACH ROW EXECUTE FUNCTION forbid_receipt_mutation();

-- ---------- AUDIT LOG ----------
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   UUID,
    before      JSONB,
    after       JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ============================================================
-- VIEWS cho dashboard (xem docs 05)
-- ============================================================
CREATE VIEW v_contract_collected AS
SELECT c.id AS contract_id,
       COALESCE(SUM(CASE WHEN r.is_reversal THEN -r.amount ELSE r.amount END), 0) AS collected
FROM contracts c
LEFT JOIN receipts r ON r.contract_id = c.id
GROUP BY c.id;

CREATE VIEW v_contract_finance AS
SELECT c.id AS contract_id,
       c.enrollment_id,
       e.program_id,
       c.net_amount,
       col.collected,
       (c.net_amount - col.collected) AS receivable,
       c.status,
       c.activated_at
FROM contracts c
JOIN enrollments e ON e.id = c.enrollment_id
JOIN v_contract_collected col ON col.contract_id = c.id;

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

-- ============================================================
-- GỢI Ý GIAI ĐOẠN SAU (không tạo ở GĐ1, để tham khảo khi migrate)
--   adjustments, revenue_recognition, period_closes,
--   chart_of_accounts, ledger_transactions, ledger_entries, einvoice_exports
-- Cột is_reversal/reverses_receipt_id đã có sẵn ở GĐ1 nên GĐ2 không phải migrate receipts.
-- ============================================================
