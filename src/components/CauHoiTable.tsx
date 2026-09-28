"use client";

import { useState, useTransition } from "react";
import { xoaCauHoi, nopDuyetCauHoi, duyetCauHoi, tuChoiDuyetCauHoi } from "@/app/dashboard/hoc-lieu/cau-hoi/actions";
import { useToast } from "./ToastProvider";
import CauHoiEditModal from "./CauHoiEditModal";
import { TRANG_THAI_LABEL, TRANG_THAI_BADGE } from "./trangThaiCauHoi";
import styles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export type CauHoiRow = {
  id: string;
  ma_cau_hoi: string;
  noi_dung: string;
  do_kho: number | null;
  loi_giai: string | null;
  dap_an_text: string | null;
  trang_thai: string;
  nguoi_tao: string | null;
  cap_hoc_ten: string;
  mon_hoc_ten: string;
  hoc_phan_ten: string;
  bai_hoc_ten: string;
  chu_de_ten: string;
  dang_cau_ma: number;
  dang_cau_ten: string;
};

export default function CauHoiTable({
  list,
  canWrite,
  canDuyet,
  currentUserId,
}: {
  list: CauHoiRow[];
  canWrite: boolean;
  canDuyet: boolean;
  currentUserId: string;
}) {
  const [editingRow, setEditingRow] = useState<CauHoiRow | null>(null);
  const showActionsCol = canWrite || canDuyet;

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
            {showActionsCol && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((ch) => (
            <CauHoiRowItem
              key={ch.id}
              cauHoi={ch}
              canWrite={canWrite}
              canDuyet={canDuyet}
              currentUserId={currentUserId}
              onEdit={() => setEditingRow(ch)}
            />
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
  canDuyet,
  currentUserId,
  onEdit,
}: {
  cauHoi: CauHoiRow;
  canWrite: boolean;
  canDuyet: boolean;
  currentUserId: string;
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

  function handleNopDuyet() {
    setError(null);
    startTransition(async () => {
      const result = await nopDuyetCauHoi(cauHoi.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Nộp duyệt thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã nộp duyệt câu hỏi "${cauHoi.ma_cau_hoi}".` });
      }
    });
  }

  function handleDuyet() {
    setError(null);
    startTransition(async () => {
      const result = await duyetCauHoi(cauHoi.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Duyệt câu hỏi thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã duyệt câu hỏi "${cauHoi.ma_cau_hoi}".` });
      }
    });
  }

  function handleTuChoi() {
    const confirmed = window.confirm(`Trả câu hỏi "${cauHoi.ma_cau_hoi}" về Nháp để sửa lại?`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await tuChoiDuyetCauHoi(cauHoi.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Từ chối duyệt thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã trả câu hỏi "${cauHoi.ma_cau_hoi}" về Nháp.` });
      }
    });
  }

  const badgeClass = styles[TRANG_THAI_BADGE[cauHoi.trang_thai] ?? "badgeNhap"];
  const laNguoiTao = cauHoi.nguoi_tao === currentUserId;
  const showActionsCol = canWrite || canDuyet;

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
      {showActionsCol && (
        <td>
          <div className={styles.rowActions}>
            {canWrite && cauHoi.trang_thai === "nhap" && (
              <button type="button" className={styles.btnEdit} onClick={handleNopDuyet} disabled={isPending}>
                Nộp duyệt
              </button>
            )}
            {canDuyet && cauHoi.trang_thai === "cho_duyet" && (
              <>
                <button
                  type="button"
                  className={styles.btnApprove}
                  onClick={handleDuyet}
                  disabled={isPending || laNguoiTao}
                  title={laNguoiTao ? "Không thể tự duyệt câu hỏi do chính mình tạo" : undefined}
                >
                  Duyệt
                </button>
                <button type="button" className={styles.btnDelete} onClick={handleTuChoi} disabled={isPending}>
                  Từ chối
                </button>
              </>
            )}
            {canWrite && (
              <button type="button" className={styles.btnEdit} onClick={onEdit} disabled={isPending}>Sửa</button>
            )}
            {canWrite && (
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
