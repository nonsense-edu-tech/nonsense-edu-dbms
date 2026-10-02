-- 0045: View danh sách học sinh kèm trạng thái ghi danh HIỆN TẠI (Expand).
--
-- Mục đích: phân trang/lọc danh sách học sinh ở phía server. Bộ lọc "trạng thái
-- ghi danh" phải theo ghi danh MỚI NHẤT của học sinh; lọc REST trên embed
-- `ghi_danh` sẽ khớp bất kỳ ghi danh nào nên không dùng được.
--
-- Backward-compatible (ADR-004 luật 3): chỉ thêm view mới, không đụng bảng/cột/
-- RLS nào. Code cũ trên production không biết tới view này nên chạy bình thường.
--
-- Bảo mật: security_invoker = true → RLS của hoc_sinh/ghi_danh áp theo NGƯỜI GỌI
-- (không chạy bằng quyền chủ view). Chỉ cấp SELECT cho authenticated, thu hồi
-- mọi quyền của anon/public (khác các view cũ đang cấp rộng).

create or replace view public.v_hoc_sinh_danh_sach
with (security_invoker = true) as
select
  hs.id,
  hs.stt,
  hs.ma_hoc_sinh,
  hs.ho_ten,
  hs.sdt_phu_huynh,
  hs.lop_hien_tai_id,
  hs.created_at,
  hs.tinh_trang_dang_ky,
  hs.ngay_sinh,
  hs.gioi_tinh,
  hs.email,
  hs.sdt_hoc_sinh,
  hs.cccd,
  hs.truong_thpt,
  hs.khoi_thi,
  hs.nv1,
  hs.ten_phu_huynh,
  hs.dia_chi,
  gd.id        as ghi_danh_id,
  gd.trang_thai as trang_thai_ghi_danh
from public.hoc_sinh hs
left join lateral (
  select g.id, g.trang_thai
  from public.ghi_danh g
  where g.hoc_sinh_id = hs.id
    and g.deleted_at is null
  order by g.ngay_bat_dau desc, g.id desc
  limit 1
) gd on true
where hs.deleted_at is null;

revoke all on public.v_hoc_sinh_danh_sach from public, anon;
grant select on public.v_hoc_sinh_danh_sach to authenticated;

comment on view public.v_hoc_sinh_danh_sach is
  'Học sinh chưa xoá + ghi danh mới nhất (trạng thái hiện tại). security_invoker. Dùng cho phân trang/lọc/xuất CSV ở trang Học sinh.';
