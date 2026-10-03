"use client";

import { useState, useTransition } from "react";
import { duyetHocPhan, tuChoiHocPhan, xoaHocPhan } from "@/app/dashboard/hoc-lieu/hoc-phan/actions";
import { useToast } from "./ToastProvider";
import HocPhanEditModal from "./HocPhanEditModal";
import styles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export type HocPhanRow = {
  id: string;
  mon_hoc_id: string;
  ma: number;
  ten: string;
  mo_ta: string | null;
  mon_hoc_ten: string;
  cap_hoc_ten: string;
  trang_thai: string;
  ly_do_tu_choi: string | null;
  tao_boi_toi: boolean;
};

const NHAN_TRANG_THAI: Record<string, string> = { cho_duyet: "Chờ duyệt", da_duyet: "Đã duyệt", tu_choi: "Bị từ chối" };

// quanLy: MA/HT/TBM (sửa/xoá mọi dòng + duyệt). laGv: chỉ sửa/xoá học phần CHƯA duyệt do chính mình tạo.
export default function HocPhanTable({ list, quanLy, laGv }: { list: HocPhanRow[]; quanLy: boolean; laGv: boolean }) {
  const [editingRow, setEditingRow] = useState<HocPhanRow | null>(null);

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Cấp học</th>
            <th>Môn học</th>
            <th>Mã</th>
            <th>Tên học phần</th>
            <th>Mô tả</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((hp) => (
            <HocPhanRowItem key={hp.id} hocPhan={hp} quanLy={quanLy} laGv={laGv} onEdit={() => setEditingRow(hp)} />
          ))}
        </tbody>
      </table>

      {editingRow && <HocPhanEditModal laGv={laGv} hocPhan={editingRow} onClose={() => setEditingRow(null)} />}
    </div>
  );
}

function HocPhanRowItem({
  hocPhan,
  quanLy,
  laGv,
  onEdit,
}: {
  hocPhan: HocPhanRow;
  quanLy: boolean;
  laGv: boolean;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleDelete() {
    const confirmed = window.confirm(`Xoá học phần "${hocPhan.ten}"? Có thể khôi phục sau (xoá mềm).`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaHocPhan(hocPhan.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Xoá học phần thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã xoá học phần "${hocPhan.ten}" thành công.` });
      }
    });
  }

  const choPhep = quanLy || (laGv && hocPhan.tao_boi_toi && hocPhan.trang_thai !== "da_duyet");
  // Không tự duyệt học phần do chính mình tạo (DB cũng chặn) → ẩn nút để khỏi nhầm.
  const coTheDuyet = quanLy && hocPhan.trang_thai === "cho_duyet" && !hocPhan.tao_boi_toi;

  function handleDuyet() {
    setError(null);
    startTransition(async () => {
      const result = await duyetHocPhan(hocPhan.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Duyệt học phần thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã duyệt học phần "${hocPhan.ten}".` });
      }
    });
  }

  function handleTuChoi() {
    const lyDo = window.prompt(`Lý do từ chối học phần "${hocPhan.ten}":`);
    if (lyDo === null) return;
    setError(null);
    startTransition(async () => {
      const result = await tuChoiHocPhan(hocPhan.id, lyDo);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Từ chối học phần thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã từ chối học phần "${hocPhan.ten}".` });
      }
    });
  }

  return (
    <tr>
      <td>{hocPhan.cap_hoc_ten}</td>
      <td>{hocPhan.mon_hoc_ten}</td>
      <td className={styles.mono}>{hocPhan.ma == null ? "—" : String(hocPhan.ma).padStart(2, "0")}</td>
      <td>{hocPhan.ten}</td>
      <td>{hocPhan.mo_ta ?? "—"}</td>
      <td>
        {NHAN_TRANG_THAI[hocPhan.trang_thai] ?? hocPhan.trang_thai}
        {hocPhan.trang_thai === "tu_choi" && hocPhan.ly_do_tu_choi ? ` — ${hocPhan.ly_do_tu_choi}` : ""}
      </td>
      {choPhep || coTheDuyet ? (
        <td>
          <div className={styles.rowActions}>
            {coTheDuyet && (
              <>
                <button type="button" className={styles.btnEdit} onClick={handleDuyet} disabled={isPending}>Duyệt</button>
                <button type="button" className={styles.btnDelete} onClick={handleTuChoi} disabled={isPending}>Từ chối</button>
              </>
            )}
            {choPhep && (<>
            <button type="button" className={styles.btnEdit} onClick={onEdit} disabled={isPending}>Sửa</button>
            <button type="button" className={styles.btnDelete} onClick={handleDelete} disabled={isPending}>
              {isPending ? "Đang xử lý…" : "Xoá"}
            </button>
            </>)}
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
        </td>
      ) : (
        <td></td>
      )}
    </tr>
  );
}
