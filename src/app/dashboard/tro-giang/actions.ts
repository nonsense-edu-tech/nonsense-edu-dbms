"use server";

import { createClient } from "@/lib/supabase/server";

// Trang trợ giảng (Bước 5.6) — CHỈ đọc qua 2 RPC SECURITY DEFINER có sẵn
// (danh_muc_cau_hoi_tro_giang/xem_mot_cau_hoi) — KHÔNG đọc trực tiếp bảng
// cau_hoi/lua_chon qua PostgREST .from(), vì RLS p_read trên 2 bảng này
// KHÔNG cấp quyền cho vai trò tro_giang (cố ý — trợ giảng chỉ được nhìn qua
// "cửa sổ" do RPC kiểm soát, ẩn dap_an_text/loi_giai đúng khi vai trò là
// tro_giang ngay trong hàm — xem định nghĩa 2 hàm trên CSDL, không phải
// migration của repo này). Không cần migration mới cho bước này — cả 2 RPC
// đã tồn tại sẵn trên production (xác nhận qua SQL trực tiếp 28/09/2026).

export type CauHoiDanhMucRow = {
  id: string;
  ma_cau_hoi: string;
  trang_thai: string;
  hoc_phan_ten: string;
  bai_hoc_ten: string;
  chu_de_ten: string;
  dang_cau_ten: string;
};

export type LayDanhMucResult = { error: string } | { data: CauHoiDanhMucRow[] };

export type ChiTietCauHoi = {
  id: string;
  ma_cau_hoi: string;
  noi_dung: string;
  lua_chon_noi_dung: string[];
  dap_an_text: string | null;
  loi_giai: string | null;
};
export type LayChiTietResult = { error: string } | { data: ChiTietCauHoi };

// Lấy danh mục câu hỏi (chỉ mã + phân loại, KHÔNG có nội dung/đáp án) của 1
// môn học qua RPC danh_muc_cau_hoi_tro_giang — RPC tự kiểm tra vai trò +
// co_quyen_mon nên không cần kiểm tra thêm ở đây. Tên học phần/bài học/chủ
// đề/dạng câu không có sẵn trong kết quả RPC (chỉ có mã số) — nối tên thủ
// công ở tầng này (cùng cách cau-hoi/page.tsx làm), tách hoc_phan từ chính
// ma_cau_hoi (17 số: cấp(1)+chương_trình(3)+môn(2)+học_phần(2)+bài(2)+
// chủ_đề(2)+dạng(1)+stt(4)) vì RPC không trả cột hoc_phan.
export async function layDanhMucCauHoi(monHocId: string, monHocMa: number): Promise<LayDanhMucResult> {
  const supabase = await createClient();
  if (!monHocId) return { error: "Vui lòng chọn môn học." };

  const { data: rpcRows, error: rpcError } = await supabase.rpc("danh_muc_cau_hoi_tro_giang", {
    p_mon_hoc: monHocMa,
  });
  if (rpcError) return { error: mapRpcError(rpcError.message) };

  const rows: { id: string; ma_cau_hoi: string; bai_hoc: number | null; chu_de: number | null; dang_cau: number | null; trang_thai: string }[] =
    rpcRows ?? [];
  if (rows.length === 0) return { data: [] };

  const [{ data: hocPhanList }, { data: chuDeList }, { data: dangCauList }] = await Promise.all([
    supabase.from("hoc_phan").select("id, ma, ten").eq("mon_hoc_id", monHocId).is("deleted_at", null),
    supabase.from("chu_de").select("id, ma, ten").eq("mon_hoc_id", monHocId).is("deleted_at", null),
    supabase.from("dang_cau").select("ma, ten").is("deleted_at", null),
  ]);

  const hocPhanByMa = new Map((hocPhanList ?? []).map((hp) => [hp.ma, hp]));
  const chuDeByMa = new Map((chuDeList ?? []).map((cd) => [cd.ma, cd.ten]));
  const dangCauByMa = new Map((dangCauList ?? []).map((d) => [d.ma, d.ten]));

  const hocPhanIds = (hocPhanList ?? []).map((hp) => hp.id);
  let baiHocByKey = new Map<string, string>();
  if (hocPhanIds.length > 0) {
    const { data: baiHocList } = await supabase
      .from("bai_hoc")
      .select("id, hoc_phan_id, ma, ten")
      .in("hoc_phan_id", hocPhanIds)
      .is("deleted_at", null);
    baiHocByKey = new Map((baiHocList ?? []).map((bh) => [`${bh.hoc_phan_id}-${bh.ma}`, bh.ten]));
  }

  const data: CauHoiDanhMucRow[] = rows.map((r) => {
    const hocPhanMa = Number(r.ma_cau_hoi.slice(6, 8));
    const hocPhan = hocPhanByMa.get(hocPhanMa);
    const baiHocTen = hocPhan && r.bai_hoc != null ? baiHocByKey.get(`${hocPhan.id}-${r.bai_hoc}`) : undefined;

    return {
      id: r.id,
      ma_cau_hoi: r.ma_cau_hoi,
      trang_thai: r.trang_thai,
      hoc_phan_ten: hocPhan?.ten ?? "—",
      bai_hoc_ten: baiHocTen ?? "—",
      chu_de_ten: r.chu_de != null ? chuDeByMa.get(r.chu_de) ?? String(r.chu_de) : "—",
      dang_cau_ten: r.dang_cau != null ? dangCauByMa.get(r.dang_cau) ?? String(r.dang_cau) : "—",
    };
  });

  return { data };
}

// Xem chi tiết 1 câu hỏi qua RPC xem_mot_cau_hoi — với vai trò tro_giang,
// dap_an_text/loi_giai luôn về null (RPC tự ẩn), KHÔNG phải lỗi hiển thị.
export async function layChiTietCauHoi(id: string): Promise<LayChiTietResult> {
  const supabase = await createClient();
  if (!id) return { error: "Thiếu ID câu hỏi." };

  const { data, error } = await supabase.rpc("xem_mot_cau_hoi", { p_id: id }).single();
  if (error) return { error: mapRpcError(error.message) };
  if (!data) return { error: "Không tìm thấy câu hỏi." };

  const row = data as {
    id: string;
    ma_cau_hoi: string;
    noi_dung: string;
    lua_chon_noi_dung: string[] | null;
    dap_an_text: string | null;
    loi_giai: string | null;
  };

  return {
    data: {
      id: row.id,
      ma_cau_hoi: row.ma_cau_hoi,
      noi_dung: row.noi_dung,
      lua_chon_noi_dung: row.lua_chon_noi_dung ?? [],
      dap_an_text: row.dap_an_text,
      loi_giai: row.loi_giai,
    },
  };
}

function mapRpcError(msg: string): string {
  // Các exception raise trong RPC (chan_tu_duyet_cau_hoi-style) đã là tiếng
  // Việt sẵn — vd "Không có quyền xem câu hỏi này", "Không tìm thấy câu hỏi".
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền truy cập chức năng này.";
  return msg;
}
