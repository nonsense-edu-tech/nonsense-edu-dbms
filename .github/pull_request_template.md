<!--
Checklist này chỉ bắt buộc có ý nghĩa khi PR này merge vào `main` (tức lên
production). Nếu PR chỉ merge vào `develop` (staging), có thể bỏ qua.
Xem docs/adr/ADR-004-hang-rao-parity-migration-db-code.md để hiểu vì sao.
-->

## Checklist trước khi merge lên `main` (bỏ qua nếu PR này không đụng `main`)

- [ ] Migration mới (nếu có) đã được viết thành file trong `supabase/migrations/`
      — không có thay đổi DB nào chỉ tồn tại "trên server" mà chưa có file trong repo.
- [ ] Migration đã áp dụng và test qua trên **staging** trước, không áp thẳng lên production.
- [ ] Nếu migration này là loại **Contract** (đổi tên/kiểu cột, `DROP`): code phụ
      thuộc vào schema mới **đã chạy thật trên production** trước khi migration
      này được merge (luật (b), ADR-004).
- [ ] Nếu migration này là loại **Expand** (thêm cột/bảng/hàm mới): code CŨ đang
      chạy trên production vẫn chạy bình thường trên schema mới — cột mới
      nullable/có default, không đổi tên/kiểu cột cũ (luật (c), ADR-004).
- [ ] Không có migration nào được áp tay (SQL Editor, `db push` từ máy cá nhân)
      lên **production DB** ngoài luồng merge → CI của PR này (luật (a), ADR-004).
- [ ] Đã thêm 1 mục mới vào `CHANGELOG.md` cho lần deploy này.
