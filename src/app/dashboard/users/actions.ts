"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, MAT_KHAU_MAC_DINH } from "@/lib/supabase/admin";

const VAI_TRO_HOP_LE = [
  "master_admin",
  "admin_ts",
  "admin_ht",
  "truong_bm",
  "gv",
  "tro_giang",
  "ke_toan",
  "thu_ngan",
  "quan_ly_chi_nhanh",
] as const;
type VaiTro = (typeof VAI_TRO_HOP_LE)[number];

const TRANG_THAI_HOP_LE = ["active", "disabled"] as const;

const VAI_TRO_ADMIN_HT_DUOC_CAP: readonly VaiTro[] = ["gv", "tro_giang"];

export type CapNhatUserResult = { error: string } | { ok: true };
export type TaoTaiKhoanResult = { error: string } | { ok: true; email: string; matKhauMacDinh: string };
export type XoaMemResult = { error: string } | { ok: true };
export type KhoiPhucResult = { error: string } | { ok: true };
export type DatLaiMatKhauResult = { error: string } | { ok: true; matKhauMacDinh: string };
export type SuaHoTenResult = { error: string } | { ok: true };
export type GanPhamViResult = { error: string } | { ok: true };
export type GoPhamViResult = { error: string } | { ok: true };
export type GanChiNhanhResult = { error: string } | { ok: true };
export type GoChiNhanhResult = { error: string } | { ok: true };

type NguoiGoiHopLe = { id: string; email: string; vaiTro: VaiTro };

// Xác thực phiên hiện tại + lấy vai trò thật từ CSDL (không tin client gửi
// lên). Mọi Server Action bên dưới đều bắt đầu bằng hàm này TRƯỚC khi đụng
// tới service role — vì service role bỏ qua RLS hoàn toàn, quyền hạn PHẢI
// được tự kiểm ở đây.
async function layNguoiGoiHopLe(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ error: string } | { data: NguoiGoiHopLe }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Chưa đăng nhập." };

  const { data: profile } = await supabase
    .from("users")
    .select("vai_tro, trang_thai, email")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trang_thai !== "active") {
    return { error: "Tài khoản của bạn đang bị khoá hoặc không tồn tại." };
  }

  return { data: { id: user.id, email: profile.email as string, vaiTro: profile.vai_tro as VaiTro } };
}

export async function capNhatUser(formData: FormData): Promise<CapNhatUserResult> {
  const supabase = await createClient();

  const goi = await layNguoiGoiHopLe(supabase);
  if ("error" in goi) return goi;
  if (goi.data.vaiTro !== "master_admin") return { error: "Chỉ Master Admin được sửa người dùng." };

  const userId = String(formData.get("user_id") ?? "").trim();
  const vaiTro = String(formData.get("vai_tro") ?? "").trim();
  const trangThai = String(formData.get("trang_thai") ?? "").trim();

  if (!userId) return { error: "Thiếu user_id." };
  if (!VAI_TRO_HOP_LE.includes(vaiTro as VaiTro)) return { error: "Vai trò không hợp lệ." };
  if (!TRANG_THAI_HOP_LE.includes(trangThai as (typeof TRANG_THAI_HOP_LE)[number])) {
    return { error: "Trạng thái không hợp lệ." };
  }

  const { data: target } = await supabase.from("users").select("vai_tro, trang_thai").eq("id", userId).single();
  if (!target) return { error: "Không tìm thấy tài khoản." };

  const { error } = await supabase.from("users").update({ vai_tro: vaiTro, trang_thai: trangThai }).eq("id", userId);
  if (error) return { error: mapDbError(error.message) };

  // Đồng bộ trạng thái khoá sang Auth (chặn đăng nhập/thu hồi phiên) — chỉ
  // gọi khi trạng thái thực sự đổi, tài khoản Auth có thể vẫn hoạt động dù
  // RLS đã chặn dữ liệu, nên vẫn cần khoá cứng ở đây.
  if (trangThai !== target.trang_thai) {
    const admin = createAdminClient();
    await admin.auth.admin
      .updateUserById(userId, trangThai === "disabled" ? { ban_duration: "876000h" } : { ban_duration: "none" })
      .catch(() => {});
  }

  await ghiNhatKy(supabase, goi.data.id, "sua_vai_tro_trang_thai", userId, target, { vai_tro: vaiTro, trang_thai: trangThai });

  revalidatePath("/dashboard/users");
  return { ok: true };
}

