"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";
import type { DeThiTai, DonViXemTruoc, PhanXemTruoc } from "@/lib/de-thi/tai-de";
import {
  capNhatCauHinhDe,
  chotDe,
  doiCum,
  goiYCum,
  khoaDonVi,
  sinhLaiDe,
  taoMaDe,
  type CauHinhDe,
  type GoiYCum,
} from "./actions";
import styles from "./de-thi.module.css";

type View = "cau-hinh" | "xem-truoc" | "chot" | "xuat";

const CHU = "ABCDEFGH";

function seedMoi() {
  return Math.random().toString(36).slice(2, 10);
}

function Html({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function trangThaiPhan(p: PhanXemTruoc): { nhan: string; cls: string } {
  if (p.dat < p.can) return { nhan: `Thiếu ${p.can - p.dat}`, cls: styles.chipThieu };
  if (p.noiDoKho > 0) return { nhan: "Vừa đủ (nới độ khó)", cls: styles.chipVua };
  return { nhan: "Đủ", cls: styles.chipDu };
}

export default function DeThiWorkspace({ data, canEdit }: { data: DeThiTai; canEdit: boolean }) {
  const router = useRouter();
  const showToast = useToast();
  const [pending, startTransition] = useTransition();
  const { de, phan, daChot } = data;

  const [view, setView] = useState<View>(daChot ? "xuat" : "xem-truoc");
  const [cfg, setCfg] = useState<CauHinhDe>({
    ten: de.ten,
    thoiGianPhut: de.thoi_gian_phut,
    chongLapN: de.chong_lap_n,
    xaoCum: de.xao_cum,
    xaoDapAn: de.xao_dap_an,
    seed: de.seed ?? "",
  });
  const [hienDapAn, setHienDapAn] = useState(false);
  const [drawer, setDrawer] = useState<{ dongId: string; donVi: DonViXemTruoc; laCum: boolean } | null>(null);
  const [goiY, setGoiY] = useState<GoiYCum[] | null>(null);
  const [chon, setChon] = useState<string | null>(null);
  const [soMaChot, setSoMaChot] = useState(2);
  const [soMaMoi, setSoMaMoi] = useState(data.maDe.length || 1);

  function chay(fn: () => Promise<{ error: string } | object>, thanhCong?: string, sau?: () => void) {
    startTransition(async () => {
      const r = await fn();
      if ("error" in r) {
        showToast({ type: "error", message: String((r as { error: string }).error) });
        return;
      }
      if (thanhCong) showToast({ type: "success", message: thanhCong });
      sau?.();
      router.refresh();
    });
  }

  function luuVaSinhLai(seed: string | null) {
    chay(
      async () => {
        const a = await capNhatCauHinhDe(de.id, cfg);
        if ("error" in a) return a;
        return sinhLaiDe(de.id, seed);
      },
      "Đã sinh lại đề (phần đã khoá được giữ nguyên).",
      () => setView("xem-truoc")
    );
  }

  function moDrawer(p: PhanXemTruoc, u: DonViXemTruoc) {
    setDrawer({ dongId: p.dong.id, donVi: u, laCum: u.laCum });
    setGoiY(null);
    setChon(null);
    startTransition(async () => {
      const r = await goiYCum(de.id, p.dong.id);
      if ("error" in r) {
        showToast({ type: "error", message: r.error });
        setDrawer(null);
        return;
      }
      setGoiY(r.rows);
    });
  }

  function apDungDoi() {
    if (!drawer || !chon) return;
    const d = drawer;
    chay(() => doiCum(de.id, d.dongId, d.donVi.id, chon), "Đã đổi.", () => setDrawer(null));
  }

  const khongThieu = data.tongThieu === 0;
  const tongDonVi = phan.reduce((s, p) => s + p.dat, 0);
  const tongCauCan = phan.reduce((s, p) => s + p.can, 0);

  const buoc: { id: View | "ma-tran"; nhan: string; xong: boolean; khoa?: boolean }[] = [
    { id: "ma-tran", nhan: "Ma trận", xong: true },
    { id: "cau-hinh", nhan: "Sinh đề", xong: true },
    { id: "xem-truoc", nhan: "Xem trước", xong: daChot },
    { id: "chot", nhan: "Chốt đề", xong: daChot },
    { id: "xuat", nhan: "Xuất file", xong: false, khoa: !daChot },
  ];

  return (
    <div className={styles.workspace}>
      <ol className={styles.stepper} aria-label="Các bước tạo đề">
        {buoc.map((b, i) => {
          const hoatDong = b.id === view;
          const noiDung = (
            <>
              <span className={styles.stepNum}>{b.xong && !hoatDong ? "✓" : i + 1}</span>
              <span>{b.nhan}</span>
            </>
          );
          if (b.id === "ma-tran") {
            return (
              <li key={b.id} className={styles.step}>
                {de.ma_tran_id ? (
                  <Link href={`/dashboard/de-thi/ma-tran/${de.ma_tran_id}`} className={styles.stepBtn}>
                    {noiDung}
                  </Link>
                ) : (
                  <span className={styles.stepBtn}>{noiDung}</span>
                )}
              </li>
            );
          }
          return (
            <li key={b.id} className={styles.step}>
              <button
                type="button"
                className={`${styles.stepBtn} ${hoatDong ? styles.stepActive : ""}`}
                disabled={b.khoa}
                aria-current={hoatDong ? "step" : undefined}
                onClick={() => setView(b.id as View)}
              >
                {noiDung}
              </button>
            </li>
          );
        })}
      </ol>

      {daChot && (
        <p className={styles.noticeOk}>
          Đề đã chốt{de.ma_de ? ` (${de.ma_de})` : ""} — nội dung được chụp lại, không còn thay đổi theo ngân hàng câu hỏi.
        </p>
      )}

      {/* ===== B2: cấu hình & sinh ===== */}
      {view === "cau-hinh" && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Cấu hình sinh đề</h2>
          <div className={styles.grid2}>
            <label className={styles.field}>
              <span className={styles.label}>Tên đề</span>
              <input className={styles.input} value={cfg.ten} disabled={!canEdit} onChange={(e) => setCfg({ ...cfg, ten: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Thời gian (phút)</span>
              <input
                className={styles.input}
                type="number"
                min={1}
                value={cfg.thoiGianPhut ?? ""}
                disabled={!canEdit}
                onChange={(e) => setCfg({ ...cfg, thoiGianPhut: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Seed xáo trộn</span>
              <span className={styles.inline}>
                <input className={styles.input} value={cfg.seed} disabled={!canEdit} onChange={(e) => setCfg({ ...cfg, seed: e.target.value })} />
                <button type="button" className={styles.btnGhost} disabled={!canEdit} onClick={() => setCfg({ ...cfg, seed: seedMoi() })}>
                  Ngẫu nhiên
                </button>
              </span>
              <span className={styles.hint}>Cùng ma trận + cùng seed → luôn ra cùng một đề.</span>
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Chống lặp với … đề đã chốt gần nhất</span>
              <select
                className={styles.input}
                value={cfg.chongLapN}
                disabled={!canEdit}
                onChange={(e) => setCfg({ ...cfg, chongLapN: Number(e.target.value) })}
              >
                {[0, 1, 2, 3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? "Không chống lặp" : `${n} đề`}
                  </option>
                ))}
              </select>
              <span className={styles.hint}>Ưu tiên câu chưa dùng; thiếu mới dùng lại và đánh dấu.</span>
            </label>
          </div>
          <div className={styles.checks}>
            <label className={styles.check}>
              <input type="checkbox" checked={cfg.xaoCum} disabled={!canEdit} onChange={(e) => setCfg({ ...cfg, xaoCum: e.target.checked })} />
              Xáo thứ tự cụm / câu trong từng phần (các mã đề sau cũng hoán vị)
            </label>
            <label className={styles.check}>
              <input type="checkbox" checked={cfg.xaoDapAn} disabled={!canEdit} onChange={(e) => setCfg({ ...cfg, xaoDapAn: e.target.checked })} />
              Xáo đáp án A–D ở các mã đề sau (câu trắc nghiệm)
            </label>
          </div>

          <h3 className={styles.subTitle}>Độ phủ theo phần</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Phần</th>
                  <th>Cần</th>
                  <th>Đạt</th>
                  <th>Nới độ khó</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {phan.map((p) => {
                  const t = trangThaiPhan(p);
                  return (
                    <tr key={p.dong.id}>
                      <td>{p.dong.nhan ?? `Dòng ${p.dong.thu_tu}`}{p.dong.loai_ngu_lieu ? " (cụm ngữ liệu)" : ""}</td>
                      <td>{p.can}</td>
                      <td>{p.dat}</td>
                      <td>{p.noiDoKho}</td>
                      <td><span className={`${styles.chip} ${t.cls}`}>{t.nhan}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!khongThieu && (
            <div className={styles.noticeWarn}>
              <strong>Ngân hàng chưa đủ câu cho {data.tongThieu} đơn vị.</strong> Cách xử lý: (1) bật “nới độ khó ±1” ở dòng thiếu trong ma trận,
              (2) giảm số lượng ở dòng đó, hoặc (3) bổ sung/duyệt thêm câu hỏi vào ngân hàng — rồi quay lại bấm “Sinh lại”.{" "}
              {de.ma_tran_id && <Link href={`/dashboard/de-thi/ma-tran/${de.ma_tran_id}`}>Mở ma trận</Link>}
            </div>
          )}

          {canEdit && (
            <div className={styles.actions}>
              <button type="button" className={styles.btnPrimary} disabled={pending} onClick={() => luuVaSinhLai(cfg.seed || null)}>
                {pending ? "Đang xử lý…" : "Lưu cấu hình & sinh lại"}
              </button>
              <button
                type="button"
                className={styles.btnGhost}
                disabled={pending}
                onClick={() => {
                  const s = seedMoi();
                  setCfg({ ...cfg, seed: s });
                  luuVaSinhLai(s);
                }}
              >
                Xáo ngẫu nhiên (seed mới)
              </button>
            </div>
          )}
        </section>
      )}

      {/* ===== B3: xem trước ===== */}
      {view === "xem-truoc" && (
        <section className={styles.card}>
          <div className={styles.rowBetween}>
            <h2 className={styles.cardTitle}>
              {de.ten} — {data.tongCau} câu · {tongDonVi}/{tongCauCan} đơn vị
            </h2>
            <label className={styles.check}>
              <input type="checkbox" checked={hienDapAn} onChange={(e) => setHienDapAn(e.target.checked)} />
              Hiện đáp án
            </label>
          </div>
          {phan.map((p) => {
            const t = trangThaiPhan(p);
            return (
              <div key={p.dong.id} className={styles.phan}>
                <div className={styles.phanHead}>
                  <strong>{p.dong.nhan ?? `Dòng ${p.dong.thu_tu}`}</strong>
                  <span className={`${styles.chip} ${t.cls}`}>{t.nhan}</span>
                  <span className={styles.muted}>
                    {p.dat}/{p.can} {p.dong.loai_ngu_lieu ? "cụm" : "câu"}
                  </span>
                </div>
                {p.donVi.length === 0 && <p className={styles.empty}>Chưa có đơn vị nào trong phần này.</p>}
                {p.donVi.map((u) => (
                  <div key={u.id} className={`${styles.donVi} ${u.khoa ? styles.donViKhoa : ""}`}>
                    <div className={styles.donViHead}>
                      <span className={styles.donViTitle}>
                        {u.laCum ? `Cụm: ${u.tieuDe ?? "ngữ liệu"} (${u.cau.length} câu)` : `Câu ${u.cau[0]?.stt}`}
                      </span>
                      {u.lapGanDay && <span className={`${styles.chip} ${styles.chipVua}`}>Lặp gần đây</span>}
                      {u.khoa && <span className={`${styles.chip} ${styles.chipDu}`}>Đã khoá</span>}
                      {canEdit && !daChot && (
                        <span className={styles.donViBtns}>
                          <button
                            type="button"
                            className={styles.btnMini}
                            disabled={pending}
                            onClick={() => chay(() => khoaDonVi(de.id, p.dong.id, u.id, !u.khoa))}
                          >
                            {u.khoa ? "Mở khoá" : "Khoá"}
                          </button>
                          <button type="button" className={styles.btnMini} disabled={pending || u.khoa} onClick={() => moDrawer(p, u)}>
                            {u.laCum ? "Đổi cụm" : "Đổi câu"}
                          </button>
                        </span>
                      )}
                    </div>
                    {u.nguLieuHtml && <Html className={styles.nguLieu} html={u.nguLieuHtml} />}
                    {u.cau.map((c) => (
                      <div key={c.deCauHoiId} className={styles.cau}>
                        <div className={styles.cauHead}>
                          <strong>Câu {c.stt}.</strong> <Html html={c.noiDungHtml} />
                        </div>
                        <div className={styles.cauMeta}>
                          <span className={styles.mono}>{c.maCauHoi}</span>
                          {c.doKho != null && <span className={styles.muted}>Khó {c.doKho}/5</span>}
                        </div>
                        {c.luaChon.length > 0 && (
                          <ul className={styles.luaChon}>
                            {c.luaChon.map((l, i) => (
                              <li key={l.id} className={hienDapAn && l.laDapAn ? styles.dapAnDung : undefined}>
                                <strong>{c.dangCau === 3 ? String.fromCharCode(97 + i) + ")" : CHU[i] + "."}</strong> <Html html={l.noiDungHtml} />
                              </li>
                            ))}
                          </ul>
                        )}
                        {hienDapAn && c.luaChon.length === 0 && c.dapAnText && <p className={styles.dapAnDung}>Đáp án: {c.dapAnText}</p>}
                        {hienDapAn && c.loiGiaiHtml && (
                          <p className={styles.loiGiai}>
                            <em>Lời giải:</em> <Html html={c.loiGiaiHtml} />
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={() => setView("cau-hinh")}>
              ← Cấu hình / sinh lại
            </button>
            <button type="button" className={styles.btnPrimary} onClick={() => setView("chot")}>
              Tiếp: chốt đề →
            </button>
          </div>
        </section>
      )}

      {/* ===== B5: chốt ===== */}
      {view === "chot" && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Chốt đề</h2>
          <ul className={styles.checklist}>
            <li className={khongThieu ? styles.ok : styles.bad}>{khongThieu ? "✓" : "✕"} Đủ số lượng ở mọi phần ({tongDonVi}/{tongCauCan})</li>
            <li className={data.tongCau > 0 ? styles.ok : styles.bad}>{data.tongCau > 0 ? "✓" : "✕"} Có {data.tongCau} câu hỏi (chỉ gồm câu đã duyệt)</li>
            <li className={styles.ok}>✓ Chống lặp: {cfg.chongLapN === 0 ? "không áp dụng" : `so với ${cfg.chongLapN} đề gần nhất`}</li>
          </ul>
          {!daChot && (
            <>
              <label className={styles.field}>
                <span className={styles.label}>Số mã đề</span>
                <select className={styles.input} value={soMaChot} onChange={(e) => setSoMaChot(Number(e.target.value))}>
                  {[1, 2, 4].map((n) => (
                    <option key={n} value={n}>{n} mã đề</option>
                  ))}
                </select>
              </label>
              <div className={styles.noticeWarn}>
                Sau khi chốt: nội dung câu hỏi được <strong>chụp lại</strong> và khoá; không sinh lại / đổi cụm; ma trận không sửa được (chỉ nhân bản); đề
                được tính vào “chống lặp” của các đề sau.
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.btnGhost} onClick={() => setView("xem-truoc")}>← Quay lại xem trước</button>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={pending || !khongThieu || !canEdit}
                  onClick={() => chay(() => chotDe(de.id, soMaChot), "Đã chốt đề.", () => setView("xuat"))}
                >
                  {pending ? "Đang chốt…" : "Chốt đề"}
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {/* ===== B6: xuất ===== */}
      {view === "xuat" && daChot && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Xuất file .docx</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Mã đề</th><th>Đề</th><th>Đáp án</th><th>Lời giải</th><th>Cả bộ</th></tr>
              </thead>
              <tbody>
                {data.maDe.map((m) => (
                  <tr key={m.ma}>
                    <td className={styles.mono}>{m.ma}</td>
                    {(["de", "dap-an", "loi-giai"] as const).map((l) => (
                      <td key={l}>
                        <a className={styles.link} href={`/dashboard/de-thi/${de.id}/docx?ma=${m.ma}&loai=${l}`}>Tải .docx</a>
                      </td>
                    ))}
                    <td><a className={styles.link} href={`/dashboard/de-thi/${de.id}/docx?ma=${m.ma}&loai=tat-ca`}>.zip</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.maDe.length > 1 && (
            <p className={styles.actions}>
              <a className={styles.btnPrimary} href={`/dashboard/de-thi/${de.id}/docx?ma=tat-ca&loai=tat-ca`}>Tải tất cả mã đề (.zip)</a>
            </p>
          )}
          {canEdit === false ? null : (
            <div className={styles.tao}>
              <label className={styles.field}>
                <span className={styles.label}>Tạo lại mã đề (số mã)</span>
                <select className={styles.input} value={soMaMoi} onChange={(e) => setSoMaMoi(Number(e.target.value))}>
                  {[1, 2, 3, 4, 6, 8].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className={styles.btnGhost}
                disabled={pending}
                onClick={() => chay(() => taoMaDe(de.id, soMaMoi), "Đã tạo lại mã đề.")}
              >
                Tạo lại
              </button>
            </div>
          )}
          <p className={styles.hint}>Mã đề đầu tiên (101) giữ nguyên thứ tự gốc; các mã sau hoán vị cụm/câu và đáp án A–D theo cấu hình lúc sinh đề.</p>
        </section>
      )}

      {/* ===== B4: drawer đổi cụm ===== */}
      {drawer && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Đổi cụm">
          <aside className={styles.drawer}>
            <div className={styles.rowBetween}>
              <h3 className={styles.cardTitle}>{drawer.laCum ? "Đổi sang cụm khác" : "Đổi sang câu khác"}</h3>
              <button type="button" className={styles.btnMini} onClick={() => setDrawer(null)}>Đóng</button>
            </div>
            {goiY === null && <p className={styles.muted}>Đang tìm gợi ý…</p>}
            {goiY?.length === 0 && <p className={styles.empty}>Không còn ứng viên phù hợp với dòng này.</p>}
            <ul className={styles.goiY}>
              {goiY?.map((g) => (
                <li key={g.don_vi_id}>
                  <label className={styles.goiYItem}>
                    <input type="radio" name="goi-y" checked={chon === g.don_vi_id} onChange={() => setChon(g.don_vi_id)} />
                    <span>
                      <strong>{g.la_cum ? g.tieu_de ?? "Cụm ngữ liệu" : "Câu hỏi"}</strong>
                      <span className={styles.muted}> · {g.so_cau} câu{g.do_kho_tb ? ` · khó TB ${g.do_kho_tb}` : ""}</span>
                      {g.lap_gan_day && <span className={`${styles.chip} ${styles.chipVua}`}>Lặp gần đây</span>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className={styles.actions}>
              <button type="button" className={styles.btnGhost} onClick={() => setDrawer(null)}>Huỷ</button>
              <button type="button" className={styles.btnPrimary} disabled={!chon || pending} onClick={apDungDoi}>Áp dụng</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
