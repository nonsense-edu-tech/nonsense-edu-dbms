-- adr004-type: expand
-- 0057 — Chuyển dữ liệu "ngưng hợp đồng" kiểu cũ sang cột so_tien_mien_cong_no (sau 0056).
--
-- Bối cảnh: khi import Master sheet, học sinh đã nghỉ được ghi hợp đồng `hoan_thanh` với ghi chú
-- "Học sinh nghỉ học: ngưng hợp đồng, chỉ ghi nhận số đã thu (…)" và doanh thu bị cắt bằng cách nhét phần
-- còn lại vào `so_tien_giam` (loai_giam_gia = 'khong'). Như vậy báo cáo hiểu nhầm là "giảm giá".
-- 0056 đã có cột riêng so_tien_mien_cong_no: chuyển đúng phần đó sang, doanh thu thuần KHÔNG đổi
-- (gia_niem_yet − so_tien_giam − so_tien_mien_cong_no giữ nguyên giá trị).
--
-- Phạm vi hẹp có chủ đích: chỉ hợp đồng hoan_thanh, ghi chú đúng mẫu trên, loai_giam_gia = 'khong',
-- so_tien_giam > 0, chưa có miễn công nợ. Trên production hiện chỉ khớp 1 hợp đồng (Trần Huỳnh Khánh Châu,
-- 1.500.000 đ). Không đụng hợp đồng khác (vd 2 hợp đồng ghi chú "Sheet ghi học phí 24,000,000đ …" là chuyện khác).
-- Idempotent: chạy lại không khớp dòng nào. Expand: chỉ chuyển giá trị giữa 2 cột, code cũ đọc vẫn đúng.

select set_config('app.nguon', 'tat_toan', true);
select set_config('app.ly_do', 'Chuyển dữ liệu import cũ: phần cắt doanh thu do học sinh nghỉ học từ so_tien_giam sang so_tien_mien_cong_no (0057)', true);

update public.hop_dong_hoc_phi
   set so_tien_mien_cong_no = so_tien_mien_cong_no + so_tien_giam,
       so_tien_giam         = 0
 where deleted_at is null
   and trang_thai = 'hoan_thanh'
   and loai_giam_gia = 'khong'
   and gia_tri_giam_gia = 0
   and so_tien_giam > 0
   and so_tien_mien_cong_no = 0
   and ghi_chu like 'Học sinh nghỉ học: ngưng hợp đồng%';
