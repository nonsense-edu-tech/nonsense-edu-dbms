import type { ReactNode } from "react";
import { chanNhomGiangDay } from "@/lib/chan-gv";

export default async function Layout({ children }: { children: ReactNode }) {
  await chanNhomGiangDay();
  return children;
}
