"use client";

import { useState, useTransition } from "react";
import { layDuongDanBienLai } from "@/app/dashboard/hoc-phi/thu-tien/actions";
import { HINH_THUC_THU_LABEL } from "./hocPhiOptions";
import { ngayHienThi } from "@/lib/formatDate";
import { tienHienThi } from "@/lib/formatCurrency";
import styles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

export type BienLaiRow = { ten_tep: string; duong_dan_luu_tru: string };

export type PhieuThuRow = {
  id: number;
  ma_phieu_thu: string;
  ho_ten: string;
  ma_hoc_sinh: string;
  so_tien: number;
  ngay_thu: string;
  hinh_thuc: string;
  la_phieu_dao: boolean;
  ghi_chu: string | null;
  bien_lai: BienLaiRow[];
};

export default function PhieuThuTable({ list }: { list: PhieuThuRow[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Mã phiếu</th>
            <th>Học sinh</th>
            <th>Số tiền</th>
            <th>Ngày thu</th>
            <th>Hình thức</th>
            <th>Biên lai</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          {list.map((pt) => (
            <tr key={pt.id}>
              <td className={styles.mono}>{pt.ma_phieu_thu}</td>
              <td>{pt.ho_ten} ({pt.ma_hoc_sinh})</td>
              <td className={pt.la_phieu_dao ? styles.errorText : undefined}>
                {pt.la_phieu_dao ? "− " : ""}{tienHienThi(pt.so_tien)}
                {pt.la_phieu_dao && <span className={`${styles.badge} ${styles.badgeHuy}`} style={{ marginLeft: 8 }}>Phiếu đảo</span>}
              </td>
              <td>{ngayHienThi(pt.ngay_thu.slice(0, 10))}</td>
              <td>{HINH_THUC_THU_LABEL[pt.hinh_thuc] ?? pt.hinh_thuc}</td>
              <td>
                {pt.bien_lai.length === 0 ? (
                  "—"
                ) : (
                  <div className={styles.rowActions}>
                    {pt.bien_lai.map((bl, i) => (
                      <XemBienLaiButton key={i} bienLai={bl} />
                    ))}
                  </div>
                )}
              </td>
              <td>{pt.ghi_chu ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function XemBienLaiButton({ bienLai }: { bienLai: BienLaiRow }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await layDuongDanBienLai(bienLai.duong_dan_luu_tru);
      if ("error" in result) {
        setError(result.error);
      } else {
        window.open(result.url, "_blank", "noopener,noreferrer");
      }
    });
  }

  return (
    <>
      <button type="button" className={styles.btnEdit} onClick={handleClick} disabled={isPending} title={bienLai.ten_tep}>
        {isPending ? "…" : "Xem"}
      </button>
      {error && <span className={styles.errorText}>{error}</span>}
    </>
  );
}
