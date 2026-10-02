// Dùng chung cho tải template + xem trước/nhập câu hỏi từ file (server).
// KHÔNG phải server action (không "use server").

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DanhMucNhap } from "@/lib/cau-hoi-import";

// Cùng danh sách vai trò với form tạo câu hỏi (page tao-moi) và RLS p_write_insert.
export const VAI_TRO_NHAP_CAU_HOI = ["master_admin", "admin_ht", "truong_bm", "gv"];

export type NguoiNhap = { userId: string };

/** Trả về người dùng nếu đang đăng nhập, active và được phép tạo câu hỏi; ngược lại trả lý do. */
export async function kiemTraQuyenNhap(supabase: SupabaseClient): Promise<{ error: string } | NguoiNhap> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };
  const { data: profile } = await supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single();
  if (profile?.trang_thai !== "active" || !VAI_TRO_NHAP_CAU_HOI.includes(profile?.vai_tro ?? "")) {
    return { error: "Bạn không có quyền nhập câu hỏi." };
  }
  return { userId: user.id };
}

const TRANG = 1000; // PostgREST mặc định tối đa 1000 dòng/lần — phải lật trang kẻo cắt dữ liệu âm thầm

async function layTatCa<T>(
  tai: (tu: number, den: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const kq: T[] = [];
  for (let tu = 0; ; tu += TRANG) {
    const { data, error } = await tai(tu, tu + TRANG - 1);
    if (error) throw new Error(error.message);
    kq.push(...(data ?? []));
    if (!data || data.length < TRANG) return kq;
  }
}

/** Danh mục mã (theo quyền đọc của người đang đăng nhập) để đối chiếu và dựng file mẫu. */
export async function layDanhMucNhap(supabase: SupabaseClient): Promise<DanhMucNhap> {
  const [capHoc, chuongTrinh, chuongTrinhMonHoc, dangCau, monHoc, hocPhan, baiHoc, chuDe] = await Promise.all([
    supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("chuong_trinh_mon_hoc").select("chuong_trinh_ma, cap_hoc_ma, mon_hoc_ma"),
    supabase.from("dang_cau").select("ma, ten").is("deleted_at", null).order("ma"),
    layTatCa((a, b) => supabase.from("mon_hoc").select("id, ma, cap_hoc_ma, ten").is("deleted_at", null).order("id").range(a, b)),
    layTatCa((a, b) => supabase.from("hoc_phan").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("id").range(a, b)),
    layTatCa((a, b) => supabase.from("bai_hoc").select("id, hoc_phan_id, ma, ten").is("deleted_at", null).order("id").range(a, b)),
    layTatCa((a, b) => supabase.from("chu_de").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("id").range(a, b)),
  ]);
  for (const r of [capHoc, chuongTrinh, chuongTrinhMonHoc, dangCau]) {
    if (r.error) throw new Error(r.error.message);
  }
  return {
    capHoc: capHoc.data ?? [],
    chuongTrinh: chuongTrinh.data ?? [],
    chuongTrinhMonHoc: chuongTrinhMonHoc.data ?? [],
    dangCau: dangCau.data ?? [],
    monHoc,
    hocPhan,
    baiHoc,
    chuDe,
  };
}
