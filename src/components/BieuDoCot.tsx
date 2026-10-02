import styles from "./BieuDo.module.css";

export type MucCot = {
  nhan: string;
  giaTri: number;
  lamMo?: boolean; // nhóm "chưa gán…" — vẽ xám để không tranh với dữ liệu chính
};

// Biểu đồ cột ngang thuần HTML/CSS (Server Component, không cần JS phía client).
// Giá trị luôn hiện ở đầu cột nên không phụ thuộc tooltip; `title` + aria-label
// cho người dùng bàn phím / trình đọc màn hình.
export default function BieuDoCot({
  muc,
  donVi,
  trongText = "Chưa có dữ liệu để vẽ biểu đồ.",
}: {
  muc: MucCot[];
  donVi: string; // vd "học sinh"
  trongText?: string;
}) {
  const max = Math.max(0, ...muc.map((m) => m.giaTri));
  if (muc.length === 0 || max === 0) {
    return <p className={styles.trong}>{trongText}</p>;
  }

  return (
    <ul className={styles.dsCot}>
      {muc.map((m) => {
        const tyLe = m.giaTri / max;
        const mo = `${m.giaTri.toLocaleString("vi-VN")} ${donVi}`;
        return (
          <li key={m.nhan} className={styles.hangCot} tabIndex={0} title={`${m.nhan}: ${mo}`} aria-label={`${m.nhan}: ${mo}`}>
            <span className={styles.nhanCot}>{m.nhan}</span>
            <span className={styles.rayCot}>
              {/* 64px chừa chỗ cho giá trị ở đầu cột để không tràn khi cột dài nhất */}
              <span
                className={`${styles.cot} ${m.lamMo ? styles.cotMo : ""}`}
                style={{ width: `calc((100% - 64px) * ${tyLe})` }}
              />
              <span className={styles.giaTriCot}>{m.giaTri.toLocaleString("vi-VN")}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
