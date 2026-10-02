import { redirect } from "next/navigation";

// Đã chuyển sang module Học liệu — giữ lại để link/bookmark cũ không bị 404.
export default function ChuongTrinhMonHocMoved() {
  redirect("/dashboard/hoc-lieu/chuong-trinh");
}
