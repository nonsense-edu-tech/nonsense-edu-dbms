import JSZip from "jszip";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VAI_TRO_DE_THI } from "@/lib/de-thi/danh-muc";
import { taoDocx, type LoaiTep } from "@/lib/docx/de-docx";
import { taiDeDocx } from "@/lib/de-thi/xuat-docx";

const TEN_LOAI: Record<LoaiTep, string> = { de: "De", "dap-an": "Dap-an", "loi-giai": "Loi-giai" };
const TAT_CA: LoaiTep[] = ["de", "dap-an", "loi-giai"];
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  const { data: profile } = await supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single();
  if (profile?.trang_thai !== "active" || !VAI_TRO_DE_THI.includes(profile?.vai_tro ?? "")) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const ma = sp.get("ma") ?? "";
  const loai = sp.get("loai") ?? "de";
  if (loai !== "tat-ca" && !TAT_CA.includes(loai as LoaiTep)) return NextResponse.json({ error: "Loại tệp không hợp lệ" }, { status: 400 });

  const dau = await taiDeDocx(supabase, id, ma === "tat-ca" ? null : ma || null);
  if ("error" in dau) return NextResponse.json({ error: dau.error }, { status: dau.error.includes("Không tìm thấy") ? 404 : 409 });

  const slug = dau.tenDe.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "de-thi";

  // Một tệp duy nhất
  if (ma !== "tat-ca" && loai !== "tat-ca") {
    const buf = await taoDocx(dau.deThi, loai as LoaiTep);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": DOCX,
        "Content-Disposition": `attachment; filename="${slug}-${dau.maDe}-${TEN_LOAI[loai as LoaiTep]}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  // Nhiều tệp → zip
  const maCan = ma === "tat-ca" ? dau.maList : [dau.maDe];
  const loaiCan = loai === "tat-ca" ? TAT_CA : [loai as LoaiTep];
  const zip = new JSZip();
  for (const m of maCan) {
    const d = m === dau.maDe ? dau : await taiDeDocx(supabase, id, m);
    if ("error" in d) return NextResponse.json({ error: d.error }, { status: 409 });
    for (const l of loaiCan) zip.file(`${slug}-${m}-${TEN_LOAI[l]}.docx`, await taoDocx(d.deThi, l));
  }
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}${ma === "tat-ca" ? "" : `-${dau.maDe}`}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
