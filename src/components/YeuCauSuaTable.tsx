"use client";

import { useState, useTransition } from "react";
import { xuLyYeuCauSua, rutYeuCauSua } from "@/app/dashboard/hoc-phi/yeu-cau-sua/actions";
import { COT_HOP_DONG_LABEL, TRANG_THAI_YEU_CAU_LABEL, hienThiGiaTriHopDong } from "@/lib/hop-dong-hien-thi";
import { tienHienThi } from "@/lib/formatCurrency";
import { useToast } from "./ToastProvider";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

export type YeuCauRow = {
  id: string;
  hop_dong_id: string;
  ho_ten: string;
  ma_hoc_sinh: string;
  nguoi_de_xuat_id: string;
  nguoi_de_xuat: string;
  ly_do_de_xuat: string;
  truoc: Record<string, unknown>;
  moi: Record<string, unknown>;
  trang_thai: string;
  nguoi_xu_ly: string | null;
  xu_ly_luc: string | null;
  ly_do_xu_ly: string | null;
  created_at: string;
};

const COT_SO_SANH = ["gia_niem_yet", "loai_giam_gia", "gia_tri_giam_gia", "hinh_thuc_dong", "ghi_chu"];

const BADGE: Record<string, string> = {
  cho_duyet: "badgeChoDuyet",
  da_duyet: "badgeHoatDong",
  tu_choi: "badgeHuy",
  da_rut: "badgeNhap",
};

function ngay(v: string) {
  return new Date(v).toLocaleString("vi-VN");
}

// Các dòng "hiện tại → đề xuất" (chỉ cột thật sự khác).
function dongKhac(y: YeuCauRow) {
  const dong = COT_SO_SANH.filter((c) => JSON.stringify(y.truoc[c] ?? null) !== JSON.stringify(y.moi[c] ?? null)).map((c) => ({
    nhan: COT_HOP_DONG_LABEL[c] ?? c,
    cu: hienThiGiaTriHopDong(c, y.truoc[c], y.truoc.loai_giam_gia),
    moi: hienThiGiaTriHopDong(c, y.moi[c], y.moi.loai_giam_gia),
  }));
  return dong;
}

