import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import { VAI_TRO_DE_THI } from "@/lib/de-thi/danh-muc";
import MaTranHanhDong from "./MaTranHanhDong";
import DeHanhDong from "./DeHanhDong";
import styles from "./de-thi.module.css";

const ngay = (s: string) => new Date(s).toLocaleDateString("vi-VN");

export default async function DeThiPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const tab = raw.tab === "ma-tran" ? "ma-tran" : "de";
  const pp = parsePhanTrang(raw);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single();
  if (profile?.trang_thai !== "active" || !VAI_TRO_DE_THI.includes(profile?.vai_tro ?? "")) redirect("/dashboard");
  const quanLy = ["master_admin", "admin_ht", "truong_bm"].includes(profile.vai_tro);

  const [{ data: mon }] = await Promise.all([supabase.from("mon_hoc").select("ma, cap_hoc_ma, ten").is("deleted_at", null)]);
  const tenMon = new Map((mon ?? []).map((m) => [`${m.cap_hoc_ma}-${m.ma}`, m.ten as string]));

  let tong = 0;
  let noiDung: React.ReactNode;

  if (tab === "de") {
    const { data, count } = await supabase
      .from("de")
      .select("id, ten, ma_de, trang_thai, cap_hoc_ma, mon_hoc_ma, nguoi_tao, created_at, de_cau_hoi(count)", { count: "exact" })
      .is("deleted_at", null)
      .not("ma_tran_id", "is", null)
      .order("created_at", { ascending: false })
      .order("id")
      .range(pp.from, pp.to);
    tong = count ?? 0;
    noiDung =
      tong === 0 ? (
        <p className={styles.empty}>Chưa có đề nào. Soạn ma trận rồi bấm “Tạo đề”.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Tên đề</th><th>Môn</th><th>Số câu</th><th>Trạng thái</th><th>Mã đề</th><th>Ngày tạo</th><th /></tr>
            </thead>
            <tbody>
              {(data ?? []).map((d) => {
                const nhap = d.trang_thai === "nhap";
                const soCau = (d.de_cau_hoi as unknown as { count: number }[] | null)?.[0]?.count ?? 0;
                return (
                  <tr key={d.id}>
                    <td>{d.ten}</td>
                    <td>{tenMon.get(`${d.cap_hoc_ma}-${d.mon_hoc_ma}`) ?? "—"}</td>
                    <td>{soCau}</td>
                    <td><span className={`${styles.chip} ${nhap ? styles.chipVua : styles.chipDu}`}>{nhap ? "Nháp" : "Đã chốt"}</span></td>
                    <td className={styles.mono}>{d.ma_de ?? "—"}</td>
                    <td>{ngay(d.created_at)}</td>
                    <td><DeHanhDong id={d.id} nhap={nhap} coTheXoa={quanLy || d.nguoi_tao === user.id} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
  } else {
    const { data, count } = await supabase
      .from("ma_tran_de")
      .select("id, ten, cap_hoc_ma, mon_hoc_ma, created_at, ma_tran_dong(count)", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id")
      .range(pp.from, pp.to);
    tong = count ?? 0;
    noiDung =
      tong === 0 ? (
        <p className={styles.empty}>Chưa có ma trận nào.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr><th>Tên ma trận</th><th>Môn</th><th>Số dòng</th><th>Ngày tạo</th><th /></tr>
            </thead>
            <tbody>
              {(data ?? []).map((m) => (
                <tr key={m.id}>
                  <td>{m.ten}</td>
                  <td>{tenMon.get(`${m.cap_hoc_ma}-${m.mon_hoc_ma}`) ?? "—"}</td>
                  <td>{(m.ma_tran_dong as unknown as { count: number }[] | null)?.[0]?.count ?? 0}</td>
                  <td>{ngay(m.created_at)}</td>
                  <td><MaTranHanhDong id={m.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }

  const trangCuoi = duongDanTrangCuoi("/dashboard/de-thi", raw, pp, tong);
  if (trangCuoi) redirect(trangCuoi);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Đề thi</h1>
        <Link className={styles.btnPrimary} href="/dashboard/de-thi/ma-tran/moi">+ Soạn ma trận mới</Link>
      </div>
      <nav className={styles.subNav} aria-label="Đề thi">
        <Link href="/dashboard/de-thi" className={`${styles.subNavLink} ${tab === "de" ? styles.subNavLinkActive : ""}`} aria-current={tab === "de" ? "page" : undefined}>Đề đã tạo</Link>
        <Link href="/dashboard/de-thi?tab=ma-tran" className={`${styles.subNavLink} ${tab === "ma-tran" ? styles.subNavLinkActive : ""}`} aria-current={tab === "ma-tran" ? "page" : undefined}>Ma trận đề</Link>
      </nav>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>{tab === "de" ? `Đề đã tạo (${tong})` : `Ma trận đề (${tong})`}</h2>
        {noiDung}
        {tong > 0 && <PhanTrang total={tong} page={pp.page} size={pp.size} />}
      </section>
    </main>
  );
}