export async function taoTaiKhoan(formData: FormData): Promise<TaoTaiKhoanResult> {
  const supabase = await createClient();

  const goi = await layNguoiGoiHopLe(supabase);
  if ("error" in goi) return goi;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const hoTen = String(formData.get("ho_ten") ?? "").trim();
  const vaiTro = String(formData.get("vai_tro") ?? "").trim() as VaiTro;
  const chiNhanhId = String(formData.get("chi_nhanh_id") ?? "").trim() || null;

  if (!email || !email.includes("@")) return { error: "Email không hợp lệ." };
  if (!hoTen) return { error: "Thiếu họ tên." };
  if (!VAI_TRO_HOP_LE.includes(vaiTro)) return { error: "Vai trò không hợp lệ." };

  let laAdminHt = false;
  let laTaoMasterAdminMoi = false;

  if (goi.data.vaiTro === "master_admin") {
    if (vaiTro === "master_admin") {
      laTaoMasterAdminMoi = true;
      const mk1 = String(formData.get("xac_nhan_mk_1") ?? "");
      const mk2 = String(formData.get("xac_nhan_mk_2") ?? "");
      if (!mk1 || !mk2) return { error: "Cần nhập mật khẩu của bạn 2 lần để xác nhận tạo Master Admin mới." };
      if (mk1 !== mk2) return { error: "Hai lần nhập mật khẩu xác nhận không khớp nhau." };
      const dungMatKhau = await xacThucMatKhau(goi.data.email, mk1);
      if (!dungMatKhau) return { error: "Mật khẩu xác nhận không đúng." };
    }
  } else if (goi.data.vaiTro === "admin_ht") {
    laAdminHt = true;
    if (!VAI_TRO_ADMIN_HT_DUOC_CAP.includes(vaiTro)) {
      return { error: "Admin Hiệu trưởng chỉ được cấp tài khoản Giáo viên hoặc Trợ giảng." };
    }
    if (!chiNhanhId) return { error: "Thiếu chi nhánh." };
  } else {
    return { error: "Bạn không có quyền tạo tài khoản." };
  }

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: MAT_KHAU_MAC_DINH,
    email_confirm: true,
  });
  if (createErr || !created?.user) return { error: mapAuthError(createErr?.message) };

  const newId = created.user.id;

  const donDep = async () => {
    await admin.auth.admin.deleteUser(newId).catch(() => {});
  };

  try {
    if (laAdminHt) {
      // RPC tự kiểm tra chi nhánh có thuộc admin_ht đang gọi hay không, chỉ
      // nhận gv/tro_giang — ép ở CSDL, chạy bằng chính phiên đăng nhập hiện
      // tại (không dùng service role) để auth.uid() bên trong hàm đúng là
      // admin_ht đang thao tác.
      const { error: rpcErr } = await supabase.rpc("admin_ht_tao_nhan_su", {
        p_user_id: newId,
        p_ho_ten: hoTen,
        p_vai_tro: vaiTro,
        p_chi_nhanh_id: chiNhanhId,
      });
      if (rpcErr) throw new Error(rpcErr.message);
    } else {
      const { error: upErr } = await supabase.from("users").update({ ho_ten: hoTen, vai_tro: vaiTro }).eq("id", newId);
      if (upErr) throw new Error(upErr.message);

      if (chiNhanhId) {
        const { error: cnErr } = await supabase.from("user_chi_nhanh").insert({ user_id: newId, chi_nhanh_id: chiNhanhId });
        if (cnErr) throw new Error(cnErr.message);
      }

      await ghiNhatKy(supabase, goi.data.id, laTaoMasterAdminMoi ? "tao_master_admin" : "tao_tai_khoan", newId, null, {
        email,
        ho_ten: hoTen,
        vai_tro: vaiTro,
        chi_nhanh_id: chiNhanhId,
      });
    }
  } catch (e) {
    await donDep();
    return { error: mapDbError(e instanceof Error ? e.message : String(e)) };
  }

  revalidatePath("/dashboard/users");
  return { ok: true, email, matKhauMacDinh: MAT_KHAU_MAC_DINH };
}

