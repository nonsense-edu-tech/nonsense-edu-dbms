import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { taoTemplateCsv, taoTemplateXlsx } from "@/lib/cau-hoi-template";
import { kiemTraQuyenNhap, layDanhMucNhap } from "../nhap-ho-tro";

// Tải file mẫu nhập câu hỏi: ?dinh_dang=xlsx (mặc định, có danh mục mã) | csv.
// Danh mục lấy theo quyền đọc của người tải nên luôn khớp dữ liệu hiện có.
export async function GET(request: NextRequest) {
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

  const ngay = new Date().toISOString().slice(0, 10);
  const dinhDang = request.nextUrl.searchParams.get("dinh_dang") === "csv" ? "csv" : "xlsx";

  if (dinhDang === "csv") {
    return new Response(taoTemplateCsv(danhMuc), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="template-nhap-cau-hoi-${ngay}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const buf = await taoTemplateXlsx(danhMuc);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="template-nhap-cau-hoi-${ngay}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
