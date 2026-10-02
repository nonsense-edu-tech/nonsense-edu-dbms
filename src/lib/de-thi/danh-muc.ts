import type { SupabaseClient } from "@supabase/supabase-js";
import type { DanhMuc } from "@/app/dashboard/de-thi/MaTranEditor";

export const VAI_TRO_DE_THI = ["master_admin", "admin_ht", "truong_bm", "gv"];

/** Danh mục cho form ma trận — RLS tự giới hạn theo phạm vi của người dùng. */
export async function taiDanhMuc(supabase: SupabaseClient): Promise<DanhMuc> {
  const [{ data: mon }, { data: cap }, { data: hp }, { data: bai }, { data: cd }, { data: dang }, { data: tt }] = await Promise.all([
    supabase.from("mon_hoc").select("id, ma, cap_hoc_ma, ten").is("deleted_at", null).order("cap_hoc_ma").order("ten"),
    supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null),
    supabase.from("hoc_phan").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("bai_hoc").select("id, hoc_phan_id, ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("chu_de").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("dang_cau").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("tien_trinh").select("ma, ten").order("ma"),
  ]);
  const capMap = new Map((cap ?? []).map((c) => [c.ma as number, c.ten as string]));
  return {
    monHoc: (mon ?? []).map((m) => ({ id: m.id, cap_hoc_ma: m.cap_hoc_ma, ma: m.ma, ten: m.ten, cap_ten: capMap.get(m.cap_hoc_ma) ?? String(m.cap_hoc_ma) })),
    hocPhan: (hp ?? []).filter((x) => x.ma !== 0),
    baiHoc: (bai ?? []).filter((x) => x.ma !== 0),
    chuDe: (cd ?? []).filter((x) => x.ma !== 0),
    dangCau: dang ?? [],
    tienTrinh: tt ?? [],
  };
}
