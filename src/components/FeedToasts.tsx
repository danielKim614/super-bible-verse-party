"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedEntry, GameState, TeamInfo } from "@/game/types";
import { TeamAvatar } from "./TeamAvatar";

const KIND_STYLE: Record<FeedEntry["kind"], string> = {
  payout: "bg-emerald-400 text-emerald-950",
  star: "bg-yellow-300 text-yellow-900",
  item: "bg-violet-400 text-violet-950",
  fail: "bg-slate-200 text-slate-800",
  info: "bg-white text-slate-800",
  boost: "bg-rose-500 text-white",
  cost: "bg-amber-300 text-amber-950",
  happening: "bg-cyan-300 text-cyan-950",
  bless: "bg-pink-300 text-pink-950",
};

/** 새로 생긴 피드 항목을 잠깐 띄움 (Undo로 사라진 항목은 무시) */
export function FeedToasts({ state, teamById, big = true }: { state: GameState; teamById: Record<string, TeamInfo>; big?: boolean }) {
  const [shown, setShown] = useState<(FeedEntry & { key: string })[]>([]);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    const keyOf = (f: FeedEntry) => `${f.seq}:${f.text}:${f.teamId ?? ""}`;
    if (seen.current === null) {
      seen.current = new Set(state.feed.map(keyOf));
      return;
    }
    const fresh = state.feed.filter((f) => !seen.current!.has(keyOf(f)));
    fresh.forEach((f) => seen.current!.add(keyOf(f)));
    if (!fresh.length) return;
    const items = fresh.map((f) => ({ ...f, key: keyOf(f) + Math.random() }));
    setShown((s) => [...s, ...items].slice(-4));
    setTimeout(() => setShown((s) => s.filter((x) => !items.includes(x))), 4500);
  }, [state.feed]);

  return (
    <div className="pointer-events-none flex flex-col items-start gap-2">
      {shown.map((f) => (
        <div
          key={f.key}
          className={`animate-pop flex items-center gap-2 rounded-full shadow-lg font-display ${big ? "px-5 py-2.5 text-2xl" : "px-3 py-1.5 text-base"} ${KIND_STYLE[f.kind]}`}
        >
          {f.teamId && <TeamAvatar team={teamById[f.teamId]} size={big ? 40 : 24} />}
          <span>{f.text}</span>
          {f.amount !== undefined && (
            <span>
              {f.amount > 0 ? "+" : ""}
              {f.amount}🪙
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
