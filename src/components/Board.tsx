"use client";

import { useEffect, useRef, useState } from "react";
import { BOARD_H, BOARD_W, B_POS, ROAD_D, ROAD_LABEL_POS, ROADS, SPACES, SPACE_BY_ID, T_POS, type RoadId } from "@/game/board";
import { currentTeamId } from "@/game/reducer";
import type { GameState, TeamInfo } from "@/game/types";

const TYPE_FILL: Record<string, [string, string]> = {
  blue: ["#4f9cf9", "#2b6fd6"],
  red: ["#ff6b6b", "#d93a3a"],
  event: ["#5ad66e", "#2fa84a"],
  item: ["#b47cf5", "#8a4fd3"],
};

const ROAD_TINT: Record<RoadId, string> = {
  1: "#f6e3b4",
  2: "#f6e3b4",
  3: "#d9cbb8",
  4: "#f6e3b4",
  5: "#f6e3b4",
};

const ROAD_IDS: RoadId[] = [1, 2, 3, 4, 5];

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

function Cloud({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`} fill="#fff" opacity={0.85}>
      <ellipse cx={0} cy={0} rx={38} ry={16} />
      <circle cx={-14} cy={-10} r={16} />
      <circle cx={10} cy={-14} r={20} />
      <circle cx={26} cy={-4} r={13} />
    </g>
  );
}

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <rect x={-4} y={-6} width={8} height={16} rx={2} fill="#8a5a2b" />
      <circle cx={0} cy={-16} r={16} fill="#3fae5a" />
      <circle cx={-10} cy={-8} r={11} fill="#4cc26a" />
      <circle cx={10} cy={-8} r={11} fill="#4cc26a" />
    </g>
  );
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

  const byPos: Record<number, string[]> = {};
  for (const id of state.teamIds) {
    const p = shown[id] ?? state.teams[id].pos;
    (byPos[p] ??= []).push(id);
  }

  const roadW = compact ? 30 : 36;

  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="w-full h-full select-none" role="img" aria-label="로마서 8장 보드">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8fd8ff" />
          <stop offset="70%" stopColor="#d5f1ff" />
          <stop offset="100%" stopColor="#bfe9a8" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6b0" stopOpacity={0.95} />
          <stop offset="100%" stopColor="#ffd84d" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="starFill" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#fff2a8" />
          <stop offset="45%" stopColor="#ffd400" />
          <stop offset="100%" stopColor="#f0a000" />
        </linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#2a3f5f" floodOpacity="0.28" />
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
      <rect width={BOARD_W} height={BOARD_H} rx={32} fill="url(#sky)" />
      <ellipse cx={200} cy={620} rx={330} ry={120} fill="#9ad95f" />
      <ellipse cx={820} cy={635} rx={360} ry={130} fill="#8fd255" />
      <ellipse cx={500} cy={660} rx={520} ry={110} fill="#7cc84a" />
      <Cloud x={160} y={110} s={0.9} />
      <Cloud x={830} y={95} s={1.1} />
      <Cloud x={380} y={240} s={0.7} />
      <Tree x={300} y={330} s={0.9} />
      <Tree x={820} y={410} />
      <Tree x={760} y={380} s={0.7} />
      <Tree x={250} y={290} s={0.7} />

      {/* 길 */}
      {ROAD_IDS.map((rid) => (
        <g key={rid}>
          <path d={ROAD_D[rid]} fill="none" stroke="#2a3f5f" strokeOpacity={0.18} strokeWidth={roadW + 10} strokeLinecap="round" transform="translate(0,5)" />
          <path d={ROAD_D[rid]} fill="none" stroke="#9c6b3a" strokeWidth={roadW + 6} strokeLinecap="round" />
          <path d={ROAD_D[rid]} fill="none" stroke={ROAD_TINT[rid]} strokeWidth={roadW} strokeLinecap="round" />
          <path d={ROAD_D[rid]} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={2.5} strokeDasharray="10 12" strokeLinecap="round" />
        </g>
      ))}

      {/* 길 이름 */}
      {!compact &&
        ROADS.map((r) => {
          const p = ROAD_LABEL_POS[r.id];
          const label = `${r.name} ${r.verses[0]}~${r.verses[1]}`;
          const w = label.length * 17 + 24;
          return (
            <g key={r.id} transform={`translate(${p.x},${p.y})`}>
              <rect x={-w / 2} y={-16} width={w} height={32} rx={16} fill="#fff" opacity={0.75} />
              <text textAnchor="middle" dy={6} className="font-display" fontSize={17} fill="#4a3620">
                {label}
              </text>
            </g>
          );
        })}

      {/* T, B */}
      <g transform={`translate(${T_POS.x},${T_POS.y})`} filter="url(#soft)">
        <circle r={32} fill="#ffd23f" stroke="#fff" strokeWidth={4} />
        <circle r={24} fill="none" stroke="#e0a800" strokeWidth={2} strokeDasharray="4 4" />
        <text textAnchor="middle" dy={-2} fontSize={18} className="font-display" fill="#5a3500">
          출발
        </text>
        <text textAnchor="middle" dy={17} fontSize={15}>
          🏪
        </text>
      </g>
      <g transform={`translate(${B_POS.x},${B_POS.y})`} filter="url(#soft)">
        <rect x={-38} y={-22} width={76} height={44} rx={22} fill="#fff" stroke="#9c6b3a" strokeWidth={3} />
        <text textAnchor="middle" dy={7} fontSize={18} className="font-display" fill="#5a3500">
          갈림길
        </text>
      </g>

      {/* 칸 */}
      {SPACES.map((sp) => {
        const isFocus = focus === sp.id;
        const [light, dark] = TYPE_FILL[sp.type];
        return (
          <g key={sp.id} transform={`translate(${sp.x},${sp.y})`}>
            {isFocus && <circle r={32} fill="none" stroke="#fff" strokeWidth={5} className="animate-ping-slow" />}
            <circle r={19} cy={3} fill={dark} />
            <circle r={19} fill={light} stroke="#fff" strokeWidth={3} />
            <ellipse cx={-5} cy={-8} rx={8} ry={4.5} fill="#fff" opacity={0.35} />
            <text textAnchor="middle" dy={6} fontSize={16} fontWeight={800} fill="#fff">
              {sp.id}
            </text>
            {sp.type === "item" && (
              <text textAnchor="middle" y={-23} fontSize={15}>
                🎁
              </text>
            )}
          </g>
        );
      })}

      {/* 스타: 자체 디자인 금색 별, Y축 회전 */}
      {state.stars.map((st) => {
        const sp = SPACE_BY_ID[st];
        if (!sp) return null;
        return (
          <g key={`star-${st}`} transform={`translate(${sp.x},${sp.y - 50})`}>
            <circle r={40} fill="url(#glow)" className="animate-ping-slow" />
            <ellipse cx={0} cy={50} rx={16} ry={5} fill="#2a3f5f" opacity={0.25} />
            <g className="animate-star-spin">
              <polygon
                points="0,-30 8.6,-10 30,-10 12.8,2.6 19.1,24 0,12.4 -19.1,24 -12.8,2.6 -30,-10 -8.6,-10"
                fill="url(#starFill)"
                stroke="#fff"
                strokeWidth={3}
                strokeLinejoin="round"
                filter="url(#soft)"
              />
              <polygon
                points="0,-22 5,-9 19,-9 8,-1 0,-4 -8,-1 -19,-9 -5,-9"
                fill="#fff"
                opacity={0.35}
              />
            </g>
          </g>
        );
      })}

      {/* 말 */}
      {Object.entries(byPos).flatMap(([posStr, ids]) => {
        const base = posXY(Number(posStr));
        const n = ids.length;
        const atStart = Number(posStr) === 0;
        // 혼자면 칸 위에 크게, 여럿이면 작게 칸 위쪽에 한 줄로
        const r = n === 1 ? 21 : n === 2 ? 17 : 14;
        const gap = r * 2 + 4;
        return ids.map((id, i) => {
          const x = base.x + (i - (n - 1) / 2) * (n === 1 ? 0 : gap);
          const y = atStart ? base.y - 62 : n === 1 ? base.y - 4 : base.y - 30 - (n > 3 ? 4 : 0);
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
