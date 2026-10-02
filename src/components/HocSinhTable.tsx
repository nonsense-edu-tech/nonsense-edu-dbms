"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { xoaHocSinh, capNhatTrangThaiGhiDanh, xuatCsvHocSinh } from "@/app/dashboard/hoc-sinh/actions";
import type { BoLocHocSinh } from "@/lib/hoc-sinh-loc";
import { GIOI_TINH_LABEL, TINH_TRANG_DANG_KY_LABEL, TRANG_THAI_GHI_DANH_LABEL, TRANG_THAI_GHI_DANH_OPTIONS } from "./hocSinhOptions";
import { ngayHienThi } from "@/lib/formatDate";
import { useToast } from "./ToastProvider";
import HocSinhEditModal from "./HocSinhEditModal";
import ChuyenLopModal from "./ChuyenLopModal";
import styles from "@/app/dashboard/hoc-sinh/hoc-sinh.module.css";

type LopOption = { id: string; ma_lop: string; ten_lop: string | null; chi_nhanh_id: string | null };
type ChiNhanhOption = { id: string; ten: string };

export type HocSinhRow = {
  id: string;
  stt: number;
  ma_hoc_sinh: string;
  ho_ten: string;
  sdt_phu_huynh: string | null;
  lop_hien_tai_id: string | null;
  lop_hien_tai: string | null;
  tinh_trang_dang_ky: string[] | null;
  ngay_sinh: string | null;
  gioi_tinh: string | null;
  email: string | null;
  sdt_hoc_sinh: string | null;
  cccd: string | null;
  truong_thpt: string | null;
  khoi_thi: string | null;
  nv1: string | null;
  ten_phu_huynh: string | null;
  dia_chi: string | null;
  ghi_danh_id: string | null;
  trang_thai_ghi_danh: string | null;
  coTheSua: boolean;
};

