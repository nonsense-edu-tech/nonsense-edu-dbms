"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { tienHienThi } from "@/lib/formatCurrency";
import { ngayHienThi } from "@/lib/formatDate";
import styles from "@/app/dashboard/hoc-phi/hoc-phi.module.css";

export type HopDongTaiChinh = {
  id: number;
  chuong_trinh_ma: string;
  doanh_thu_thuan: number;
  trang_thai: string;
  ngay_moc: string; // kich_hoat_luc (ưu tiên) hoặc created_at — mốc lọc "doanh thu thuần"
};

export type PhieuThuTaiChinh = {
  hop_dong_id: number;
  chuong_trinh_ma: string;
  so_tien: number;
  ngay_thu: string; // mốc lọc "thực thu"
  la_phieu_dao: boolean;
};

export type HopDongQuaHan = {
  hop_dong_id: number;
  ho_ten: string;
  ma_hoc_sinh: string;
  ten_lop: string | null;
  chuong_trinh_ma: string;
  so_tien_cham: number;
  so_ngay_tre_nhat: number;
};

type ChuongTrinh = { ma: string; ten: string };

const PRESET_LABEL: Record<string, string> = {
  last_30_days: "30 ngày trước",
  last_1_month: "1 tháng qua",
  last_2_months: "2 tháng qua",
  last_3_months: "3 tháng qua",
  last_6_months: "6 tháng qua",
  this_year: "Năm nay",
  custom: "Tuỳ chọn",
};

function tinhTuNgay(preset: string, customFrom: string): string | null {
  if (preset === "custom") return customFrom || null;
  const now = new Date();
  const tu = new Date(now);
  if (preset === "last_30_days") tu.setDate(tu.getDate() - 30);
  else if (preset === "last_1_month") tu.setMonth(tu.getMonth() - 1);
  else if (preset === "last_2_months") tu.setMonth(tu.getMonth() - 2);
  else if (preset === "last_3_months") tu.setMonth(tu.getMonth() - 3);
  else if (preset === "last_6_months") tu.setMonth(tu.getMonth() - 6);
  else if (preset === "this_year") return `${now.getFullYear()}-01-01`;
  return tu.toISOString().slice(0, 10);
}

