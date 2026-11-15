"use client";

/** 어드민 공용: 타입, 버튼 스타일, 한 줄 레이아웃 */
import { useAdmin } from "@/lib/useGame";

export type Admin = ReturnType<typeof useAdmin>;
export const btn = "rounded-xl px-4 py-2 font-bold shadow-sm active:scale-[0.97] transition disabled:opacity-40 disabled:pointer-events-none";

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 text-sm text-slate-500">{label}</span>
      {children}
    </div>
  );
}
