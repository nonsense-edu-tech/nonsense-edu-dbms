import type { ReactNode } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import { chuCaiDau, tenVaiTro } from "@/lib/vai-tro";
import Sidebar from "@/components/Sidebar";
import Breadcrumb from "@/components/Breadcrumb";
import styles from "./layout.module.css";

// Layout dùng chung cho toàn bộ /dashboard/** — header (logo + breadcrumb +
// user/đăng xuất) + sidebar cố định. Thay cho việc mỗi trang tự dựng header
// riêng (đã bóc khỏi 19 trang con, xem CHANGELOG). Sidebar thay thế hoàn
// toàn khối "Khối nghiệp vụ" từng nằm trên thân trang /dashboard.
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("vai_tro, trang_thai, ho_ten")
    .eq("id", user.id)
    .single();

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const tenHienThi = profile?.ho_ten?.trim() || user.email?.split("@")[0] || "bạn";

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Image
            src="/brand/nonsense-edu-mascot-navy-transparent.png"
            alt=""
            width={38}
            height={38}
            priority
            className={styles.logoMascot}
          />
          <Image
            src="/brand/nonsense-edu-wordmark-white-transparent.png"
            alt="Nonsense Education"
            width={70}
            height={22}
            priority
            className={styles.logoWordmark}
          />
          {isActive && vaiTro && <span className={styles.roleBadge}>{tenVaiTro(vaiTro)}</span>}
        </div>

        <div className={styles.headerDivider} />

        <Breadcrumb />

        <div className={styles.headerDivider} />

        <div className={styles.headerRight}>
          <div className={styles.userChip}>
            <div className={styles.avatar}>{chuCaiDau(tenHienThi)}</div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{tenHienThi}</span>
              <span className={styles.userRole}>{user.email}</span>
            </div>
          </div>
          <div className={styles.divider} />
          <form action={signOut}>
            <button type="submit" className={styles.btnSignOut}>
              Đăng xuất
            </button>
          </form>
        </div>
      </header>

      <div className={styles.body}>
        {isActive && vaiTro && <Sidebar vaiTro={vaiTro} />}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
