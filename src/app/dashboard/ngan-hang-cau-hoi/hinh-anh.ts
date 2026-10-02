// Hình ảnh đính kèm câu hỏi (đề bài / lời giải / từng lựa chọn) — dùng chung cho
// tạo mới, sửa và nhập từ file. File này KHÔNG phải server action (không "use server").
//
// Quy ước tên field trong FormData (form tạo/sửa):
//   hinh_de, hinh_loi_giai, hinh_lua_chon_<i>        — file MỚI (i = chỉ số dòng lựa chọn trên form, từ 0)
//   giu_hinh_de, giu_hinh_loi_giai, giu_hinh_lua_chon_<i> — id ảnh CŨ giữ lại (chỉ khi sửa)
// Ảnh cũ không nằm trong danh sách "giu_*" sẽ bị xoá (cả file trong Storage).

import type { SupabaseClient } from "@supabase/supabase-js";
import { mapDbError } from "./luu-cau-hoi";

export const BUCKET_HINH_CAU_HOI = "hinh-cau-hoi";
export const HINH_MIME_CHO_PHEP = ["image/jpeg", "image/png", "image/webp"] as const;
export const HINH_TOI_DA_BYTE = 2 * 1024 * 1024;
export const HINH_TOI_DA_MOI_VI_TRI = { de: 5, loi_giai: 5, lua_chon: 1 } as const;
export const HINH_TOI_DA_MOI_CAU = 20;

export type ViTriHinh = "de" | "loi_giai" | "lua_chon";

const DUOI_THEO_MIME: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type HinhMoi = { tep: File; viTri: ViTriHinh; thuTuLuaChon: number | null; thuTu: number };
export type HinhGiu = { id: string; viTri: ViTriHinh; thuTuLuaChon: number | null; thuTu: number };
export type DacTaHinhAnh = { moi: HinhMoi[]; giu: HinhGiu[] };

export type HinhAnhCauHoi = {
  id: string;
  vi_tri: ViTriHinh;
  thu_tu_lua_chon: number | null;
  thu_tu: number;
  url: string;
};

function laTep(v: FormDataEntryValue): v is File {
  return typeof v !== "string" && v.size > 0;
}

/** Ảnh gắn với lựa chọn thứ i (0-based, theo form) — để docDapAn không bỏ lựa chọn chỉ có ảnh. */
export function coHinhChoLuaChon(formData: FormData, i: number): boolean {
  return formData.getAll(`hinh_lua_chon_${i}`).some(laTep) || formData.getAll(`giu_hinh_lua_chon_${i}`).length > 0;
}

/**
 * Đọc + kiểm tra ảnh từ form. `chiSoGoc[k]` = chỉ số dòng trên form của lựa chọn thứ k (k từ 0)
 * sau khi bỏ dòng rỗng → ảnh dòng i được gắn vào thu_tu_lua_chon = k + 1.
 */
export function docHinhAnh(formData: FormData, chiSoGoc: number[]): DacTaHinhAnh | { error: string } {
  const moi: HinhMoi[] = [];
  const giu: HinhGiu[] = [];

  const vung: { ten: string; viTri: ViTriHinh; thuTuLuaChon: number | null }[] = [
    { ten: "de", viTri: "de", thuTuLuaChon: null },
    { ten: "loi_giai", viTri: "loi_giai", thuTuLuaChon: null },
    ...chiSoGoc.map((i, k) => ({ ten: `lua_chon_${i}`, viTri: "lua_chon" as const, thuTuLuaChon: k + 1 })),
  ];

  for (const v of vung) {
    const gioiHan = HINH_TOI_DA_MOI_VI_TRI[v.viTri];
    const idGiu = formData.getAll(`giu_hinh_${v.ten}`).map(String).filter(Boolean);
    const teps = formData.getAll(`hinh_${v.ten}`).filter(laTep);
    const nhan = v.viTri === "de" ? "đề bài" : v.viTri === "loi_giai" ? "lời giải" : `lựa chọn ${v.thuTuLuaChon}`;
    if (idGiu.length + teps.length > gioiHan) {
      return { error: `Tối đa ${gioiHan} ảnh cho ${nhan}.` };
    }
    let thuTu = 1;
    for (const id of idGiu) giu.push({ id, viTri: v.viTri, thuTuLuaChon: v.thuTuLuaChon, thuTu: thuTu++ });
    for (const tep of teps) {
      if (!(HINH_MIME_CHO_PHEP as readonly string[]).includes(tep.type)) {
        return { error: `Ảnh "${tep.name}" không đúng định dạng — chỉ nhận JPG, PNG, WebP.` };
      }
      if (tep.size > HINH_TOI_DA_BYTE) {
        return { error: `Ảnh "${tep.name}" vượt quá 2MB.` };
      }
      moi.push({ tep, viTri: v.viTri, thuTuLuaChon: v.thuTuLuaChon, thuTu: thuTu++ });
    }
  }

  if (moi.length + giu.length > HINH_TOI_DA_MOI_CAU) {
    return { error: `Mỗi câu hỏi tối đa ${HINH_TOI_DA_MOI_CAU} ảnh.` };
  }
  // Giữ tổng dung lượng gửi lên dưới bodySizeLimit (25MB) của server action.
  if (moi.reduce((t, m) => t + m.tep.size, 0) > 20 * 1024 * 1024) {
    return { error: "Tổng dung lượng ảnh tải lên một lần tối đa 20MB — hãy chia nhỏ rồi lưu nhiều lần." };
  }
  return { moi, giu };
}

