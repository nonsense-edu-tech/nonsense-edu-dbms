import { redirect } from "next/navigation";

// Việc tạo ngữ liệu nay nằm trong tab "Tạo câu hỏi" — giữ đường dẫn cũ để link/bookmark không gãy.
export default function TaoNguLieuCu() {
  redirect("/dashboard/ngan-hang-cau-hoi/tao-moi?tab=ngu-lieu");
}
