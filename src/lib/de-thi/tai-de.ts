// Tải dữ liệu đề thi cho trang làm việc (phía server). Nội dung đã làm sạch + render công thức sẵn
// (HTML có MathML) để component client chỉ việc chèn vào.
import type { SupabaseClient } from "@supabase/supabase-js";
import { lamSachHtml } from "@/lib/van-ban-dinh-dang";
import { htmlCoToan } from "@/lib/toan";

export type DongMaTran = {
  id: string;
  thu_tu: number;
  nhan: string | null;
  loai_ngu_lieu: string | null;
  so_luong: number;
  cau_moi_cum: number | null;
  dang_cau_ma: number | null;
  hoc_phan_ma: number | null;
  bai_hoc_ma: number | null;
  chu_de_ma: number | null;
  tien_trinh: string | null;
  do_kho_tu: number;
  do_kho_den: number;
  cho_phep_noi_do_kho: boolean;
  diem_moi_cau: number | null;
};

export type CauXemTruoc = {
  deCauHoiId: string;
  cauHoiId: string;
  maCauHoi: string;
  stt: number;
  doKho: number | null;
  dangCau: number | null;
  noiDungHtml: string;
  luaChon: { id: string; noiDungHtml: string; laDapAn: boolean }[];
  dapAnText: string | null;
  loiGiaiHtml: string | null;
};

export type DonViXemTruoc = {
  id: string; // cum_id hoặc cau_hoi_id
  laCum: boolean;
  tieuDe: string | null;
  nguLieuHtml: string | null;
  khoa: boolean;
  lapGanDay: boolean;
  cau: CauXemTruoc[];
};

export type PhanXemTruoc = { dong: DongMaTran; can: number; dat: number; noiDoKho: number; donVi: DonViXemTruoc[] };

export type DeThiTai = {
  de: {
    id: string;
    ten: string;
    mo_ta: string | null;
    trang_thai: string;
    ma_de: string | null;
    seed: string | null;
    chong_lap_n: number;
    xao_cum: boolean;
    xao_dap_an: boolean;
    thoi_gian_phut: number | null;
    cap_hoc_ma: number | null;
    mon_hoc_ma: number | null;
    ma_tran_id: string | null;
    nguoi_tao: string | null;
    ngay_chot: string | null;
  };
  maTran: { id: string; ten: string } | null;
  phan: PhanXemTruoc[];
  maDe: { ma: string; thu_tu: number }[];
  tongCau: number;
  tongThieu: number;
  daChot: boolean;
};

const h = (s: string | null | undefined) => htmlCoToan(lamSachHtml(s));

type Row = Record<string, unknown>;

