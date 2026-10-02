"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { tienHienThi, tienRutGon } from "@/lib/formatCurrency";
import styles from "./BieuDo.module.css";

export type DiemDuong = {
  nhan: string; // nhãn ngắn trên trục X, vd "T9"
  chiTiet: string; // nhãn đầy đủ cho tooltip, vd "Tháng 9/2026"
  giaTri: number; // VNĐ nguyên
};

// Hệ toạ độ cố định, SVG co giãn theo bề rộng thẻ (width: 100%).
const W = 560;
const H = 250;
const PL = 64; // chừa chỗ nhãn trục Y
const PR = 32;
const PT = 28; // chừa chỗ nhãn giá trị trên điểm cao nhất
const PB = 34;

// Bước chia trục "đẹp" (1/2/5 × 10^k) để có tối đa ~4 vạch.
function buocDep(khoang: number): number {
  if (khoang <= 0) return 1;
  const tho = khoang / 4;
  const mu = Math.pow(10, Math.floor(Math.log10(tho)));
  const f = tho / mu;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * mu;
}

// Biểu đồ đường 1 chuỗi tiền (VNĐ): nét 2px, vùng 10%, điểm ≥ 8px có viền nền,
// crosshair + tooltip theo con trỏ / phím mũi tên, bảng ẩn cho trình đọc màn hình.
export default function BieuDoDuong({
  diem,
  tenChuoi,
  trongText = "Chưa có dữ liệu để vẽ biểu đồ.",
}: {
  diem: DiemDuong[];
  tenChuoi: string; // vd "Thực thu"
  trongText?: string;
}) {
  const [chon, setChon] = useState<number | null>(null);

  const n = diem.length;
  if (n === 0 || diem.every((d) => d.giaTri === 0)) {
    return <p className={styles.trong}>{trongText}</p>;
  }

  const maxGt = Math.max(0, ...diem.map((d) => d.giaTri));
  const minGt = Math.min(0, ...diem.map((d) => d.giaTri));
  const buoc = buocDep(maxGt - minGt);
  const yMax = Math.ceil(maxGt / buoc) * buoc;
  const yMin = minGt < 0 ? -Math.ceil(-minGt / buoc) * buoc : 0;
  const soVach = Math.round((yMax - yMin) / buoc);
  const vach = Array.from({ length: soVach + 1 }, (_, i) => yMin + i * buoc);

  const dai = W - PL - PR;
  const cao = H - PT - PB;
  const x = (i: number) => (n === 1 ? PL + dai / 2 : PL + (i * dai) / (n - 1));
  const y = (v: number) => PT + (1 - (v - yMin) / (yMax - yMin)) * cao;

  const duongPath = diem.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(d.giaTri).toFixed(1)}`).join(" ");
  const vungPath = `${duongPath} L${x(n - 1).toFixed(1)} ${y(0).toFixed(1)} L${x(0).toFixed(1)} ${y(0).toFixed(1)} Z`;

  // Chỉ gắn nhãn giá trị cho điểm cao nhất và điểm cuối — không gắn số lên mọi điểm.
  const idxMax = diem.reduce((best, d, i) => (d.giaTri > diem[best].giaTri ? i : best), 0);
  const idxGanNhan = new Set<number>([idxMax, n - 1]);

  function diChuyen(e: PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width === 0) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    let gan = 0;
    let kc = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(x(i) - px);
      if (d < kc) {
        kc = d;
        gan = i;
      }
    }
    setChon(gan);
  }

  function phim(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setChon((c) => Math.min((c ?? n - 2) + 1, n - 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setChon((c) => Math.max((c ?? 1) - 1, 0));
    } else if (e.key === "Escape") {
      setChon(null);
    }
  }

  const tt = chon === null ? null : diem[chon];
  const ttX = chon === null ? 0 : Math.min(Math.max((x(chon) / W) * 100, 16), 84);
  const ttY = chon === null ? 0 : (y(diem[chon].giaTri) / H) * 100;
  const ttDuoi = ttY < 40; // điểm gần mép trên → tooltip hiện phía dưới điểm

  return (
    <div className={styles.khung}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Biểu đồ đường ${tenChuoi} theo tháng. Dùng phím mũi tên trái/phải để xem từng tháng.`}
        tabIndex={0}
        onPointerMove={diChuyen}
        onPointerLeave={() => setChon(null)}
        onKeyDown={phim}
        onFocus={() => setChon((c) => c ?? n - 1)}
        onBlur={() => setChon(null)}
      >
        {/* Lưới ngang hairline + nhãn trục Y */}
        {vach.map((v) => (
          <g key={v}>
            <line className={styles.luoi} x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} />
            <text className={styles.truc} x={PL - 10} y={y(v)} textAnchor="end" dominantBaseline="middle">
              {tienRutGon(v)}
            </text>
          </g>
        ))}

        {/* Nhãn trục X */}
        {diem.map((d, i) => (
          <text key={d.chiTiet} className={styles.truc} x={x(i)} y={H - PB + 20} textAnchor="middle">
            {d.nhan}
          </text>
        ))}

        <path className={styles.vung} d={vungPath} />
        <path className={styles.duong} d={duongPath} />

        {/* Crosshair bám theo điểm gần con trỏ nhất */}
        {chon !== null && <line className={styles.tamNgam} x1={x(chon)} x2={x(chon)} y1={PT} y2={H - PB} />}

        {diem.map((d, i) => (
          <circle key={d.chiTiet} className={styles.diem} cx={x(i)} cy={y(d.giaTri)} r={chon === i ? 5.5 : 4} />
        ))}

        {/* Nhãn giá trị chọn lọc: điểm cao nhất + điểm cuối */}
        {diem.map((d, i) =>
          idxGanNhan.has(i) && chon === null ? (
            <text key={`nhan-${d.chiTiet}`} className={styles.nhanGiaTri} x={x(i)} y={y(d.giaTri) - 11} textAnchor="middle">
              {tienRutGon(d.giaTri)}
            </text>
          ) : null
        )}
      </svg>

      {tt && (
        <div
          className={styles.tooltip}
          role="status"
          style={{
            left: `${ttX}%`,
            top: `${ttY}%`,
            transform: ttDuoi ? "translate(-50%, 14px)" : "translate(-50%, calc(-100% - 14px))",
          }}
        >
          <div className={styles.tooltipGiaTri}>{tienHienThi(tt.giaTri)}</div>
          <div className={styles.tooltipDong}>
            <span className={styles.khoaNet} aria-hidden="true" />
            {tenChuoi} · {tt.chiTiet}
          </div>
        </div>
      )}

      {/* Bảng dữ liệu cho trình đọc màn hình — giá trị không phụ thuộc hover */}
      <table className={styles.srOnly}>
        <caption>{tenChuoi} theo tháng</caption>
        <thead>
          <tr>
            <th scope="col">Tháng</th>
            <th scope="col">{tenChuoi}</th>
          </tr>
        </thead>
        <tbody>
          {diem.map((d) => (
            <tr key={d.chiTiet}>
              <th scope="row">{d.chiTiet}</th>
              <td>{tienHienThi(d.giaTri)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
