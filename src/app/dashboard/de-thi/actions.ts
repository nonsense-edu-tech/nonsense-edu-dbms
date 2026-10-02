"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DongInput = {
  id?: string | null;
  thu_tu: number;
  nhan?: string | null;
  loai_ngu_lieu?: string | null;
  so_luong: number;
  cau_moi_cum?: number | null;
  dang_cau_ma?: number | null;
  hoc_phan_ma?: number | null;
  bai_hoc_ma?: number | null;
  chu_de_ma?: number | null;
  tien_trinh?: string | null;
  do_kho_tu: number;
  do_kho_den: number;
  cho_phep_noi_do_kho: boolean;
  diem_moi_cau?: number | null;
};

export type KqId = { error: string } | { id: string };
export type KqMaTran = { error: string } | { id: string; dongIds: string[] };
export type KqOk = { error: string } | { ok: true };

function loiDb(message: string): string {
  if (/row-level security|permission denied/i.test(message)) return "Bạn không có quyền thực hiện thao tác này.";
  if (/uq_ma_tran_dong_thu_tu|duplicate key/i.test(message)) return "Dữ liệu bị trùng — thử tải lại trang.";
  return message;
}

export async function luuMaTran(input: {
  id: string | null;
  ten: string;
  moTa: string;
  capHocMa: number;
  monHocMa: number;
  dong: DongInput[];
}): Promise<KqMaTran> {
  if (!input.ten.trim()) return { error: "Tên ma trận không được để trống." };
  if (!Number.isInteger(input.capHocMa) || !Number.isInteger(input.monHocMa)) return { error: "Chọn cấp học và môn học." };
  if (input.dong.length === 0) return { error: "Ma trận cần ít nhất 1 dòng." };
  for (const [i, d] of input.dong.entries()) {
    const ten = `Dòng ${i + 1}`;
    if (!Number.isInteger(d.so_luong) || d.so_luong < 1) return { error: `${ten}: số lượng phải ≥ 1.` };
    if (d.do_kho_tu > d.do_kho_den) return { error: `${ten}: độ khó "từ" phải ≤ "đến".` };
    if (d.loai_ngu_lieu && d.cau_moi_cum != null && d.cau_moi_cum < 1) return { error: `${ten}: số câu mỗi cụm phải ≥ 1.` };
  }
  const supabase = await createClient();
  const dong = input.dong.map((d, i) => ({ ...d, thu_tu: i + 1, loai_ngu_lieu: d.loai_ngu_lieu || null, cau_moi_cum: d.loai_ngu_lieu ? d.cau_moi_cum ?? null : null }));
  const { data, error } = await supabase.rpc("luu_ma_tran", {
    p_id: input.id,
    p_ten: input.ten,
    p_mo_ta: input.moTa,
    p_cap: input.capHocMa,
    p_mon: input.monHocMa,
    p_dong: dong,
  });
  if (error) return { error: loiDb(error.message) };
  const { data: ids } = await supabase.from("ma_tran_dong").select("id").eq("ma_tran_id", data as string).order("thu_tu");
  revalidatePath("/dashboard/de-thi");
  return { id: data as string, dongIds: (ids ?? []).map((r) => r.id as string) };
}

export type DoPhuRow = { dong_id: string; can: number; co_dung: number; co_noi: number };

export async function doPhuMaTran(id: string): Promise<{ error: string } | { rows: DoPhuRow[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("do_phu_ma_tran", { p_ma_tran_id: id });
  if (error) return { error: loiDb(error.message) };
  return { rows: (data ?? []) as DoPhuRow[] };
}

export async function nhanBanMaTran(id: string): Promise<KqId> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("nhan_ban_ma_tran", { p_id: id });
  if (error) return { error: loiDb(error.message) };
  revalidatePath("/dashboard/de-thi");
  return { id: data as string };
}

export async function xoaMaTran(id: string): Promise<KqOk> {
  const supabase = await createClient();
  const { error } = await supabase.from("ma_tran_de").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: loiDb(error.message) };
  revalidatePath("/dashboard/de-thi");
  return { ok: true };
}

export type CauHinhDe = {
  ten: string;
  thoiGianPhut: number | null;
  chongLapN: number;
  xaoCum: boolean;
  xaoDapAn: boolean;
  seed: string;
};

