"use client";

import { useEffect, useState, useTransition } from "react";
import {
  layNangLucCauHoi,
  capNhatTienTrinh,
  ganNangLucCauHoi,
  xoaGanNangLuc,
  type NangLucOption,
  type NangLucCauHoiRow,
} from "@/app/dashboard/hoc-lieu/cau-hoi/nangLucActions";
import { useToast } from "./ToastProvider";
import formStyles from "./Form.module.css";
import modalStyles from "@/app/dashboard/hoc-lieu/hoc-lieu.module.css";

export type TienTrinhOption = { ma: string; ten: string };

// Modal gắn năng lực (Bước 5.5) — sửa tien_trinh (P1/P2/P3) và quản lý danh
// sách năng lực gắn cho 1 câu hỏi (cau_hoi_nang_luc). Danh sách năng lực khả
// dụng (nangLucOptions) lấy 1 lần ở page.tsx, KHÔNG lọc trùng ở server —
// modal tự loại năng lực đã gắn khỏi dropdown thêm mới.
export default function CauHoiNangLucModal({
  cauHoiId,
  maCauHoi,
  nangLucOptions,
  tienTrinhOptions,
  onClose,
}: {
  cauHoiId: string;
  maCauHoi: string;
  nangLucOptions: NangLucOption[];
  tienTrinhOptions: TienTrinhOption[];
  onClose: () => void;
}) {
  const showToast = useToast();
  const [isPending, startTransition] = useTransition();

  const [dangTai, setDangTai] = useState(true);
  const [loiTai, setLoiTai] = useState<string | null>(null);
  const [tienTrinh, setTienTrinh] = useState<string>("");
  const [nangLucList, setNangLucList] = useState<NangLucCauHoiRow[]>([]);

  const [nangLucChonId, setNangLucChonId] = useState("");
  const [laChinh, setLaChinh] = useState(false);

  // Tách fetch (chỉ setState trong callback .then, không setState đồng bộ
  // ngay trong thân effect — tránh lỗi react-hooks/set-state-in-effect) khỏi
  // taiLai (gọi từ handler sau khi gắn/gỡ năng lực, không nằm trong effect
  // nên setState đồng bộ trước đó không bị lint chặn).
  function fetchVaSetState() {
    return layNangLucCauHoi(cauHoiId).then((result) => {
      if ("error" in result) {
        setLoiTai(result.error);
      } else {
        setLoiTai(null);
        setTienTrinh(result.data.tienTrinh ?? "");
        setNangLucList(result.data.nangLucList);
      }
      setDangTai(false);
    });
  }

  function taiLai() {
    setDangTai(true);
    setLoiTai(null);
    fetchVaSetState();
  }

  useEffect(() => {
    fetchVaSetState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cauHoiId]);

  function handleLuuTienTrinh() {
    startTransition(async () => {
      const result = await capNhatTienTrinh(cauHoiId, tienTrinh || null);
      if ("error" in result) {
        showToast({ type: "error", message: `Cập nhật tiến trình thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: "Đã cập nhật tiến trình." });
      }
    });
  }

  function handleGan() {
    if (!nangLucChonId) {
      showToast({ type: "error", message: "Gắn năng lực thất bại: vui lòng chọn năng lực." });
      return;
    }
    startTransition(async () => {
      const result = await ganNangLucCauHoi(cauHoiId, nangLucChonId, laChinh);
      if ("error" in result) {
        showToast({ type: "error", message: `Gắn năng lực thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: "Đã gắn năng lực cho câu hỏi." });
        setNangLucChonId("");
        setLaChinh(false);
        taiLai();
      }
    });
  }

  function handleXoa(id: string, nhan: string) {
    const confirmed = window.confirm(`Gỡ năng lực "${nhan}" khỏi câu hỏi này?`);
    if (!confirmed) return;
    startTransition(async () => {
      const result = await xoaGanNangLuc(id);
      if ("error" in result) {
        showToast({ type: "error", message: `Gỡ năng lực thất bại: ${result.error}` });
      } else {
        showToast({ type: "success", message: "Đã gỡ năng lực khỏi câu hỏi." });
        taiLai();
      }
    });
  }

  const daGanIds = new Set(nangLucList.map((n) => n.nang_luc_id).filter((id): id is string => id !== null));
  const chonDuocList = nangLucOptions.filter((n) => !daGanIds.has(n.id));

  return (
    <div className={modalStyles.modalOverlay} onClick={onClose}>
      <div className={modalStyles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div className={modalStyles.modalHeader}>
          <h3 className={modalStyles.modalTitle}>Gắn năng lực — {maCauHoi}</h3>
          <button type="button" className={modalStyles.modalClose} onClick={onClose}>✕</button>
        </div>

        {dangTai && <p className={formStyles.hint}>Đang tải…</p>}
        {loiTai && <div className={formStyles.errorBox} role="alert">{loiTai}</div>}

        {!dangTai && !loiTai && (
          <div className={formStyles.form}>
            <div className={formStyles.field}>
              <label htmlFor="tien_trinh" className={formStyles.label}>Tiến trình</label>
              <div className={modalStyles.rowActions}>
                <select
                  id="tien_trinh"
                  className={formStyles.select}
                  value={tienTrinh}
                  onChange={(e) => setTienTrinh(e.target.value)}
                  disabled={isPending}
                >
                  <option value="">— Chưa gán —</option>
                  {tienTrinhOptions.map((tt) => (
                    <option key={tt.ma} value={tt.ma}>{tt.ma} — {tt.ten}</option>
                  ))}
                </select>
                <button type="button" className={formStyles.btnPrimary} onClick={handleLuuTienTrinh} disabled={isPending}>
                  Lưu
                </button>
              </div>
            </div>

            <fieldset className={modalStyles.fieldset}>
              <legend className={modalStyles.fieldsetTitle}>Năng lực đã gắn</legend>
              {nangLucList.length === 0 && <p className={formStyles.hint}>Chưa gắn năng lực nào.</p>}
              {nangLucList.map((n) => (
                <div key={n.id} className={modalStyles.luaChonRow}>
                  <span>
                    {n.ma_nang_luc ? (
                      <>
                        <strong>{n.ma_nang_luc}</strong> ({n.mien}) — {n.ten_nang_luc}
                      </>
                    ) : (
                      <em>Năng lực đã bị xoá khỏi khung</em>
                    )}
                    {n.la_chinh && <span className={`${modalStyles.badge} ${modalStyles.badgeDaDuyet}`}> Chính</span>}
                  </span>
                  <button type="button" className={modalStyles.btnEdit} onClick={() => handleXoa(n.id, n.ma_nang_luc ?? "")} disabled={isPending}>
                    Gỡ
                  </button>
                </div>
              ))}
            </fieldset>

            <fieldset className={modalStyles.fieldset}>
              <legend className={modalStyles.fieldsetTitle}>Gắn năng lực mới</legend>
              {nangLucOptions.length === 0 ? (
                <p className={formStyles.hint}>
                  Hệ thống chưa khai báo năng lực nào (bảng năng lực đang rỗng — cần nhập seed data từ khung năng lực
                  trước).
                </p>
              ) : chonDuocList.length === 0 ? (
                <p className={formStyles.hint}>Đã gắn hết các năng lực khả dụng cho câu hỏi này.</p>
              ) : (
                <>
                  <select
                    className={formStyles.select}
                    value={nangLucChonId}
                    onChange={(e) => setNangLucChonId(e.target.value)}
                    disabled={isPending}
                  >
                    <option value="">— Chọn năng lực —</option>
                    {chonDuocList.map((n) => (
                      <option key={n.id} value={n.id}>{n.ma_nang_luc} ({n.mien}) — {n.ten}</option>
                    ))}
                  </select>
                  <label className={modalStyles.luaChonCheck}>
                    <input
                      type="checkbox"
                      checked={laChinh}
                      onChange={(e) => setLaChinh(e.target.checked)}
                      disabled={isPending}
                    />
                    Là năng lực chính (trọng tâm) của câu hỏi
                  </label>
                  <button type="button" className={formStyles.btnPrimary} onClick={handleGan} disabled={isPending}>
                    Gắn năng lực
                  </button>
                </>
              )}
            </fieldset>
          </div>
        )}

        <div className={modalStyles.modalActions}>
          <button type="button" className={modalStyles.btnEdit} onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
