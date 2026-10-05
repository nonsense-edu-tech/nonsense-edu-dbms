"use client";

import { useState, useTransition } from "react";
import { kichHoatHopDong, huyHopDong } from "@/app/dashboard/hoc-phi/hop-dong/actions";
import { TRANG_THAI_HOP_DONG_LABEL, TRANG_THAI_THU_LABEL, tinhTrangThaiThu } from "./hocPhiOptions";
import { tienHienThi } from "@/lib/formatCurrency";
import { useToast } from "./ToastProvider";
import HopDongEditModal from "./HopDongEditModal";
import HopDongLichSuModal from "./HopDongLichSuModal";
import Link from "next/link";
import styles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

export type HopDongRow = {
  id: string;
  ho_ten: string;
  ma_hoc_sinh: string;
  chuong_trinh_ten: string;
  goi_ten: string;
  gia_niem_yet: number;
  so_tien_giam: number;
  doanh_thu_thuan: number;
  thuc_thu: number;
  trang_thai: string;
  loai_giam_gia: string;
  gia_tri_giam_gia: number;
  hinh_thuc_dong: string;
  ghi_chu: string | null;
  yeu_cau_cho_duyet: boolean; // hợp đồng đang có yêu cầu sửa chờ Master Admin duyệt
};

const BADGE_CLASS: Record<string, string> = {
  nhap: "badgeNhap",
  cho_duyet: "badgeChoDuyet",
  dang_hoat_dong: "badgeHoatDong",
  hoan_thanh: "badgeHoanThanh",
  da_huy: "badgeHuy",
};

const BADGE_CLASS_THU: Record<string, string> = {
  chua_du: "badgeChuaDu",
  du: "badgeDu",
  du_thua: "badgeDuThua",
};

const TRANG_THAI_CO_THU_TIEN = ["dang_hoat_dong", "hoan_thanh"];

export default function HopDongTable({
  list,
  canEdit,
  isMaster,
  isAdminTs,
}: {
  list: HopDongRow[];
  canEdit: boolean;
  isMaster: boolean;
  isAdminTs: boolean;
}) {
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
            <th>Thực thu</th>
            <th>Trạng thái</th>
            <th>Trạng thái thu</th>
            {canEdit && <th></th>}
          </tr>
        </thead>
        <tbody>
          {list.map((hd) => (
            <HopDongRowItem key={hd.id} hd={hd} canEdit={canEdit} isMaster={isMaster} isAdminTs={isAdminTs} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HopDongRowItem({
  hd,
  canEdit,
  isMaster,
  isAdminTs,
}: {
  hd: HopDongRow;
  canEdit: boolean;
  isMaster: boolean;
  isAdminTs: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [moSua, setMoSua] = useState(false);
  const [moDeXuat, setMoDeXuat] = useState(false);
  const [moLichSu, setMoLichSu] = useState(false);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  const coTinhTrangThaiThu = TRANG_THAI_CO_THU_TIEN.includes(hd.trang_thai);
  const trangThaiThu = coTinhTrangThaiThu ? tinhTrangThaiThu(hd.doanh_thu_thuan, hd.thuc_thu) : null;

  function handleKichHoat() {
    setError(null);
    startTransition(async () => {
      const result = await kichHoatHopDong(hd.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Kích hoạt hợp đồng thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã kích hoạt hợp đồng của "${hd.ho_ten}" thành công.` });
      }
    });
  }

  function handleHuy() {
    const confirmed = window.confirm(`Huỷ hợp đồng của "${hd.ho_ten}"?`);
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await huyHopDong(hd.id);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Huỷ hợp đồng thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: `Đã huỷ hợp đồng của "${hd.ho_ten}" thành công.` });
      }
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
      <td>{coTinhTrangThaiThu ? tienHienThi(hd.thuc_thu) : "—"}</td>
      <td>
        <span className={`${styles.badge} ${styles[BADGE_CLASS[hd.trang_thai] ?? "badgeNhap"]}`}>
          {TRANG_THAI_HOP_DONG_LABEL[hd.trang_thai] ?? hd.trang_thai}
        </span>
      </td>
      <td>
        {trangThaiThu ? (
          <span className={`${styles.badge} ${styles[BADGE_CLASS_THU[trangThaiThu]]}`}>
            {TRANG_THAI_THU_LABEL[trangThaiThu]}
          </span>
        ) : (
          "—"
        )}
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
            {isMaster && hd.trang_thai !== "da_huy" && (
              <button type="button" className={styles.btnEdit} onClick={() => setMoSua(true)}>
                Sửa
              </button>
            )}
            {isAdminTs && hd.trang_thai !== "da_huy" && !hd.yeu_cau_cho_duyet && (
              <button type="button" className={styles.btnEdit} onClick={() => setMoDeXuat(true)}>
                Đề xuất sửa
              </button>
            )}
            {(isMaster || isAdminTs) && hd.yeu_cau_cho_duyet && (
              <Link href="/dashboard/hoc-phi/yeu-cau-sua" className={`${styles.badge} ${styles.badgeChoDuyet}`}>
                Đang chờ duyệt
              </Link>
            )}
            {isMaster && (
              <button type="button" className={styles.btnEdit} onClick={() => setMoLichSu(true)}>
                Lịch sử
              </button>
            )}
          </div>
          {error && <div className={styles.errorText}>{error}</div>}
          {moSua && <HopDongEditModal hd={hd} onClose={() => setMoSua(false)} />}
          {moDeXuat && <HopDongEditModal hd={hd} mode="de_xuat" onClose={() => setMoDeXuat(false)} />}
          {moLichSu && <HopDongLichSuModal hd={hd} onClose={() => setMoLichSu(false)} />}
        </td>
      )}
    </tr>
  );
}
