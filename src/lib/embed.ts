// Lấy 1 bản ghi từ kết quả embed của PostgREST (select "a(b(c))").
//
// Quan hệ nhiều-một (vd phieu_thu → hop_dong_hoc_phi) PostgREST trả về OBJECT,
// nhưng `database.types.ts` hiện không khai báo Relationships nên supabase-js suy
// ra kiểu MẢNG. Hàm này chấp nhận cả hai dạng để code đúng ở runtime và qua tsc.
export function motBanGhi<T>(v: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(v)) return v[0];
  return v ?? undefined;
}