export async function taoDeTuMaTran(maTranId: string, cauHinh: CauHinhDe): Promise<KqId> {
  if (!cauHinh.ten.trim()) return { error: "Tên đề không được để trống." };
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return { error: "Phiên đăng nhập đã hết hạn." };
  const { data: mt, error: e1 } = await supabase.from("ma_tran_de").select("id, cap_hoc_ma, mon_hoc_ma").eq("id", maTranId).maybeSingle();
  if (e1 || !mt) return { error: "Không tìm thấy ma trận." };

  const { data: de, error } = await supabase
    .from("de")
    .insert({
      ten: cauHinh.ten.trim(),
      nguoi_tao: user.user.id,
      ma_tran_id: maTranId,
      cap_hoc_ma: mt.cap_hoc_ma,
      mon_hoc_ma: mt.mon_hoc_ma,
      chong_lap_n: cauHinh.chongLapN,
      xao_cum: cauHinh.xaoCum,
      xao_dap_an: cauHinh.xaoDapAn,
      thoi_gian_phut: cauHinh.thoiGianPhut,
      seed: cauHinh.seed.trim() || null,
    })
    .select("id")
    .single();
  if (error || !de) return { error: loiDb(error?.message ?? "Không tạo được đề.") };

  const { error: e2 } = await supabase.rpc("sinh_de", { p_de_id: de.id, p_seed: cauHinh.seed.trim() || null });
  if (e2) return { error: loiDb(e2.message) };
  revalidatePath("/dashboard/de-thi");
  return { id: de.id as string };
}

export async function capNhatCauHinhDe(deId: string, c: CauHinhDe): Promise<KqOk> {
  if (!c.ten.trim()) return { error: "Tên đề không được để trống." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("de")
    .update({ ten: c.ten.trim(), thoi_gian_phut: c.thoiGianPhut, chong_lap_n: c.chongLapN, xao_cum: c.xaoCum, xao_dap_an: c.xaoDapAn })
    .eq("id", deId);
  if (error) return { error: loiDb(error.message) };
  revalidatePath(`/dashboard/de-thi/${deId}`);
  return { ok: true };
}

export async function sinhLaiDe(deId: string, seed: string | null): Promise<KqOk> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("sinh_de", { p_de_id: deId, p_seed: seed?.trim() || null });
  if (error) return { error: loiDb(error.message) };
  revalidatePath(`/dashboard/de-thi/${deId}`);
  return { ok: true };
}

export async function khoaDonVi(deId: string, dongId: string, donViId: string, khoa: boolean): Promise<KqOk> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("khoa_don_vi", { p_de_id: deId, p_dong_id: dongId, p_don_vi_id: donViId, p_khoa: khoa });
  if (error) return { error: loiDb(error.message) };
  revalidatePath(`/dashboard/de-thi/${deId}`);
  return { ok: true };
}

export type GoiYCum = { don_vi_id: string; la_cum: boolean; tieu_de: string | null; so_cau: number; do_kho_tb: number | null; lap_gan_day: boolean };

export async function goiYCum(deId: string, dongId: string): Promise<{ error: string } | { rows: GoiYCum[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("goi_y_cum", { p_de_id: deId, p_dong_id: dongId });
  if (error) return { error: loiDb(error.message) };
  return { rows: (data ?? []) as GoiYCum[] };
}

export async function doiCum(deId: string, dongId: string, cu: string, moi: string): Promise<KqOk> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("doi_cum", { p_de_id: deId, p_dong_id: dongId, p_don_vi_cu: cu, p_don_vi_moi: moi });
  if (error) return { error: loiDb(error.message) };
  revalidatePath(`/dashboard/de-thi/${deId}`);
  return { ok: true };
}

export async function chotDe(deId: string, soMa: number): Promise<{ error: string } | { maDe: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("chot_de", { p_de_id: deId, p_so_ma: soMa });
  if (error) return { error: loiDb(error.message) };
  revalidatePath("/dashboard/de-thi");
  revalidatePath(`/dashboard/de-thi/${deId}`);
  return { maDe: (data as { ma_de: string }).ma_de };
}

export async function taoMaDe(deId: string, soMa: number): Promise<KqOk> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("tao_ma_de", { p_de_id: deId, p_so_ma: soMa });
  if (error) return { error: loiDb(error.message) };
  revalidatePath(`/dashboard/de-thi/${deId}`);
  return { ok: true };
}

export async function xoaDe(deId: string): Promise<KqOk> {
  const supabase = await createClient();
  const { data: de } = await supabase.from("de").select("trang_thai").eq("id", deId).maybeSingle();
  if (!de) return { error: "Không tìm thấy đề." };
  if (de.trang_thai !== "nhap") return { error: "Đề đã chốt không xoá được." };
  const { error } = await supabase.from("de").update({ deleted_at: new Date().toISOString() }).eq("id", deId);
  if (error) return { error: loiDb(error.message) };
  revalidatePath("/dashboard/de-thi");
  return { ok: true };
}
