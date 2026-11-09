"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BOARD_H, BOARD_W, FORK_POINTS, ROUTE_D, SPACES, SPACE_BY_ID, T_POS, type RouteId } from "@/game/board";
import { currentTeamId } from "@/game/reducer";
import type { GameState, TeamInfo } from "@/game/types";

// 네온 톤: [채움, 그림자/글로우]
const TYPE_FILL: Record<string, [string, string]> = {
  blue: ["#4da3ff", "#1d6fe0"],
  red: ["#ff5c7a", "#d1294b"],
  event: ["#3ee07a", "#17a84f"],
  item: ["#c084fc", "#8b3fe0"],
  happening: ["#2dd4bf", "#0d9488"],
  bless: ["#f472b6", "#be185d"],
};
const TYPE_ICON: Record<string, string> = { item: "🎁", happening: "❔", bless: "🕊️" };

const ROUTE_IDS: RouteId[] = ["c0", "a1", "a2", "c1", "b1", "b2", "c2", "d1", "d2"];
const HARD_ROUTES: RouteId[] = ["a2", "b2"];

function posXY(pos: number) {
  if (pos === 0) return T_POS;
  const s = SPACE_BY_ID[pos];
  return s ? { x: s.x, y: s.y } : T_POS;
}

/** 말 이동 애니메이션: 현재 팀은 이번 턴 경로(ctx.path)를 따라 한 칸씩 이동 */
function useAnimatedPositions(state: GameState, stepMs: number) {
  const [shown, setShown] = useState<Record<string, number>>({});
  const shownRef = useRef(shown);
  shownRef.current = shown;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const target: Record<string, number> = {};
    for (const id of state.teamIds) target[id] = state.teams[id].pos;
    const cur = currentTeamId(state);
    const path = state.ctx.path;
    const prevShown = shownRef.current;

    const next: Record<string, number> = { ...target };
    let queue: number[] = [];
    if (cur && prevShown[cur] !== undefined && prevShown[cur] !== target[cur] && path.length > 0 && !state.ctx.teleport) {
      const idx = path.lastIndexOf(prevShown[cur]);
      queue = path.slice(idx + 1);
      if (queue[queue.length - 1] !== target[cur]) queue = [target[cur]];
      next[cur] = prevShown[cur];
    }
    setShown(next);
    const stepFn = () => {
      const p = queue.shift();
      if (p === undefined || !cur) return;
      setShown((s) => ({ ...s, [cur]: p }));
      if (queue.length) timer.current = setTimeout(stepFn, stepMs);
    };
    if (queue.length) timer.current = setTimeout(stepFn, stepMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.moveSeq, state.lastSeq, state.teamIds.join(",")]);

  return shown;
}

/** 배경 별빛 (결정적) */
function useSparkles(n: number) {
  return useMemo(() => {
    let a = 12345;
    const r = () => {
      a = (a * 1103515245 + 12345) & 0x7fffffff;
      return a / 0x7fffffff;
    };
    return Array.from({ length: n }, (_, i) => ({ x: r() * BOARD_W, y: r() * BOARD_H, r: 0.8 + r() * 1.6, d: (i % 7) * 0.4 }));
  }, [n]);
}

