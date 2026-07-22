"use client";

import { useState, useTransition } from "react";
import { xoaPhongHoc } from "@/app/dashboard/van-hanh/phong-hoc/actions";
import PhongHocEditModal from "./PhongHocEditModal";
import styles from "@/app/dashboard/van-hanh/van-hanh.module.css";

type MaTen = { ma: string | number; ten: string };

export type PhongHocRow = {
  id: number;
  ten: string;
  chi_nhanh_id: number;
  chi_nhanh_ten: string;
  loai_phong_id: number;
  loai_phong_ten: string | null;
};

export default function PhongHocTable({
  list,
  isMasterAdmin,
  editableChiNhanhIds,
  deletableChiNhanhIds,
  showLoaiPhongColumn,
  chiNhanhList,
  loaiPhongList,
}: {
  list: PhongHocRow[];
  isMasterAdmin: boolean;
  editableChiNhanhIds: number[] | "all" | "none";
  deletableChiNhanhIds: number[] | "all" | "none";
  showLoaiPhongColumn: boolean;
  chiNhanhList: MaTen[];
  loaiPhongList: MaTen[];
}) {
  const [editingRow, setEditingRow] = useState<PhongHocRow | null>(null);

  function canOn(scope: number[] | "all" | "none", chiNhanhId: number): boolean {
    if (scope === "all") return true;
    if (scope === "none") return false;
    return scope.includes(chiNhanhId);
  }

  const anyActionColumn = list.some(
    (p) => canOn(editableChiNhanhIds, p.chi_nhanh_id) || canOn(deletableChiNhanhIds, p.chi_nhanh_id)
  );

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Tên phòng</th>
            <th>Chi nhánh</th>
            {showLoaiPhongColumn && <th>Loại phòng</th>}
            {anyActionColumn && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((p) => {
            const canEdit = canOn(editableChiNhanhIds, p.chi_nhanh_id);
            const canDelete = canOn(deletableChiNhanhIds, p.chi_nhanh_id);
            return (
              <PhongHocRowItem
                key={p.id}
                phongHoc={p}
                canEdit={canEdit}
                canDelete={canDelete}
                showLoaiPhongColumn={showLoaiPhongColumn}
                anyActionColumn={anyActionColumn}
                onEdit={() => setEditingRow(p)}
              />
            );
          })}
        </tbody>
      </table>

      {editingRow && (
        <PhongHocEditModal
          phongHoc={editingRow}
          fullEdit={isMasterAdmin}
          chiNhanhList={chiNhanhList}
          loaiPhongList={loaiPhongList}
          onClose={() => setEditingRow(null)}
        />
      )}
    </div>
  );
}

function PhongHocRowItem({
  phongHoc,
  canEdit,
  canDelete,
  showLoaiPhongColumn,
  anyActionColumn,
  onEdit,
}: {
  phongHoc: PhongHocRow;
  canEdit: boolean;
  canDelete: boolean;
  showLoaiPhongColumn: boolean;
  anyActionColumn: boolean;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(`Xoá phòng "${phongHoc.ten}"? Có thể khôi phục sau (xoá mềm).`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaPhongHoc(phongHoc.id);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <tr>
      <td>{phongHoc.ten}</td>
      <td>{phongHoc.chi_nhanh_ten}</td>
      {showLoaiPhongColumn && <td>{phongHoc.loai_phong_ten ?? "—"}</td>}
      {anyActionColumn && (
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
