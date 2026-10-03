import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import CauHoiSubNav from "@/components/CauHoiSubNav";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import { tenLoaiNguLieu, VAI_TRO_SOAN_NGU_LIEU } from "@/lib/ngu-lieu";
import styles from "../ngan-hang-cau-hoi.module.css";

const GOC = "/dashboard/ngan-hang-cau-hoi/ngu-lieu";

export default async function NguLieuListPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single();
  const canWrite = profile?.trang_thai === "active" && VAI_TRO_SOAN_NGU_LIEU.includes(profile?.vai_tro ?? "");

  const { data: list, count } = await supabase
    .from("ngu_lieu")
    .select("id, so_hieu, loai, tieu_de, mon_hoc_id, mon_hoc(ten), created_at", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id")
    .range(pp.from, pp.to);

  const total = count ?? 0;
  const trangCuoi = duongDanTrangCuoi(GOC, raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  // Đếm câu con của các ngữ liệu trong trang hiện tại.
  const ids = (list ?? []).map((n) => n.id);
  const demCau = new Map<string, number>();
  if (ids.length > 0) {
    const { data: cau } = await supabase.from("cau_hoi").select("ngu_lieu_id").in("ngu_lieu_id", ids).is("deleted_at", null);
    for (const c of cau ?? []) demCau.set(c.ngu_lieu_id as string, (demCau.get(c.ngu_lieu_id as string) ?? 0) + 1);
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ngân hàng câu hỏi</h1>
      </div>
      <CauHoiSubNav active="ngu-lieu" canCreate={canWrite} />

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Ngữ liệu ({total})</h2>
        <p className={styles.noticeBox}>
          Ngữ liệu là đề dẫn dùng chung (bài đọc, bảng số liệu, tình huống logic) kèm nhiều câu hỏi con. Câu hỏi con
          không tồn tại độc lập: thêm ngữ liệu vào đề thì cả nhóm câu con đi theo, xếp liền nhau.
        </p>
        {canWrite && (
          <p>
            <Link href={`${GOC}/tao-moi`} className={styles.btnAdd}>+ Tạo ngữ liệu</Link>
          </p>
        )}
        {total > 0 ? (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Số hiệu</th>
                    <th>Môn học</th>
                    <th>Loại</th>
                    <th>Tiêu đề</th>
                    <th>Số câu con</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(list ?? []).map((n) => {
                    const mon = n.mon_hoc as unknown as { ten: string } | { ten: string }[] | null;
                    const tenMon = Array.isArray(mon) ? mon[0]?.ten : mon?.ten;
                    return (
                      <tr key={n.id}>
                        <td className={styles.mono}>{n.so_hieu}</td>
                        <td>{tenMon ?? "—"}</td>
                        <td>{tenLoaiNguLieu(n.loai)}</td>
                        <td>{n.tieu_de ?? <span className={styles.errorText}>(không tiêu đề)</span>}</td>
                        <td>{demCau.get(n.id) ?? 0}</td>
                        <td>
                          <Link href={`${GOC}/${n.id}`} className={styles.btnEdit}>Mở</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PhanTrang total={total} page={pp.page} size={pp.size} />
          </>
        ) : (
          <p className={styles.empty}>Chưa có ngữ liệu nào.</p>
        )}
      </section>
    </main>
  );
}
