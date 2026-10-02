// Tìm kiếm cho các bảng trong module học phí (Hợp đồng, Phiếu thu) — phía server.
//
// Từ khoá nằm trên URL (?q=). Các cột cần tìm (tên/mã học sinh, lớp, gói) nằm ở bảng
// khác nên ta tra ngược ra danh sách id hợp đồng khớp, rồi trang gọi lọc theo id đó.
// Chỉ dùng cú pháp lọc cơ bản của PostgREST (ilike / in / or), không cần đổi CSDL.
//
// Thuần server (nhận supabase client từ trang), không import next/*.

import type { SupabaseClient } from "@supabase/supabase-js";
import { lamSachTuKhoa } from "@/lib/hoc-sinh-loc";
import type { RawSearchParams } from "@/lib/phan-trang";

export const UUID_RONG = "00000000-0000-0000-0000-000000000000";

// Mỗi danh sách id được ghép vào URL của câu truy vấn kế tiếp → giữ nhỏ để URL không quá dài.
// Vượt ngưỡng nghĩa là từ khoá quá chung chung: báo cho người dùng thay vì cắt âm thầm.
const NGUONG_ID = 150;

export function layTuKhoa(raw: RawSearchParams): string {
  const v = raw.q;
  return lamSachTuKhoa((Array.isArray(v) ? v[0] : v) ?? "");
}

export type KetQuaTimHopDong = {
  /** id hợp đồng khớp (tối đa NGUONG_ID). */
  ids: string[];
  /** true khi từ khoá khớp quá nhiều → kết quả không đầy đủ, cần nhập cụ thể hơn. */
  quaRong: boolean;
};

/**
 * Tìm id hợp đồng theo từ khoá: tên/mã học sinh; với `gomLopVaGoi` thì thêm tên/mã lớp
 * và tên gói học phí. `boDaXoa` = true để bỏ hợp đồng đã xoá mềm (bảng Hợp đồng);
 * bảng Phiếu thu giữ cả hợp đồng đã xoá vì phiếu vẫn là sổ sách.
 */
export async function timHopDongTheoTuKhoa(
  supabase: SupabaseClient,
  q: string,
  opts: { gomLopVaGoi: boolean; boDaXoa: boolean }
): Promise<KetQuaTimHopDong> {
  const [hs, lop, goi] = await Promise.all([
    supabase.from("hoc_sinh").select("id").or(`ma_hoc_sinh.ilike.%${q}%,ho_ten.ilike.%${q}%`).limit(NGUONG_ID + 1),
    opts.gomLopVaGoi
      ? supabase.from("lop").select("id").or(`ma_lop.ilike.%${q}%,ten_lop.ilike.%${q}%`).limit(NGUONG_ID + 1)
      : Promise.resolve({ data: [] as { id: string }[] }),
    opts.gomLopVaGoi
      ? supabase.from("goi_hoc_phi").select("id").ilike("ten", `%${q}%`).limit(NGUONG_ID + 1)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);

  const hsIds = (hs.data ?? []).map((r) => r.id as string);
  const lopIds = (lop.data ?? []).map((r) => r.id as string);
  const goiIds = (goi.data ?? []).map((r) => r.id as string);
  if ([hsIds, lopIds, goiIds].some((d) => d.length > NGUONG_ID)) return { ids: [], quaRong: true };

  // ghi_danh của các học sinh / lớp khớp
  const dkGhiDanh = [
    hsIds.length > 0 ? `hoc_sinh_id.in.(${hsIds.join(",")})` : "",
    lopIds.length > 0 ? `lop_id.in.(${lopIds.join(",")})` : "",
  ].filter(Boolean);
  let gdIds: string[] = [];
  if (dkGhiDanh.length > 0) {
    const { data } = await supabase.from("ghi_danh").select("id").or(dkGhiDanh.join(",")).limit(NGUONG_ID + 1);
    gdIds = (data ?? []).map((r) => r.id as string);
    if (gdIds.length > NGUONG_ID) return { ids: [], quaRong: true };
  }

  const dkHopDong = [
    gdIds.length > 0 ? `ghi_danh_id.in.(${gdIds.join(",")})` : "",
    goiIds.length > 0 ? `goi_hoc_phi_id.in.(${goiIds.join(",")})` : "",
  ].filter(Boolean);
  if (dkHopDong.length === 0) return { ids: [], quaRong: false };

  let qb = supabase.from("hop_dong_hoc_phi").select("id").or(dkHopDong.join(",")).limit(NGUONG_ID + 1);
  if (opts.boDaXoa) qb = qb.is("deleted_at", null);
  const { data } = await qb;
  const ids = (data ?? []).map((r) => r.id as string);
  if (ids.length > NGUONG_ID) return { ids: ids.slice(0, NGUONG_ID), quaRong: true };
  return { ids, quaRong: false };
}

/** Từ khoá toàn chữ số (cho phép dấu . , và khoảng trắng) → số tiền; ngược lại null. */
export function tuKhoaLaSoTien(q: string): number | null {
  const s = q.replace(/[.,\s]/g, "").replace(/đ$/i, "");
  if (!/^\d{4,15}$/.test(s)) return null;
  const n = Number(s);
  return Number.isSafeInteger(n) ? n : null;
}
