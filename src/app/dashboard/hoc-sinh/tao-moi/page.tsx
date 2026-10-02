import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import HocSinhForm from "@/components/HocSinhForm";
import HocSinhSubNav from "@/components/HocSinhSubNav";
import styles from "../hoc-sinh.module.css";

export default async function TaoHocSinhPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: lopList }, { data: userChiNhanhList }] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase
      .from("lop")
      .select("id, ma_lop, ten_lop, chi_nhanh_id")
      .is("deleted_at", null)
      .order("ma_lop", { ascending: false }),
    supabase.from("user_chi_nhanh").select("chi_nhanh_id").eq("user_id", user.id),
  ]);

  const isActive = profile?.trang_thai === "active";
  const isMasterAdmin = isActive && profile?.vai_tro === "master_admin";
  const isAdminTs = isActive && profile?.vai_tro === "admin_ts";
  const isQuanLyChiNhanh = isActive && profile?.vai_tro === "quan_ly_chi_nhanh";

  // Vai trò không được tạo học sinh thì không có tab này — đưa về danh sách,
  // không hiện thông báo "không có quyền" (quy tắc ẩn hẳn).
  if (!(isMasterAdmin || isAdminTs || isQuanLyChiNhanh)) redirect("/dashboard/hoc-sinh");

  // quan_ly_chi_nhanh chỉ thấy lớp trong phạm vi chi nhánh mình — RLS chỉ chặn
  // ghi, không chặn đọc (lop.p_read cho phép đọc mọi lớp), nên lọc ở tầng ứng dụng.
  const myChiNhanhIds = new Set((userChiNhanhList ?? []).map((uc) => uc.chi_nhanh_id));
  const lopListChoForm = isQuanLyChiNhanh
    ? (lopList ?? []).filter((l) => l.chi_nhanh_id != null && myChiNhanhIds.has(l.chi_nhanh_id))
    : (lopList ?? []);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Học sinh</h1>
      </div>

      <HocSinhSubNav active="tao" canCreate />

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo ID học sinh</h2>
        <HocSinhForm lopList={lopListChoForm} />
      </section>
    </main>
  );
}
