import { createClient } from "@/lib/supabase/server";
import { taoTemplateNguLieuXlsx } from "@/lib/ngu-lieu-template";
import { kiemTraQuyenNhap, layDanhMucNhap } from "../../nhap-ho-tro";

// Tải file mẫu nhập ngữ liệu + câu hỏi con (.xlsx, 2 sheet + danh mục mã).
export async function GET() {
  const supabase = await createClient();
  const quyen = await kiemTraQuyenNhap(supabase);
  if ("error" in quyen) {
    return new Response(quyen.error, { status: quyen.error === "Chưa đăng nhập." ? 401 : 403 });
  }
  let danhMuc;
  try {
    danhMuc = await layDanhMucNhap(supabase);
  } catch (e) {
    return new Response(`Không tải được danh mục: ${e instanceof Error ? e.message : "lỗi không rõ"}`, { status: 500 });
  }
  const buf = await taoTemplateNguLieuXlsx(danhMuc);
  const ngay = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template-nhap-ngu-lieu-${ngay}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