export default function HocPhiDashboardClient({
  chuongTrinhList,
  hopDong,
  phieuThu,
  quaHan,
}: {
  chuongTrinhList: ChuongTrinh[];
  hopDong: HopDongTaiChinh[];
  phieuThu: PhieuThuTaiChinh[];
  quaHan: HopDongQuaHan[];
}) {
  const [preset, setPreset] = useState("this_year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState(new Date().toISOString().slice(0, 10));
  const [chuongTrinhChon, setChuongTrinhChon] = useState<string[]>([]);

  const tuNgay = tinhTuNgay(preset, customFrom);
  const denNgay = preset === "custom" ? customTo || new Date().toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);

  const theoChuongTrinh = (ma: string) => chuongTrinhChon.length === 0 || chuongTrinhChon.includes(ma);
  const trongKhoang = (ngay: string) => (!tuNgay || ngay >= tuNgay) && ngay <= denNgay;

  function toggleChuongTrinh(ma: string) {
    setChuongTrinhChon((cur) => (cur.includes(ma) ? cur.filter((c) => c !== ma) : [...cur, ma]));
  }

  const soHopDongActive = useMemo(
    () => hopDong.filter((h) => h.trang_thai === "dang_hoat_dong" && theoChuongTrinh(h.chuong_trinh_ma)).length,
    [hopDong, chuongTrinhChon]
  );

  const doanhThuThuan = useMemo(
    () =>
      hopDong
        .filter(
          (h) =>
            (h.trang_thai === "dang_hoat_dong" || h.trang_thai === "hoan_thanh") &&
            theoChuongTrinh(h.chuong_trinh_ma) &&
            trongKhoang(h.ngay_moc)
        )
        .reduce((tong, h) => tong + h.doanh_thu_thuan, 0),
    [hopDong, chuongTrinhChon, tuNgay, denNgay]
  );

  const thucThu = useMemo(
    () =>
      phieuThu
        .filter((p) => theoChuongTrinh(p.chuong_trinh_ma) && trongKhoang(p.ngay_thu.slice(0, 10)))
        .reduce((tong, p) => tong + (p.la_phieu_dao ? -p.so_tien : p.so_tien), 0),
    [phieuThu, chuongTrinhChon, tuNgay, denNgay]
  );

  const conPhaiThu = Math.max(doanhThuThuan - thucThu, 0);

  const quaHanLoc = useMemo(
    () => quaHan.filter((q) => theoChuongTrinh(q.chuong_trinh_ma)).sort((a, b) => b.so_ngay_tre_nhat - a.so_ngay_tre_nhat),
    [quaHan, chuongTrinhChon]
  );

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Bộ lọc</h2>
        <div className={styles.filterRow}>
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Khoảng thời gian</label>
            <select className={styles.filterSelect} value={preset} onChange={(e) => setPreset(e.target.value)}>
              {Object.entries(PRESET_LABEL).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
          {preset === "custom" && (
            <>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Từ ngày</label>
                <input type="date" className={styles.filterSelect} value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              </div>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>Đến ngày</label>
                <input type="date" className={styles.filterSelect} value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            </>
          )}
          <div className={styles.filterField}>
            <label className={styles.filterLabel}>Chương trình (bỏ trống = tất cả)</label>
            <div className={styles.chipGroup}>
              {chuongTrinhList.map((c) => (
                <button
                  type="button"
                  key={c.ma}
                  className={`${styles.chip} ${chuongTrinhChon.includes(c.ma) ? styles.chipActive : ""}`}
                  onClick={() => toggleChuongTrinh(c.ma)}
                >
                  {c.ten}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className={styles.empty} style={{ marginTop: 4 }}>
          Doanh thu thuần lọc theo ngày ký/kích hoạt hợp đồng · Thực thu lọc theo ngày nhận tiền — hai chỉ số
          dùng hai mốc khác nhau nên tỉ lệ pie có thể không khớp trực giác.
        </p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Chỉ số tổng quan</h2>
        <div className={styles.kpiGrid}>
          <KpiCard label="Doanh thu thuần" value={tienHienThi(doanhThuThuan)} />
          <KpiCard label="Thực thu" value={tienHienThi(thucThu)} />
          <KpiCard label="Còn phải thu" value={tienHienThi(conPhaiThu)} />
          <KpiCard label="Hợp đồng đang hoạt động" value={String(soHopDongActive)} />
        </div>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Tỉ lệ đã thu / doanh thu thuần</h2>
        {doanhThuThuan === 0 ? (
          <p className={styles.empty}>Chưa có dữ liệu trong khoảng lọc này.</p>
        ) : (
          <div className={styles.pieRow}>
            <PieBlock
              title="Pie 1 — Đã thu / Doanh thu thuần"
              slices={[
                { label: "Đã thu", value: Math.max(thucThu, 0), color: "var(--success)" },
                { label: "Chưa thu", value: conPhaiThu, color: "var(--border)" },
              ]}
            />
            <PieBlock
              title="Pie 2 — Chưa thu / Doanh thu thuần"
              slices={[
                { label: "Chưa thu", value: conPhaiThu, color: "var(--accent)" },
                { label: "Đã thu", value: Math.max(thucThu, 0), color: "var(--border)" },
              ]}
            />
          </div>
        )}
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>Đóng thiếu / chậm thu ({quaHanLoc.length})</h2>
        {quaHanLoc.length === 0 ? (
          <p className={styles.empty}>Không có hợp đồng nào đóng thiếu/chậm.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Học sinh</th>
                  <th>Lớp</th>
                  <th>Số tiền chậm</th>
                  <th>Trễ nhất (ngày)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {quaHanLoc.map((q) => (
                  <tr key={q.hop_dong_id}>
                    <td>{q.ho_ten} <span className={styles.mono}>({q.ma_hoc_sinh})</span></td>
                    <td>{q.ten_lop ?? "—"}</td>
                    <td className={styles.errorText}>{tienHienThi(q.so_tien_cham)}</td>
                    <td>{q.so_ngay_tre_nhat}</td>
                    <td>
                      <Link href="/dashboard/hoc-phi/hop-dong" className={styles.btnEdit}>Xem hợp đồng</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
    </div>
  );
}

function PieBlock({
  title,
  slices,
}: {
  title: string;
  slices: { label: string; value: number; color: string }[];
}) {
  const tong = slices.reduce((t, s) => t + s.value, 0) || 1;
  let goc = 0;
  const stops = slices
    .map((s) => {
      const tyLe = (s.value / tong) * 100;
      const tu = goc;
      goc += tyLe;
      return `${s.color} ${tu}% ${goc}%`;
    })
    .join(", ");

  return (
    <div className={styles.pieBlock}>
      <span className={styles.pieTitle}>{title}</span>
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: `conic-gradient(${stops})`,
        }}
      />
      <div className={styles.pieLegend}>
        {slices.map((s) => (
          <div key={s.label} className={styles.legendItem}>
            <span className={styles.legendLabel}>
              <span className={styles.legendDot} style={{ background: s.color }} />
              {s.label}
            </span>
            <span className={styles.legendValue}>
              {tienHienThi(s.value)} ({((s.value / tong) * 100).toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
