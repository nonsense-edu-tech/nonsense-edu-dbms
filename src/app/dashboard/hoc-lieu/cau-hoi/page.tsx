import { redirect } from "next/navigation";

// Đã tách thành module Ngân hàng câu hỏi — giữ lại để link/bookmark cũ không bị 404.
export default function CauHoiMoved() {
  redirect("/dashboard/ngan-hang-cau-hoi");
}
