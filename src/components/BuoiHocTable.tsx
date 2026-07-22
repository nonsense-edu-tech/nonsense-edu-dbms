"use client";

import { useState, useTransition } from "react";
import { xoaBuoiHoc } from "@/app/dashboard/van-hanh/buoi-hoc/actions";
import { tienHienThi } from "@/lib/formatCurrency";
import { ngayHienThi } from "@/lib/formatDate";
import BuoiHocEditModal from "./BuoiHocEditModal";
import BuoiHocChiPhiModal from "./BuoiHocChiPhiModal";
import type { MonHocOption, GvOption, PhongHocOption } from "./BuoiHocForm";
import styles from "@/app/dashboard/van-hanh/van-hanh.module.css";

const TRANG_THAI_LABEL: Record<string, string> = {
  du_kien: "Dự kiến",
  da_day: "Đã dạy",
  huy: "Huỷ",
};

const TRANG_THAI_BADGE: Record<string, string> = {
  du_kien: "badgeDuKien",
  da_day: "badgeDaDay",
  huy: "badgeHuy",
};

export type BuoiHocRow = {
  id: number;
  lop_id: number;
  lop_nhan: string;
  mon_hoc_ma: number;
  mon_hoc_ten: string;
  cap_hoc_ma: number;
  gv_id: string | null;
  gv_ten: string | null;
  phong_hoc_id: number | null;
  phong_hoc_ten: string | null;
  ngay: string;
  gio_bat_dau: string | null;
  gio_ket_thuc: string | null;
  trang_thai: string;
  thu_lao_gv: number | null;
  chi_phi_phong: number | null;
};

export default function BuoiHocTable({
  list,
  editableIds,
  deletableIds,
  canReassignGv,
  canSeeCost,
  monHocList,
  gvList,
  phongHocList,
}: {
  list: BuoiHocRow[];
  editableIds: number[] | "all";
  deletableIds: number[] | "all";
  canReassignGv: boolean;
  canSeeCost: boolean;
  monHocList: MonHocOption[];
  gvList: GvOption[];
  phongHocList: PhongHocOption[];
}) {
  const [editingRow, setEditingRow] = useState<BuoiHocRow | null>(null);
  const [costRow, setCostRow] = useState<BuoiHocRow | null>(null);

  function canOn(scope: number[] | "all", id: number): boolean {
    return scope === "all" || scope.includes(id);
  }

  const anyActionColumn = list.some(
    (b) => canOn(editableIds, b.id) || canOn(deletableIds, b.id) || canSeeCost
  );

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Lớp</th>
            <th>Môn học</th>
            <th>GV</th>
            <th>Phòng</th>
            <th>Ngày</th>
            <th>Giờ</th>
            <th>Trạng thái</th>
            {canSeeCost && <th>Thù lao GV</th>}
            {canSeeCost && <th>Chi phí phòng</th>}
            {anyActionColumn && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((b) => (
            <BuoiHocRowItem
              key={b.id}
              buoiHoc={b}
              canEdit={canOn(editableIds, b.id)}
              canDelete={canOn(deletableIds, b.id)}
              canSeeCost={canSeeCost}
              anyActionColumn={anyActionColumn}
              onEdit={() => setEditingRow(b)}
              onEditCost={() => setCostRow(b)}
            />
          ))}
        </tbody>
      </table>

      {editingRow && (
        <BuoiHocEditModal
          buoiHoc={editingRow}
          canReassignGv={canReassignGv}
          monHocList={monHocList}
          gvList={gvList}
          phongHocList={phongHocList}
          onClose={() => setEditingRow(null)}
        />
      )}

      {costRow && <BuoiHocChiPhiModal buoiHoc={costRow} onClose={() => setCostRow(null)} />}
    </div>
  );
}

function BuoiHocRowItem({
  buoiHoc,
  canEdit,
  canDelete,
  canSeeCost,
  anyActionColumn,
  onEdit,
  onEditCost,
}: {
  buoiHoc: BuoiHocRow;
  canEdit: boolean;
  canDelete: boolean;
  canSeeCost: boolean;
  anyActionColumn: boolean;
  onEdit: () => void;
  onEditCost: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(`Xoá buổi học "${buoiHoc.lop_nhan}" ngày ${ngayHienThi(buoiHoc.ngay)}?`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaBuoiHoc(buoiHoc.id);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <tr>
      <td>{buoiHoc.lop_nhan}</td>
      <td>{buoiHoc.mon_hoc_ten}</td>
      <td>{buoiHoc.gv_ten ?? "—"}</td>
      <td>{buoiHoc.phong_hoc_ten ?? "—"}</td>
      <td>{ngayHienThi(buoiHoc.ngay)}</td>
      <td>{buoiHoc.gio_bat_dau ?? "—"}{buoiHoc.gio_ket_thuc ? ` - ${buoiHoc.gio_ket_thuc}` : ""}</td>
      <td>
        <span className={`${styles.badge} ${styles[TRANG_THAI_BADGE[buoiHoc.trang_thai]] ?? ""}`}>
          {TRANG_THAI_LABEL[buoiHoc.trang_thai] ?? buoiHoc.trang_thai}
        </span>
      </td>
      {canSeeCost && <td>{buoiHoc.thu_lao_gv != null ? tienHienThi(buoiHoc.thu_lao_gv) : "—"}</td>}
      {canSeeCost && <td>{buoiHoc.chi_phi_phong != null ? tienHienThi(buoiHoc.chi_phi_phong) : "—"}</td>}
      {anyActionColumn && (
        <td>
          <div className={styles.rowActions}>
            {canEdit && (
              <button type="button" className={styles.btnEdit} onClick={onEdit} disabled={isPending}>Sửa</button>
            )}
            {canSeeCost && (
              <button type="button" className={styles.btnEdit} onClick={onEditCost} disabled={isPending}>Chi phí</button>
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
