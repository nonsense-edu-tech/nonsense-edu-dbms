"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type HocPhan = {
  id: string;
  ma: number | null;
  ten: string;
};

export type TaoHocPhanResult = { error: string } | { data: HocPhan };
export type SuaHocPhanResult = { error: string } | { ok: true };
export type XoaHocPhanResult = { error: string } | { ok: true };

export type DuyetHocPhanResult = { error: string } | { ok: true };

// Mã để trống = hệ thống tự cấp khi duyệt (tuần tự theo cấp học + môn).
function docMa(formData: FormData): number | null | { error: string } {
  const raw = String(formData.get("ma") ?? "").trim();
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 99) {
    return { error: "Mã học phần phải là số nguyên từ 1 đến 99 (hoặc để trống để hệ thống tự cấp)." };
  }
  return value;
}

async function layVaiTro(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("users").select("vai_tro").eq("id", user.id).single();
  return { id: user.id, vaiTro: data?.vai_tro ?? "" };
}

export async function taoHocPhan(formData: FormData): Promise<TaoHocPhanResult> {
  const supabase = await createClient();

  const monHocId = String(formData.get("mon_hoc_id") ?? "").trim();
  const capHocMa = Number(formData.get("cap_hoc_ma"));
  const monHocMa = Number(formData.get("mon_hoc_ma"));
  const ten = String(formData.get("ten") ?? "").trim();
  const moTa = String(formData.get("mo_ta") ?? "").trim() || null;

  if (!monHocId || !Number.isInteger(capHocMa) || !Number.isInteger(monHocMa)) {
    return { error: "Vui lòng chọn môn học." };
  }
  if (!ten) return { error: "Tên học phần không được để trống." };

  const nguoi = await layVaiTro(supabase);
  if (!nguoi) return { error: "Phiên đăng nhập đã hết hạn." };

  // GV: học phần vào trạng thái chờ duyệt, chưa có mã (cấp khi Trưởng bộ môn duyệt).
  const laGv = nguoi.vaiTro === "gv";
  const ma = laGv ? null : docMa(formData);
  if (ma !== null && typeof ma !== "number") return ma;

  const { data, error } = await supabase
    .from("hoc_phan")
    .insert({
      mon_hoc_id: monHocId,
      cap_hoc_ma: capHocMa,
      mon_hoc_ma: monHocMa,
      ma,
      ten,
      mo_ta: moTa,
      nguoi_tao: nguoi.id,
      trang_thai: laGv ? "cho_duyet" : "da_duyet",
    })
    .select("id, ma, ten")
    .single();

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/hoc-phan");
  return { data: data as HocPhan };
}

export async function suaHocPhan(formData: FormData): Promise<SuaHocPhanResult> {
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "").trim();
  const ten = String(formData.get("ten") ?? "").trim();
  const moTa = String(formData.get("mo_ta") ?? "").trim() || null;

  if (!id) return { error: "Thiếu ID học phần." };
  if (!ten) return { error: "Tên học phần không được để trống." };

  const nguoi = await layVaiTro(supabase);
  if (!nguoi) return { error: "Phiên đăng nhập đã hết hạn." };

  // GV sửa học phần của mình → gửi duyệt lại (xoá lý do từ chối), không đổi mã.
  const capNhat =
    nguoi.vaiTro === "gv"
      ? { ten, mo_ta: moTa, trang_thai: "cho_duyet", ly_do_tu_choi: null }
      : (() => {
          const ma = docMa(formData);
          return ma !== null && typeof ma !== "number" ? ma : ma === null ? { ten, mo_ta: moTa } : { ma, ten, mo_ta: moTa };
        })();
  if ("error" in capNhat) return capNhat;

  const { error } = await supabase.from("hoc_phan").update(capNhat).eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/hoc-phan");
  return { ok: true };
}

export async function xoaHocPhan(id: string): Promise<XoaHocPhanResult> {
  const supabase = await createClient();

  if (!id) return { error: "Thiếu ID học phần." };

  const { error } = await supabase.from("hoc_phan").update({ deleted_at: new Date().toISOString() }).eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/hoc-lieu/hoc-phan");
  return { ok: true };
}

export async function duyetHocPhan(id: string): Promise<DuyetHocPhanResult> {
  const supabase = await createClient();
  if (!id) return { error: "Thiếu ID học phần." };
  const { error } = await supabase.from("hoc_phan").update({ trang_thai: "da_duyet" }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };
  revalidatePath("/dashboard/hoc-lieu/hoc-phan");
  return { ok: true };
}

export async function tuChoiHocPhan(id: string, lyDo: string): Promise<DuyetHocPhanResult> {
  const supabase = await createClient();
  if (!id) return { error: "Thiếu ID học phần." };
  const ly = lyDo.trim();
  if (!ly) return { error: "Vui lòng nhập lý do từ chối." };
  const { error } = await supabase.from("hoc_phan").update({ trang_thai: "tu_choi", ly_do_tu_choi: ly }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };
  revalidatePath("/dashboard/hoc-lieu/hoc-phan");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền với học phần này (Giáo viên chỉ tạo/sửa học phần chờ duyệt trong môn mình phụ trách; duyệt do Trưởng bộ môn/quản trị).";
  if (msg.includes("tự duyệt")) return "Không được tự duyệt học phần do chính mình tạo — cần Trưởng bộ môn khác hoặc quản trị duyệt.";
  if (msg.includes("hết mã học phần")) return "Đã hết mã học phần (tối đa 99) cho môn này.";
  if (msg.includes("uq_hoc_phan")) return "Mã học phần này đã tồn tại trong môn học đã chọn.";
  if (msg.includes("hoc_phan_ma_check")) return "Mã học phần phải từ 1 đến 99.";
  if (msg.includes("bai_hoc_hoc_phan_id_fkey") || msg.includes("update or delete"))
    return "Không thể xoá — học phần này còn bài học bên trong.";
  return msg;
}
