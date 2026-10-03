"use client";

import { useState, type ReactNode } from "react";
import styles from "@/app/dashboard/ngan-hang-cau-hoi/ngan-hang-cau-hoi.module.css";

/**
 * Chuyển đổi 2 cách tạo câu hỏi trong cùng tab "Tạo câu hỏi". Cả hai phần luôn
 * được giữ nguyên (chỉ ẩn) để không mất dữ liệu đang nhập khi đổi qua lại.
 */
export default function TaoCauHoiTabs({
  thuCong,
  tuFile,
  nhanThuCong = "Nhập từng câu",
  nhanTuFile = "Nhập từ file",
}: {
  thuCong: ReactNode;
  tuFile: ReactNode;
  nhanThuCong?: string;
  nhanTuFile?: string;
}) {
  const [tab, setTab] = useState<"thu-cong" | "tu-file">("thu-cong");

  return (
    <div>
      <div className={styles.segmented} role="tablist" aria-label="Cách tạo câu hỏi">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "thu-cong"}
          className={`${styles.segmentedBtn} ${tab === "thu-cong" ? styles.segmentedBtnActive : ""}`}
          onClick={() => setTab("thu-cong")}
        >
          {nhanThuCong}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "tu-file"}
          className={`${styles.segmentedBtn} ${tab === "tu-file" ? styles.segmentedBtnActive : ""}`}
          onClick={() => setTab("tu-file")}
        >
          {nhanTuFile}
        </button>
      </div>
      <div hidden={tab !== "thu-cong"}>{thuCong}</div>
      <div hidden={tab !== "tu-file"}>{tuFile}</div>
    </div>
  );
}
