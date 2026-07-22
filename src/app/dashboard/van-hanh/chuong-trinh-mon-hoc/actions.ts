"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TaoChuongTrinhMonHocResult = { error: string } | { ok: true };
export type XoaChuongTrinhMonHocResult = { error: string } | { ok: true };

export async function taoChuongTrinhMonHoc(formData: FormData): Promise<TaoChuongTrinhMonHocResult> {
  const supabase = await createClient();

  const chuongTrinhMa = String(formData.get("chuong_trinh_ma") ?? "").trim();
  const capHocMa = Number(formData.get("cap_hoc_ma"));
  const monHocMa = Number(formData.get("mon_hoc_ma"));

  if (!chuongTrinhMa) return { error: "Vui lòng chọn chương trình." };
  if (!Number.isInteger(capHocMa) || capHocMa < 1 || capHocMa > 9) return { error: "Vui lòng chọn cấp học." };
  if (!Number.isInteger(monHocMa) || monHocMa < 1 || monHocMa > 99) return { error: "Vui lòng chọn môn học." };

  const { error } = await supabase.from("chuong_trinh_mon_hoc").insert({
    chuong_trinh_ma: chuongTrinhMa,
    cap_hoc_ma: capHocMa,
    mon_hoc_ma: monHocMa,
  });

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/van-hanh/chuong-trinh-mon-hoc");
  return { ok: true };
}

export async function xoaChuongTrinhMonHoc(
  chuongTrinhMa: string,
  capHocMa: number,
  monHocMa: number
): Promise<XoaChuongTrinhMonHocResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("chuong_trinh_mon_hoc")
    .delete()
    .eq("chuong_trinh_ma", chuongTrinhMa)
    .eq("cap_hoc_ma", capHocMa)
    .eq("mon_hoc_ma", monHocMa);

  if (error) return { error: mapDbError(error.message) };

  revalidatePath("/dashboard/van-hanh/chuong-trinh-mon-hoc");
  return { ok: true };
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền thực hiện thao tác này (chỉ Master Admin).";
  if (msg.includes("duplicate key"))
    return "Môn học này đã được gán vào chương trình này rồi.";
  return msg;
}
