"use client";

import { useState, type ReactNode } from "react";
import styles from "@/app/dashboard/ngan-hang-cau-hoi/ngan-hang-cau-hoi.module.css";

export type TabTao = { id: string; nhan: string; noiDung: ReactNode };

/**
 * Chuyển đổi các cách tạo trong cùng tab "Tạo câu hỏi" (từng câu / từ file / ngữ liệu...).
 * Mọi phần luôn được giữ nguyên (chỉ ẩn) để không mất dữ liệu đang nhập khi đổi qua lại.
 */
export default function TaoCauHoiTabs({
  tabs,
  tabBanDau,
  nhanAria = "Cách tạo",
}: {
  tabs: TabTao[];
  tabBanDau?: string;
  nhanAria?: string;
}) {
  const [tab, setTab] = useState(tabs.some((t) => t.id === tabBanDau) ? tabBanDau! : tabs[0].id);

  return (
    <div>
      <div className={styles.segmented} role="tablist" aria-label={nhanAria}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.segmentedBtn} ${tab === t.id ? styles.segmentedBtnActive : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.nhan}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} hidden={tab !== t.id}>
          {t.noiDung}
        </div>
      ))}
    </div>
  );
}
