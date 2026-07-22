"use client";

import { useState, useTransition } from "react";
import { xoaLoaiPhong } from "@/app/dashboard/van-hanh/loai-phong/actions";
import { tienHienThi } from "@/lib/formatCurrency";
import { ngayHienThi } from "@/lib/formatDate";
import LoaiPhongEditModal from "./LoaiPhongEditModal";
import styles from "@/app/dashboard/van-hanh/van-hanh.module.css";

export type LoaiPhongRow = {
  id: number;
  ten: string;
  don_gia_thue_gio: number;
  don_gia_dien_nuoc_gio: number;
  don_gia_khau_hao_gio: number;
  hieu_luc_tu: string;
  hieu_luc_den: string | null;
};

export default function LoaiPhongTable({
  list,
  canEdit,
  canDelete,
}: {
  list: LoaiPhongRow[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editingRow, setEditingRow] = useState<LoaiPhongRow | null>(null);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Tên loại phòng</th>
            <th>Thuê/giờ</th>
            <th>Điện nước/giờ</th>
            <th>Khấu hao/giờ</th>
            <th>Hiệu lực từ</th>
            <th>Hiệu lực đến</th>
            {(canEdit || canDelete) && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((lp) => (
            <LoaiPhongRowItem
              key={lp.id}
              loaiPhong={lp}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={() => setEditingRow(lp)}
            />
          ))}
        </tbody>
      </table>

      {editingRow && <LoaiPhongEditModal loaiPhong={editingRow} onClose={() => setEditingRow(null)} />}
    </div>
  );
}

function LoaiPhongRowItem({
  loaiPhong,
  canEdit,
  canDelete,
  onEdit,
}: {
  loaiPhong: LoaiPhongRow;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(`Xoá loại phòng "${loaiPhong.ten}"? Có thể khôi phục sau (xoá mềm).`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaLoaiPhong(loaiPhong.id);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <tr>
      <td>{loaiPhong.ten}</td>
      <td>{tienHienThi(loaiPhong.don_gia_thue_gio)}</td>
      <td>{tienHienThi(loaiPhong.don_gia_dien_nuoc_gio)}</td>
      <td>{tienHienThi(loaiPhong.don_gia_khau_hao_gio)}</td>
      <td>{ngayHienThi(loaiPhong.hieu_luc_tu)}</td>
      <td>{ngayHienThi(loaiPhong.hieu_luc_den)}</td>
      {(canEdit || canDelete) && (
        <td>
          <div className={styles.rowActions}>
            {canEdit && (
              <button type="button" className={styles.btnEdit} onClick={onEdit} disabled={isPending}>Sửa</button>
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
