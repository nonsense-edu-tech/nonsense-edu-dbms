"use client";

import { useState, useTransition } from "react";
import { tatToanHopDong } from "@/app/dashboard/hoc-phi/hop-dong/actions";
import { tienHienThi } from "@/lib/formatCurrency";
import { useToast } from "./ToastProvider";
import type { HopDongRow } from "./HopDongTable";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

// Tất toán hợp đồng (học sinh nghỉ/bảo lưu/chuyển lớp): miễn phần còn phải thu. DB kiểm lại quyền + điều kiện.
export default function HopDongTatToanModal({ hd, onClose }: { hd: HopDongRow; onClose: () => void }) {
  const [lyDo, setLyDo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();
  const conPhaiThu = Math.max(0, hd.doanh_thu_thuan - hd.thuc_thu);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (lyDo.trim().length < 5) {
      setError("Vui lòng nhập lý do tất toán (tối thiểu 5 ký tự) — lý do được lưu vào nhật ký.");
      return;
    }
    startTransition(async () => {
      const result = await tatToanHopDong(hd.id, lyDo);
      if ("error" in result) {
        setError(result.error);
        showToast({ type: "error", message: `Tất toán hợp đồng thất bại: ${result.error}` });
        return;
      }
      showToast({
        type: "success",
        message: `Đã tất toán hợp đồng của "${hd.ho_ten}": miễn ${tienHienThi(result.soTienMien)}, doanh thu ghi nhận ${tienHienThi(result.thucThu)}.`,
      });
      onClose();
    });
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Tất toán hợp đồng — {hd.ho_ten}</h3>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.previewBox} style={{ marginBottom: 12 }}>
          {hd.goi_ten} · {hd.chuong_trinh_ten}
          <br />
          Doanh thu thuần hiện tại: <strong>{tienHienThi(hd.doanh_thu_thuan)}</strong> · đã thu: <strong>{tienHienThi(hd.thuc_thu)}</strong>
          <br />
          Phần còn phải thu sẽ được MIỄN: <strong>{tienHienThi(conPhaiThu)}</strong>
          <br />
          Sau khi tất toán: hợp đồng chuyển &quot;Hoàn thành&quot;, doanh thu ghi nhận = <strong>{tienHienThi(hd.thuc_thu)}</strong>.
        </div>
        <div className={styles.warnBox} role="alert" style={{ marginBottom: 12 }}>
          Không thể hoàn tác trên giao diện. Phiếu thu đã lập không bị thay đổi; mọi bước được ghi vào nhật ký.
        </div>

        <form onSubmit={handleSubmit} className={formStyles.form} noValidate>
          <div className={formStyles.field}>
            <label htmlFor="ly_do_tat_toan" className={formStyles.label}>Lý do tất toán (bắt buộc)</label>
            <textarea
              id="ly_do_tat_toan" rows={2} required className={formStyles.textarea} disabled={isPending}
              placeholder="VD: Học sinh nghỉ học từ tháng 9, thỏa thuận miễn phần còn lại"
              value={lyDo} onChange={(e) => setLyDo(e.target.value)}
            />
          </div>
          {error && <div className={formStyles.errorBox} role="alert">{error}</div>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnEdit} onClick={onClose} disabled={isPending}>Huỷ</button>
            <button type="submit" className={formStyles.btnPrimary} disabled={isPending}>
              {isPending ? "Đang lưu…" : "Xác nhận tất toán"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
