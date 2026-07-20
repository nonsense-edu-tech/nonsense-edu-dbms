"use client";

import { useState, useTransition } from "react";
import { kichHoatHopDong, huyHopDong } from "@/app/dashboard/hoc-phi/hop-dong/actions";
import { TRANG_THAI_HOP_DONG_LABEL } from "./hocPhiOptions";
import { tienHienThi } from "@/lib/formatCurrency";
import styles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

export type HopDongRow = {
  id: number;
  ho_ten: string;
  ma_hoc_sinh: string;
  chuong_trinh_ten: string;
  goi_ten: string;
  gia_niem_yet: number;
  so_tien_giam: number;
  doanh_thu_thuan: number;
  trang_thai: string;
};

const BADGE_CLASS: Record<string, string> = {
  nhap: "badgeNhap",
  cho_duyet: "badgeChoDuyet",
  dang_hoat_dong: "badgeHoatDong",
  hoan_thanh: "badgeHoanThanh",
  da_huy: "badgeHuy",
};

export default function HopDongTable({ list, canEdit }: { list: HopDongRow[]; canEdit: boolean }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Học sinh</th>
            <th>Chương trình</th>
            <th>Gói học phí</th>
            <th>Giá niêm yết</th>
            <th>Giảm</th>
            <th>Doanh thu thuần</th>
            <th>Trạng thái</th>
            {canEdit && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((hd) => (
            <HopDongRowItem key={hd.id} hd={hd} canEdit={canEdit} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HopDongRowItem({ hd, canEdit }: { hd: HopDongRow; canEdit: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleKichHoat() {
    setError(null);
    startTransition(async () => {
      const result = await kichHoatHopDong(hd.id);
      if ("error" in result) setError(result.error);
    });
  }

  function handleHuy() {
    const confirmed = window.confirm(`Huỷ hợp đồng của "${hd.ho_ten}"?`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await huyHopDong(hd.id);
      if ("error" in result) setError(result.error);
    });
  }

  return (
    <tr>
      <td>{hd.ho_ten} <span className={styles.mono}>({hd.ma_hoc_sinh})</span></td>
      <td>{hd.chuong_trinh_ten}</td>
      <td>{hd.goi_ten}</td>
      <td>{tienHienThi(hd.gia_niem_yet)}</td>
      <td>{tienHienThi(hd.so_tien_giam)}</td>
      <td className={styles.mono}>{tienHienThi(hd.doanh_thu_thuan)}</td>
      <td>
        <span className={`${styles.badge} ${styles[BADGE_CLASS[hd.trang_thai] ?? "badgeNhap"]}`}>
          {TRANG_THAI_HOP_DONG_LABEL[hd.trang_thai] ?? hd.trang_thai}
        </span>
      </td>
      {canEdit && (
        <td>
          <div className={styles.rowActions}>
            {hd.trang_thai === "nhap" && (
              <>
                <button type="button" className={styles.btnEdit} onClick={handleKichHoat} disabled={isPending}>
                  {isPending ? "Đang lưu…" : "Kích hoạt"}
                </button>
                <button type="button" className={styles.btnEdit} onClick={handleHuy} disabled={isPending}>
                  Huỷ
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
