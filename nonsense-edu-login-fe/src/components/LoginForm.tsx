"use client";

import { useState, useTransition } from "react";
import { loginWithEmail } from "@/app/login/actions";
import styles from "./LoginForm.module.css";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleEmailLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await loginWithEmail(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.logoMark}>N</div>
        <h1 className={styles.title}>Nonsense Edu</h1>
        <p className={styles.subtitle}>Hệ thống quản lý nội bộ</p>
      </div>

      <form onSubmit={handleEmailLogin} className={styles.form} noValidate>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="ten@nonsense.edu.vn"
            className={styles.input}
            disabled={isPending}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>Mật khẩu</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className={styles.input}
            disabled={isPending}
          />
        </div>

        {error && (
          <div className={styles.errorBox} role="alert">
            <span className={styles.errorIcon}>!</span>
            {error}
          </div>
        )}

        <button type="submit" className={styles.btnPrimary} disabled={isPending}>
          {isPending ? (
            <><span className={styles.spinner} />Đang đăng nhập…</>
          ) : (
            "Đăng nhập"
          )}
        </button>
      </form>

      <p className={styles.hint}>
        Chỉ tài khoản nội bộ được phép truy cập.
        <br />
        Liên hệ Admin nếu chưa có tài khoản.
      </p>
    </div>
  );
}
