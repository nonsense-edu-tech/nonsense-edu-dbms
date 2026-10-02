// Gom dữ liệu đề đã chốt (từ ảnh chụp + bố cục mã đề) thành cấu trúc DeDocx để dựng file.
import type { SupabaseClient } from "@supabase/supabase-js";
import { chuanBiAnh, type AnhDocx } from "@/lib/docx/anh";
import type { CauDocx, DeDocx } from "@/lib/docx/de-docx";

const BUCKET = "hinh-cau-hoi";
const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

type BanChup = {
  de_cau_hoi_id: string;
  cau_hoi_id: string;
  dang_cau: number | null;
  noi_dung: string;
  dap_an_text: string | null;
  loi_giai: string | null;
  lua_chon: { id: string; thu_tu: number; noi_dung: string; la_dap_an: boolean }[];
  hinh_anh: { vi_tri: string; thu_tu_lua_chon: number | null; thu_tu: number; duong_dan: string }[];
  ngu_lieu: { id: string; tieu_de: string | null; noi_dung: string } | null;
};

export type KetQuaXuat = { error: string } | { deThi: DeDocx; maDe: string; tenDe: string; maList: string[] };

async function taiAnh(supabase: SupabaseClient, duongDan: string, cache: Map<string, AnhDocx | null>): Promise<AnhDocx | null> {
  if (cache.has(duongDan)) return cache.get(duongDan) ?? null;
  let kq: AnhDocx | null = null;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(duongDan);
    if (!error && data) {
      const ext = duongDan.split(".").pop()?.toLowerCase() ?? "";
      kq = await chuanBiAnh(Buffer.from(await data.arrayBuffer()), MIME[ext] ?? data.type);
    }
  } catch {
    kq = null;
  }
  cache.set(duongDan, kq);
  return kq;
}

export async function taiDeDocx(supabase: SupabaseClient, deId: string, ma: string | null): Promise<KetQuaXuat> {
  const { data: de } = await supabase
    .from("de")
    .select("id, ten, ma_de, trang_thai, thoi_gian_phut, cap_hoc_ma, mon_hoc_ma")
    .eq("id", deId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!de) return { error: "Không tìm thấy đề." };
  if (de.trang_thai !== "da_phat_hanh") return { error: "Đề chưa chốt — chốt đề trước khi xuất." };

  const { data: maDeList } = await supabase.from("de_ma_de").select("ma, thu_tu, bo_cuc").eq("de_id", deId).order("thu_tu");
  const maList = (maDeList ?? []).map((m) => m.ma as string);
  const chon = (maDeList ?? []).find((m) => m.ma === (ma ?? maList[0]));
  if (!chon) return { error: "Không tìm thấy mã đề." };

  const [{ data: bc }, { data: dch }, { data: mon }] = await Promise.all([
    supabase
      .from("de_cau_hoi_ban_chup")
      .select("de_cau_hoi_id, cau_hoi_id, dang_cau, noi_dung, dap_an_text, loi_giai, lua_chon, hinh_anh, ngu_lieu")
      .eq("de_id", deId),
    supabase.from("de_cau_hoi").select("id, diem, dong_id").eq("de_id", deId),
    supabase.from("mon_hoc").select("ten").eq("ma", de.mon_hoc_ma).eq("cap_hoc_ma", de.cap_hoc_ma).maybeSingle(),
  ]);
  const dongIds = [...new Set((dch ?? []).map((d) => d.dong_id as string).filter(Boolean))];
  const { data: dongs } = dongIds.length ? await supabase.from("ma_tran_dong").select("id, nhan, thu_tu").in("id", dongIds) : { data: [] };

  const bcMap = new Map(((bc ?? []) as unknown as BanChup[]).map((b) => [b.de_cau_hoi_id, b]));
  const dchMap = new Map((dch ?? []).map((d) => [d.id as string, d]));
  const dongMap = new Map((dongs ?? []).map((d) => [d.id as string, d]));
  const cache = new Map<string, AnhDocx | null>();

  const layout = chon.bo_cuc as { de_cau_hoi_id: string; thu_tu: number; lua_chon: string[] }[];
  const cau: CauDocx[] = [];
  for (const item of layout) {
    const b = bcMap.get(item.de_cau_hoi_id);
    const meta = dchMap.get(item.de_cau_hoi_id);
    if (!b || !meta) continue;
    const dong = meta.dong_id ? dongMap.get(meta.dong_id as string) : undefined;

    const theoId = new Map(b.lua_chon.map((l) => [l.id, l]));
    const lcThuTu = item.lua_chon.map((id) => theoId.get(id)).filter((x): x is NonNullable<typeof x> => !!x);

    const anhDe: AnhDocx[] = [];
    const anhLoiGiai: AnhDocx[] = [];
    const anhLc = new Map<number, AnhDocx[]>();
    for (const h of [...b.hinh_anh].sort((x, y) => x.thu_tu - y.thu_tu)) {
      const a = await taiAnh(supabase, h.duong_dan, cache);
      if (!a) continue;
      if (h.vi_tri === "de") anhDe.push(a);
      else if (h.vi_tri === "loi_giai") anhLoiGiai.push(a);
      else if (h.thu_tu_lua_chon != null) anhLc.set(h.thu_tu_lua_chon, [...(anhLc.get(h.thu_tu_lua_chon) ?? []), a]);
    }

    cau.push({
      stt: item.thu_tu,
      dangCau: b.dang_cau,
      noiDung: b.noi_dung,
      dapAnText: b.dap_an_text,
      loiGiai: b.loi_giai,
      luaChon: lcThuTu.map((l) => ({ id: l.id, noiDung: l.noi_dung, laDapAn: l.la_dap_an, anh: anhLc.get(l.thu_tu) })),
      anhDe,
      anhLoiGiai,
      diem: meta.diem != null ? Number(meta.diem) : null,
      phan: { id: String(meta.dong_id ?? "0"), nhan: (dong?.nhan as string | null) ?? null },
      nguLieu: b.ngu_lieu ? { id: b.ngu_lieu.id, tieuDe: b.ngu_lieu.tieu_de, noiDung: b.ngu_lieu.noi_dung } : null,
    });
  }

  return {
    deThi: {
      tenDe: de.ten,
      tenMon: (mon?.ten as string) ?? "",
      maDe: chon.ma as string,
      thoiGianPhut: de.thoi_gian_phut,
      tenTrungTam: "Nonsense Edu",
      cau,
    },
    maDe: chon.ma as string,
    tenDe: de.ten,
    maList,
  };
}