export function Board({
  state,
  teamById,
  highlightTeam,
  compact = false,
}: {
  state: GameState;
  teamById: Record<string, TeamInfo>;
  highlightTeam?: string;
  compact?: boolean;
}) {
  const shown = useAnimatedPositions(state, compact ? 200 : 320);
  const sparkles = useSparkles(70);
  const cur = currentTeamId(state);
  const focus =
    state.phase === "recite" ? state.ctx.landed : state.phase === "star_offer" || state.phase === "star_recite" ? state.ctx.starAt : undefined;

  const byPos: Record<number, string[]> = {};
  for (const id of state.teamIds) {
    const p = shown[id] ?? state.teams[id].pos;
    (byPos[p] ??= []).push(id);
  }

  const roadW = compact ? 30 : 36;

  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="w-full h-full select-none" role="img" aria-label="로마서 8장 보드">
      <defs>
        <radialGradient id="night" cx="50%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#2b3a8f" />
          <stop offset="60%" stopColor="#141b4d" />
          <stop offset="100%" stopColor="#0a0f2e" />
        </radialGradient>
        <radialGradient id="aurora1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6d5dfc" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#6d5dfc" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="aurora2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1fd1c8" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#1fd1c8" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff2a8" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#ffd84d" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="starFill" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#fff6c2" />
          <stop offset="45%" stopColor="#ffd400" />
          <stop offset="100%" stopColor="#f29a00" />
        </linearGradient>
        <linearGradient id="roadFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b4a86" />
          <stop offset="100%" stopColor="#26315f" />
        </linearGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.45" />
        </filter>
        <filter id="neon" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {state.teamIds.flatMap((id) =>
          [21, 17, 14].map((r) => (
            <clipPath id={`clip-${id}-${r}`} key={`${id}-${r}`}>
              <circle r={r - 3} cx={0} cy={0} />
            </clipPath>
          )),
        )}
      </defs>

      {/* 배경 */}
      <rect width={BOARD_W} height={BOARD_H} rx={36} fill="url(#night)" />
      <ellipse cx={760} cy={120} rx={360} ry={200} fill="url(#aurora1)" />
      <ellipse cx={240} cy={520} rx={330} ry={190} fill="url(#aurora2)" />
      {sparkles.map((sp, i) => (
        <circle key={i} cx={sp.x} cy={sp.y} r={sp.r} fill="#fff" opacity={0.7} className="animate-twinkle" style={{ animationDelay: `${sp.d}s` }} />
      ))}

      {/* 길 */}
      {ROUTE_IDS.map((rid) => (
        <g key={rid}>
          <path d={ROUTE_D[rid]} fill="none" stroke="#000" strokeOpacity={0.35} strokeWidth={roadW + 10} strokeLinecap="round" transform="translate(0,6)" />
          <path d={ROUTE_D[rid]} fill="none" stroke="#7f8fd6" strokeOpacity={0.9} strokeWidth={roadW + 5} strokeLinecap="round" />
          <path d={ROUTE_D[rid]} fill="none" stroke="url(#roadFill)" strokeWidth={roadW} strokeLinecap="round" />
          <path
            d={ROUTE_D[rid]}
            fill="none"
            stroke={HARD_ROUTES.includes(rid) ? "#ffb15c" : "#cfe3ff"}
            strokeOpacity={0.7}
            strokeWidth={2.5}
            strokeDasharray="8 14"
            strokeLinecap="round"
            className="animate-dash"
          />
        </g>
      ))}

      {/* T, B */}
      <g transform={`translate(${T_POS.x},${T_POS.y})`} filter="url(#soft)">
        <circle r={36} fill="#ffd23f" stroke="#fff" strokeWidth={4} />
        <text textAnchor="middle" dy={-1} fontSize={19} className="font-display" fill="#5a3500">
          출발
        </text>
        <text textAnchor="middle" dy={19} fontSize={15}>
          🏪
        </text>
      </g>
      {Object.values(FORK_POINTS).map((p, i) => (
        <g key={i} transform={`translate(${p.x},${p.y})`} filter="url(#soft)">
          <polygon points="0,-22 22,0 0,22 -22,0" fill="#fff" stroke="#7f8fd6" strokeWidth={3} />
          <text textAnchor="middle" dy={5} fontSize={13} className="font-display" fill="#26315f">
            갈림
          </text>
        </g>
      ))}

      {/* 칸 */}
      {SPACES.map((sp) => {
        const isFocus = focus === sp.id;
        const [light, dark] = TYPE_FILL[sp.type];
        return (
          <g key={sp.id} transform={`translate(${sp.x},${sp.y})`}>
            {isFocus && <circle r={34} fill="none" stroke="#fff" strokeWidth={5} className="animate-ping-slow" />}
            <circle r={21} fill={dark} opacity={0.6} filter="url(#neon)" />
            <circle r={19} cy={3} fill={dark} />
            <circle r={19} fill={light} stroke="#fff" strokeWidth={3} />
            <ellipse cx={-5} cy={-8} rx={8} ry={4.5} fill="#fff" opacity={0.4} />
            <text textAnchor="middle" dy={6} fontSize={16} fontWeight={800} fill="#fff">
              {sp.id}
            </text>
            {TYPE_ICON[sp.type] && (
              <text textAnchor="middle" y={-24} fontSize={15}>
                {TYPE_ICON[sp.type]}
              </text>
            )}
          </g>
        );
      })}

      {/* 스타: 칸 위에 떠서 Y축 회전 */}
      {state.stars.map((st) => {
        const sp = SPACE_BY_ID[st];
        if (!sp) return null;
        return (
          <g key={`star-${st}`} transform={`translate(${sp.x},${sp.y - 50})`}>
            <circle r={44} fill="url(#glow)" className="animate-ping-slow" />
            <ellipse cx={0} cy={50} rx={16} ry={5} fill="#000" opacity={0.35} />
            <g className="animate-star-spin">
              <polygon
                points="0,-30 8.6,-10 30,-10 12.8,2.6 19.1,24 0,12.4 -19.1,24 -12.8,2.6 -30,-10 -8.6,-10"
                fill="url(#starFill)"
                stroke="#fff"
                strokeWidth={3}
                strokeLinejoin="round"
                filter="url(#soft)"
              />
              <polygon points="0,-22 5,-9 19,-9 8,-1 0,-4 -8,-1 -19,-9 -5,-9" fill="#fff" opacity={0.35} />
            </g>
          </g>
        );
      })}

      {/* 말 */}
      {Object.entries(byPos).flatMap(([posStr, ids]) => {
        const base = posXY(Number(posStr));
        const n = ids.length;
        const atStart = Number(posStr) === 0;
        const r = n === 1 ? 21 : n === 2 ? 17 : 14;
        const gap = r * 2 + 4;
        return ids.map((id, i) => {
          const x = base.x + (i - (n - 1) / 2) * (n === 1 ? 0 : gap);
          const y = atStart ? base.y - 66 : n === 1 ? base.y - 4 : base.y - 30 - (n > 3 ? 4 : 0);
          const t = teamById[id];
          const isCur = id === cur && state.phase !== "ended";
          const isMine = highlightTeam === id;
          return (
            <g key={id} style={{ transform: `translate(${x}px, ${y}px)`, transition: "transform 0.28s ease-out" }} filter="url(#soft)">
              {isCur && <circle r={r + 7} fill="none" stroke="#fff" strokeWidth={4} strokeDasharray="6 5" className="animate-spin-slow" />}
              {isMine && <circle r={r + 11} fill="none" stroke="#ffd23f" strokeWidth={4} />}
              <circle r={r} fill={t?.color ?? "#888"} stroke="#fff" strokeWidth={3} />
              {t?.image_url ? (
                <image
                  href={t.image_url}
                  x={-(r - 3)}
                  y={-(r - 3)}
                  width={(r - 3) * 2}
                  height={(r - 3) * 2}
                  clipPath={`url(#clip-${id}-${r})`}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <text textAnchor="middle" dy={r * 0.3} fontSize={r * 0.8} fontWeight={800} fill="#fff">
                  {(t?.name ?? "?").slice(0, 1)}
                </text>
              )}
            </g>
          );
        });
      })}
    </svg>
  );
}
