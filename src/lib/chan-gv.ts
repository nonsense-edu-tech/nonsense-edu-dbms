import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { nhomGiaoDien } from "@/lib/vai-tro";

// Chặn nhóm giáo viên/trợ giảng khỏi các khu vực "Vận hành" (lớp, học sinh,
// phòng, buổi học…). Dùng trong layout.tsx của từng khu vực — ẩn menu chưa đủ,
// phải chặn cả truy cập URL trực tiếp (RLS vẫn là lớp bảo vệ dữ liệu thật).
export async function chanNhomGiangDay(diaChiThay = "/dashboard") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("vai_tro").eq("id", user.id).single();
  if (profile && nhomGiaoDien(profile.vai_tro) !== "admin") redirect(diaChiThay);
}
