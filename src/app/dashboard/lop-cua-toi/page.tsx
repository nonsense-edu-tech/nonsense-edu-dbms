import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import styles from "../lop/lop.module.css";

// GV/TBM/trợ giảng chỉ thấy lớp mình được phân công (RLS lop dùng lop_trong_pham_vi()).
export default async function LopCuaToiPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: lopList, count }, { data: phanCong }, { data: monList }] = await Promise.all([
    supabase
      .from("lop")
      .select("id, ma_lop, ten_lop, cap_hoc_ma, nam_hoc, tinh_trang, ngay_khai_giang, ngay_ket_thuc", { count: "exact" })
      .is("deleted_at", null)
      .order("ma_lop", { ascending: false })
      .order("id")
      .range(pp.from, pp.to),
    supabase.from("phan_cong_giang_day").select("lop_id, mon_hoc_ma").eq("user_id", user.id),
    supabase.from("mon_hoc").select("cap_hoc_ma, ma, ten").is("deleted_at", null),
  ]);

  const total = count ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/lop-cua-toi", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  const tenMon = new Map((monList ?? []).map((m) => [`${m.cap_hoc_ma}-${m.ma}`, m.ten]));
  const capCuaLop = new Map((lopList ?? []).map((l) => [l.id, l.cap_hoc_ma]));
  const monTheoLop = new Map<string, string[]>();
  for (const pc of phanCong ?? []) {
    const ten = tenMon.get(`${capCuaLop.get(pc.lop_id)}-${pc.mon_hoc_ma}`) ?? `Môn ${pc.mon_hoc_ma}`;
    monTheoLop.set(pc.lop_id, [...(monTheoLop.get(pc.lop_id) ?? []), ten]);
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Lớp của tôi</h1>
      </div>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Lớp đang phụ trách ({total})</h2>
        {total > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã lớp</th>
                    <th>Tên lớp</th>
                    <th>Môn phụ trách</th>
                    <th>Năm học</th>
                    <th>Tình trạng</th>
                  </tr>
                </thead>
                <tbody>
                  {(lopList ?? []).map((l) => (
                    <tr key={l.id}>
                      <td className={styles.mono}>{l.ma_lop}</td>
                      <td>{l.ten_lop}</td>
                      <td>{(monTheoLop.get(l.id) ?? ["—"]).join(", ")}</td>
                      <td>{l.nam_hoc}</td>
                      <td>{l.tinh_trang}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PhanTrang total={total} page={pp.page} size={pp.size} />
          </>
        ) : (
          <p className={styles.empty}>Bạn chưa được phân công lớp nào. Liên hệ Admin để được phân công.</p>
        )}
      </section>
    </main>
  );
}
