"use client";

import { useEffect, useRef, useState } from "react";
import type { GameState, TeamInfo } from "@/game/types";
import { TeamAvatar } from "./TeamAvatar";

const INTRO_MS = 4200;

/**
 * 게임 시작 연출: 대기 화면에서 게임 화면으로 바뀌는 순간에만 재생.
 * 화면이 어두워지고 "GAME START!"가 튀어나온 뒤, 진행 순서대로 팀이 하나씩 등장하고 서서히 걷힌다.
 * (이미 시작된 게임에 뒤늦게 접속한 경우에는 나오지 않는다.)
 */
export function StartIntro({ state, teamById, big = true }: { state: GameState; teamById: Record<string, TeamInfo>; big?: boolean }) {
  const [show, setShow] = useState(false);
  const prev = useRef<boolean | null>(null);
  useEffect(() => {
    const was = prev.current;
    prev.current = state.started;
    if (was !== false || !state.started) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), INTRO_MS);
    return () => clearTimeout(t);
  }, [state.started]);

  if (!show) return null;
  const size = big ? 76 : 44;
  // 폰: 한 줄에 못 담으면 두 줄로 고르게 나눈다 (7팀 → 4 + 3, 가운데 정렬)
  const n = state.teamIds.length;
  const cols = n <= 5 ? Math.max(1, n) : Math.ceil(n / 2);
  return (
    <div className="animate-intro-wrap fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-[#0b1033]/90 backdrop-blur-sm text-white pointer-events-none px-4">
      <div className="relative">
        <span className={`absolute inset-0 -z-10 rounded-full bg-yellow-300/30 blur-3xl animate-intro-glow`} />
        <div className={`animate-intro-title font-display text-yellow-300 [text-shadow:0_6px_0_#b45309,0_10px_30px_rgba(0,0,0,0.5)] ${big ? "text-9xl" : "text-5xl"}`}>
          GAME START!
        </div>
      </div>
      <div className={`animate-intro-sub font-display text-white/80 ${big ? "text-3xl" : "text-lg"}`}>진행 순서</div>
      <ol className={`flex flex-wrap justify-center ${big ? "gap-x-5 gap-y-4" : "gap-y-3"} max-w-5xl w-full`}>
        {state.teamIds.map((id, i) => {
          const t = teamById[id];
          return (
            <li
              key={id}
              className="animate-intro-team flex flex-col items-center gap-1"
              style={{ animationDelay: `${900 + i * 180}ms`, width: big ? undefined : `${100 / cols}%` }}
            >
              <span className="relative">
                <TeamAvatar team={t} size={size} />
                <span
                  className={`absolute -top-2 -left-2 rounded-full bg-white text-slate-900 font-display flex items-center justify-center shadow ${big ? "w-8 h-8 text-lg" : "w-5 h-5 text-xs"}`}
                >
                  {i + 1}
                </span>
              </span>
              <span className={`font-display ${big ? "text-2xl" : "text-sm"}`} style={{ color: t?.color }}>
                {t?.name}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
