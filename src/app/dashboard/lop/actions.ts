"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Lop = {
  id: number;
  ma_lop: string;
  ten_lop: string | null;
};

export type TaoLopResult = { error: string } | { data: Lop };
export type SuaLopResult = { error: string } | { ok: true };
export type XoaLopResult = { error: string } | { ok: true };

const TINH_TRANG_HOP_LE = ["dang_tuyen_sinh", "da_khai_giang", "dang_hoc", "da_hoan_thanh", "da_huy"];

type ThongTinBoSungLop = {
  ngay_khai_giang: string | null;
  ngay_ket_thuc: string | null;
  tinh_trang: string[] | null;
};

function docThongTinBoSungLop(formData: FormData): ThongTinBoSungLop | { error: string } {
  const layChuoi = (key: string) => String(formData.get(key) ?? "").trim() || null;

  const tinhTrang = formData.getAll("tinh_trang").map((v) => String(v));
  for (const t of tinhTrang) {
    if (!TINH_TRANG_HOP_LE.includes(t)) return { error: "Tình trạng lớp không hợp lệ." };
  }

  return {
    ngay_khai_giang: layChuoi("ngay_khai_giang"),
    ngay_ket_thuc: layChuoi("ngay_ket_thuc"),
    tinh_trang: tinhTrang.length > 0 ? tinhTrang : null,
  };
}

export async function taoLop(formData: FormData): Promise<TaoLopResult> {
  const supabase = await createClient();

  const capHoc = Number(formData.get("cap_hoc"));
  const chuongTrinh = String(formData.get("chuong_trinh") ?? "").trim();
  const namHoc = Number(formData.get("nam_hoc"));
  const tenLop = String(formData.get("ten_lop") ?? "").trim() || null;

  if (!Number.isInteger(capHoc) || capHoc < 1 || capHoc > 9) {
    return { error: "Cấp học phải là số từ 1-9." };
  }
  if (!/^[0-9]{3}$/.test(chuongTrinh)) {
    return { error: "Chương trình phải là chuỗi 3 chữ số (vd 012)." };
  }
  if (!Number.isInteger(namHoc) || namHoc < 0 || namHoc > 99) {
    return { error: "Niên khoá không hợp lệ." };
  }

  const boSung = docThongTinBoSungLop(formData);
  if ("error" in boSung) return boSung;

  const { data, error } = await supabase.rpc("tao_lop", {
    p_cap_hoc: capHoc,
    p_chuong_trinh: chuongTrinh,
    p_nam_hoc: namHoc,
    p_ten_lop: tenLop,
  });

  if (error) return { error: mapDbError(error.message) };

  const lop = data as Lop;

  const coThongTinBoSung = boSung.ngay_khai_giang || boSung.ngay_ket_thuc || boSung.tinh_trang;
  if (coThongTinBoSung) {
    const { error: updateError } = await supabase.from("lop").update(boSung).eq("id", lop.id);
    if (updateError) return { error: mapDbError(updateError.message) };
  }

  revalidatePath("/dashboard/lop");
  return { data: lop };
}

export async function suaLop(formData: FormData): Promise<SuaLopResult> {
  const supabase = await createClient();

  const id = Number(formData.get("id"));
  const tenLop = String(formData.get("ten_lop") ?? "").trim() || null;

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID lớp." };

  const boSung = docThongTinBoSungLop(formData);
  if ("error" in boSung) return boSung;

  const { error } = await supabase
    .from("lop")
    .update({ ten_lop: tenLop, ...boSung })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/lop");
  return { ok: true };
}

export async function xoaLop(id: number): Promise<XoaLopResult> {
  const supabase = await createClient();

  if (!Number.isInteger(id) || id <= 0) return { error: "Thiếu ID lớp." };

  const { error } = await supabase
    .from("lop")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/lop");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền thực hiện thao tác này (chỉ Master Admin / admin_ts).";
  if (msg.includes("Chỉ Master Admin được xoá"))
    return "Chỉ Master Admin được xoá lớp học.";
  return msg;
}