export async function taiDeThi(supabase: SupabaseClient, id: string): Promise<DeThiTai | null> {
  const { data: de } = await supabase
    .from("de")
    .select(
      "id, ten, mo_ta, trang_thai, ma_de, seed, chong_lap_n, xao_cum, xao_dap_an, thoi_gian_phut, cap_hoc_ma, mon_hoc_ma, ma_tran_id, nguoi_tao, ngay_chot"
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!de) return null;

  const daChot = de.trang_thai === "da_phat_hanh";

  const [{ data: mt }, { data: dongList }, { data: dch }, { data: maDe }] = await Promise.all([
    de.ma_tran_id ? supabase.from("ma_tran_de").select("id, ten").eq("id", de.ma_tran_id).maybeSingle() : Promise.resolve({ data: null }),
    de.ma_tran_id
      ? supabase.from("ma_tran_dong").select("*").eq("ma_tran_id", de.ma_tran_id).order("thu_tu")
      : Promise.resolve({ data: [] as Row[] }),
    supabase
      .from("de_cau_hoi")
      .select("id, cau_hoi_id, thu_tu, dong_id, cum_id, khoa, stt_don_vi")
      .eq("de_id", id)
      .order("thu_tu"),
    supabase.from("de_ma_de").select("ma, thu_tu").eq("de_id", id).order("thu_tu"),
  ]);

  const dch2 = (dch ?? []) as { id: string; cau_hoi_id: string; thu_tu: number; dong_id: string | null; cum_id: string | null; khoa: boolean }[];
  const cauIds = dch2.map((r) => r.cau_hoi_id);

  // Nội dung: đề đã chốt đọc từ ảnh chụp, đề nháp đọc trực tiếp từ ngân hàng.
  const cauMap = new Map<string, { ma: string; noiDung: string; doKho: number | null; dang: number | null; dapAn: string | null; loiGiai: string | null; lc: { id: string; noiDung: string; laDapAn: boolean; thuTu: number }[]; nl: { id: string; tieu_de: string | null; noi_dung: string } | null }>();

  if (daChot) {
    const { data: bc } = await supabase
      .from("de_cau_hoi_ban_chup")
      .select("de_cau_hoi_id, ma_cau_hoi, dang_cau, noi_dung, dap_an_text, loi_giai, lua_chon, ngu_lieu, cau_hoi_id")
      .eq("de_id", id);
    for (const b of (bc ?? []) as Row[]) {
      const lc = ((b.lua_chon as { id: string; thu_tu: number; noi_dung: string; la_dap_an: boolean }[]) ?? []).map((l) => ({
        id: l.id, noiDung: l.noi_dung, laDapAn: l.la_dap_an, thuTu: l.thu_tu,
      }));
      const nl = b.ngu_lieu as { id: string; tieu_de: string | null; noi_dung: string } | null;
      cauMap.set(String(b.cau_hoi_id), {
        ma: String(b.ma_cau_hoi), noiDung: String(b.noi_dung), doKho: null, dang: (b.dang_cau as number) ?? null,
        dapAn: (b.dap_an_text as string) ?? null, loiGiai: (b.loi_giai as string) ?? null, lc, nl,
      });
    }
  } else if (cauIds.length) {
    const [{ data: chs }, { data: lcs }] = await Promise.all([
      supabase.from("cau_hoi").select("id, ma_cau_hoi, noi_dung, do_kho, dang_cau, dap_an_text, loi_giai, ngu_lieu_id").in("id", cauIds),
      supabase.from("lua_chon").select("id, cau_hoi_id, thu_tu, noi_dung, la_dap_an").in("cau_hoi_id", cauIds).order("thu_tu"),
    ]);
    const nlIds = [...new Set(((chs ?? []) as Row[]).map((c) => c.ngu_lieu_id as string | null).filter(Boolean))] as string[];
    const { data: nls } = nlIds.length
      ? await supabase.from("ngu_lieu").select("id, tieu_de, noi_dung").in("id", nlIds)
      : { data: [] as Row[] };
    const nlMap = new Map(((nls ?? []) as { id: string; tieu_de: string | null; noi_dung: string }[]).map((n) => [n.id, n]));
    for (const c of (chs ?? []) as Row[]) {
      cauMap.set(String(c.id), {
        ma: String(c.ma_cau_hoi), noiDung: String(c.noi_dung), doKho: (c.do_kho as number) ?? null, dang: (c.dang_cau as number) ?? null,
        dapAn: (c.dap_an_text as string) ?? null, loiGiai: (c.loi_giai as string) ?? null,
        lc: ((lcs ?? []) as { id: string; cau_hoi_id: string; thu_tu: number; noi_dung: string; la_dap_an: boolean }[])
          .filter((l) => l.cau_hoi_id === c.id)
          .map((l) => ({ id: l.id, noiDung: l.noi_dung, laDapAn: l.la_dap_an, thuTu: l.thu_tu })),
        nl: c.ngu_lieu_id ? nlMap.get(String(c.ngu_lieu_id)) ?? null : null,
      });
    }
  }

  // Câu đã dùng trong N đề đã chốt gần nhất (để đánh dấu "lặp gần đây").
  let lapSet = new Set<string>();
  if (!daChot && de.cap_hoc_ma != null && de.mon_hoc_ma != null && de.chong_lap_n > 0 && cauIds.length) {
    const { data: gan } = await supabase
      .from("de")
      .select("id")
      .eq("trang_thai", "da_phat_hanh")
      .is("deleted_at", null)
      .eq("cap_hoc_ma", de.cap_hoc_ma)
      .eq("mon_hoc_ma", de.mon_hoc_ma)
      .neq("id", id)
      .order("ngay_chot", { ascending: false })
      .limit(de.chong_lap_n);
    const ganIds = (gan ?? []).map((g) => g.id as string);
    if (ganIds.length) {
      const { data: used } = await supabase.from("de_cau_hoi").select("cau_hoi_id").in("de_id", ganIds).in("cau_hoi_id", cauIds);
      lapSet = new Set((used ?? []).map((u) => u.cau_hoi_id as string));
    }
  }

  const dongs = (dongList ?? []) as unknown as DongMaTran[];
  const baoCao = new Map<string, number>();
  const bc = (await supabase.from("de").select("bao_cao_sinh").eq("id", id).maybeSingle()).data?.bao_cao_sinh as
    | { dong_id: string; noi_do_kho: number }[]
    | null;
  for (const b of bc ?? []) baoCao.set(b.dong_id, b.noi_do_kho);

  let tongCau = 0;
  let tongThieu = 0;
  const phan: PhanXemTruoc[] = dongs.map((dong) => {
    const rows = dch2.filter((r) => r.dong_id === dong.id);
    const don = new Map<string, DonViXemTruoc>();
    for (const r of rows) {
      const c = cauMap.get(r.cau_hoi_id);
      if (!c) continue;
      const key = r.cum_id ?? r.cau_hoi_id;
      let u = don.get(key);
      if (!u) {
        u = {
          id: key, laCum: !!r.cum_id, tieuDe: c.nl?.tieu_de ?? null, nguLieuHtml: c.nl ? h(c.nl.noi_dung) : null,
          khoa: r.khoa, lapGanDay: false, cau: [],
        };
        don.set(key, u);
      }
      if (lapSet.has(r.cau_hoi_id)) u.lapGanDay = true;
      if (r.khoa) u.khoa = true;
      u.cau.push({
        deCauHoiId: r.id, cauHoiId: r.cau_hoi_id, maCauHoi: c.ma, stt: r.thu_tu, doKho: c.doKho, dangCau: c.dang,
        noiDungHtml: h(c.noiDung),
        luaChon: c.lc.map((l) => ({ id: l.id, noiDungHtml: h(l.noiDung), laDapAn: l.laDapAn })),
        dapAnText: c.dapAn, loiGiaiHtml: c.loiGiai ? h(c.loiGiai) : null,
      });
    }
    const donVi = [...don.values()];
    const dat = donVi.length;
    tongCau += donVi.reduce((s, u) => s + u.cau.length, 0);
    tongThieu += Math.max(dong.so_luong - dat, 0);
    return { dong, can: dong.so_luong, dat, noiDoKho: baoCao.get(dong.id) ?? 0, donVi };
  });

  return {
    de: de as DeThiTai["de"],
    maTran: (mt as { id: string; ten: string } | null) ?? null,
    phan,
    maDe: (maDe ?? []) as { ma: string; thu_tu: number }[],
    tongCau,
    tongThieu,
    daChot,
  };
}
