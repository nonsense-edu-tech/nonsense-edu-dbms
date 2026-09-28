"use client";

import { useState, useTransition } from "react";
import { xoaCauHoi } from "@/app/dashboard/hoc-lieu/cau-hoi/actions";
import { useToast } from "./ToastProvider";
import CauHoiEditModal from "./CauHoiEditModal";
import styles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export type CauHoiRow = {
  id: string;
  ma_cau_hoi: string;
  noi_dung: string;
  do_kho: number | null;
  loi_giai: string | null;
  dap_an_text: string | null;
  trang_thai: string;
  cap_hoc_ten: string;
  mon_hoc_ten: string;
  hoc_phan_ten: string;
  bai_hoc_ten: string;
  chu_de_ten: string;
  dang_cau_ma: number;
  dang_cau_ten: string;
};

const TRANG_THAI_LABEL: Record<string, string> = {
  nhap: "Nháp",
  cho_duyet: "Chờ duyệt",
  da_duyet: "Đã duyệt",
  luu_tru: "Lưu trữ",
};

const TRANG_THAI_BADGE: Record<string, string> = {
  nhap: "badgeNhap",
  cho_duyet: "badgeChoDuyet",
  da_duyet: "badgeDaDuyet",
  luu_tru: "badgeLuuTru",
};

export default function CauHoiTable({ list, canWrite }: { list: CauHoiRow[]; canWrite: boolean }) {
  const [editingRow, setEditingRow] = useState<CauHoiRow | null>(null);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Mã câu hỏi</th>
            <th>Cấp học</th>
            <th>Môn học</th>
            <th>Học phần</th>
            <th>Bài học</th>
            <th>Chủ đề</th>
            <th>Dạng câu</th>
            <th>Nội dung</th>
            <th>Trạng thái</th>
            {canWrite && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((ch) => (
            <CauHoiRowItem key={ch.id} cauHoi={ch} canWrite={canWrite} onEdit={() => setEditingRow(ch)} />
          ))}
        </tbody>
      </table>

      {editingRow && <CauHoiEditModal cauHoi={editingRow} onClose={() => setEditingRow(null)} />}
    </div>
  );
}

function CauHoiRowItem({
  cauHoi,
  canWrite,
  onEdit,
}: {
  cauHoi: CauHoiRow;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleDelete() {
    const confirmed = window.confirm(`Xoá câu hỏi "${cauHoi.ma_cau_hoi}"? Có thể khôi phục sau (xoá mềm).`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaCauHoi(cauHoi.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Xoá câu hỏi thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã xoá câu hỏi "${cauHoi.ma_cau_hoi}" thành công.` });
      }
    });
  }

  const badgeClass = styles[TRANG_THAI_BADGE[cauHoi.trang_thai] ?? "badgeNhap"];

  return (
    <tr>
      <td className={styles.mono}>{cauHoi.ma_cau_hoi}</td>
      <td>{cauHoi.cap_hoc_ten}</td>
      <td>{cauHoi.mon_hoc_ten}</td>
      <td>{cauHoi.hoc_phan_ten}</td>
      <td>{cauHoi.bai_hoc_ten}</td>
      <td>{cauHoi.chu_de_ten}</td>
      <td>{cauHoi.dang_cau_ten}</td>
      <td className={styles.noiDungCell}>{cauHoi.noi_dung}</td>
      <td>
        <span className={`${styles.badge} ${badgeClass}`}>{TRANG_THAI_LABEL[cauHoi.trang_thai] ?? cauHoi.trang_thai}</span>
      </td>
      {canWrite && (
        <td>
          <div className={styles.rowActions}>
            <button type="button" className={styles.btnEdit} onClick={onEdit} disabled={isPending}>Sửa</button>
            <button type="button" className={styles.btnDelete} onClick={handleDelete} disabled={isPending}>
              {isPending ? "Đang xoá…" : "Xoá"}
            </button>
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
        </td>
      )}
    </tr>
  );
}