export default function YeuCauSuaTable({ list, isMaster, userId }: { list: YeuCauRow[]; isMaster: boolean; userId: string }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Học sinh</th>
            <th>Người đề xuất</th>
            <th>Nội dung đề xuất</th>
            <th>Lý do đề xuất</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((y) => (
            <Dong key={y.id} y={y} isMaster={isMaster} userId={userId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dong({ y, isMaster, userId }: { y: YeuCauRow; isMaster: boolean; userId: string }) {
  const [quyet, setQuyet] = useState<"duyet" | "tu_choi" | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();
  const dong = dongKhac(y);
  const doanhThuMoi = (() => {
    const g = Number(y.moi.gia_niem_yet);
    const v = Number(y.moi.gia_tri_giam_gia) || 0;
    const loai = y.moi.loai_giam_gia;
    const giam = loai === "phan_tram" ? Math.round((g * v) / 100) : loai === "co_dinh" ? v : 0;
    return g - Math.max(0, Math.min(giam, g));
  })();

  function handleRut() {
    if (!window.confirm(`Rút đề xuất sửa hợp đồng của "${y.ho_ten}"?`)) return;
    startTransition(async () => {
      const r = await rutYeuCauSua(y.id);
      if ("error" in r) showToast({ type: "error", message: `Rút đề xuất thất bại: ${r.error}` });
      else showToast({ type: "success", message: `Đã rút đề xuất sửa hợp đồng của "${y.ho_ten}".` });
    });
  }

  return (
    <tr>
      <td>
        {y.ho_ten} <span className={styles.mono}>({y.ma_hoc_sinh})</span>
        <div className={formStyles.hint}>{ngay(y.created_at)}</div>
      </td>
      <td>{y.nguoi_de_xuat}</td>
      <td>
        {dong.map((d) => (
          <div key={d.nhan} className={styles.logDiff}>
            {d.nhan}: <span className={styles.logOld}>{d.cu}</span> → <span className={styles.logNew}>{d.moi}</span>
          </div>
        ))}
        <div className={formStyles.hint}>Doanh thu thuần sau sửa: {tienHienThi(doanhThuMoi)}</div>
      </td>
      <td>{y.ly_do_de_xuat}</td>
      <td>
        <span className={`${styles.badge} ${styles[BADGE[y.trang_thai] ?? "badgeNhap"]}`}>
          {TRANG_THAI_YEU_CAU_LABEL[y.trang_thai] ?? y.trang_thai}
        </span>
        {y.trang_thai !== "cho_duyet" && y.xu_ly_luc && (
          <div className={formStyles.hint}>
            {y.nguoi_xu_ly} · {ngay(y.xu_ly_luc)}
            {y.ly_do_xu_ly && <div>Lý do: {y.ly_do_xu_ly}</div>}
          </div>
        )}
      </td>
      <td>
        {y.trang_thai === "cho_duyet" && (
          <div className={styles.rowActions}>
            {isMaster && (
              <>
                <button type="button" className={styles.btnEdit} onClick={() => setQuyet("duyet")} disabled={isPending}>
                  Duyệt
                </button>
                <button type="button" className={styles.btnEdit} onClick={() => setQuyet("tu_choi")} disabled={isPending}>
                  Từ chối
                </button>
              </>
            )}
            {y.nguoi_de_xuat_id === userId && (
              <button type="button" className={styles.btnEdit} onClick={handleRut} disabled={isPending}>
                Rút
              </button>
            )}
          </div>
        )}
        {quyet && <XuLyModal y={y} quyet={quyet} onClose={() => setQuyet(null)} />}
      </td>
    </tr>
  );
}

function XuLyModal({ y, quyet, onClose }: { y: YeuCauRow; quyet: "duyet" | "tu_choi"; onClose: () => void }) {
  const [lyDo, setLyDo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();
  const duyet = quyet === "duyet";
  const ten = duyet ? "Phê duyệt" : "Từ chối";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (lyDo.trim().length < 5) {
      setError(`Vui lòng nêu lý do ${duyet ? "phê duyệt" : "từ chối"} (tối thiểu 5 ký tự).`);
      return;
    }
    startTransition(async () => {
      const r = await xuLyYeuCauSua(y.id, quyet, lyDo);
      if ("error" in r) {
        setError(r.error);
        showToast({ type: "error", message: `${ten} yêu cầu thất bại: ${r.error}` });
        return;
      }
      showToast({
        type: "success",
        message: duyet
          ? `Đã phê duyệt và áp dụng chỉnh sửa hợp đồng của "${y.ho_ten}".`
          : `Đã từ chối đề xuất sửa hợp đồng của "${y.ho_ten}".`,
      });
      onClose();
    });
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{ten} yêu cầu — {y.ho_ten}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        {dongKhac(y).map((d) => (
          <div key={d.nhan} className={styles.logDiff}>
            {d.nhan}: <span className={styles.logOld}>{d.cu}</span> → <span className={styles.logNew}>{d.moi}</span>
          </div>
        ))}
        <p className={formStyles.hint} style={{ margin: "8px 0" }}>
          Lý do đề xuất ({y.nguoi_de_xuat}): {y.ly_do_de_xuat}
        </p>
        {duyet && (
          <p className={formStyles.hint}>
            Duyệt sẽ áp dụng ngay vào hợp đồng. Lịch kỳ đóng và phiếu thu đã lập không tự thay đổi.
          </p>
        )}
        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <div className={formStyles.field}>
            <label htmlFor="ly_do_xu_ly" className={formStyles.label}>
              Lý do {duyet ? "phê duyệt" : "từ chối"} (bắt buộc)
            </label>
            <textarea
              id="ly_do_xu_ly" rows={2} required className={formStyles.textarea} disabled={isPending}
              value={lyDo} onChange={(e) => setLyDo(e.target.value)}
            />
          </div>
          {error && <div className={formStyles.errorBox} role="alert">{error}</div>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnEdit} onClick={onClose} disabled={isPending}>Huỷ</button>
            <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
              {isPending ? "Đang xử lý…" : ten}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