export type TaoNguoiDungMotBuocInput = {
  email: string;
  hoTen: string;
  vaiTro: string;
  chiNhanhIds: string[];
  // Phạm vi: Admin HT theo cấp học (monHocMa = null), TBM/GV/TG theo từng môn.
  phamVi: { capHocMa: number; monHocMa: number | null }[];
  // Phân lớp (tuỳ chọn): lớp × môn — môn phải nằm trong phạm vi ở trên.
  phanCong: { lopId: string; monHocMa: number }[];
  xacNhanMk1?: string;
  xacNhanMk2?: string;
};

// Tạo người dùng trong MỘT bước: Auth (service role) → RPC master_admin_tao_nguoi_dung
// áp hồ sơ + chi nhánh + phạm vi + phân lớp trong 1 transaction (chạy bằng phiên của
// Master Admin để auth.uid() đúng). RPC lỗi → xoá tài khoản Auth vừa tạo, không để rác.
export async function taoNguoiDungMotBuoc(input: TaoNguoiDungMotBuocInput): Promise<TaoTaiKhoanResult> {
  const supabase = await createClient();

  const goi = await layNguoiGoiHopLe(supabase);
  if ("error" in goi) return goi;
  if (goi.data.vaiTro !== "master_admin") return { error: "Chỉ Master Admin được tạo người dùng theo luồng này." };

  const email = String(input.email ?? "").trim().toLowerCase();
  const hoTen = String(input.hoTen ?? "").trim();
  const vaiTro = String(input.vaiTro ?? "") as VaiTro;

  if (!email || !email.includes("@")) return { error: "Email không hợp lệ." };
  if (!hoTen) return { error: "Thiếu họ tên." };
  if (!VAI_TRO_HOP_LE.includes(vaiTro)) return { error: "Vai trò không hợp lệ." };

  if (vaiTro === "master_admin") {
    const mk1 = String(input.xacNhanMk1 ?? "");
    const mk2 = String(input.xacNhanMk2 ?? "");
    if (!mk1 || !mk2) return { error: "Cần nhập mật khẩu của bạn 2 lần để xác nhận tạo Master Admin mới." };
    if (mk1 !== mk2) return { error: "Hai lần nhập mật khẩu xác nhận không khớp nhau." };
    if (!(await xacThucMatKhau(goi.data.email, mk1))) return { error: "Mật khẩu xác nhận không đúng." };
  }

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: MAT_KHAU_MAC_DINH,
    email_confirm: true,
  });
  if (createErr || !created?.user) return { error: mapAuthError(createErr?.message) };
  const newId = created.user.id;

  const { error: rpcErr } = await supabase.rpc("master_admin_tao_nguoi_dung", {
    p_user_id: newId,
    p_ho_ten: hoTen,
    p_vai_tro: vaiTro,
    p_chi_nhanh_ids: input.chiNhanhIds ?? [],
    p_pham_vi: (input.phamVi ?? []).map((p) => ({ cap_hoc_ma: p.capHocMa, mon_hoc_ma: p.monHocMa })),
    p_phan_cong: (input.phanCong ?? []).map((p) => ({ lop_id: p.lopId, mon_hoc_ma: p.monHocMa })),
  });
  if (rpcErr) {
    await admin.auth.admin.deleteUser(newId).catch(() => {});
    return { error: mapDbError(rpcErr.message) };
  }

  revalidatePath("/dashboard/users");
  return { ok: true, email, matKhauMacDinh: MAT_KHAU_MAC_DINH };
}

export async function xoaMemTaiKhoan(id: string): Promise<XoaMemResult> {
  const supabase = await createClient();

  const goi = await layNguoiGoiHopLe(supabase);
  if ("error" in goi) return goi;
  if (goi.data.vaiTro !== "master_admin") return { error: "Chỉ Master Admin được xoá tài khoản." };
  if (!id) return { error: "Thiếu ID tài khoản." };

  const { data: truoc } = await supabase.from("users").select("*").eq("id", id).single();

  const { error } = await supabase
    .from("users")
    .update({ deleted_at: new Date().toISOString(), trang_thai: "disabled" })
    .eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(id, { ban_duration: "876000h" }).catch(() => {});

  await ghiNhatKy(supabase, goi.data.id, "xoa_mem", id, truoc, null);

  revalidatePath("/dashboard/users");
  return { ok: true };
}

