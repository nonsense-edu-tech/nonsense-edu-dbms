import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CauHoiSubNav from "@/components/CauHoiSubNav";
import CauHoiForm from "@/components/CauHoiForm";
import CauHoiTable, { type CauHoiRow } from "@/components/CauHoiTable";
import NguLieuForm from "@/components/NguLieuForm";
import NoiDungToan from "@/components/NoiDungToan";
import { NutDoiThuTu, NutXoaNguLieu } from "@/components/NguLieuHanhDong";
import { SO_CAU_CON_TOI_DA, tenLoaiNguLieu, VAI_TRO_SOAN_NGU_LIEU } from "@/lib/ngu-lieu";
import { layHinhAnhCacCauHoi } from "../../hinh-anh";
import styles from "../../ngan-hang-cau-hoi.module.css";

const VAI_TRO_DUYET = ["master_admin", "admin_ht", "truong_bm"];

export default async function NguLieuChiTietPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: nl } = await supabase
    .from("ngu_lieu")
    .select("id, so_hieu, loai, tieu_de, noi_dung, mon_hoc_id, hoc_phan_id, bai_hoc_id, chu_de_id")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!nl) notFound();

  const [
    { data: profile },
    { data: capHocList },
    { data: monHocList },
    { data: hocPhanList },
    { data: baiHocList },
    { data: chuDeList },
    { data: dangCauList },
    { data: nangLucList },
    { data: tienTrinhList },
    { data: cauList },
  ] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("mon_hoc").select("id, ma, cap_hoc_ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("hoc_phan").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("bai_hoc").select("id, hoc_phan_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("chu_de").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("dang_cau").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("nang_luc").select("id, ma_nang_luc, ten, mien").is("hieu_luc_den", null).order("mien").order("ma_nang_luc"),
    supabase.from("tien_trinh").select("ma, ten").order("ma"),
    supabase
      .from("cau_hoi")
      .select("id, ma_cau_hoi, noi_dung, do_kho, loi_giai, dap_an_text, trang_thai, nguoi_tao, dang_cau, thu_tu_trong_ngu_lieu")
      .eq("ngu_lieu_id", id)
      .is("deleted_at", null)
      .order("thu_tu_trong_ngu_lieu")
      .order("id"),
  ]);

  const canWrite = profile?.trang_thai === "active" && VAI_TRO_SOAN_NGU_LIEU.includes(profile?.vai_tro ?? "");
  const canDuyet = profile?.trang_thai === "active" && VAI_TRO_DUYET.includes(profile?.vai_tro ?? "");

  const mon = (monHocList ?? []).find((m) => m.id === nl.mon_hoc_id);
  const hocPhan = (hocPhanList ?? []).find((h) => h.id === nl.hoc_phan_id);
  const baiHoc = (baiHocList ?? []).find((b) => b.id === nl.bai_hoc_id);
  const chuDe = (chuDeList ?? []).find((c) => c.id === nl.chu_de_id);
  const capTen = (capHocList ?? []).find((c) => c.ma === mon?.cap_hoc_ma)?.ten ?? "—";
  const dangCauMap = new Map((dangCauList ?? []).map((d) => [d.ma, d.ten]));

  const hinhAnhMap = await layHinhAnhCacCauHoi(supabase, (cauList ?? []).map((c) => c.id));
  // Mọi câu con cùng vị trí với ngữ liệu → tên các cấp lấy từ ngữ liệu.
  const rows: CauHoiRow[] = (cauList ?? []).map((ch) => ({
    hinh_anh: hinhAnhMap.get(ch.id) ?? [],
    id: ch.id,
    ma_cau_hoi: ch.ma_cau_hoi,
    noi_dung: ch.noi_dung,
    do_kho: ch.do_kho,
    loi_giai: ch.loi_giai,
    dap_an_text: ch.dap_an_text,
    trang_thai: ch.trang_thai,
    nguoi_tao: ch.nguoi_tao,
    cap_hoc_ten: capTen,
    mon_hoc_ten: mon?.ten ?? "—",
    hoc_phan_ten: hocPhan?.ten ?? "Chung",
    bai_hoc_ten: baiHoc?.ten ?? "Chung",
    chu_de_ten: chuDe?.ten ?? "Chung",
    dang_cau_ma: ch.dang_cau ?? 0,
    dang_cau_ten: ch.dang_cau != null ? dangCauMap.get(ch.dang_cau) ?? String(ch.dang_cau) : "—",
  }));
  const soCau = rows.length;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ngân hàng câu hỏi</h1>
      </div>
      <CauHoiSubNav active="ngu-lieu" canCreate={canWrite} />

      <Link href="/dashboard/ngan-hang-cau-hoi/ngu-lieu" className={styles.backLink}>← Danh sách ngữ liệu</Link>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          <span className={styles.mono}>{nl.so_hieu}</span> · {mon?.ten ?? "—"} · {tenLoaiNguLieu(nl.loai)}
          {nl.tieu_de ? ` · ${nl.tieu_de}` : ""}
        </h2>
        <p className={styles.noticeBox}>
          Vị trí: {capTen} › {mon?.ten ?? "—"} › {hocPhan?.ten ?? "Chung"} › {baiHoc?.ten ?? "Chung"} › {chuDe?.ten ?? "Chung"}
        </p>
        <NoiDungToan html={nl.noi_dung} as="div" />
        {canWrite && (
          <details style={{ marginTop: 16 }}>
            <summary>Sửa ngữ liệu</summary>
            <NguLieuForm
              capHocList={capHocList ?? []}
              monHocList={monHocList ?? []}
              hocPhanList={hocPhanList ?? []}
              baiHocList={baiHocList ?? []}
              chuDeList={chuDeList ?? []}
              banDau={nl}
              khoaViTri={soCau > 0}
            />
          </details>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Câu hỏi con ({soCau})</h2>
        {soCau > 0 ? (
          <CauHoiTable
            list={rows}
            canWrite={canWrite}
            canDuyet={canDuyet}
            currentUserId={user.id}
            nangLucOptions={nangLucList ?? []}
            tienTrinhOptions={tienTrinhList ?? []}
            cotThem={{
              tieuDe: "Thứ tự",
              ve: (ch, i) =>
                canWrite ? (
                  <span>
                    {i + 1}{" "}
                    <NutDoiThuTu cauHoiId={ch.id} nguLieuId={nl.id} dauTien={i === 0} cuoiCung={i === soCau - 1} />
                  </span>
                ) : (
                  i + 1
                ),
            }}
          />
        ) : (
          <p className={styles.empty}>Chưa có câu hỏi con. Thêm câu đầu tiên bên dưới.</p>
        )}
      </section>

      {canWrite && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Thêm câu hỏi con</h2>
          {soCau >= SO_CAU_CON_TOI_DA ? (
            <p className={styles.noticeBox}>Ngữ liệu đã đạt tối đa {SO_CAU_CON_TOI_DA} câu hỏi con.</p>
          ) : (
            <CauHoiForm
              nguLieu={{
                id: nl.id,
                monHocId: nl.mon_hoc_id,
                hocPhanId: nl.hoc_phan_id ?? "",
                baiHocId: nl.bai_hoc_id ?? "",
                chuDeId: nl.chu_de_id ?? "",
              }}
              capHocList={capHocList ?? []}
              monHocList={monHocList ?? []}
              hocPhanList={hocPhanList ?? []}
              baiHocList={baiHocList ?? []}
              chuDeList={chuDeList ?? []}
              dangCauList={dangCauList ?? []}
            />
          )}
          <div style={{ marginTop: 16 }}>
            <NutXoaNguLieu id={nl.id} soCau={soCau} />
          </div>
        </section>
      )}
    </main>
  );
}
