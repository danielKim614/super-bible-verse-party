"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedEntry, GameState, TeamInfo } from "@/game/types";
import { TeamAvatar } from "./TeamAvatar";

const KIND_STYLE: Record<FeedEntry["kind"], string> = {
  payout: "bg-emerald-500 text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]",
  star: "bg-yellow-300 text-yellow-900",
  item: "bg-violet-400 text-violet-950",
  fail: "bg-slate-200 text-slate-800",
  info: "bg-white text-slate-800",
  boost: "bg-rose-500 text-white",
  cost: "bg-amber-300 text-amber-950",
  happening: "bg-cyan-300 text-cyan-950",
  bless: "bg-pink-300 text-pink-950",
};

/** 알림 자리는 한 칸. 새 알림이 오면 기존 알림은 아래로 밀려나며 사라짐 */
const MAX_VISIBLE = 1;
/** 여러 알림이 한꺼번에 생기면 앞 알림을 이만큼 보여 준 뒤 다음 알림이 밀어냄 */
const GAP_MS = 2000;
/** 다음 알림이 없을 때 알림 하나가 머무는 시간 */
const LIFE_MS = 4000;
/** 사라지는(밀려나는) 데 걸리는 시간 */
const LEAVE_MS = 450;
/** 대기열이 너무 길면 오래된 것은 건너뜀 */
const MAX_QUEUE = 6;

type Toast = FeedEntry & { key: string; leaving: false | "pushed" | "expired" };

/**
 * 새로 생긴 피드 항목을 한 자리에 하나씩 띄움 (Undo로 사라진 항목은 무시).
 * 다음 알림이 위에서 내려오면 지금 알림은 아래로 밀려나며 흐려져 사라진다.
 */
export function FeedToasts({ state, teamById, big = true }: { state: GameState; teamById: Record<string, TeamInfo>; big?: boolean }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const queue = useRef<Toast[]>([]);
  const lastShown = useRef(0);
  const pumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const counter = useRef(0);

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timers.current.delete(t);
      fn();
    }, ms);
    timers.current.add(t);
  };

  const show = (toast: Toast) => {
    lastShown.current = Date.now();
    setToasts((list) => {
      const pushed = new Set(list.filter((t) => !t.leaving).slice(MAX_VISIBLE - 1).map((t) => t.key));
      return [toast, ...list.map((t) => (pushed.has(t.key) ? { ...t, leaving: "pushed" as const } : t))];
    });
    later(() => setToasts((list) => list.map((t) => (t.key === toast.key && !t.leaving ? { ...t, leaving: "expired" as const } : t))), LIFE_MS);
  };

  // 사라지기 시작한 알림은 전환이 끝나면 목록에서 뺀다
  const removing = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const t of toasts) {
      if (!t.leaving || removing.current.has(t.key)) continue;
      removing.current.add(t.key);
      later(() => {
        removing.current.delete(t.key);
        setToasts((list) => list.filter((x) => x.key !== t.key));
      }, LEAVE_MS);
    }
  }, [toasts]);

  const pump = () => {
    if (pumpTimer.current) return;
    const next = () => {
      pumpTimer.current = null;
      const t = queue.current.shift();
      if (!t) return;
      show(t);
      if (queue.current.length) pumpTimer.current = setTimeout(next, GAP_MS);
    };
    const wait = Math.max(0, lastShown.current + GAP_MS - Date.now());
    pumpTimer.current = setTimeout(next, wait);
  };

  useEffect(() => {
    const keyOf = (f: FeedEntry) => `${f.seq}:${f.text}:${f.teamId ?? ""}`;
    if (seen.current === null) {
      seen.current = new Set(state.feed.map(keyOf));
      return;
    }
    const fresh = state.feed.filter((f) => !seen.current!.has(keyOf(f)));
    fresh.forEach((f) => seen.current!.add(keyOf(f)));
    if (!fresh.length) return;
    // 피드는 일어난 순서대로 쌓여 있으므로 그대로 줄 세움
    const items = fresh.map((f) => ({ ...f, key: `${keyOf(f)}#${counter.current++}`, leaving: false as const }));
    queue.current = [...queue.current, ...items].slice(-MAX_QUEUE);
    pump();
    // pump/show는 ref만 쓰므로 의존성에서 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.feed]);

  useEffect(() => {
    const all = timers.current;
    return () => {
      all.forEach(clearTimeout);
      if (pumpTimer.current) clearTimeout(pumpTimer.current);
    };
  }, []);

  // 한 줄 높이 + 간격. 위치는 transform으로 옮겨 부드럽게 밀려 내려가게 한다
  const slot = big ? 54 : 46;
  let i = 0;
  const placed = toasts.map((t) => {
    if (t.leaving === "pushed") return { t, y: MAX_VISIBLE * slot - slot * 0.2 };
    const y = i * slot;
    if (!t.leaving) i += 1;
    return { t, y };
  });

  return (
    <div className="pointer-events-none relative w-full" style={{ height: MAX_VISIBLE * slot }}>
      {placed.map(({ t: f, y }) => (
        <div
          key={f.key}
          className="absolute left-1/2 top-0"
          style={{
            transform: `translate(-50%, ${y}px)`,
            opacity: f.leaving ? 0 : 1,
            filter: f.leaving ? "blur(2px)" : undefined,
            transition: `transform 0.42s cubic-bezier(0.2, 0.8, 0.3, 1), opacity ${LEAVE_MS}ms ease-in, filter ${LEAVE_MS}ms ease-in`,
          }}
        >
          <div
            className={`animate-toast-in flex items-center gap-2 whitespace-nowrap rounded-full shadow-lg font-display ${big ? "px-4 py-1.5 text-xl" : "px-3 py-1.5 text-base"} ${KIND_STYLE[f.kind]}`}
          >
            {f.teamId && <TeamAvatar team={teamById[f.teamId]} size={big ? 30 : 24} />}
            <span>{f.text}</span>
            {f.amount !== undefined && (
              <span>
                {f.amount > 0 ? "+" : ""}
                {f.amount}🪙
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
