"use client";

import { useState, useTransition } from "react";
import { xoaChuongTrinhMonHoc } from "@/app/dashboard/van-hanh/chuong-trinh-mon-hoc/actions";
import styles from "@/app/dashboard/van-hanh/van-hanh.module.css";

export type ChuongTrinhMonHocRow = {
  chuong_trinh_ma: string;
  chuong_trinh_ten: string;
  cap_hoc_ma: number;
  cap_hoc_ten: string;
  mon_hoc_ma: number;
  mon_hoc_ten: string;
};

export default function ChuongTrinhMonHocTable({
  list,
  canDelete,
}: {
  list: ChuongTrinhMonHocRow[];
  canDelete: boolean;
}) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Chương trình</th>
            <th>Cấp học</th>
            <th>Môn học</th>
            {canDelete && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((row) => (
            <RowItem key={`${row.chuong_trinh_ma}-${row.cap_hoc_ma}-${row.mon_hoc_ma}`} row={row} canDelete={canDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowItem({ row, canDelete }: { row: ChuongTrinhMonHocRow; canDelete: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(`Gỡ môn "${row.mon_hoc_ten}" khỏi chương trình "${row.chuong_trinh_ten}"?`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await xoaChuongTrinhMonHoc(row.chuong_trinh_ma, row.cap_hoc_ma, row.mon_hoc_ma);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <tr>
      <td>{row.chuong_trinh_ten}</td>
      <td>{row.cap_hoc_ten}</td>
      <td>{row.mon_hoc_ten}</td>
      {canDelete && (
        <td>
          <div className={styles.rowActions}>
            <button type="button" className={styles.btnDelete} onClick={handleDelete} disabled={isPending}>
              {isPending ? "Đang gỡ…" : "Gỡ"}
            </button>
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
        </td>
      )}
    </tr>
  );
}
