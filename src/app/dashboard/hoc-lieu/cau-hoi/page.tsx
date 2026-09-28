import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CauHoiForm from "@/components/CauHoiForm";
import CauHoiTable, { type CauHoiRow } from "@/components/CauHoiTable";
import styles from "../hoc-lieu.module.css";

const VAI_TRO_QUAN_LY = ["master_admin", "admin_ht", "truong_bm", "gv"];
const VAI_TRO_DUYET = ["master_admin", "admin_ht", "truong_bm"];

export default async function CauHoiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: capHocList },
    { data: chuongTrinhList },
    { data: chuongTrinhMonHocList },
    { data: monHocList },
    { data: hocPhanList },
    { data: baiHocList },
    { data: chuDeList },
    { data: dangCauList },
    { data: cauHoiList },
  ] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("chuong_trinh_mon_hoc").select("chuong_trinh_ma, cap_hoc_ma, mon_hoc_ma"),
    supabase.from("mon_hoc").select("id, ma, cap_hoc_ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("hoc_phan").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("bai_hoc").select("id, hoc_phan_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("chu_de").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("dang_cau").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase
      .from("cau_hoi")
      .select(
        "id, ma_cau_hoi, noi_dung, do_kho, loi_giai, dap_an_text, trang_thai, nguoi_tao, cap_hoc, chuong_trinh, mon_hoc, hoc_phan, bai_hoc, chu_de, dang_cau, created_at"
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const canWrite = isActive && VAI_TRO_QUAN_LY.includes(vaiTro);
  const canDuyet = isActive && VAI_TRO_DUYET.includes(vaiTro);

  const capHocMap = new Map((capHocList ?? []).map((c) => [c.ma, c.ten]));
  const dangCauMap = new Map((dangCauList ?? []).map((d) => [d.ma, d.ten]));
  const monHocByCode = new Map((monHocList ?? []).map((m) => [`${m.cap_hoc_ma}-${m.ma}`, m]));
  const hocPhanByCode = new Map((hocPhanList ?? []).map((hp) => [`${hp.mon_hoc_id}-${hp.ma}`, hp]));
  const baiHocByCode = new Map((baiHocList ?? []).map((bh) => [`${bh.hoc_phan_id}-${bh.ma}`, bh]));
  const chuDeByCode = new Map((chuDeList ?? []).map((cd) => [`${cd.mon_hoc_id}-${cd.ma}`, cd]));

  const cauHoiRows: CauHoiRow[] = (cauHoiList ?? []).map((ch) => {
    const monHoc = ch.cap_hoc != null && ch.mon_hoc != null ? monHocByCode.get(`${ch.cap_hoc}-${ch.mon_hoc}`) : undefined;
    const hocPhan = monHoc && ch.hoc_phan != null ? hocPhanByCode.get(`${monHoc.id}-${ch.hoc_phan}`) : undefined;
    const baiHoc = hocPhan && ch.bai_hoc != null ? baiHocByCode.get(`${hocPhan.id}-${ch.bai_hoc}`) : undefined;
    const chuDe = monHoc && ch.chu_de != null ? chuDeByCode.get(`${monHoc.id}-${ch.chu_de}`) : undefined;

    return {
      id: ch.id,
      ma_cau_hoi: ch.ma_cau_hoi,
      noi_dung: ch.noi_dung,
      do_kho: ch.do_kho,
      loi_giai: ch.loi_giai,
      dap_an_text: ch.dap_an_text,
      trang_thai: ch.trang_thai,
      nguoi_tao: ch.nguoi_tao,
      cap_hoc_ten: ch.cap_hoc != null ? capHocMap.get(ch.cap_hoc) ?? String(ch.cap_hoc) : "—",
      mon_hoc_ten: monHoc?.ten ?? "—",
      hoc_phan_ten: hocPhan?.ten ?? "—",
      bai_hoc_ten: baiHoc?.ten ?? "—",
      chu_de_ten: chuDe?.ten ?? "—",
      dang_cau_ma: ch.dang_cau ?? 0,
      dang_cau_ten: ch.dang_cau != null ? dangCauMap.get(ch.dang_cau) ?? String(ch.dang_cau) : "—",
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ngân hàng câu hỏi</h1>
        <Link href="/dashboard/hoc-lieu" className={styles.backLink}>← Về học liệu</Link>
      </div>

      <nav className={styles.subNav}>
        <Link href="/dashboard/hoc-lieu" className={styles.subNavLink}>Tổng quan</Link>
        <Link href="/dashboard/hoc-lieu/chu-de" className={styles.subNavLink}>Chủ đề</Link>
        <Link href="/dashboard/hoc-lieu/hoc-phan" className={styles.subNavLink}>Học phần</Link>
        <Link href="/dashboard/hoc-lieu/bai-hoc" className={styles.subNavLink}>Bài học</Link>
        <Link href="/dashboard/hoc-lieu/cau-hoi" className={`${styles.subNavLink} ${styles.subNavLinkActive}`}>Câu hỏi</Link>
      </nav>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo câu hỏi mới</h2>
        {canWrite ? (
          <CauHoiForm
            capHocList={capHocList ?? []}
            chuongTrinhList={chuongTrinhList ?? []}
            chuongTrinhMonHocList={chuongTrinhMonHocList ?? []}
            monHocList={monHocList ?? []}
            hocPhanList={hocPhanList ?? []}
            baiHocList={baiHocList ?? []}
            chuDeList={chuDeList ?? []}
            dangCauList={dangCauList ?? []}
          />
        ) : (
          <p className={styles.noticeBox}>
            Chỉ Master Admin, Admin học thuật, Trưởng bộ môn hoặc Giáo viên (trong phạm vi môn được phân công) được
            tạo câu hỏi. Tài khoản của bạn:{" "}
            {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
          </p>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách câu hỏi ({cauHoiRows.length})</h2>
        <p className={styles.noticeBox}>
          Câu hỏi mới tạo ở trạng thái <strong>Nháp</strong> → nộp duyệt chuyển <strong>Chờ duyệt</strong> → Admin học
          thuật/Trưởng bộ môn/Master Admin duyệt thành <strong>Đã duyệt</strong> (không tự duyệt được câu hỏi của
          chính mình). Giáo viên chỉ thấy câu hỏi thuộc môn/cấp học được phân quyền.
        </p>
        {cauHoiRows.length > 0 ? (
          <CauHoiTable list={cauHoiRows} canWrite={canWrite} canDuyet={canDuyet} currentUserId={user.id} />
        ) : (
          <p className={styles.empty}>Chưa có câu hỏi nào.</p>
        )}
      </section>
    </main>
  );
}
