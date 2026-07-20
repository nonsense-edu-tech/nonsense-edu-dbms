"use client";

import { useState, useTransition } from "react";
import { ngungApDungGoi } from "@/app/dashboard/hoc-phi/goi/actions";
import { HINH_THUC_DONG_LABEL } from "./hocPhiOptions";
import { ngayHienThi } from "@/lib/formatDate";
import { tienHienThi } from "@/lib/formatCurrency";
import GoiHocPhiDoiGiaModal from "./GoiHocPhiDoiGiaModal";
import styles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

export type GoiHocPhiRow = {
  id: number;
  ten: string;
  chuong_trinh_ten: string;
  hinh_thuc_dong: string;
  gia_niem_yet: number;
  hieu_luc_tu: string;
  hieu_luc_den: string | null;
  dang_ap_dung: boolean;
};

export default function GoiHocPhiTable({ list, canEdit }: { list: GoiHocPhiRow[]; canEdit: boolean }) {
  const [editingRow, setEditingRow] = useState<GoiHocPhiRow | null>(null);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Chương trình</th>
            <th>Tên gói</th>
            <th>Hình thức đóng</th>
            <th>Giá niêm yết</th>
            <th>Hiệu lực từ</th>
            <th>Hiệu lực đến</th>
            <th>Trạng thái</th>
            {canEdit && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((goi) => (
            <GoiRowItem key={goi.id} goi={goi} canEdit={canEdit} onDoiGia={() => setEditingRow(goi)} />
          ))}
        </tbody>
      </table>

      {editingRow && <GoiHocPhiDoiGiaModal goi={editingRow} onClose={() => setEditingRow(null)} />}
    </div>
  );
}

function GoiRowItem({
  goi,
  canEdit,
  onDoiGia,
}: {
  goi: GoiHocPhiRow;
  canEdit: boolean;
  onDoiGia: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dangApDungHienHanh = goi.dang_ap_dung && goi.hieu_luc_den === null;

  function handleNgungApDung() {
    const confirmed = window.confirm(`Ngừng áp dụng gói "${goi.ten}"?`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await ngungApDungGoi(goi.id);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <tr>
      <td>{goi.chuong_trinh_ten}</td>
      <td>{goi.ten}</td>
      <td>{HINH_THUC_DONG_LABEL[goi.hinh_thuc_dong] ?? goi.hinh_thuc_dong}</td>
      <td className={styles.mono}>{tienHienThi(goi.gia_niem_yet)}</td>
      <td>{ngayHienThi(goi.hieu_luc_tu)}</td>
      <td>{ngayHienThi(goi.hieu_luc_den)}</td>
      <td>
        {dangApDungHienHanh ? (
          <span className={`${styles.badge} ${styles.badgeHoatDong}`}>Đang áp dụng</span>
        ) : (
          <span className={`${styles.badge} ${styles.badgeNhap}`}>Hết hiệu lực</span>
        )}
      </td>
      {canEdit && (
        <td>
          <div className={styles.rowActions}>
            {dangApDungHienHanh && (
              <>
                <button type="button" className={styles.btnEdit} onClick={onDoiGia} disabled={isPending}>
                  Đổi giá
                </button>
                <button type="button" className={styles.btnEdit} onClick={handleNgungApDung} disabled={isPending}>
                  {isPending ? "Đang lưu…" : "Ngừng áp dụng"}
                </button>
              </>
            )}
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
        </td>
      )}
    </tr>
  );
}
