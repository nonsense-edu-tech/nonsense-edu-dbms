"use client";

import { useState, useTransition } from "react";
import { xoaChiNhanh, ganQuanLy, goQuanLy } from "@/app/dashboard/chi-nhanh/actions";
import ChiNhanhEditModal from "./ChiNhanhEditModal";
import styles from "@/app/dashboard/chi-nhanh/chi-nhanh.module.css";

export type QuanLyGan = { assignment_id: number; user_id: string; ten_hien_thi: string };
export type QuanLyOption = { user_id: string; ten_hien_thi: string };

export type ChiNhanhRow = {
  id: number;
  ma: string;
  ten: string;
  dia_chi: string | null;
  quan_ly: QuanLyGan[];
};

export default function ChiNhanhTable({
  list,
  quanLyOptions,
  canEdit,
  canDelete,
}: {
  list: ChiNhanhRow[];
  quanLyOptions: QuanLyOption[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [editingRow, setEditingRow] = useState<ChiNhanhRow | null>(null);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Mã</th>
            <th>Tên chi nhánh</th>
            <th>Địa chỉ</th>
            <th>Quản lý chi nhánh</th>
            {(canEdit || canDelete) && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((cn) => (
            <ChiNhanhRowItem
              key={cn.id}
              chiNhanh={cn}
              quanLyOptions={quanLyOptions}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={() => setEditingRow(cn)}
            />
          ))}
        </tbody>
      </table>

      {editingRow && <ChiNhanhEditModal chiNhanh={editingRow} onClose={() => setEditingRow(null)} />}
    </div>
  );
}

function ChiNhanhRowItem({
  chiNhanh,
  quanLyOptions,
  canEdit,
  canDelete,
  onEdit,
}: {
  chiNhanh: ChiNhanhRow;
  quanLyOptions: QuanLyOption[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState("");

  const assignedIds = new Set(chiNhanh.quan_ly.map((q) => q.user_id));
  const khaDung = quanLyOptions.filter((o) => !assignedIds.has(o.user_id));

  function handleDelete() {
    const confirmed = window.confirm(`Xoá chi nhánh "${chiNhanh.ten}"? Có thể khôi phục sau (xoá mềm).`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaChiNhanh(chiNhanh.id);
      if ("error" in result) setError(result.error);
    });
  }

  function handleAssign() {
    if (!selectedUserId) return;
    setError(null);
    const formData = new FormData();
    formData.set("chi_nhanh_id", String(chiNhanh.id));
    formData.set("user_id", selectedUserId);
    startTransition(async () => {
      const result = await ganQuanLy(formData);
      if ("error" in result) setError(result.error);
      else setSelectedUserId("");
    });
  }

  function handleRemove(assignmentId: number) {
    setError(null);
    startTransition(async () => {
      const result = await goQuanLy(assignmentId);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <tr>
      <td className={styles.mono}>{chiNhanh.ma}</td>
      <td>{chiNhanh.ten}</td>
      <td>{chiNhanh.dia_chi ?? "—"}</td>
      <td>
        <div className={styles.managerList}>
          {chiNhanh.quan_ly.length === 0 && "—"}
          {chiNhanh.quan_ly.map((q) => (
            <span key={q.assignment_id} className={styles.managerBadge}>
              {q.ten_hien_thi}
              {canEdit && (
                <button
                  type="button"
                  className={styles.managerRemove}
                  onClick={() => handleRemove(q.assignment_id)}
                  disabled={isPending}
                  title="Gỡ phân công"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
        {canEdit && khaDung.length > 0 && (
          <div className={styles.assignRow}>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={isPending}
            >
              <option value="">— Gán quản lý —</option>
              {khaDung.map((o) => (
                <option key={o.user_id} value={o.user_id}>{o.ten_hien_thi}</option>
              ))}
            </select>
            <button type="button" className={styles.btnEdit} onClick={handleAssign} disabled={isPending || !selectedUserId}>
              Gán
            </button>
          </div>
        )}
      </td>
      {(canEdit || canDelete) && (
        <td>
          <div className={styles.rowActions}>
            {canEdit && (
              <button type="button" className={styles.btnEdit} onClick={onEdit} disabled={isPending}>
                Sửa
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
