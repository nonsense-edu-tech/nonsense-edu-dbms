"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/ToastProvider";
import { taoDeTuMaTran } from "./actions";
import styles from "./de-thi.module.css";

export default function TaoDeForm({ maTranId, tenMaTran }: { maTranId: string; tenMaTran: string }) {
  const router = useRouter();
  const showToast = useToast();
  const [pending, startTransition] = useTransition();
  const [ten, setTen] = useState(`Đề — ${tenMaTran}`);
  const [thoiGian, setThoiGian] = useState<string>("45");
  const [seed, setSeed] = useState("");
  const [chongLapN, setChongLapN] = useState(3);
  const [xaoCum, setXaoCum] = useState(true);
  const [xaoDapAn, setXaoDapAn] = useState(true);

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Cấu hình sinh đề</h2>
      <div className={styles.grid2}>
        <label className={styles.field}>
          <span className={styles.label}>Tên đề</span>
          <input className={styles.input} value={ten} onChange={(e) => setTen(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Thời gian (phút)</span>
          <input className={styles.input} type="number" min={1} value={thoiGian} onChange={(e) => setThoiGian(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Seed (để trống = ngẫu nhiên)</span>
          <input className={styles.input} value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Chống lặp với … đề đã chốt gần nhất</span>
          <select className={styles.input} value={chongLapN} onChange={(e) => setChongLapN(Number(e.target.value))}>
            {[0, 1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n === 0 ? "Không chống lặp" : `${n} đề`}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.checks}>
        <label className={styles.check}><input type="checkbox" checked={xaoCum} onChange={(e) => setXaoCum(e.target.checked)} /> Xáo thứ tự cụm / câu trong từng phần</label>
        <label className={styles.check}><input type="checkbox" checked={xaoDapAn} onChange={(e) => setXaoDapAn(e.target.checked)} /> Xáo đáp án A–D ở các mã đề sau</label>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await taoDeTuMaTran(maTranId, {
                ten, thoiGianPhut: thoiGian ? Number(thoiGian) : null, chongLapN, xaoCum, xaoDapAn, seed,
              });
              if ("error" in r) return showToast({ type: "error", message: r.error });
              showToast({ type: "success", message: "Đã sinh đề." });
              router.push(`/dashboard/de-thi/${r.id}`);
            })
          }
        >
          {pending ? "Đang sinh đề…" : "Sinh đề"}
        </button>
      </div>
    </section>
  );
}
