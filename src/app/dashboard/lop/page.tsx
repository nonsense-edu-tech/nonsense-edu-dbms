import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LopForm from "@/components/LopForm";
import styles from "./lop.module.css";

export default async function LopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: lopList }, { data: capHocList }, { data: chuongTrinhList }] =
    await Promise.all([
      supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
      supabase
        .from("lop")
        .select("id, ma_lop, ten_lop, cap_hoc_ma, chuong_trinh_ma, nam_hoc, so_lop, created_at")
        .order("ma_lop", { ascending: false })
        .limit(100),
      supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
      supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null).order("ma"),
    ]);

  const isActive = profile?.trang_thai === "active";
  const isAllowed = isActive && (profile?.vai_tro === "master_admin" || profile?.vai_tro === "admin_ts");

  const capHocMap = new Map((capHocList ?? []).map((c) => [c.ma, c.ten]));
  const chuongTrinhMap = new Map((chuongTrinhList ?? []).map((c) => [c.ma, c.ten]));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Lớp học</h1>
        <Link href="/dashboard" className={styles.backLink}>← Về dashboard</Link>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo lớp mới</h2>
        {isAllowed ? (
          <LopForm capHocList={capHocList ?? []} chuongTrinhList={chuongTrinhList ?? []} />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin hoặc Tuyển sinh (admin_ts) được tạo lớp học. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${profile?.vai_tro ?? "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách lớp ({lopList?.length ?? 0})</h2>
        {lopList && lopList.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID lớp học</th>
                  <th>Tên lớp</th>
                  <th>Cấp học</th>
                  <th>Chương trình</th>
                  <th>Năm học</th>
                  <th>Số lớp</th>
                </tr>
              </thead>
              <tbody>
                {lopList.map((lop) => (
                  <tr key={lop.id}>
                    <td className={styles.mono}>{lop.ma_lop}</td>
                    <td>{lop.ten_lop ?? "—"}</td>
                    <td>{capHocMap.get(lop.cap_hoc_ma) ?? lop.cap_hoc_ma}</td>
                    <td>{chuongTrinhMap.get(lop.chuong_trinh_ma) ?? lop.chuong_trinh_ma}</td>
                    <td>{lop.nam_hoc}</td>
                    <td>{lop.so_lop}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>Chưa có lớp nào.</p>
        )}
      </section>
    </main>
  );
}
