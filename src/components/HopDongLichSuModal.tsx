"use client";

import { useEffect, useState } from "react";
import { layLichSuHopDong, type NhatKyHopDong } from "@/app/dashboard/hoc-phi/hop-dong/actions";
import { COT_HOP_DONG_LABEL, TRANG_THAI_YEU_CAU_LABEL, hienThiGiaTriHopDong } from "@/lib/hop-dong-hien-thi";
import type { HopDongRow } from "./HopDongTable";
import styles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

const HANH_DONG_LABEL: Record<string, string> = {
  tao_hop_dong: "Tạo hợp đồng",
  sua_hop_dong: "Sửa hợp đồng (Master Admin)",
  kich_hoat_hop_dong: "Kích hoạt hợp đồng",
  huy_hop_dong: "Huỷ hợp đồng",
  xoa_mem_hop_dong: "Xoá mềm hợp đồng",
  cap_nhat_hop_dong: "Cập nhật hợp đồng",
  sua_hop_dong_theo_yeu_cau: "Sửa hợp đồng theo yêu cầu đã duyệt",
  de_xuat_sua_hop_dong: "Admin Tuyển sinh đề xuất chỉnh sửa",
  duyet_yeu_cau_sua_hop_dong: "Master Admin phê duyệt yêu cầu",
  tu_choi_yeu_cau_sua_hop_dong: "Master Admin từ chối yêu cầu",
  rut_yeu_cau_sua_hop_dong: "Người đề xuất rút yêu cầu",
};

type DongDiff = { cot: string; nhan: string; cu: string | null; moi: string };

// Gom các dòng "cũ → mới" cho 1 bản ghi nhật ký (hợp đồng hoặc sự kiện của yêu cầu sửa).
function tinhDongDiff(n: NhatKyHopDong): DongDiff[] {
  const loaiGiamSau = n.sau?.loai_giam_gia ?? n.truoc?.loai_giam_gia;
  const laSuKienYeuCau = n.hanh_dong.endsWith("yeu_cau_sua_hop_dong") && n.hanh_dong !== "sua_hop_dong_theo_yeu_cau";
  if (laSuKienYeuCau && n.hanh_dong !== "de_xuat_sua_hop_dong") {
    return [{
      cot: "trang_thai_yeu_cau",
      nhan: "Trạng thái yêu cầu",
      cu: TRANG_THAI_YEU_CAU_LABEL[String(n.truoc?.trang_thai)] ?? String(n.truoc?.trang_thai ?? "—"),
      moi: TRANG_THAI_YEU_CAU_LABEL[String(n.sau?.trang_thai)] ?? String(n.sau?.trang_thai ?? "—"),
    }];
  }
  const bo = laSuKienYeuCau ? ["hop_dong_id", "trang_thai"] : [];
  return Object.keys(n.sau ?? {})
    .filter((c) => !bo.includes(c))
    .filter((c) => !laSuKienYeuCau || JSON.stringify(n.truoc?.[c]) !== JSON.stringify(n.sau?.[c]))
    .map((c) => ({
      cot: c,
      nhan: COT_HOP_DONG_LABEL[c] ?? c,
      cu: n.truoc ? hienThiGiaTriHopDong(c, n.truoc[c], n.truoc.loai_giam_gia ?? loaiGiamSau) : null,
      moi: hienThiGiaTriHopDong(c, n.sau?.[c], loaiGiamSau),
    }));
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
              const dong = tinhDongDiff(n);
              return (
                <li key={n.id} className={styles.logItem}>
                  <div className={styles.logHead}>
                    <strong>{HANH_DONG_LABEL[n.hanh_dong] ?? n.hanh_dong}</strong>
                    <span className={styles.logMeta}>
                      {new Date(n.created_at).toLocaleString("vi-VN")} · {n.nguoi}
                    </span>
                  </div>
                  {n.ly_do && <div className={styles.logReason}>Lý do: {n.ly_do}</div>}
                  {dong.length > 0 && (
                    <table className={styles.logDiff}>
                      <tbody>
                        {dong.map((d) => (
                          <tr key={d.cot}>
                            <th>{d.nhan}</th>
                            <td>
                              {d.cu !== null && (
                                <>
                                  <span className={styles.logOld}>{d.cu}</span>
                                  {" → "}
                                </>
                              )}
                              <span className={styles.logNew}>{d.moi}</span>
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