export default function HocSinhTable({
  list,
  lopList,
  chiNhanhList,
  canDelete,
  boLoc,
  total,
  dangLoc,
}: {
  list: HocSinhRow[];
  lopList: LopOption[];
  chiNhanhList: ChiNhanhOption[];
  canDelete: boolean;
  boLoc: BoLocHocSinh;
  total: number;
  dangLoc: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const showToast = useToast();
  const [isLocPending, startLocTransition] = useTransition();
  const [isExporting, startExport] = useTransition();
  const [query, setQuery] = useState(boLoc.q);
  const [editingRow, setEditingRow] = useState<HocSinhRow | null>(null);
  const [chuyenLopRow, setChuyenLopRow] = useState<HocSinhRow | null>(null);
  const coCotHanhDong = canDelete || list.some((hs) => hs.coTheSua);

  // Bộ lọc nằm trên URL (?q &lop &cn &tt). Đổi bộ lọc luôn về trang 1.
  const datBoLoc = useCallback(
    (thayDoi: Partial<BoLocHocSinh>) => {
      const qs = new URLSearchParams(searchParams.toString());
      qs.delete("page");
      for (const [k, v] of Object.entries(thayDoi)) {
        if (v) qs.set(k, v);
        else qs.delete(k);
      }
      const url = qs.size > 0 ? `${pathname}?${qs.toString()}` : pathname;
      startLocTransition(() => router.replace(url));
    },
    [pathname, router, searchParams]
  );

  // Ô tìm kiếm: chờ ~300ms sau lần gõ cuối mới truy vấn server.
  useEffect(() => {
    const dangGo = query.trim();
    if (dangGo === boLoc.q) return;
    const t = setTimeout(() => datBoLoc({ q: dangGo }), 300);
    return () => clearTimeout(t);
  }, [query, boLoc.q, datBoLoc]);

  // Back/Forward hoặc "Xoá bộ lọc" làm đổi ?q từ ngoài → đồng bộ lại ô nhập.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(boLoc.q);
  }, [boLoc.q]);

  function handleExport() {
    startExport(async () => {
      const result = await xuatCsvHocSinh(boLoc);
      if ("error" in result) {
        showToast({ type: "error", message: `Xuất CSV thất bại: ${result.error}` });
        return;
      }
      // BOM để Excel mở tiếng Việt không lỗi font.
      const blob = new Blob(["\uFEFF" + result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `danh-sach-hoc-sinh-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast({ type: "success", message: `Đã xuất ${result.soDong} học sinh ra CSV.` });
    });
  }

  return (
    <div>
      <div className={styles.searchRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Tìm theo ID, họ tên, lớp..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className={styles.rowSelect}
          value={boLoc.lop}
          onChange={(e) => datBoLoc({ lop: e.target.value })}
        >
          <option value="">— Tất cả lớp —</option>
          {lopList.map((lop) => (
            <option key={lop.id} value={lop.id}>
              {lop.ma_lop}
              {lop.ten_lop ? ` — ${lop.ten_lop}` : ""}
            </option>
          ))}
        </select>
        {chiNhanhList.length > 0 && (
          <select
            className={styles.rowSelect}
            value={boLoc.cn}
            onChange={(e) => datBoLoc({ cn: e.target.value })}
          >
            <option value="">— Tất cả chi nhánh —</option>
            {chiNhanhList.map((c) => (
              <option key={c.id} value={c.id}>{c.ten}</option>
            ))}
          </select>
        )}
        <select
          className={styles.rowSelect}
          value={boLoc.tt}
          onChange={(e) => datBoLoc({ tt: e.target.value })}
        >
          <option value="">— Tất cả trạng thái ghi danh —</option>
          {TRANG_THAI_GHI_DANH_OPTIONS.map((t) => (
            <option key={t} value={t}>{TRANG_THAI_GHI_DANH_LABEL[t]}</option>
          ))}
        </select>
        {dangLoc && (
          <button
            type="button"
            className={styles.btnEdit}
            onClick={() => {
              setQuery("");
              datBoLoc({ q: "", lop: "", cn: "", tt: "" });
            }}
          >
            Xoá bộ lọc
          </button>
        )}
        <button
          type="button"
          className={styles.btnExport}
          onClick={handleExport}
          disabled={total === 0 || isExporting}
        >
          {isExporting ? "Đang xuất…" : `Xuất CSV (${total})`}
        </button>
      </div>

      {list.length > 0 ? (
        <div className={`${styles.tableWrap} ${isLocPending ? styles.dangTai : ""}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>STT</th>
                <th>ID học sinh</th>
                <th>Họ tên</th>
                <th>Lớp hiện tại</th>
                <th>Trạng thái ghi danh</th>
                <th>Ngày sinh</th>
                <th>Giới tính</th>
                <th>SĐT học sinh</th>
                <th>Email</th>
                <th>Số CCCD</th>
                <th>Địa chỉ nhà ở</th>
                <th>Tên phụ huynh</th>
                <th>SĐT phụ huynh</th>
                <th>Trường THPT</th>
                <th>Khối thi</th>
                <th>Nguyện vọng 1</th>
                <th>Tình trạng đăng ký</th>
                {coCotHanhDong && <th></th>}
              </tr>
            </thead>
            <tbody>
              {list.map((hs) => (
                <HocSinhRowItem
                  key={hs.id}
                  hocSinh={hs}
                  canDelete={canDelete}
                  coCotHanhDong={coCotHanhDong}
                  onEdit={() => setEditingRow(hs)}
                  onChuyenLop={() => setChuyenLopRow(hs)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.empty}>{dangLoc ? "Không tìm thấy học sinh nào khớp." : "Chưa có học sinh nào."}</p>
      )}

      {editingRow && <HocSinhEditModal hocSinh={editingRow} onClose={() => setEditingRow(null)} />}
      {chuyenLopRow && (
        <ChuyenLopModal hocSinh={chuyenLopRow} lopList={lopList} onClose={() => setChuyenLopRow(null)} />
      )}
    </div>
  );
}

function HocSinhRowItem({
  hocSinh,
  canDelete,
  coCotHanhDong,
  onEdit,
  onChuyenLop,
}: {
  hocSinh: HocSinhRow;
  canDelete: boolean;
  coCotHanhDong: boolean;
  onEdit: () => void;
  onChuyenLop: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isTrangThaiPending, startTrangThaiTransition] = useTransition();
  const [trangThaiError, setTrangThaiError] = useState<string | null>(null);
  const showToast = useToast();

  function handleDelete() {
    const confirmed = window.confirm(`Xoá học sinh "${hocSinh.ho_ten}" (${hocSinh.ma_hoc_sinh})? Có thể khôi phục sau (xoá mềm).`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaHocSinh(hocSinh.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Xoá học sinh thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã xoá học sinh "${hocSinh.ho_ten}" thành công.` });
      }
    });
  }

  function handleTrangThaiChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const trangThaiMoi = e.target.value;
    if (!hocSinh.ghi_danh_id) return;
    setTrangThaiError(null);
    startTrangThaiTransition(async () => {
      const result = await capNhatTrangThaiGhiDanh(hocSinh.ghi_danh_id!, trangThaiMoi);
      if ("error" in result) {
        setTrangThaiError(result.error);
        showToast({ type: "error", message: `Đổi trạng thái ghi danh thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã đổi trạng thái ghi danh của "${hocSinh.ho_ten}" thành công.` });
      }
    });
  }

  return (
    <tr>
      <td>{hocSinh.stt}</td>
      <td className={styles.mono}>{hocSinh.ma_hoc_sinh}</td>
      <td>{hocSinh.ho_ten}</td>
      <td>{hocSinh.lop_hien_tai ?? "—"}</td>
      <td>
        {hocSinh.ghi_danh_id ? (
          hocSinh.coTheSua ? (
            <>
              <select
                className={styles.rowSelect}
                value={hocSinh.trang_thai_ghi_danh ?? ""}
                onChange={handleTrangThaiChange}
                disabled={isTrangThaiPending}
              >
                {TRANG_THAI_GHI_DANH_OPTIONS.map((t) => (
                  <option key={t} value={t}>{TRANG_THAI_GHI_DANH_LABEL[t]}</option>
                ))}
              </select>
              {trangThaiError && <div className={styles.errorText}>{trangThaiError}</div>}
            </>
          ) : (
            TRANG_THAI_GHI_DANH_LABEL[hocSinh.trang_thai_ghi_danh ?? ""] ?? hocSinh.trang_thai_ghi_danh
          )
        ) : (
          "—"
        )}
      </td>
      <td>{ngayHienThi(hocSinh.ngay_sinh)}</td>
      <td>{hocSinh.gioi_tinh ? (GIOI_TINH_LABEL[hocSinh.gioi_tinh] ?? hocSinh.gioi_tinh) : "—"}</td>
      <td>{hocSinh.sdt_hoc_sinh ?? "—"}</td>
      <td>{hocSinh.email ?? "—"}</td>
      <td>{hocSinh.cccd ?? "—"}</td>
      <td>{hocSinh.dia_chi ?? "—"}</td>
      <td>{hocSinh.ten_phu_huynh ?? "—"}</td>
      <td>{hocSinh.sdt_phu_huynh ?? "—"}</td>
      <td>{hocSinh.truong_thpt ?? "—"}</td>
      <td>{hocSinh.khoi_thi ?? "—"}</td>
      <td>{hocSinh.nv1 ?? "—"}</td>
      <td>
        {hocSinh.tinh_trang_dang_ky && hocSinh.tinh_trang_dang_ky.length > 0
          ? hocSinh.tinh_trang_dang_ky.map((t) => TINH_TRANG_DANG_KY_LABEL[t] ?? t).join(", ")
          : "—"}
      </td>
      {coCotHanhDong && (
        <td>
          <div className={styles.rowActions}>
            {hocSinh.coTheSua && (
              <button type="button" className={styles.btnEdit} onClick={onEdit} disabled={isPending}>
                Sửa
              </button>
            )}
            {hocSinh.coTheSua && hocSinh.ghi_danh_id && (
              <button type="button" className={styles.btnChuyenLop} onClick={onChuyenLop} disabled={isPending}>
                Chuyển lớp
              </button>
            )}
            {canDelete && (
              <button type="button" className={styles.btnDelete} onClick={handleDelete} disabled={isPending}>
                {isPending ? "Đang xoá…" : "Xoá"}
              </button>
            )}
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
        </td>
      )}
    </tr>
  );
}
