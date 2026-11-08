"use client";

import { useEffect, useRef, useState } from "react";
import { BOARD_H, BOARD_W, B_POS, ROAD_LABEL_POS, ROAD_PATHS, ROADS, SPACES, SPACE_BY_ID, T_POS, type RoadId } from "@/game/board";
import { currentTeamId } from "@/game/reducer";
import type { GameState, TeamInfo } from "@/game/types";

const TYPE_FILL: Record<string, string> = {
  blue: "#2f80ed",
  red: "#e5484d",
  event: "#2fb344",
  item: "#9b51e0",
  shop: "#f2994a",
};

const ROAD_TINT: Record<RoadId, string> = {
  1: "#c9f29b",
  2: "#ffe7a3",
  3: "#d8cbb5",
  4: "#bfe3ff",
  5: "#e6d4ff",
};

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
  const cur = currentTeamId(state);
  const focus =
    state.phase === "recite" ? state.ctx.landed : state.phase === "star_offer" || state.phase === "star_recite" ? state.ctx.starAt : undefined;

  // 같은 칸의 말 겹침 처리
  const byPos: Record<number, string[]> = {};
  for (const id of state.teamIds) {
    const p = shown[id] ?? state.teams[id].pos;
    (byPos[p] ??= []).push(id);
  }

  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="w-full h-full select-none" role="img" aria-label="로마서 8장 보드">
      <defs>
        <radialGradient id="sky" cx="50%" cy="40%" r="75%">
          <stop offset="0%" stopColor="#bdf0ff" />
          <stop offset="100%" stopColor="#6cc8f0" />
        </radialGradient>
        {state.teamIds.map((id) => (
          <clipPath id={`clip-${id}`} key={id}>
            <circle r={17} cx={0} cy={0} />
          </clipPath>
        ))}
      </defs>
      <rect width={BOARD_W} height={BOARD_H} rx={28} fill="url(#sky)" />
      {/* 언덕 */}
      <ellipse cx={180} cy={640} rx={260} ry={110} fill="#7ed957" opacity={0.6} />
      <ellipse cx={820} cy={650} rx={300} ry={120} fill="#7ed957" opacity={0.6} />
      <ellipse cx={500} cy={360} rx={110} ry={180} fill="#ffffff" opacity={0.18} />

      {/* 길 */}
      {(Object.keys(ROAD_PATHS) as unknown as RoadId[]).map((rid) => {
        const pts = ROAD_PATHS[rid].map((p) => `${p.x},${p.y}`).join(" ");
        return (
          <g key={rid}>
            <polyline points={pts} fill="none" stroke="#8a5a2b" strokeWidth={compact ? 30 : 34} strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={pts} fill="none" stroke={ROAD_TINT[rid]} strokeWidth={compact ? 24 : 28} strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}

      {/* 길 이름 */}
      {!compact &&
        ROADS.map((r) => {
          const p = ROAD_LABEL_POS[r.id];
          return (
            <text key={r.id} x={p.x} y={p.y} textAnchor="middle" className="font-display" fontSize={20} fill="#3b2a14" opacity={0.7}>
              {r.name} {r.verses[0]}~{r.verses[1]}
            </text>
          );
        })}

      {/* T, B */}
      <g transform={`translate(${T_POS.x},${T_POS.y})`}>
        <circle r={30} fill="#ffd23f" stroke="#8a5a2b" strokeWidth={4} />
        <text textAnchor="middle" dy={7} fontSize={18} className="font-display" fill="#5a3500">
          출발
        </text>
      </g>
      <g transform={`translate(${B_POS.x},${B_POS.y})`}>
        <rect x={-34} y={-22} width={68} height={44} rx={10} fill="#fff" stroke="#8a5a2b" strokeWidth={4} />
        <text textAnchor="middle" dy={7} fontSize={17} className="font-display" fill="#5a3500">
          갈림길
        </text>
      </g>

      {/* 스타 (칸 뒤에 큰 별) */}
      {state.stars.map((st) => {
        const sp = SPACE_BY_ID[st];
        if (!sp) return null;
        return (
          <g key={`star-${st}`} transform={`translate(${sp.x},${sp.y})`}>
            <g className="animate-star">
              <polygon
                points="0,-36 10,-12 36,-12 15,4 23,30 0,15 -23,30 -15,4 -36,-12 -10,-12"
                fill="#ffd700"
                stroke="#b8860b"
                strokeWidth={3}
                strokeLinejoin="round"
              />
            </g>
          </g>
        );
      })}

      {/* 칸 */}
      {SPACES.map((sp) => {
        const isFocus = focus === sp.id;
        return (
          <g key={sp.id} transform={`translate(${sp.x},${sp.y})`}>
            {isFocus && <circle r={30} fill="none" stroke="#fff" strokeWidth={5} className="animate-ping-slow" />}
            <circle r={19} fill={TYPE_FILL[sp.type]} stroke="#fff" strokeWidth={3} />
            <text textAnchor="middle" dy={6} fontSize={16} fontWeight={800} fill="#fff">
              {sp.id}
            </text>
            {sp.type === "item" && (
              <text textAnchor="middle" y={-22} fontSize={14}>
                🎁
              </text>
            )}
            {sp.type === "shop" && (
              <text textAnchor="middle" y={-22} fontSize={14}>
                🏪
              </text>
            )}
          </g>
        );
      })}

      {/* 말 */}
      {Object.entries(byPos).flatMap(([posStr, ids]) => {
        const base = posXY(Number(posStr));
        return ids.map((id, i) => {
          const n = ids.length;
          let x: number;
          let y: number;
          if (Number(posStr) === 0) {
            // 출발점: 위쪽에 한 줄로
            x = base.x + (i - (n - 1) / 2) * 40;
            y = base.y - 58;
          } else {
            const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
            const off = n > 1 ? 20 : 0;
            x = base.x + Math.cos(ang) * off;
            y = base.y + Math.sin(ang) * off - (n > 1 ? 0 : 4);
          }
          const t = teamById[id];
          const isCur = id === cur && state.phase !== "ended";
          const isMine = highlightTeam === id;
          return (
            <g key={id} style={{ transform: `translate(${x}px, ${y}px)`, transition: "transform 0.28s ease-out" }}>
              {isCur && <circle r={27} fill="none" stroke="#fff" strokeWidth={4} strokeDasharray="6 5" className="animate-spin-slow" />}
              {isMine && <circle r={31} fill="none" stroke="#ffd23f" strokeWidth={4} />}
              <circle r={20} fill={t?.color ?? "#888"} stroke="#fff" strokeWidth={3} />
              {t?.image_url ? (
                <image href={t.image_url} x={-17} y={-17} width={34} height={34} clipPath={`url(#clip-${id})`} preserveAspectRatio="xMidYMid slice" />
              ) : (
                <text textAnchor="middle" dy={6} fontSize={16} fontWeight={800} fill="#fff">
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
