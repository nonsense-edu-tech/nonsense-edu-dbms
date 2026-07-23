"use client";

import { useMemo, useState, useTransition } from "react";
import { xoaHocSinh, capNhatTrangThaiGhiDanh } from "@/app/dashboard/hoc-sinh/actions";
import { GIOI_TINH_LABEL, TINH_TRANG_DANG_KY_LABEL, TRANG_THAI_GHI_DANH_LABEL, TRANG_THAI_GHI_DANH_OPTIONS } from "./hocSinhOptions";
import { ngayHienThi } from "@/lib/formatDate";
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
}: {
  list: HocSinhRow[];
  lopList: LopOption[];
  chiNhanhList: ChiNhanhOption[];
  canDelete: boolean;
}) {
  const [query, setQuery] = useState("");
  const [lopFilter, setLopFilter] = useState("");
  const [chiNhanhFilter, setChiNhanhFilter] = useState("");
  const [trangThaiFilter, setTrangThaiFilter] = useState("");
  const [editingRow, setEditingRow] = useState<HocSinhRow | null>(null);
  const [chuyenLopRow, setChuyenLopRow] = useState<HocSinhRow | null>(null);
  const coCotHanhDong = canDelete || list.some((hs) => hs.coTheSua);

  const lopIdToChiNhanhId = useMemo(
    () => new Map(lopList.map((l) => [l.id, l.chi_nhanh_id])),
    [lopList]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((hs) => {
      if (q) {
        const khop =
          hs.ma_hoc_sinh.toLowerCase().includes(q) ||
          hs.ho_ten.toLowerCase().includes(q) ||
          (hs.lop_hien_tai ?? "").toLowerCase().includes(q);
        if (!khop) return false;
      }
      if (lopFilter && hs.lop_hien_tai_id !== lopFilter) return false;
      if (chiNhanhFilter) {
        const chiNhanhCuaHs = hs.lop_hien_tai_id != null ? lopIdToChiNhanhId.get(hs.lop_hien_tai_id) : null;
        if (chiNhanhCuaHs !== chiNhanhFilter) return false;
      }
      if (trangThaiFilter && hs.trang_thai_ghi_danh !== trangThaiFilter) return false;
      return true;
    });
  }, [list, query, lopFilter, chiNhanhFilter, trangThaiFilter, lopIdToChiNhanhId]);

  function handleExport() {
    const header = [
      "STT", "ID hoc sinh", "Ho va ten", "Lop hien tai", "Ten phu huynh", "SDT phu huynh",
      "Ngay sinh", "Gioi tinh", "SDT hoc sinh", "Email", "CCCD", "Dia chi",
      "Tinh trang dang ky", "Truong THPT", "Khoi thi", "NV1",
    ];
    const rows = filtered.map((hs) => [
      String(hs.stt),
      hs.ma_hoc_sinh,
      hs.ho_ten,
      hs.lop_hien_tai ?? "",
      hs.ten_phu_huynh ?? "",
      hs.sdt_phu_huynh ?? "",
      hs.ngay_sinh ?? "",
      hs.gioi_tinh ? (GIOI_TINH_LABEL[hs.gioi_tinh] ?? hs.gioi_tinh) : "",
      hs.sdt_hoc_sinh ?? "",
      hs.email ?? "",
      hs.cccd ?? "",
      hs.dia_chi ?? "",
      hs.tinh_trang_dang_ky
        ? hs.tinh_trang_dang_ky.map((t) => TINH_TRANG_DANG_KY_LABEL[t] ?? t).join(", ")
        : "",
      hs.truong_thpt ?? "",
      hs.khoi_thi ?? "",
      hs.nv1 ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
    // BOM để Excel mở tiếng Việt không lỗi font.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `danh-sach-hoc-sinh-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
          value={lopFilter}
          onChange={(e) => setLopFilter(e.target.value)}
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
            value={chiNhanhFilter}
            onChange={(e) => setChiNhanhFilter(e.target.value)}
          >
            <option value="">— Tất cả chi nhánh —</option>
            {chiNhanhList.map((c) => (
              <option key={c.id} value={c.id}>{c.ten}</option>
            ))}
          </select>
        )}
        <select
          className={styles.rowSelect}
          value={trangThaiFilter}
          onChange={(e) => setTrangThaiFilter(e.target.value)}
        >
          <option value="">— Tất cả trạng thái ghi danh —</option>
          {TRANG_THAI_GHI_DANH_OPTIONS.map((t) => (
            <option key={t} value={t}>{TRANG_THAI_GHI_DANH_LABEL[t]}</option>
          ))}
        </select>
        <button
          type="button"
          className={styles.btnExport}
          onClick={handleExport}
          disabled={filtered.length === 0}
        >
          Xuất CSV ({filtered.length})
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className={styles.tableWrap}>
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
              {filtered.map((hs) => (
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
        <p className={styles.empty}>Không tìm thấy học sinh nào khớp.</p>
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

  function handleDelete() {
    const confirmed = window.confirm(`Xoá học sinh "${hocSinh.ho_ten}" (${hocSinh.ma_hoc_sinh})? Có thể khôi phục sau (xoá mềm).`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaHocSinh(hocSinh.id);
      if ("error" in result) setError(result.error);
    });
  }

  function handleTrangThaiChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const trangThaiMoi = e.target.value;
    if (!hocSinh.ghi_danh_id) return;
    setTrangThaiError(null);
    startTrangThaiTransition(async () => {
      const result = await capNhatTrangThaiGhiDanh(hocSinh.ghi_danh_id!, trangThaiMoi);
      if ("error" in result) setTrangThaiError(result.error);
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

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
