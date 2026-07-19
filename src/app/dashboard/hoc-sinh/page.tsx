import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HocSinhForm from "@/components/HocSinhForm";
import styles from "./hoc-sinh.module.css";

export default async function HocSinhPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: lopList }, { data: hocSinhList }] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("lop").select("id, ma_lop, ten_lop").order("ma_lop", { ascending: false }),
    supabase
      .from("hoc_sinh")
      .select("id, ma_hoc_sinh, ho_ten, sdt_phu_huynh, created_at")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const isActive = profile?.trang_thai === "active";
  const isAllowed = isActive && (profile?.vai_tro === "master_admin" || profile?.vai_tro === "admin_ts");

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Học sinh</h1>
        <Link href="/dashboard" className={styles.backLink}>← Về dashboard</Link>
      </div>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo ID học sinh</h2>
        {isAllowed ? (
          <HocSinhForm lopList={lopList ?? []} />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin hoặc Tuyển sinh (admin_ts) được tạo ID học sinh. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${profile?.vai_tro ?? "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách học sinh ({hocSinhList?.length ?? 0})</h2>
        {hocSinhList && hocSinhList.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID học sinh</th>
                  <th>Họ tên</th>
                  <th>SĐT phụ huynh</th>
                </tr>
              </thead>
              <tbody>
                {hocSinhList.map((hs) => (
                  <tr key={hs.id}>
                    <td className={styles.mono}>{hs.ma_hoc_sinh}</td>
                    <td>{hs.ho_ten}</td>
                    <td>{hs.sdt_phu_huynh ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>Chưa có học sinh nào.</p>
        )}
      </section>
    </main>
  );
}
