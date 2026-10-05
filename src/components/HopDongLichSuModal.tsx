"use client";

import { useEffect, useState } from "react";
import { layLichSuHopDong, type NhatKyHopDong } from "@/app/dashboard/hoc-phi/hop-dong/actions";
import { HINH_THUC_DONG_LABEL, LOAI_GIAM_GIA_LABEL, TRANG_THAI_HOP_DONG_LABEL } from "./hocPhiOptions";
import { tienHienThi } from "@/lib/formatCurrency";
import type { HopDongRow } from "./HopDongTable";
import styles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

const HANH_DONG_LABEL: Record<string, string> = {
  tao_hop_dong: "Tạo hợp đồng",
  sua_hop_dong: "Sửa hợp đồng (Master Admin)",
  kich_hoat_hop_dong: "Kích hoạt hợp đồng",
  huy_hop_dong: "Huỷ hợp đồng",
  xoa_mem_hop_dong: "Xoá mềm hợp đồng",
  cap_nhat_hop_dong: "Cập nhật hợp đồng",
};

const COT_LABEL: Record<string, string> = {
  goi_hoc_phi_id: "Gói học phí",
  gia_niem_yet: "Giá niêm yết",
  loai_giam_gia: "Loại giảm giá",
  gia_tri_giam_gia: "Giá trị giảm",
  so_tien_giam: "Số tiền giảm",
  doanh_thu_thuan: "Doanh thu thuần",
  hinh_thuc_dong: "Hình thức đóng",
  trang_thai: "Trạng thái",
  ghi_chu: "Ghi chú",
  nguoi_duyet: "Người duyệt",
  kich_hoat_luc: "Kích hoạt lúc",
  deleted_at: "Xoá mềm lúc",
};

const COT_TIEN = ["gia_niem_yet", "gia_tri_giam_gia", "so_tien_giam", "doanh_thu_thuan"];

function hienThiGiaTri(cot: string, v: unknown, loaiGiam?: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (cot === "gia_tri_giam_gia" && loaiGiam === "phan_tram") return `${v}%`;
  if (COT_TIEN.includes(cot) && typeof v === "number") return tienHienThi(v);
  if (cot === "hinh_thuc_dong") return HINH_THUC_DONG_LABEL[String(v)] ?? String(v);
  if (cot === "loai_giam_gia") return LOAI_GIAM_GIA_LABEL[String(v)] ?? String(v);
  if (cot === "trang_thai") return TRANG_THAI_HOP_DONG_LABEL[String(v)] ?? String(v);
  if (cot === "kich_hoat_luc" || cot === "deleted_at") return new Date(String(v)).toLocaleString("vi-VN");
  return String(v);
}

export default function HopDongLichSuModal({ hd, onClose }: { hd: HopDongRow; onClose: () => void }) {
  const [list, setList] = useState<NhatKyHopDong[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let huy = false;
    layLichSuHopDong(hd.id).then((r) => {
      if (huy) return;
      if ("error" in r) setError(r.error);
      else setList(r.list);
    });
    return () => {
      huy = true;
    };
  }, [hd.id]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalPanel} ${styles.modalPanelWide}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Lịch sử thay đổi — {hd.ho_ten}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        {error && <div className={styles.errorText}>{error}</div>}
        {!error && list === null && <p className={styles.empty}>Đang tải…</p>}
        {list !== null && list.length === 0 && (
          <p className={styles.empty}>
            Chưa có bản ghi nào. Hợp đồng tạo trước khi bật nhật ký sẽ chỉ có lịch sử từ lần thay đổi đầu tiên.
          </p>
        )}
        {list !== null && list.length > 0 && (
          <ul className={styles.logList}>
            {list.map((n) => {
              const cot = Object.keys(n.sau ?? {});
              const loaiGiamSau = n.sau?.loai_giam_gia ?? n.truoc?.loai_giam_gia;
              return (
                <li key={n.id} className={styles.logItem}>
                  <div className={styles.logHead}>
                    <strong>{HANH_DONG_LABEL[n.hanh_dong] ?? n.hanh_dong}</strong>
                    <span className={styles.logMeta}>
                      {new Date(n.created_at).toLocaleString("vi-VN")} · {n.nguoi}
                    </span>
                  </div>
                  {n.ly_do && <div className={styles.logReason}>Lý do: {n.ly_do}</div>}
                  {cot.length > 0 && (
                    <table className={styles.logDiff}>
                      <tbody>
                        {cot.map((c) => (
                          <tr key={c}>
                            <th>{COT_LABEL[c] ?? c}</th>
                            <td>
                              {n.truoc ? (
                                <>
                                  <span className={styles.logOld}>{hienThiGiaTri(c, n.truoc[c], n.truoc.loai_giam_gia ?? loaiGiamSau)}</span>
                                  {" → "}
                                </>
                              ) : null}
                              <span className={styles.logNew}>{hienThiGiaTri(c, n.sau?.[c], loaiGiamSau)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className={styles.modalActions} style={{ marginTop: 16 }}>
          <button type="button" className={styles.btnEdit} onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
