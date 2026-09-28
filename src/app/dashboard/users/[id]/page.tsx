import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import NguoiDungChiTiet from "@/components/NguoiDungChiTiet";
import styles from "../users.module.css";

export default async function ChiTietNguoiDungPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("vai_tro, trang_thai")
    .eq("id", user.id)
    .single();

  const isActive = profile?.trang_thai === "active";
  const isMasterAdmin = isActive && profile?.vai_tro === "master_admin";

  if (!isMasterAdmin) redirect("/dashboard/users");

  // Dùng service role để đọc được cả tài khoản đã xoá mềm (bị p_users_read
  // ẩn) — quyền master_admin đã xác nhận ở trên.
  const admin = createAdminClient();

  const [{ data: target }, { data: capHocList }, { data: monHocList }, { data: phamViList }, { data: chiNhanhList }, { data: userChiNhanhList }, { data: nhatKyList }] =
    await Promise.all([
      admin.from("users").select("id, email, ho_ten, vai_tro, trang_thai, deleted_at, phai_doi_mat_khau, created_at").eq("id", id).single(),
      supabase.from("cap_hoc").select("id, ma, ten").is("deleted_at", null).order("ma"),
      supabase.from("mon_hoc").select("id, ma, cap_hoc_ma, ten").is("deleted_at", null).order("cap_hoc_ma", { ascending: true }),
      supabase.from("user_pham_vi").select("id, cap_hoc_ma, mon_hoc_ma").eq("user_id", id),
      supabase.from("chi_nhanh").select("id, ten").is("deleted_at", null).order("ten"),
      supabase.from("user_chi_nhanh").select("id, chi_nhanh:chi_nhanh_id(id, ten)").eq("user_id", id),
      supabase
        .from("nhat_ky")
        .select("id, hanh_dong, truoc, sau, created_at, nguoi_dung:nguoi_dung_id(email, ho_ten)")
        .eq("doi_tuong", "users")
        .eq("doi_tuong_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

  if (!target) notFound();

  const capHocTenMap = new Map((capHocList ?? []).map((c) => [c.ma, c.ten]));
  const monHocTenMap = new Map((monHocList ?? []).map((m) => [`${m.cap_hoc_ma}:${m.ma}`, m.ten]));

  const phamViRows = (phamViList ?? []).map((p) => ({
    id: p.id as string,
    cap_hoc_ma: p.cap_hoc_ma as number,
    mon_hoc_ma: p.mon_hoc_ma as number | null,
    cap_hoc_ten: capHocTenMap.get(p.cap_hoc_ma as number) ?? String(p.cap_hoc_ma),
    mon_hoc_ten: p.mon_hoc_ma != null ? monHocTenMap.get(`${p.cap_hoc_ma}:${p.mon_hoc_ma}`) ?? String(p.mon_hoc_ma) : null,
  }));

  const chiNhanhRows = (userChiNhanhList ?? [])
    .map((r) => {
      const cn = r.chi_nhanh as unknown as { id: string; ten: string } | null;
      return cn ? { id: r.id as string, chi_nhanh_id: cn.id, chi_nhanh_ten: cn.ten } : null;
    })
    .filter((r): r is { id: string; chi_nhanh_id: string; chi_nhanh_ten: string } => !!r);

  const nhatKyRows = (nhatKyList ?? []).map((n) => {
    const actor = n.nguoi_dung as unknown as { email: string; ho_ten: string | null } | null;
    return {
      id: n.id as string,
      hanh_dong: n.hanh_dong as string,
      truoc: n.truoc,
      sau: n.sau,
      created_at: n.created_at as string,
      thuc_hien_boi: actor?.ho_ten ?? actor?.email ?? "—",
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{target.ho_ten ?? target.email}</h1>
        <Link href="/dashboard/users" className={styles.backLink}>← Về danh sách</Link>
      </div>

      <NguoiDungChiTiet
        target={{
          id: target.id,
          email: target.email,
          ho_ten: target.ho_ten,
          vai_tro: target.vai_tro,
          trang_thai: target.trang_thai,
          deleted_at: target.deleted_at,
          phai_doi_mat_khau: target.phai_doi_mat_khau,
        }}
        capHocOptions={(capHocList ?? []).map((c) => ({ id: c.id, ma: c.ma, ten: c.ten }))}
        monHocOptions={(monHocList ?? []).map((m) => ({ id: m.id, ma: m.ma, cap_hoc_ma: m.cap_hoc_ma, ten: m.ten }))}
        phamViRows={phamViRows}
        chiNhanhOptions={(chiNhanhList ?? []).map((c) => ({ id: c.id, ten: c.ten }))}
        chiNhanhRows={chiNhanhRows}
        nhatKyRows={nhatKyRows}
      />
    </main>
  );
}
