import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TroGiangBrowser, { type MonHocKhaDung } from "@/components/TroGiangBrowser";
import styles from "./tro-giang.module.css";

// Bước 5.6 — trang riêng cho trợ giảng (và các vai trò học thuật khác), chỉ
// đọc câu hỏi qua 2 RPC SECURITY DEFINER (xem actions.ts) — KHÔNG bao giờ
// đọc thẳng bảng cau_hoi/lua_chon ở đây, kể cả để lấy danh sách môn học (chỉ
// user_pham_vi + mon_hoc/cap_hoc là bảng phân loại, không phải nội dung câu
// hỏi, nên đọc trực tiếp qua RLS bình thường là an toàn).
const VAI_TRO_DUOC_XEM = ["master_admin", "admin_ht", "truong_bm", "gv", "tro_giang"];

export default async function TroGiangPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, { data: phamViList }, { data: monHocList }, { data: capHocList }] = await Promise.all([
    supabase.from("users").select("vai_tro, trang_thai").eq("id", user.id).single(),
    supabase.from("user_pham_vi").select("cap_hoc_ma, mon_hoc_ma").eq("user_id", user.id),
    supabase.from("mon_hoc").select("id, ma, cap_hoc_ma, ten").is("deleted_at", null).order("ten"),
    supabase.from("cap_hoc").select("ma, ten").is("deleted_at", null).order("ma"),
  ]);

  const isActive = profile?.trang_thai === "active";
  const vaiTro = profile?.vai_tro ?? "";
  const duocXem = isActive && VAI_TRO_DUOC_XEM.includes(vaiTro);

  const capHocMap = new Map((capHocList ?? []).map((c) => [c.ma, c.ten]));

  // Môn học khả dụng = giao giữa user_pham_vi (phạm vi được phân quyền) và
  // mon_hoc thật — mon_hoc_ma null trong user_pham_vi nghĩa là toàn quyền cả
  // cấp học đó (mọi môn), không phải "không có môn nào" (xem co_quyen_mon()).
  const monHocKhaDung: MonHocKhaDung[] = [];
  const daThem = new Set<string>();
  for (const pv of phamViList ?? []) {
    const monHocPhuHop = (monHocList ?? []).filter(
      (m) => m.cap_hoc_ma === pv.cap_hoc_ma && (pv.mon_hoc_ma === null || pv.mon_hoc_ma === m.ma)
    );
    for (const m of monHocPhuHop) {
      const key = `${m.cap_hoc_ma}-${m.ma}`;
      if (daThem.has(key)) continue;
      daThem.add(key);
      monHocKhaDung.push({
        mon_hoc_id: m.id,
        mon_hoc_ma: m.ma,
        mon_hoc_ten: m.ten,
        cap_hoc_ma: m.cap_hoc_ma,
        cap_hoc_ten: capHocMap.get(m.cap_hoc_ma) ?? String(m.cap_hoc_ma),
      });
    }
  }
  monHocKhaDung.sort((a, b) => a.cap_hoc_ma - b.cap_hoc_ma || a.mon_hoc_ten.localeCompare(b.mon_hoc_ten));

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Trợ giảng — Tra cứu câu hỏi</h1>
        <Link href="/dashboard" className={styles.backLink}>← Về trang chủ</Link>
      </div>

      {!duocXem ? (
        <p className={styles.noticeBox}>
          Chỉ Trợ giảng, Giáo viên, Trưởng bộ môn, Admin học thuật hoặc Master Admin (trong phạm vi môn được phân
          công) được dùng trang này. Tài khoản của bạn:{" "}
          {isActive ? `vai trò "${vaiTro || "chưa gán"}"` : "tài khoản đang bị khoá (disabled)"}.
        </p>
      ) : monHocKhaDung.length === 0 ? (
        <p className={styles.noticeBox}>
          Tài khoản của bạn chưa được phân quyền môn học nào (bảng phạm vi rỗng) — liên hệ Admin học thuật/Master
          Admin để được gán phạm vi trước khi dùng trang này.
        </p>
      ) : (
        <>
          <p className={styles.noticeBox}>
            Chỉ xem — không tạo/sửa/xoá được ở đây. Vai trò <strong>Trợ giảng</strong> không thấy đáp án/lời giải
            (ẩn theo thiết kế CSDL, không phải lỗi).
          </p>
          <section className={styles.card}>
            <TroGiangBrowser monHocKhaDung={monHocKhaDung} />
          </section>
        </>
      )}
    </main>
  );
}
