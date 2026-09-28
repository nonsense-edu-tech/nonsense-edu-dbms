"use client";

import { useState, useTransition } from "react";
import {
  layDanhMucCauHoi,
  layChiTietCauHoi,
  type CauHoiDanhMucRow,
  type ChiTietCauHoi,
} from "@/app/dashboard/tro-giang/actions";
import { TRANG_THAI_LABEL, TRANG_THAI_BADGE } from "./trangThaiCauHoi";
import formStyles from "./Form.module.css";
import styles from "@/app/dashboard/tro-giang/tro-giang.module.css";

export type MonHocKhaDung = {
  mon_hoc_id: string;
  mon_hoc_ma: number;
  mon_hoc_ten: string;
  cap_hoc_ma: number;
  cap_hoc_ten: string;
};

// Trình duyệt câu hỏi cho trợ giảng (Bước 5.6) — chọn môn học → xem danh mục
// → click 1 dòng để xem chi tiết. Toàn bộ dữ liệu lấy qua 2 server action bọc
// RPC (không phải .from() trực tiếp) — xem actions.ts.
export default function TroGiangBrowser({ monHocKhaDung }: { monHocKhaDung: MonHocKhaDung[] }) {
  const [monHocChonKey, setMonHocChonKey] = useState(
    monHocKhaDung.length > 0 ? `${monHocKhaDung[0].cap_hoc_ma}-${monHocKhaDung[0].mon_hoc_ma}` : ""
  );
  const [isPending, startTransition] = useTransition();
  const [danhMuc, setDanhMuc] = useState<CauHoiDanhMucRow[]>([]);
  const [daTai, setDaTai] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);

  const [chiTiet, setChiTiet] = useState<ChiTietCauHoi | null>(null);
  const [loiChiTiet, setLoiChiTiet] = useState<string | null>(null);
  const [dangTaiChiTiet, setDangTaiChiTiet] = useState(false);

  function handleXem() {
    const monHoc = monHocKhaDung.find((m) => `${m.cap_hoc_ma}-${m.mon_hoc_ma}` === monHocChonKey);
    if (!monHoc) return;
    setLoi(null);
    startTransition(async () => {
      const result = await layDanhMucCauHoi(monHoc.mon_hoc_id, monHoc.mon_hoc_ma);
      if ("error" in result) {
        setLoi(result.error);
        setDanhMuc([]);
      } else {
        setDanhMuc(result.data);
      }
      setDaTai(true);
    });
  }

  function handleXemChiTiet(id: string) {
    setChiTiet(null);
    setLoiChiTiet(null);
    setDangTaiChiTiet(true);
    layChiTietCauHoi(id).then((result) => {
      if ("error" in result) {
        setLoiChiTiet(result.error);
      } else {
        setChiTiet(result.data);
      }
      setDangTaiChiTiet(false);
    });
  }

  return (
    <div>
      <div className={styles.rowActions}>
        <select
          className={formStyles.select}
          value={monHocChonKey}
          onChange={(e) => setMonHocChonKey(e.target.value)}
          disabled={isPending}
        >
          {monHocKhaDung.map((m) => (
            <option key={`${m.cap_hoc_ma}-${m.mon_hoc_ma}`} value={`${m.cap_hoc_ma}-${m.mon_hoc_ma}`}>
              {m.cap_hoc_ten} — {m.mon_hoc_ten}
            </option>
          ))}
        </select>
        <button type="button" className={formStyles.btnPrimary} onClick={handleXem} disabled={isPending}>
          {isPending ? "Đang tải…" : "Xem danh mục"}
        </button>
      </div>

      {loi && <div className={formStyles.errorBox} role="alert">{loi}</div>}

      {daTai && !loi && (
        <div className={styles.tableWrap} style={{ marginTop: 16 }}>
          {danhMuc.length === 0 ? (
            <p className={styles.empty}>Môn học này chưa có câu hỏi nào trong phạm vi của bạn.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mã câu hỏi</th>
                  <th>Học phần</th>
                  <th>Bài học</th>
                  <th>Chủ đề</th>
                  <th>Dạng câu</th>
                  <th>Trạng thái</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {danhMuc.map((ch) => {
                  const badgeClass = styles[TRANG_THAI_BADGE[ch.trang_thai] ?? "badgeNhap"];
                  return (
                    <tr key={ch.id}>
                      <td className={styles.mono}>{ch.ma_cau_hoi}</td>
                      <td>{ch.hoc_phan_ten}</td>
                      <td>{ch.bai_hoc_ten}</td>
                      <td>{ch.chu_de_ten}</td>
                      <td>{ch.dang_cau_ten}</td>
                      <td>
                        <span className={`${styles.badge} ${badgeClass}`}>
                          {TRANG_THAI_LABEL[ch.trang_thai] ?? ch.trang_thai}
                        </span>
                      </td>
                      <td>
                        <button type="button" className={styles.btnEdit} onClick={() => handleXemChiTiet(ch.id)}>
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {(dangTaiChiTiet || chiTiet || loiChiTiet) && (
        <div className={styles.modalOverlay} onClick={() => { setChiTiet(null); setLoiChiTiet(null); }}>
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{chiTiet ? `Câu hỏi — ${chiTiet.ma_cau_hoi}` : "Câu hỏi"}</h3>
              <button
                type="button"
                className={styles.modalClose}
                onClick={() => { setChiTiet(null); setLoiChiTiet(null); }}
              >
                ✕
              </button>
            </div>

            {dangTaiChiTiet && <p className={formStyles.hint}>Đang tải…</p>}
            {loiChiTiet && <div className={formStyles.errorBox} role="alert">{loiChiTiet}</div>}

            {chiTiet && (
              <div className={formStyles.form}>
                <p>{chiTiet.noi_dung}</p>

                {chiTiet.lua_chon_noi_dung.length > 0 && (
                  <fieldset className={styles.fieldset}>
                    <legend className={styles.fieldsetTitle}>Lựa chọn / mệnh đề</legend>
                    <ul>
                      {chiTiet.lua_chon_noi_dung.map((lc, idx) => (
                        <li key={idx}>{lc}</li>
                      ))}
                    </ul>
                  </fieldset>
                )}

                {chiTiet.dap_an_text !== null ? (
                  <div className={formStyles.field}>
                    <span className={formStyles.label}>Đáp án</span>
                    <p>{chiTiet.dap_an_text}</p>
                  </div>
                ) : (
                  <p className={formStyles.hint}>
                    Đáp án/lời giải bị ẩn với vai trò Trợ giảng (theo thiết kế, không phải lỗi).
                  </p>
                )}

                {chiTiet.loi_giai !== null && (
                  <div className={formStyles.field}>
                    <span className={formStyles.label}>Lời giải</span>
                    <p>{chiTiet.loi_giai}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
