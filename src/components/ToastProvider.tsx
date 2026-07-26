"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import styles from "./ToastProvider.module.css";

type ToastType = "success" | "error";

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

type ShowToast = (toast: { type: ToastType; message: string }) => void;

const ToastContext = createContext<ShowToast | null>(null);

const THOI_GIAN_TU_DONG_TAT_MS = 5000;

export function useToast(): ShowToast {
  const showToast = useContext(ToastContext);
  if (!showToast) {
    throw new Error("useToast() phải được gọi bên trong <ToastProvider>.");
  }
  return showToast;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const showToast: ShowToast = useCallback(
    ({ type, message }) => {
      const id = nextId.current++;
      setToasts((cur) => [...cur, { id, type, message }]);
      setTimeout(() => removeToast(id), THOI_GIAN_TU_DONG_TAT_MS);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={styles.viewport} role="region" aria-live="polite" aria-label="Thông báo">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${styles.toast} ${t.type === "success" ? styles.toastSuccess : styles.toastError}`}
            role="status"
          >
            <span className={styles.icon}>{t.type === "success" ? "✓" : "✕"}</span>
            <span className={styles.message}>{t.message}</span>
            <button
              type="button"
              className={styles.close}
              onClick={() => removeToast(t.id)}
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
