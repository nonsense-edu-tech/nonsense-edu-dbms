-- =============================================================================
-- NONSENSE EDU — GỠ TRIGGER HỎNG TRÊN users
-- Đích: Supabase / PostgreSQL 15+
--
-- Bối cảnh: migration nháp 0001 (đã xoá khỏi repo, xem docs/roadmap.md mục "Ghi
-- chú migration") từng chạy thật trên production trước khi phát hiện bảng
-- users KHÔNG có cột updated_at. Trigger trg_users_updated cố gán
-- new.updated_at = now() mỗi lần UPDATE users → lỗi
-- 'record "new" has no field "updated_at"'. Gỡ trigger này (users vốn không
-- cần nó — bảng dùng created_at + deleted_at, không có updated_at).
-- =============================================================================

drop trigger if exists trg_users_updated on users;

-- =============================================================================
-- HẾT
-- =============================================================================