/**
 * Lưu ảnh cho câu hỏi đã tồn tại: xoá ảnh cũ không còn giữ, cập nhật vị trí ảnh giữ lại, tải ảnh mới.
 * Trả về lỗi (nếu có) — caller quyết định xử lý (câu hỏi vẫn đã lưu, chỉ phần ảnh lỗi).
 */
export async function luuHinhAnh(
  supabase: SupabaseClient,
  userId: string,
  cauHoiId: string,
  dacTa: DacTaHinhAnh
): Promise<{ error: string } | { ok: true }> {
  const { data: hienCo, error: layError } = await supabase
    .from("cau_hoi_hinh_anh")
    .select("id, duong_dan")
    .eq("cau_hoi_id", cauHoiId);
  if (layError) return { error: mapDbError(layError.message) };

  const idGiu = new Set(dacTa.giu.map((g) => g.id));
  const canXoa = (hienCo ?? []).filter((h) => !idGiu.has(h.id));
  if (canXoa.length > 0) {
    const { error: xoaError } = await supabase
      .from("cau_hoi_hinh_anh")
      .delete()
      .in("id", canXoa.map((h) => h.id));
    if (xoaError) return { error: mapDbError(xoaError.message) };
    // File mồ côi trong Storage chỉ tốn dung lượng, không ảnh hưởng dữ liệu → bỏ qua lỗi dọn dẹp.
    await supabase.storage.from(BUCKET_HINH_CAU_HOI).remove(canXoa.map((h) => h.duong_dan));
  }

  const idHienCo = new Set((hienCo ?? []).map((h) => h.id));
  for (const g of dacTa.giu) {
    if (!idHienCo.has(g.id)) continue; // id không thuộc câu hỏi này → bỏ qua (không tin client)
    const { error } = await supabase
      .from("cau_hoi_hinh_anh")
      .update({ vi_tri: g.viTri, thu_tu_lua_chon: g.thuTuLuaChon, thu_tu: g.thuTu })
      .eq("id", g.id)
      .eq("cau_hoi_id", cauHoiId);
    if (error) return { error: mapDbError(error.message) };
  }

  for (const m of dacTa.moi) {
    const duoi = DUOI_THEO_MIME[m.tep.type];
    const duongDan = `${cauHoiId}/${crypto.randomUUID()}.${duoi}`;
    const { error: upError } = await supabase.storage
      .from(BUCKET_HINH_CAU_HOI)
      .upload(duongDan, m.tep, { contentType: m.tep.type, upsert: false });
    if (upError) return { error: `Tải ảnh "${m.tep.name}" thất bại: ${upError.message}` };

    const { error: insError } = await supabase.from("cau_hoi_hinh_anh").insert({
      cau_hoi_id: cauHoiId,
      vi_tri: m.viTri,
      thu_tu_lua_chon: m.thuTuLuaChon,
      thu_tu: m.thuTu,
      duong_dan: duongDan,
      loai_mime: m.tep.type,
      kich_thuoc: m.tep.size,
      nguoi_tao: userId,
    });
    if (insError) {
      await supabase.storage.from(BUCKET_HINH_CAU_HOI).remove([duongDan]);
      return { error: mapDbError(insError.message) };
    }
  }
  return { ok: true };
}

/** Lấy ảnh (kèm signed URL 1 giờ) cho nhiều câu hỏi cùng lúc — dùng ở trang danh sách. */
export async function layHinhAnhCacCauHoi(
  supabase: SupabaseClient,
  cauHoiIds: string[]
): Promise<Map<string, HinhAnhCauHoi[]>> {
  const ketQua = new Map<string, HinhAnhCauHoi[]>();
  if (cauHoiIds.length === 0) return ketQua;

  const { data } = await supabase
    .from("cau_hoi_hinh_anh")
    .select("id, cau_hoi_id, vi_tri, thu_tu_lua_chon, thu_tu, duong_dan")
    .in("cau_hoi_id", cauHoiIds)
    .order("thu_tu");
  if (!data || data.length === 0) return ketQua;

  const { data: urls } = await supabase.storage
    .from(BUCKET_HINH_CAU_HOI)
    .createSignedUrls(
      data.map((h) => h.duong_dan),
      60 * 60
    );
  const urlTheoDuongDan = new Map((urls ?? []).map((u) => [u.path, u.signedUrl]));

  for (const h of data) {
    const url = urlTheoDuongDan.get(h.duong_dan);
    if (!url) continue;
    const ds = ketQua.get(h.cau_hoi_id) ?? [];
    ds.push({ id: h.id, vi_tri: h.vi_tri, thu_tu_lua_chon: h.thu_tu_lua_chon, thu_tu: h.thu_tu, url });
    ketQua.set(h.cau_hoi_id, ds);
  }
  return ketQua;
}

/** Xoá câu hỏi vừa tạo + file ảnh đã tải của nó (dọn khi lưu ảnh lỗi giữa chừng). */
export async function donDepCauHoi(supabase: SupabaseClient, cauHoiId: string): Promise<void> {
  const { data } = await supabase.from("cau_hoi_hinh_anh").select("duong_dan").eq("cau_hoi_id", cauHoiId);
  if (data && data.length > 0) {
    await supabase.storage.from(BUCKET_HINH_CAU_HOI).remove(data.map((h) => h.duong_dan));
  }
  await supabase.from("cau_hoi").delete().eq("id", cauHoiId);
}
