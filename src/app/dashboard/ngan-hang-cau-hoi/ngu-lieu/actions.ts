"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { htmlRong, lamSachHtml } from "@/lib/van-ban-dinh-dang";
import { laLoaiNguLieu } from "@/lib/ngu-lieu";
import { mapDbError } from "../luu-cau-hoi";

export type NguLieuResult = { error: string } | { data: { id: string; so_hieu: string } };
export type NguLieuOkResult = { error: string } | { ok: true };

const GOC = "/dashboard/ngan-hang-cau-hoi/ngu-lieu";

function loiDb(msg: string): string {
  if (msg.includes("ngu_lieu_so_hieu_key")) return "Số hiệu ngữ liệu bị trùng — thử lưu lại.";
  return mapDbError(msg);
}

type ViTriId = {
  mon_hoc_id: string;
  cap_hoc_ma: number;
  mon_hoc_ma: number;
  hoc_phan_id: string | null;
  bai_hoc_id: string | null;
  chu_de_id: string | null;
};

/** Đọc + đối chiếu vị trí từ form: môn bắt buộc; học phần/bài học/chủ đề tuỳ chọn và phải đúng cha. */
async function docViTri(supabase: Awaited<ReturnType<typeof createClient>>, formData: FormData): Promise<ViTriId | { error: string }> {
  const monId = String(formData.get("mon_hoc_id") ?? "").trim();
  if (!monId) return { error: "Vui lòng chọn môn học." };
  const hocPhanId = String(formData.get("hoc_phan_id") ?? "").trim() || null;
  const baiHocId = String(formData.get("bai_hoc_id") ?? "").trim() || null;
  const chuDeId = String(formData.get("chu_de_id") ?? "").trim() || null;
  if (baiHocId && !hocPhanId) return { error: "Chọn bài học thì phải chọn học phần chứa nó." };

  const { data: mon } = await supabase.from("mon_hoc").select("id, ma, cap_hoc_ma").eq("id", monId).is("deleted_at", null).maybeSingle();
  if (!mon) return { error: "Môn học không tồn tại." };
  // Học phần/bài học/chủ đề đúng cha cũng được trigger kiem_tra_ngu_lieu kiểm ở DB — ở đây chỉ để báo lỗi sớm.
  return { mon_hoc_id: mon.id, cap_hoc_ma: mon.cap_hoc_ma, mon_hoc_ma: mon.ma, hoc_phan_id: hocPhanId, bai_hoc_id: baiHocId, chu_de_id: chuDeId };
}

function docNoiDung(formData: FormData): { loai: string; tieuDe: string | null; noiDung: string } | { error: string } {
  const loai = String(formData.get("loai") ?? "");
  if (!laLoaiNguLieu(loai)) return { error: "Vui lòng chọn loại ngữ liệu." };
  const tieuDe = String(formData.get("tieu_de") ?? "").trim() || null;
  if (tieuDe && tieuDe.length > 200) return { error: "Tiêu đề tối đa 200 ký tự." };
  const noiDung = lamSachHtml(String(formData.get("noi_dung") ?? ""));
  if (htmlRong(noiDung)) return { error: "Nội dung ngữ liệu không được để trống." };
  return { loai, tieuDe, noiDung };
}

export async function taoNguLieu(formData: FormData): Promise<NguLieuResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const nd = docNoiDung(formData);
  if ("error" in nd) return nd;
  const vt = await docViTri(supabase, formData);
  if ("error" in vt) return vt;

  const { data, error } = await supabase
    .from("ngu_lieu")
    .insert({
      loai: nd.loai,
      tieu_de: nd.tieuDe,
      noi_dung: nd.noiDung,
      mon_hoc_id: vt.mon_hoc_id,
      cap_hoc_ma: vt.cap_hoc_ma,
      mon_hoc_ma: vt.mon_hoc_ma,
      hoc_phan_id: vt.hoc_phan_id,
      bai_hoc_id: vt.bai_hoc_id,
      chu_de_id: vt.chu_de_id,
      nguoi_tao: user.id,
    })
    .select("id, so_hieu")
    .single();
  if (error) return { error: loiDb(error.message) };

  revalidatePath(GOC);
  return { data: data as { id: string; so_hieu: string } };
}

/**
 * Sửa tiêu đề/loại/nội dung. Vị trí chỉ đổi được khi ngữ liệu CHƯA có câu con
 * (mã câu hỏi bất biến — trigger kiem_tra_ngu_lieu chặn ở DB nếu đã có).
 */
export async function suaNguLieu(formData: FormData): Promise<NguLieuOkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mã ngữ liệu." };
  const nd = docNoiDung(formData);
  if ("error" in nd) return nd;

  const capNhat: Record<string, unknown> = { loai: nd.loai, tieu_de: nd.tieuDe, noi_dung: nd.noiDung };
  if (formData.get("sua_vi_tri") === "1") {
    const vt = await docViTri(supabase, formData);
    if ("error" in vt) return vt;
    Object.assign(capNhat, {
      mon_hoc_id: vt.mon_hoc_id,
      cap_hoc_ma: vt.cap_hoc_ma,
      mon_hoc_ma: vt.mon_hoc_ma,
      hoc_phan_id: vt.hoc_phan_id,
      bai_hoc_id: vt.bai_hoc_id,
      chu_de_id: vt.chu_de_id,
    });
  }

  const { error } = await supabase.from("ngu_lieu").update(capNhat).eq("id", id).is("deleted_at", null);
  if (error) return { error: loiDb(error.message) };

  revalidatePath(GOC);
  revalidatePath(`${GOC}/${id}`);
  return { ok: true };
}

/** Xóa mềm ngữ liệu + toàn bộ câu con (RPC chặn nếu có câu con đã nằm trong đề). */
export async function xoaNguLieu(id: string): Promise<NguLieuOkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const { error } = await supabase.rpc("xoa_mem_ngu_lieu", { p_id: id });
  if (error) return { error: loiDb(error.message) };

  revalidatePath(GOC);
  revalidatePath("/dashboard/ngan-hang-cau-hoi");
  return { ok: true };
}

export async function doiThuTuCauCon(cauHoiId: string, huong: "len" | "xuong", nguLieuId: string): Promise<NguLieuOkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const { error } = await supabase.rpc("doi_thu_tu_cau_con", { p_cau_hoi_id: cauHoiId, p_huong: huong });
  if (error) return { error: loiDb(error.message) };

  revalidatePath(`${GOC}/${nguLieuId}`);
  return { ok: true };
}
