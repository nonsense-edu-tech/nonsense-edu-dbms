import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import styles from "../lop/lop.module.css";

// Chỉ hiện họ tên + lớp (RPC hoc_sinh_cua_toi không trả SĐT/thông tin khác).
export default async function HocSinhCuaToiPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.rpc("hoc_sinh_cua_toi");
  const tatCa = [...(data ?? [])].sort(
    (a, b) => a.ma_lop.localeCompare(b.ma_lop) || a.ho_ten.localeCompare(b.ho_ten, "vi") || a.hoc_sinh_id.localeCompare(b.hoc_sinh_id)
  );
  const total = tatCa.length;
  const trangCuoi = duongDanTrangCuoi("/dashboard/hoc-sinh-cua-toi", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);
  const rows = tatCa.slice(pp.from, pp.to + 1);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Học sinh của tôi</h1>
      </div>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Học sinh trong lớp đang phụ trách ({total})</h2>
        {total > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã học sinh</th>
                    <th>Họ tên</th>
                    <th>Lớp</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={`${r.hoc_sinh_id}-${r.lop_id}`}>
                      <td className={styles.mono}>{r.ma_hoc_sinh}</td>
                      <td>{r.ho_ten}</td>
                      <td>
                        {r.ma_lop} — {r.ten_lop}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PhanTrang total={total} page={pp.page} size={pp.size} />
          </>
        ) : (
          <p className={styles.empty}>Chưa có học sinh nào trong các lớp bạn phụ trách.</p>
        )}
      </section>
    </main>
  );
}
