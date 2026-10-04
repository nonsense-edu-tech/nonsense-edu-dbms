-- adr004-type: expand
-- 0053 — Hợp đồng học phí đã hủy không được chiếm chỗ của ghi danh.
--
-- Lỗi gốc (04/10/2026): hop_dong_hoc_phi có UNIQUE (ghi_danh_id) áp cho MỌI trạng thái, nên sau khi
-- hủy hợp đồng (trang_thai = 'da_huy') ghi danh đó không thể tạo hợp đồng mới (học sinh
-- 202126002010 bị kẹt). Sửa: chỉ ràng buộc duy nhất trên hợp đồng "đang mở" (chưa hủy, chưa xóa mềm).
-- Hợp đồng đã hủy vẫn được giữ lại làm vết cho tài chính.
--
-- Phân loại expand: chỉ NỚI một ràng buộc, không đổi tên/kiểu cột, code cũ chạy bình thường
-- (code cũ vẫn lọc "đã có hợp đồng" ở phía ứng dụng, chỉ là chưa mở khóa được ca đã hủy).
-- Có DROP CONSTRAINT nên người duyệt nên xác nhận lại cách phân loại này khi duyệt job production-db.
--
-- ⚠️ Ghi chú lịch sử (04/10/2026): migration này đã được áp lên production bằng MCP apply_migration
-- TRƯỚC khi có file này — vi phạm ADR-004. File này là bản ghi nội dung đã áp, viết idempotent để
-- CI áp lại cũng vô hại; bản ghi lịch sử production được đổi version → 0053 để parity khớp (như 0052).

alter table public.hop_dong_hoc_phi
  drop constraint if exists hop_dong_hoc_phi_ghi_danh_id_key;

create unique index if not exists uq_hop_dong_mo_theo_ghi_danh
  on public.hop_dong_hoc_phi (ghi_danh_id)
  where trang_thai <> 'da_huy' and deleted_at is null;

comment on index public.uq_hop_dong_mo_theo_ghi_danh is
  'Mỗi ghi danh chỉ có tối đa 1 hợp đồng chưa hủy/chưa xóa mềm. Hợp đồng da_huy được giữ lại làm vết nhưng không chặn tạo hợp đồng mới.';
