import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhanTrang from "@/components/PhanTrang";
import { duongDanTrangCuoi, parsePhanTrang, type RawSearchParams } from "@/lib/phan-trang";
import CauHoiLoc from "@/components/CauHoiLoc";
import CauHoiSubNav from "@/components/CauHoiSubNav";
import { apDungBoLocCauHoi, dangLocCauHoi, parseBoLocCauHoi } from "@/lib/cau-hoi-loc";
import CauHoiTable, { type CauHoiRow } from "@/components/CauHoiTable";
import { layHinhAnhCacCauHoi } from "./hinh-anh";
import styles from "./ngan-hang-cau-hoi.module.css";

const VAI_TRO_QUAN_LY = ["master_admin", "admin_ht", "truong_bm", "gv"];
const VAI_TRO_DUYET = ["master_admin", "admin_ht", "truong_bm"];

export default async function CauHoiPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;
  const pp = parsePhanTrang(raw);
  const boLoc = parseBoLocCauHoi(raw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: capHocList },
    { data: chuongTrinhList },
    { data: monHocList },
    { data: hocPhanList },
    { data: baiHocList },
    { data: chuDeList },
    { data: dangCauList },
    { data: nangLucList },
    { data: tienTrinhList },
  ] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("chuong_trinh").select("ma, ten").is("deleted_at", null).order("ma"),
    supabase.from("mon_hoc").select("id, ma, cap_hoc_ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("hoc_phan").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("bai_hoc").select("id, hoc_phan_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("chu_de").select("id, mon_hoc_id, ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("dang_cau").select("ma, ten").is("deleted_at", null).order("ma"),
    // Chỉ mã năng lực còn hiệu lực (hieu_luc_den null) — mã đã đóng không cho
    // gắn mới, xem quy ước ở areas/khung-nang-luc.md.
    supabase.from("nang_luc").select("id, ma_nang_luc, ten, mien").is("hieu_luc_den", null).order("mien").order("ma_nang_luc"),
    supabase.from("tien_trinh").select("ma, ten").order("ma"),
  ]);

  // Bộ lọc áp phía server (quy id môn/học phần/bài học/chủ đề ra mã + cha) rồi mới phân trang.
  const { data: cauHoiList, count: tongCauHoi } = await apDungBoLocCauHoi(
    supabase
      .from("cau_hoi")
      .select(
        "id, ma_cau_hoi, noi_dung, do_kho, loi_giai, dap_an_text, trang_thai, nguoi_tao, cap_hoc, chuong_trinh, mon_hoc, hoc_phan, bai_hoc, chu_de, dang_cau, created_at",
        { count: "exact" }
      )
      .is("deleted_at", null),
    boLoc,
    {
      monHocList: monHocList ?? [],
      hocPhanList: hocPhanList ?? [],
      baiHocList: baiHocList ?? [],
      chuDeList: chuDeList ?? [],
    }
  )
    .order("created_at", { ascending: false })
    .order("id")
    .range(pp.from, pp.to);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const total = tongCauHoi ?? 0;
  const trangCuoi = duongDanTrangCuoi("/dashboard/ngan-hang-cau-hoi", raw, pp, total);
  if (trangCuoi) redirect(trangCuoi);

  const canWrite = isActive && VAI_TRO_QUAN_LY.includes(vaiTro);
  const dangLoc = dangLocCauHoi(boLoc);
  const canDuyet = isActive && VAI_TRO_DUYET.includes(vaiTro);

  const hinhAnhMap = await layHinhAnhCacCauHoi(supabase, (cauHoiList ?? []).map((ch) => ch.id));

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
      hinh_anh: hinhAnhMap.get(ch.id) ?? [],
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
      </div>

      <CauHoiSubNav active="danh-sach" canCreate={canWrite} />

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Danh sách câu hỏi ({total})</h2>
        <p className={styles.noticeBox}>
          Câu hỏi mới tạo ở trạng thái <strong>Nháp</strong> → nộp duyệt chuyển <strong>Chờ duyệt</strong> → Admin học
          thuật/Trưởng bộ môn/Master Admin duyệt thành <strong>Đã duyệt</strong> (không tự duyệt được câu hỏi của
          chính mình). Giáo viên chỉ thấy câu hỏi thuộc môn/cấp học được phân quyền.
        </p>
        {/* Bộ lọc luôn hiện để người dùng xoá được bộ lọc kể cả khi kết quả rỗng. */}
        <CauHoiLoc
          boLoc={boLoc}
          dangLoc={dangLoc}
          capHocList={capHocList ?? []}
          chuongTrinhList={chuongTrinhList ?? []}
          monHocList={monHocList ?? []}
          hocPhanList={hocPhanList ?? []}
          baiHocList={baiHocList ?? []}
          chuDeList={chuDeList ?? []}
          dangCauList={dangCauList ?? []}
        >
          {total > 0 ? (
            <>
              <CauHoiTable
                list={cauHoiRows}
                canWrite={canWrite}
                canDuyet={canDuyet}
                currentUserId={user.id}
                nangLucOptions={nangLucList ?? []}
                tienTrinhOptions={tienTrinhList ?? []}
              />
              <PhanTrang total={total} page={pp.page} size={pp.size} />
            </>
          ) : (
            <p className={styles.empty}>{dangLoc ? "Không tìm thấy câu hỏi nào khớp." : "Chưa có câu hỏi nào."}</p>
          )}
        </CauHoiLoc>
      </section>
    </main>
  );
}