export async function khoiPhucTaiKhoan(id: string): Promise<KhoiPhucResult> {
  const supabase = await createClient();

  const goi = await layNguoiGoiHopLe(supabase);
  if ("error" in goi) return goi;
  if (goi.data.vaiTro !== "master_admin") return { error: "Chỉ Master Admin được khôi phục tài khoản." };
  if (!id) return { error: "Thiếu ID tài khoản." };

  // Dòng đã xoá mềm không lọt qua p_users_read (deleted_at IS NULL) — dùng
  // service role chỉ để ĐỌC phục vụ ghi nhật ký, quyền đã được xác nhận ở
  // layNguoiGoiHopLe() phía trên.
  const admin = createAdminClient();
  const { data: truoc } = await admin.from("users").select("*").eq("id", id).single();

  const { error } = await supabase.from("users").update({ deleted_at: null }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  await ghiNhatKy(supabase, goi.data.id, "khoi_phuc", id, truoc, null);

  revalidatePath("/dashboard/users");
  return {
    ok: true,
  };
}

export async function datLaiMatKhauMacDinh(id: string): Promise<DatLaiMatKhauResult> {
  const supabase = await createClient();

  const goi = await layNguoiGoiHopLe(supabase);
  if ("error" in goi) return goi;
  if (goi.data.vaiTro !== "master_admin") return { error: "Chỉ Master Admin được đặt lại mật khẩu." };
  if (!id) return { error: "Thiếu ID tài khoản." };

  const admin = createAdminClient();
  const { error: authErr } = await admin.auth.admin.updateUserById(id, { password: MAT_KHAU_MAC_DINH });
  if (authErr) return { error: authErr.message };

  const { error } = await supabase.from("users").update({ phai_doi_mat_khau: true }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  await ghiNhatKy(supabase, goi.data.id, "dat_lai_mat_khau", id, null, null);

  revalidatePath("/dashboard/users");
  return { ok: true, matKhauMacDinh: MAT_KHAU_MAC_DINH };
}

export async function suaHoTen(formData: FormData): Promise<SuaHoTenResult> {
  const supabase = await createClient();

  const goi = await layNguoiGoiHopLe(supabase);
  if ("error" in goi) return goi;
  if (goi.data.vaiTro !== "master_admin") return { error: "Chỉ Master Admin được sửa thông tin người dùng." };

  const id = String(formData.get("id") ?? "").trim();
  const hoTen = String(formData.get("ho_ten") ?? "").trim();
  if (!id) return { error: "Thiếu ID tài khoản." };
  if (!hoTen) return { error: "Họ tên không được để trống." };

  const { error } = await supabase.from("users").update({ ho_ten: hoTen }).eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  await ghiNhatKy(supabase, goi.data.id, "sua_ho_ten", id, null, { ho_ten: hoTen });

  revalidatePath(`/dashboard/users/${id}`);
  return { ok: true };
}

export async function ganPhamVi(formData: FormData): Promise<GanPhamViResult> {
  const supabase = await createClient();

  const goi = await layNguoiGoiHopLe(supabase);
  if ("error" in goi) return goi;
  if (goi.data.vaiTro !== "master_admin") return { error: "Chỉ Master Admin được gán phạm vi." };

  const userId = String(formData.get("user_id") ?? "").trim();
  const capHocId = String(formData.get("cap_hoc_id") ?? "").trim();
  const capHocMa = Number(formData.get("cap_hoc_ma"));
  const monHocId = String(formData.get("mon_hoc_id") ?? "").trim() || null;
  const monHocMaRaw = String(formData.get("mon_hoc_ma") ?? "").trim();
  const monHocMa = monHocMaRaw ? Number(monHocMaRaw) : null;

  if (!userId) return { error: "Thiếu tài khoản." };
  if (!capHocId || Number.isNaN(capHocMa)) return { error: "Thiếu cấp học." };

  const { error } = await supabase
    .from("user_pham_vi")
    .insert({ user_id: userId, cap_hoc_id: capHocId, cap_hoc_ma: capHocMa, mon_hoc_id: monHocId, mon_hoc_ma: monHocMa });
  if (error) return { error: mapDbError(error.message) };

  await ghiNhatKy(supabase, goi.data.id, "gan_pham_vi", userId, null, { cap_hoc_ma: capHocMa, mon_hoc_ma: monHocMa });

  revalidatePath(`/dashboard/users/${userId}`);
  return { ok: true };
}

export async function goPhamVi(id: string, userId: string): Promise<GoPhamViResult> {
  const supabase = await createClient();

  const goi = await layNguoiGoiHopLe(supabase);
  if ("error" in goi) return goi;
  if (goi.data.vaiTro !== "master_admin") return { error: "Chỉ Master Admin được gỡ phạm vi." };
  if (!id) return { error: "Thiếu ID phạm vi." };

  const { error } = await supabase.from("user_pham_vi").delete().eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  await ghiNhatKy(supabase, goi.data.id, "go_pham_vi", userId, null, null);

  revalidatePath(`/dashboard/users/${userId}`);
  return { ok: true };
}

export async function ganChiNhanhThuCong(formData: FormData): Promise<GanChiNhanhResult> {
  const supabase = await createClient();

  const goi = await layNguoiGoiHopLe(supabase);
  if ("error" in goi) return goi;
  if (goi.data.vaiTro !== "master_admin") return { error: "Chỉ Master Admin được gán chi nhánh." };

  const userId = String(formData.get("user_id") ?? "").trim();
  const chiNhanhId = String(formData.get("chi_nhanh_id") ?? "").trim();
  if (!userId) return { error: "Thiếu tài khoản." };
  if (!chiNhanhId) return { error: "Thiếu chi nhánh." };

  const { error } = await supabase.from("user_chi_nhanh").insert({ user_id: userId, chi_nhanh_id: chiNhanhId });
  if (error) return { error: mapDbError(error.message) };

  await ghiNhatKy(supabase, goi.data.id, "gan_chi_nhanh", userId, null, { chi_nhanh_id: chiNhanhId });

  revalidatePath(`/dashboard/users/${userId}`);
  return { ok: true };
}

export async function goChiNhanh(id: string, userId: string): Promise<GoChiNhanhResult> {
  const supabase = await createClient();

  const goi = await layNguoiGoiHopLe(supabase);
  if ("error" in goi) return goi;
  if (goi.data.vaiTro !== "master_admin") return { error: "Chỉ Master Admin được gỡ chi nhánh." };
  if (!id) return { error: "Thiếu ID phân công." };

  const { error } = await supabase.from("user_chi_nhanh").delete().eq("id", id);
  if (error) return { error: mapDbError(error.message) };

  await ghiNhatKy(supabase, goi.data.id, "go_chi_nhanh", userId, null, null);

  revalidatePath(`/dashboard/users/${userId}`);
  return { ok: true };
}

// Xác thực lại mật khẩu của CHÍNH người đang thao tác — dùng client tạm,
// không lưu phiên, để không ghi đè cookie session thật đang dùng.
async function xacThucMatKhau(email: string, matKhau: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;

  const tam = createSupabaseClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await tam.auth.signInWithPassword({ email, password: matKhau });
  return !error;
}

async function ghiNhatKy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nguoiThucHien: string,
  hanhDong: string,
  doiTuongId: string,
  truoc: unknown,
  sau: unknown
) {
  try {
    await supabase
      .from("nhat_ky")
      .insert({ nguoi_dung_id: nguoiThucHien, hanh_dong: hanhDong, doi_tuong: "users", doi_tuong_id: doiTuongId, truoc, sau });
  } catch {
    // Ghi nhật ký là best-effort — không để lỗi ghi log chặn hành động chính.
  }
}

function mapAuthError(msg?: string): string {
  if (!msg) return "Tạo tài khoản Auth thất bại.";
  if (msg.includes("already been registered") || msg.includes("already exists")) {
    return "Email này đã có tài khoản trong hệ thống.";
  }
  return msg;
}

function mapDbError(msg: string): string {
  if (msg.includes("permission denied") || msg.includes("row-level security"))
    return "Bạn không có quyền thực hiện thao tác này.";
  if (msg.includes("Chỉ Admin Hiệu trưởng") || msg.includes("Bạn không quản lý chi nhánh") || msg.includes("chỉ được cấp"))
    return msg;
  if (msg.includes("Không thể tự đổi vai trò") || msg.includes("Master Admin cuối cùng")) return msg;
  if (msg.includes("duplicate key") && msg.includes("users_email_key")) return "Email này đã tồn tại.";
  if (msg.includes("duplicate key") && msg.includes("uq_user_pham_vi")) return "Phạm vi này đã được gán cho tài khoản rồi.";
  if (msg.includes("duplicate key") && msg.includes("user_chi_nhanh")) return "Tài khoản này đã được gán chi nhánh này rồi.";
  return msg;
}
