"use client";

import { splitSum } from "./DieBadge";
import { useEffect, useMemo, useRef, useState, memo } from "react";
import { BOARD_H, BOARD_W, FORKS, ROUTE_D, SHOP_AT, SHOP_POS, SPACES, SPACE_BY_ID, T_POS, type RouteId, type SpaceType } from "@/game/board";
import { currentTeamId, diceCount } from "@/game/reducer";
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

const ROUTE_IDS: RouteId[] = ["a1", "a2", "c1", "b1", "b2", "c2", "d1", "d2", "c3"];
const HARD_ROUTES: RouteId[] = ["a2", "b2"];

/** 칸 위 아이콘 (자체 SVG). 원점이 아이콘 중심 */
function GiftIcon() {
  return (
    <g>
      <rect x={-13} y={-6} width={26} height={18} rx={3} fill="#e11d48" stroke="#fff" strokeWidth={1.5} />
      <rect x={-15} y={-12} width={30} height={9} rx={3} fill="#fb7185" stroke="#fff" strokeWidth={1.5} />
      <rect x={-3} y={-12} width={6} height={24} fill="#fde047" />
      <path d="M-3 -12 C-10 -22 -16 -16 -8 -12 Z" fill="#fde047" />
      <path d="M3 -12 C10 -22 16 -16 8 -12 Z" fill="#fde047" />
    </g>
  );
}
function BlessIcon() {
  return (
    <g>
      <circle r={13} fill="#f9a8d4" stroke="#fff" strokeWidth={1.5} />
      <path d="M0 7 C-9 0 -9 -8 -4 -8 C-1 -8 0 -5 0 -4 C0 -5 1 -8 4 -8 C9 -8 9 0 0 7 Z" fill="#be185d" />
      <path d="M-11 -14 l2 -4 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 z" fill="#fff" />
      <path d="M12 -12 l1.5 -3 l1.5 3 l3 1.5 l-3 1.5 l-1.5 3 l-1.5 -3 l-3 -1.5 z" fill="#fff" />
    </g>
  );
}
function HappeningIcon() {
  return (
    <g>
      <polygon points="0,-15 13,-7 13,7 0,15 -13,7 -13,-7" fill="#14b8a6" stroke="#fff" strokeWidth={1.5} />
      <text textAnchor="middle" dy={6} fontSize={17} fontWeight={900} fill="#fff">
        ?
      </text>
    </g>
  );
}
const SPACE_ICON: Record<string, () => React.JSX.Element> = { item: GiftIcon, bless: BlessIcon, happening: HappeningIcon };

function posXY(pos: number) {
  if (pos === 0) return T_POS;
  const s = SPACE_BY_ID[pos];
  return s ? { x: s.x, y: s.y } : T_POS;
}

/** 말 이동 애니메이션: 현재 팀은 이번 턴 경로(ctx.path)를 따라 한 칸씩 이동 */
function useAnimatedPositions(state: GameState, stepMs: number, initialDelayMs: number) {
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
    if (queue.length) timer.current = setTimeout(stepFn, stepMs + initialDelayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.moveSeq, state.lastSeq, state.teamIds.join(",")]);

  return shown;
}

/** START에서 1번 칸으로 휘어지는 뭉툭한 화살표 (단색, START 중심에서 1번 칸 중심을 향함) */
function StartArrow() {
  const to = SPACE_BY_ID[1];
  const dx = to.x - T_POS.x;
  const dy = to.y - T_POS.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // START 중심과 1번 칸 중심을 잇는 선 위에 놓고, 아주 살짝만 휘게 한다
  const sx = T_POS.x + ux * (34 + 12);
  const sy = T_POS.y + uy * (34 + 12);
  // 화살촉 끝은 1번 칸 가장자리에서 12 떨어진 곳, 몸통은 그 16 앞에서 끝남
  const bx = to.x - ux * (24 + 12 + 16);
  const by = to.y - uy * (24 + 12 + 16);
  const cx = (sx + bx) / 2 + uy * 5;
  const cy = (sy + by) / 2 - ux * 5;
  const ang = (Math.atan2(uy, ux) * 180) / Math.PI;
  const color = "#fff";
  return (
    <g className="animate-pulse-fast" filter="url(#soft)">
      <path d={`M ${sx} ${sy} Q ${cx} ${cy} ${bx} ${by}`} fill="none" stroke={color} strokeWidth={11} strokeLinecap="round" />
      <g transform={`translate(${bx},${by}) rotate(${ang})`}>
        <path d="M -2 -12 L 16 0 L -2 12 Z" fill={color} stroke={color} strokeWidth={4} strokeLinejoin="round" />
      </g>
    </g>
  );
}

/** 출발 표시: 모든 말이 출발을 떠나면 한 번 반짝이며 사라짐 (Undo 등으로 다시 돌아오면 다시 보임) */
const START_VANISH_MS = 1000;
function useStartMark(state: GameState, shown: Record<string, number>): "visible" | "leaving" | "hidden" {
  const allLeft =
    state.started && state.teamIds.length > 0 && state.teamIds.every((id) => (shown[id] ?? state.teams[id].pos) !== 0);
  const [mark, setMark] = useState<"visible" | "leaving" | "hidden">(allLeft ? "hidden" : "visible");
  const prev = useRef(allLeft);
  useEffect(() => {
    if (prev.current === allLeft) return;
    prev.current = allLeft;
    if (!allLeft) {
      setMark("visible");
      return;
    }
    setMark("leaving");
    const t = setTimeout(() => setMark("hidden"), START_VANISH_MS);
    return () => clearTimeout(t);
  }, [allLeft]);
  return mark;
}

/** 갈림길 선택 직후 잠깐 보여줄 연출 정보 */
function useForkFlash(state: GameState) {
  const [flash, setFlash] = useState<{ pos: number; chosen: number } | null>(null);
  const prevPhase = useRef(state.phase);
  useEffect(() => {
    const was = prevPhase.current;
    prevPhase.current = state.phase;
    if (was !== "choose_path" || state.phase === "choose_path") return;
    const path = state.ctx.path;
    // 경로에서 갈림길 칸 바로 다음 칸이 선택된 길의 첫 칸
    for (let i = 0; i < path.length; i++) {
      const fork = FORKS[path[i]];
      if (fork && path[i + 1] !== undefined) {
        const idx = fork.findIndex((o) => o.to === path[i + 1]);
        if (idx >= 0) {
          setFlash({ pos: path[i], chosen: idx });
          const t = setTimeout(() => setFlash(null), 900);
          return () => clearTimeout(t);
        }
      }
    }
    // 경로가 갈림길 칸에서 시작하는 경우 (갈림길 칸에 멈춰 있다가 출발)
    const cur = currentTeamId(state);
    if (cur) {
      const start = path[0];
      for (const [k, fork] of Object.entries(FORKS)) {
        const idx = fork.findIndex((o) => o.to === start);
        if (idx >= 0) {
          setFlash({ pos: Number(k), chosen: idx });
          const t = setTimeout(() => setFlash(null), 900);
          return () => clearTimeout(t);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.moveSeq]);
  return flash;
}

const DICE_MS = 1300;

/** 주사위 입력 직후 굴러가는 연출 */
function useDiceRoll(state: GameState) {
  const [dice, setDice] = useState<{ key: number; faces: number[]; show: number[]; lockFirst?: boolean } | null>(null);
  const prevRoll = useRef<number | undefined>(state.ctx.roll);
  const prevSeq = useRef(state.ctx.startSeq);
  useEffect(() => {
    const hadRoll = prevRoll.current !== undefined && prevSeq.current === state.ctx.startSeq;
    prevRoll.current = state.ctx.roll;
    prevSeq.current = state.ctx.startSeq;
    if (state.ctx.roll === undefined || hadRoll || state.ctx.teleport) return;
    const faces = state.ctx.faces && state.ctx.faces.length ? state.ctx.faces : splitSum(state.ctx.roll);
    const key = Date.now();
    // 선택 다이스로 고정한 첫 주사위는 구르지 않고 그 눈 그대로
    const lockFirst = state.ctx.rollMode === "fixed" && !!state.ctx.fixedFace;
    const rnd = (f: number, i: number) => (lockFirst && i === 0 ? f : 1 + Math.floor(Math.random() * 6));
    setDice({ key, faces, show: faces.map(rnd), lockFirst });
    let n = 0;
    const iv = setInterval(() => {
      n += 1;
      setDice((d) => (d && d.key === key ? { ...d, show: d.faces.map(rnd) } : d));
      if (n >= 9) {
        clearInterval(iv);
        setDice((d) => (d && d.key === key ? { ...d, show: d.faces } : d));
      }
    }, 100);
    const t = setTimeout(() => setDice((d) => (d && d.key === key ? null : d)), DICE_MS + 500);
    return () => {
      clearInterval(iv);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ctx.roll, state.ctx.startSeq]);
  return dice;
}

const STAR_FX_MS = 2400;

/** 스타 구매 직후 연출: 그 칸 위에서 별이 빠르게 돌며 빛나다 사라짐 */
const STAR_SPAWN_MS = 2200;
/** 산 별이 사라진 뒤 새 별이 나타나기까지 잠깐 쉬는 시간 (화면은 계속 어둡게) */
const STAR_GAP_MS = 1000;

function useStarBurst(state: GameState) {
  const [burst, setBurst] = useState<{ key: number; at: number } | null>(null);
  const [hidden, setHidden] = useState<number | null>(null); // 아직 등장 연출 전인 새 별
  const [spawn, setSpawn] = useState<{ key: number; at: number } | null>(null);
  const [pause, setPause] = useState(false);
  const prevBought = useRef(false);
  const prevStart = useRef(state.ctx.startSeq);
  const prevStars = useRef<number[]>(state.stars);
  useEffect(() => {
    const was = prevBought.current && prevStart.current === state.ctx.startSeq;
    prevBought.current = !!state.ctx.starBought;
    prevStart.current = state.ctx.startSeq;
    const before = prevStars.current;
    prevStars.current = state.stars;
    if (!state.ctx.starBought || was) return;
    const at = state.ctx.starBoughtAt ?? state.ctx.landed ?? 0;
    const fresh = state.stars.find((x) => !before.includes(x)) ?? null;
    const key = Date.now();
    setBurst({ key, at });
    setHidden(fresh);
    // 산 별 연출 → 잠깐 쉼(어두운 채로) → 새 별 등장
    const t1 = setTimeout(() => {
      setBurst((b) => (b && b.key === key ? null : b));
      setPause(true);
    }, STAR_FX_MS);
    const t2 = setTimeout(() => {
      setPause(false);
      setHidden(null);
      if (fresh !== null) setSpawn({ key, at: fresh });
    }, STAR_FX_MS + STAR_GAP_MS);
    const t3 = setTimeout(() => setSpawn((sp) => (sp && sp.key === key ? null : sp)), STAR_FX_MS + STAR_GAP_MS + STAR_SPAWN_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setPause(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ctx.starBought, state.ctx.startSeq]);
  return { burst, hidden, spawn, pause };
}

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

function Die({ face, settled, delay, locked }: { face: number; settled: boolean; delay: number; locked?: boolean }) {
  if (locked) {
    // 선택 다이스로 고정한 주사위: 구르지 않고 금색 테두리로 그 자리에
    return (
      <g filter="url(#soft)">
        <rect x={-34} y={-34} width={68} height={68} rx={14} fill="#fff" stroke="#fbbf24" strokeWidth={5} />
        {(PIPS[face] ?? PIPS[1]).map(([px, py], i) => (
          <circle key={i} cx={px * 18} cy={py * 18} r={6.5} fill="#1e293b" />
        ))}
      </g>
    );
  }
  // 바깥 g: 왼쪽에서 굴러 들어오는 이동, 안쪽 g: 구르는 회전 → 멈추면 튕김
  return (
    <g className="animate-die-travel" style={{ animationDelay: `${delay}ms` }}>
      <g className={settled ? "animate-die-settle" : "animate-die-tumble"} style={{ animationDelay: settled ? "0ms" : `${delay}ms` }}>
        <rect x={-34} y={-34} width={68} height={68} rx={14} fill="#fff" stroke="#cbd5e1" strokeWidth={3} filter="url(#soft)" />
        {(PIPS[face] ?? PIPS[1]).map(([px, py], i) => (
          <circle key={i} cx={px * 18} cy={py * 18} r={6.5} fill="#1e293b" />
        ))}
      </g>
    </g>
  );
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
  const forkFlash = useForkFlash(state);
  const dice = useDiceRoll(state);
  const { burst: starBurst, hidden: hiddenStar, spawn: starSpawn, pause: starPause } = useStarBurst(state);
  const shown = useAnimatedPositions(state, compact ? 200 : 320, forkFlash ? 700 : dice ? DICE_MS : 0);
  const startMark = useStartMark(state, shown);
  const warp = useWarpFx(state);
  const sparkles = useSparkles(70);
  const cur = currentTeamId(state);
  const focus =
    state.phase === "recite" ? state.ctx.landed : state.phase === "star_offer" || state.phase === "star_recite" ? state.ctx.starAt : undefined;

  const byPos: Record<number, string[]> = {};
  for (const id of state.teamIds) {
    if (warp && warp.team === id) continue; // 파이프 연출 중인 말은 연출 레이어에서 그림
    if (state.phase === "pipe_choose" && id === currentTeamId(state)) continue; // 황금 파이프 속에 있는 중
    const p = shown[id] ?? state.teams[id].pos;
    (byPos[p] ??= []).push(id);
  }

  const roadW = compact ? 30 : 36;

  return (
    <div className="relative w-full h-full">
    <BoardBackdrop roadW={roadW} />
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className="relative block w-full h-full select-none" role="img" aria-label="로마서 8장 보드">
      <defs>
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
        {(Object.keys(TYPE_FILL) as SpaceType[]).map((t) => (
          <radialGradient key={t} id={`planet-${t}`} cx="34%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#fff" stopOpacity={0.95} />
            <stop offset="18%" stopColor={TYPE_FILL[t][0]} />
            <stop offset="62%" stopColor={TYPE_FILL[t][0]} />
            <stop offset="100%" stopColor={TYPE_FILL[t][1]} />
          </radialGradient>
        ))}
        <linearGradient id="pipeGreen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="55%" stopColor="#16a34a" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
        <linearGradient id="pipeGold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff1a8" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b7791f" />
        </linearGradient>
        <clipPath id="pipeMouth" clipPathUnits="userSpaceOnUse">
          <rect x={-60} y={-160} width={120} height={160 + PIPE_TOP + 1} />
        </clipPath>
        <linearGradient id="goldDie" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff1a8" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b7791f" />
        </linearGradient>
        <linearGradient id="shopHull" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="shopBeam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde047" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#fde047" stopOpacity={0.05} />
        </linearGradient>
        <radialGradient id="planetShade" cx="30%" cy="26%" r="85%">
          <stop offset="55%" stopColor="#000" stopOpacity={0} />
          <stop offset="100%" stopColor="#060a2a" stopOpacity={0.55} />
        </radialGradient>
        <clipPath id="planetClip">
          <circle r={PLANET_R} />
        </clipPath>
        {state.teamIds.flatMap((id) =>
          [21, 17, 14].map((r) => (
            <clipPath id={`clip-${id}-${r}`} key={`${id}-${r}`}>
              <circle r={r - 3} cx={0} cy={0} />
            </clipPath>
          )),
        )}
      </defs>

      {/* 반짝이는 별 (배경·은하수 띠는 BoardBackdrop의 정지 레이어) */}
      {sparkles.map((sp, i) => (
        <circle key={i} cx={sp.x} cy={sp.y} r={sp.r} fill="#fff" opacity={0.7} className="animate-twinkle" style={{ animationDelay: `${sp.d}s` }} />
      ))}

      {/* 길 위를 흐르는 별가루 (어려운 길은 주황빛). 폰(compact)에서는 한 겹만 */}
      {ROUTE_IDS.map((rid) => {
        const dust = HARD_ROUTES.includes(rid) ? "#ffd9a8" : "#ffffff";
        const d = ROUTE_D[rid];
        return (
          <g key={rid} fill="none" strokeLinecap="round">
            {!compact && (
              <path d={d} stroke={dust} strokeOpacity={0.55} strokeWidth={1.4} strokeDasharray="0.1 6 0.1 9 0.1 28.7" className="animate-dash" style={{ animationDuration: "5s" }} transform="translate(0,-7)" />
            )}
            <path d={d} stroke={dust} strokeOpacity={0.9} strokeWidth={2.4} strokeDasharray="0.1 21.9" className="animate-dash" style={{ animationDuration: "3.2s" }} />
            {!compact && (
              <path d={d} stroke={dust} strokeOpacity={0.7} strokeWidth={3.4} strokeDasharray="0.1 13 0.1 30.8" className="animate-dash" style={{ animationDuration: "4.2s" }} transform="translate(0,6)" />
            )}
          </g>
        );
      })}

      {/* START → 1번 칸 방향 화살표 (START가 보이는 동안만) */}
      {startMark === "visible" && <StartArrow />}
      {/* 출발점: 모든 말이 떠나면 반짝이며 사라짐 */}
      {startMark !== "hidden" && (
        <g transform={`translate(${T_POS.x},${T_POS.y})`}>
          <g className={startMark === "leaving" ? "animate-start-vanish" : undefined} filter="url(#soft)">
            <circle r={34} fill="#ffd23f" stroke="#fff" strokeWidth={4} />
            <text textAnchor="middle" dy={6} fontSize={16} letterSpacing={0.5} className="font-display" fill="#fff" stroke="#b45309" strokeWidth={3} paintOrder="stroke">
              START
            </text>
          </g>
          {startMark === "leaving" && (
            <g>
              <circle r={34} fill="none" stroke="#ffd23f" strokeWidth={5} className="animate-start-ring" />
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2;
                return (
                  <circle
                    key={i}
                    r={4}
                    fill="#fff7c2"
                    className="animate-start-spark"
                    style={{ ["--dx" as string]: `${Math.cos(a) * 60}px`, ["--dy" as string]: `${Math.sin(a) * 60}px` }}
                  />
                );
              })}
            </g>
          )}
        </g>
      )}
      {/* 상점: 28번 행성 위에 떠 있는 우주 상점선. 빛줄기가 28번 칸을 비춘다 */}
      <g transform={`translate(${SHOP_POS.x},${SHOP_POS.y})`}>
        {/* 빛줄기와 UFO가 함께 살짝 떠다님 (진폭 3px) */}
        <g className="animate-ufo">
          {/* 28번 칸으로 내려오는 빛줄기 */}
          <path d={`M -12 10 L 12 10 L ${SHOP_AT_DX + 17} ${SHOP_AT_DY - 6} L ${SHOP_AT_DX - 17} ${SHOP_AT_DY - 6} Z`} fill="url(#shopBeam)" />
          <g filter="url(#soft)">
          {/* 유리 돔 */}
          <path d="M -15 -4 A 15 15 0 0 1 15 -4 Z" fill="#7dd3fc" fillOpacity={0.85} stroke="#e0f2fe" strokeWidth={1.5} />
          <ellipse cx={-5} cy={-12} rx={4} ry={2.2} fill="#fff" opacity={0.7} />
          {/* 선체 */}
          <ellipse cx={0} cy={2} rx={32} ry={10} fill="url(#shopHull)" stroke="#f5f3ff" strokeWidth={1.6} />
          <ellipse cx={0} cy={-1} rx={22} ry={4} fill="#fff" opacity={0.18} />
          {/* 불빛 */}
          {[-22, -11, 0, 11, 22].map((x, i) => (
            <circle key={x} cx={x} cy={5 - Math.abs(x) * 0.09} r={2.6} fill="#fde047" className="animate-twinkle" style={{ animationDelay: `${i * 0.3}s` }} />
          ))}
          {/* 간판 */}
          <rect x={-19} y={-34} width={38} height={15} rx={7.5} fill="#fde047" stroke="#fff" strokeWidth={1.5} />
          <text textAnchor="middle" y={-22.5} fontSize={10.5} className="font-display" fill="#4c1d95">
            상점
          </text>
          </g>
        </g>
      </g>

      {/* 칸 */}
      {SPACES.map((sp) => {
        const isFocus = focus === sp.id;
        const [light, dark] = TYPE_FILL[sp.type];
        return (
          <g key={sp.id} transform={`translate(${sp.x},${sp.y})`}>
            {isFocus && <circle r={34} fill="none" stroke="#fff" strokeWidth={5} className="animate-ping-slow" />}
            <Planet id={sp.id} type={sp.type} light={light} dark={dark} />
            <text textAnchor="middle" dy={6} fontSize={16} fontWeight={800} fill="#fff" stroke={dark} strokeWidth={3.5} strokeLinejoin="round" paintOrder="stroke">
              {sp.id}
            </text>
            {SPACE_ICON[sp.type] && (
              <g transform="translate(0,-34)" filter="url(#soft)" className="animate-bob">
                {SPACE_ICON[sp.type]()}
              </g>
            )}
          </g>
        );
      })}

      {/* 스타 획득·등장 동안 화면 어둡게 */}
      {(starBurst || starPause || starSpawn) && <rect width={BOARD_W} height={BOARD_H} rx={36} fill="#05081f" opacity={0.72} className="animate-dim-in" />}

      {/* 스타: 칸 위에 떠서 Y축 회전 */}
      {state.stars.map((st) => {
        const sp = SPACE_BY_ID[st];
        if (!sp || st === hiddenStar) return null;
        const spawning = starSpawn?.at === st;
        return (
          <g key={`star-${st}`} transform={`translate(${sp.x},${sp.y - 40})`}>
            {spawning && (
              <g transform={`translate(0,${sp.y < 170 ? 118 : -84})`}>
                {/* 위치(transform 속성)와 애니메이션(CSS transform)을 다른 g에 나눠야 위치가 유지된다 */}
                <g className="animate-pop" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                  <rect x={-58} y={-16} width={116} height={32} rx={16} fill="#fde047" stroke="#fff" strokeWidth={2.5} />
                  <text textAnchor="middle" dy={7} fontSize={18} className="font-display" fill="#4c1d95">
                    새 스타 등장!
                  </text>
                </g>
              </g>
            )}
            {spawning && (
              <g className="animate-starfx-rays" style={{ animationDuration: "2.2s" }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <rect key={i} x={-2.5} y={-80} width={5} height={46} rx={2.5} fill="#fff7c2" opacity={0.9} transform={`rotate(${i * 36})`} />
                ))}
              </g>
            )}
            <circle r={44} fill="url(#glow)" className="animate-ping-slow" />
            <ellipse cx={0} cy={40} rx={16} ry={5} fill="#000" opacity={0.35} />
            <g className={spawning ? "animate-star-spawn" : "animate-star-spin"}>
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

      {/* 갈림길 화살표: 선택 대기 중 + 선택 직후 연출 */}
      {cur &&
        (state.phase === "choose_path" || forkFlash) &&
        (() => {
          const pos = forkFlash ? forkFlash.pos : state.teams[cur].pos;
          const from = posXY(pos);
          const opts = FORKS[pos] ?? [];
          return opts.map((o, i) => {
            // 방향은 그 길의 두 번째 칸 쪽으로, 길이는 고정
            const aim = posXY(SPACE_BY_ID[o.to + 1] ? o.to + 1 : o.to);
            const dx = aim.x - from.x;
            const dy = aim.y - from.y;
            const len = Math.hypot(dx, dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            const angle = (Math.atan2(uy, ux) * 180) / Math.PI;
            const color = i === 0 ? "#7dd3fc" : "#fcd34d";
            const lx = from.x + ux * 128;
            const ly = from.y + uy * 128;
            const picked = forkFlash ? forkFlash.chosen === i : null;
            const cls = picked === null ? "animate-pulse-fast" : picked ? "animate-fork-pick" : "animate-fork-drop";
            // 짧고 통통한 화살표: 갈림길 칸에서 34px 떨어진 곳부터 길이 56px
            const body = "M0 -14 L24 -14 L24 -30 L56 0 L24 30 L24 14 L0 14 Z";
            return (
              <g key={o.to} className={cls} style={{ transformOrigin: `${from.x + ux * 62}px ${from.y + uy * 62}px` }}>
                <g transform={`translate(${from.x + ux * 34},${from.y + uy * 34}) rotate(${angle})`}>
                  <path d={body} fill={color} opacity={0.5} filter="url(#neon)" transform="scale(1.12)" />
                  <path d={body} fill="#fff" stroke={color} strokeWidth={5} strokeLinejoin="round" />
                  <path d="M8 -5 L22 -5" stroke={color} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
                </g>
                <g transform={`translate(${lx},${ly})`}>
                  <rect x={-34} y={-14} width={68} height={28} rx={14} fill={i === 0 ? "#0369a1" : "#b45309"} stroke="#fff" strokeWidth={2} />
                  <text textAnchor="middle" dy={5} fontSize={14} className="font-display" fill="#fff">
                    {o.label}
                  </text>
                </g>
              </g>
            );
          });
        })()}

      {/* 말 */}
      {Object.entries(byPos).flatMap(([posStr, ids]) => {
        const base = posXY(Number(posStr));
        const n = ids.length;
        const atStart = Number(posStr) === 0;
        // 말은 칸 아래쪽에 매달리듯 배치해 칸 번호·색이 항상 보이게 한다
        const r = n === 1 ? 18 : n === 2 ? 16 : 13;
        const gap = r * 2 + 3;
        return ids.map((id, i) => {
          let x = base.x + (i - (n - 1) / 2) * (n === 1 ? 0 : gap);
          let y = base.y + 22 + r;
          if (atStart) {
            // START 둘레(길 반대편인 왼쪽 위)를 따라 둥글게 세워 1번 칸·길과 겹치지 않게
            const ring = 34 + r + 5;
            const step = n === 1 ? 0 : Math.min(((gap + 2) / ring) * (180 / Math.PI), 250 / (n - 1));
            const ang = ((-135 + (i - (n - 1) / 2) * step) * Math.PI) / 180;
            x = base.x + Math.cos(ang) * ring;
            y = base.y + Math.sin(ang) * ring;
          }
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
      {/* 워프·황금 파이프 연출 */}
      {warp && <WarpFx key={warp.key} fx={warp} team={teamById[warp.team]} />}

      {/* 스타 획득 연출 */}
      {starBurst &&
        (() => {
          const p = posXY(starBurst.at);
          return (
            <g key={starBurst.key} transform={`translate(${p.x},${p.y - 40})`}>
              <g className="animate-starfx-glow">
                <circle r={90} fill="url(#glow)" />
              </g>
              <g className="animate-starfx-rays">
                {Array.from({ length: 12 }, (_, i) => (
                  <rect key={i} x={-3} y={-95} width={6} height={60} rx={3} fill="#fff7c2" opacity={0.85} transform={`rotate(${i * 30})`} />
                ))}
              </g>
              <g className="animate-starfx-fade">
                <g className="animate-starfx-spin">
                  <polygon
                    points="0,-44 12.6,-14.6 44,-14.6 18.8,3.8 28,35.2 0,18.2 -28,35.2 -18.8,3.8 -44,-14.6 -12.6,-14.6"
                    fill="url(#starFill)"
                    stroke="#fff"
                    strokeWidth={4}
                    strokeLinejoin="round"
                    filter="url(#neon)"
                  />
                </g>
              </g>
              {Array.from({ length: 10 }, (_, i) => (
                <circle
                  key={`p${i}`}
                  r={4}
                  fill={i % 2 ? "#fde047" : "#fff"}
                  className="animate-starfx-particle"
                  style={{ animationDelay: `${i * 40}ms`, transform: `rotate(${i * 36}deg)` } as React.CSSProperties}
                />
              ))}
            </g>
          );
        })()}

      {/* 주사위 아이템 사용 중: 굴리기 전까지 화면 가운데에 주사위가 준비된 채로 떠 있음 */}
      {!dice && state.phase === "pre_roll" && state.ctx.rollMode !== "normal" && !state.paused && (
        <DiceReady mode={state.ctx.rollMode} count={diceCount(state)} fixed={state.ctx.fixedFace} />
      )}

      {/* 주사위 연출 */}
      {dice && (
        <g transform={`translate(${BOARD_W / 2},${BOARD_H / 2})`}>
          <circle r={110} fill="#000" opacity={0.35} />
          {dice.show.map((f, i) => {
            const off = (i - (dice.show.length - 1) / 2) * (dice.show.length > 2 ? 80 : 90);
            const settled = dice.show[i] === dice.faces[i] && dice.show.every((x, j) => x === dice.faces[j]);
            return (
              <g key={i} transform={`translate(${off},0)`}>
                <Die face={f} settled={settled} delay={i * 120} locked={dice.lockFirst && i === 0} />
              </g>
            );
          })}
        </g>
      )}
    </svg>
    </div>
  );
}

/**
 * 정지 배경 레이어: 밤하늘, 오로라, 은하수 빛의 띠(블러).
 * 움직이는 요소와 분리해 두어, 애니메이션이 돌 때마다 큰 블러를 다시 그리지 않게 한다.
 */
const BoardBackdrop = memo(function BoardBackdrop({ roadW }: { roadW: number }) {
  return (
    <svg
      viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
      className="absolute inset-0 w-full h-full"
      style={{ transform: "translateZ(0)" }}
      aria-hidden
    >
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
        <filter id="milky" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="milkyWide" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <clipPath id="boardClip">
          <rect width={BOARD_W} height={BOARD_H} rx={36} />
        </clipPath>
      </defs>
      <g clipPath="url(#boardClip)">
        <rect width={BOARD_W} height={BOARD_H} fill="url(#night)" />
        <ellipse cx={760} cy={120} rx={360} ry={200} fill="url(#aurora1)" />
        <ellipse cx={240} cy={520} rx={330} ry={190} fill="url(#aurora2)" />
        {ROUTE_IDS.map((rid) => {
          const hard = HARD_ROUTES.includes(rid);
          const haze = hard ? "#ffb877" : "#9db4ff";
          const core = hard ? "#ffe3c2" : "#e6edff";
          const d = ROUTE_D[rid];
          return (
            <g key={rid} fill="none" strokeLinecap="round">
              <path d={d} stroke={haze} strokeOpacity={0.16} strokeWidth={roadW + 30} filter="url(#milkyWide)" />
              <path d={d} stroke={haze} strokeOpacity={0.3} strokeWidth={roadW + 4} filter="url(#milky)" />
              <path d={d} stroke={core} strokeOpacity={0.3} strokeWidth={roadW * 0.4} filter="url(#milky)" />
            </g>
          );
        })}
      </g>
    </svg>
  );
});

/** 트리플·선택 다이스를 쓴 뒤 굴리기를 기다리는 동안의 표시 */
function DiceReady({ mode, count, fixed }: { mode: "triple" | "fixed" | "normal"; count: number; fixed?: number }) {
  const triple = mode === "triple";
  const label = triple ? "트리플 다이스!" : `선택 다이스! ${fixed ?? ""} 고정`;
  const tint = triple ? "#fbbf24" : "#c4b5fd";
  const w = Math.max(label.length * 17 + 36, 180);
  // 트리플은 피라미드(위 1개, 아래 2개). 선택 다이스는 고정한 주사위 + 굴릴 주사위를 한 줄로
  const n = triple ? 3 : count + 1;
  const slots: [number, number][] = triple
    ? [
        [0, -26],
        [-42, 52],
        [42, 52],
      ]
    : Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * 92, 14] as [number, number]);
  const labelY = triple ? -112 : -74;
  return (
    // 바깥 g는 위치만, 안쪽 g가 등장 애니메이션 (CSS transform 애니메이션이 SVG transform 속성을 덮어쓰지 않게 분리)
    <g transform={`translate(${BOARD_W / 2},${BOARD_H / 2 + (triple ? -14 : 0)})`}>
      <g className="animate-pop" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <ellipse cy={triple ? 6 : 0} rx={triple ? 170 : n * 52 + 60} ry={triple ? 150 : 112} fill="#05081f" opacity={0.6} />
        <g transform={`translate(0,${labelY})`} filter="url(#soft)">
          <rect x={-w / 2} y={-19} width={w} height={38} rx={19} fill={tint} stroke="#fff" strokeWidth={2.5} />
          <text textAnchor="middle" dy={7} fontSize={21} className="font-display" fill="#1e1b4b">
            {label}
          </text>
        </g>
        {slots.map(([x, y], i) => {
          const isFixed = !triple && i === 0 && fixed !== undefined;
          return (
            <g key={i} transform={`translate(${x},${y})`}>
              <g className={isFixed ? undefined : "animate-bob"} style={{ animationDelay: `${i * 0.18}s` }} filter="url(#soft)">
                {triple ? (
                  <>
                    <rect x={-34} y={-34} width={68} height={68} rx={14} fill="url(#goldDie)" stroke="#fff7d6" strokeWidth={3} />
                    <rect x={-27} y={-29} width={34} height={10} rx={5} fill="#fff" opacity={0.35} />
                    <text textAnchor="middle" dy={14} fontSize={42} className="font-display" fill="#111">
                      ?
                    </text>
                  </>
                ) : isFixed ? (
                  <>
                    {/* 고정한 주사위: 금색 테두리 + 실제 눈 */}
                    <rect x={-34} y={-34} width={68} height={68} rx={14} fill="#fff" stroke="#fbbf24" strokeWidth={5} />
                    {(PIPS[fixed!] ?? PIPS[1]).map(([px, py], k) => (
                      <circle key={k} cx={px * 18} cy={py * 18} r={6.5} fill="#1e293b" />
                    ))}
                    <g transform="translate(0,-46)">
                      <rect x={-22} y={-10} width={44} height={20} rx={10} fill="#fbbf24" stroke="#fff" strokeWidth={2} />
                      <text textAnchor="middle" dy={5} fontSize={13} className="font-display" fill="#1e1b4b">
                        고정
                      </text>
                    </g>
                  </>
                ) : (
                  <>
                    <rect x={-34} y={-34} width={68} height={68} rx={14} fill="#fff" stroke={tint} strokeWidth={4} />
                    <text textAnchor="middle" dy={14} fontSize={40} className="font-display" fill="#1e1b4b">
                      ?
                    </text>
                  </>
                )}
              </g>
            </g>
          );
        })}
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* 파이프 연출: 출발 칸에 파이프가 솟아 말이 쏙 들어가고,            */
/* 도착 칸에 파이프가 솟아 말이 쏙 올라온 뒤 파이프가 들어감          */
/* ------------------------------------------------------------------ */
interface WarpInfo {
  key: number;
  team: string;
  from: number;
  to: number;
  gold: boolean;
  /** both: 들어갔다 나옴(워프) / enter: 들어가기만(황금 파이프, 나올 칸 입력 대기) / exit: 나오기만 */
  mode: "both" | "enter" | "exit";
}
const WARP_MS = { both: 3700, enter: 1950, exit: 2050 };

function useWarpFx(state: GameState): WarpInfo | null {
  const [fx, setFx] = useState<WarpInfo | null>(null);
  const prevPos = useRef<Record<string, number> | null>(null);
  const prevMove = useRef(state.moveSeq);
  const prevPhase = useRef(state.phase);
  useEffect(() => {
    const before = prevPos.current;
    const moved = prevMove.current !== state.moveSeq;
    const wasPhase = prevPhase.current;
    prevPos.current = Object.fromEntries(state.teamIds.map((id) => [id, state.teams[id].pos]));
    prevMove.current = state.moveSeq;
    prevPhase.current = state.phase;
    if (!before) return;
    const team = currentTeamId(state);
    if (!team) return;
    let next: WarpInfo | null = null;
    const key = Date.now();
    if (state.phase === "pipe_choose" && wasPhase !== "pipe_choose") {
      next = { key, team, from: state.teams[team].pos, to: state.teams[team].pos, gold: true, mode: "enter" };
    } else if (moved && state.ctx.teleport && before[team] !== undefined && before[team] !== state.teams[team].pos) {
      const gold = state.ctx.moveItem === "goldenPipe";
      next = { key, team, from: before[team], to: state.teams[team].pos, gold, mode: gold ? "exit" : "both" };
    }
    if (!next) return;
    setFx(next);
    const t = setTimeout(() => setFx((f) => (f && f.key === key ? null : f)), WARP_MS[next.mode]);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.moveSeq, state.lastSeq]);
  return fx;
}

const PIPE_TOP = -26; // 칸 중심 기준 파이프 입구 높이
const PIPE_BOTTOM = 30;

function Pipe({ gold, delay, life }: { gold: boolean; delay: number; life: number }) {
  // 그라데이션 대신 단색 + 하이라이트 (브라우저에 따라 그라데이션 참조가 빠지는 경우가 있어서)
  const body = gold ? "#f5b81c" : "#22b14c";
  const edge = gold ? "#8a5a00" : "#0f5a26";
  const shade = gold ? "#c98a0c" : "#178a3a";
  return (
    <g className="animate-pipe" style={{ animationDelay: `${delay}ms`, animationDuration: `${life}ms` }}>
      <rect x={-17} y={PIPE_TOP + 10} width={34} height={PIPE_BOTTOM - PIPE_TOP - 10} fill={body} stroke={edge} strokeWidth={2.5} />
      <rect x={6} y={PIPE_TOP + 12} width={9} height={PIPE_BOTTOM - PIPE_TOP - 14} fill={shade} />
      <rect x={-12} y={PIPE_TOP + 12} width={5} height={PIPE_BOTTOM - PIPE_TOP - 14} fill="#fff" opacity={0.35} />
      <rect x={-23} y={PIPE_TOP} width={46} height={14} rx={3} fill={body} stroke={edge} strokeWidth={2.5} />
      <rect x={9} y={PIPE_TOP + 2} width={12} height={10} rx={2} fill={shade} />
      <rect x={-18} y={PIPE_TOP + 2.5} width={7} height={8} rx={2} fill="#fff" opacity={0.4} />
      <ellipse cx={0} cy={PIPE_TOP + 1} rx={19} ry={4} fill="#06120a" opacity={0.85} />
    </g>
  );
}

function WarpToken({ team, anim, delay }: { team: TeamInfo | undefined; anim: string; delay: number }) {
  const r = 17;
  return (
    // 파이프 입구 위쪽만 보이게 잘라서, 말이 입구 속으로 들어가고 나오는 것처럼 보이게 한다
    <g clipPath="url(#pipeMouth)">
      <g className={anim} style={{ animationDelay: `${delay}ms` }}>
        <g transform={`translate(0,${PIPE_TOP - r + 2})`}>
          <circle r={r} fill={team?.color ?? "#888"} stroke="#fff" strokeWidth={3} />
          {team?.image_url ? (
            <image
              href={team.image_url}
              x={-(r - 3)}
              y={-(r - 3)}
              width={(r - 3) * 2}
              height={(r - 3) * 2}
              clipPath={`url(#clip-${team.id}-${r})`}
              preserveAspectRatio="xMidYMid slice"
            />
          ) : (
            <text textAnchor="middle" dy={r * 0.3} fontSize={r * 0.8} fontWeight={800} fill="#fff">
              {(team?.name ?? "?").slice(0, 1)}
            </text>
          )}
        </g>
      </g>
    </g>
  );
}

function WarpFx({ fx, team }: { fx: WarpInfo; team: TeamInfo | undefined }) {
  const a = SPACE_BY_ID[fx.from] ?? (fx.from === 0 ? { x: T_POS.x, y: T_POS.y } : null);
  const b = SPACE_BY_ID[fx.to];
  // 나오기만 할 때는 바로 시작, 워프(들어갔다 나옴)는 들어가는 연출 뒤에
  const exitAt = fx.mode === "exit" ? 0 : 1700;
  return (
    <g>
      {fx.mode !== "exit" && a && (
        // 출발: 파이프가 솟고(0~0.35초) 말이 쏙 들어감(0.45~0.95초), 파이프가 들어감
        // 감싸는 g에 그림자 필터를 걸면 파이프가 0 크기일 때 검은 사각형이 생겨서 필터를 쓰지 않는다
        <g transform={`translate(${a.x},${a.y})`}>
          <Pipe gold={fx.gold} delay={0} life={1900} />
          <WarpToken team={team} anim="animate-warp-sink" delay={700} />
        </g>
      )}
      {fx.mode !== "enter" && b && (
        // 도착: 파이프가 솟고 말이 쏙 올라옴, 파이프가 들어감
        <g transform={`translate(${b.x},${b.y})`}>
          <Pipe gold={fx.gold} delay={exitAt} life={2000} />
          <WarpToken team={team} anim="animate-warp-rise" delay={exitAt + 650} />
        </g>
      )}
    </g>
  );
}

const PLANET_R = 20;
// 상점선에서 본 28번 칸의 상대 위치
const SHOP_AT_DX = SPACE_BY_ID[SHOP_AT].x - SHOP_POS.x;
const SHOP_AT_DY = SPACE_BY_ID[SHOP_AT].y - SHOP_POS.y;

/**
 * 칸 = 작은 행성. 칸 종류 색의 구체에 표면 무늬(줄무늬·크레이터·소용돌이)를 번갈아 입히고,
 * 이벤트 칸에는 고리를 두른다. 무늬는 칸 번호로 정해져 항상 같다.
 */
function Planet({ id, type, light, dark }: { id: number; type: SpaceType; light: string; dark: string }) {
  const R = PLANET_R;
  const ringed = type === "event";
  const variant = id % 3;
  const tilt = -18 + (id % 5) * 4;
  return (
    <g>
      <circle r={R + 2} fill={dark} opacity={0.6} filter="url(#neon)" />
      {ringed && (
        <ellipse rx={R + 11} ry={7} fill="none" stroke={light} strokeOpacity={0.9} strokeWidth={3.2} transform={`rotate(${tilt})`} />
      )}
      <circle r={R} fill={`url(#planet-${type})`} />
      <g clipPath="url(#planetClip)">
        {variant === 0 && (
          <g transform={`rotate(${tilt})`} fill="none" strokeLinecap="round">
            <path d={`M ${-R - 4} -7 Q 0 -12 ${R + 4} -6`} stroke={dark} strokeOpacity={0.35} strokeWidth={4} />
            <path d={`M ${-R - 4} 4 Q 0 -1 ${R + 4} 5`} stroke="#fff" strokeOpacity={0.28} strokeWidth={3} />
            <path d={`M ${-R - 4} 13 Q 0 9 ${R + 4} 14`} stroke={dark} strokeOpacity={0.4} strokeWidth={5} />
          </g>
        )}
        {variant === 1 && (
          <g fill={dark} fillOpacity={0.32}>
            <circle cx={-8} cy={7} r={4.6} />
            <circle cx={9} cy={-4} r={3.2} />
            <circle cx={5} cy={12} r={2.6} />
            <circle cx={-11} cy={-6} r={2.2} />
          </g>
        )}
        {variant === 2 && (
          <g transform={`rotate(${tilt})`} fill="none" strokeLinecap="round">
            <path d="M -16 2 C -8 -8, 4 -8, 10 -1 S 4 10, -3 6" stroke="#fff" strokeOpacity={0.3} strokeWidth={3.4} />
            <path d="M -18 12 C -6 16, 10 16, 20 8" stroke={dark} strokeOpacity={0.4} strokeWidth={4.5} />
          </g>
        )}
        <circle r={R} fill="url(#planetShade)" />
      </g>
      <circle r={R} fill="none" stroke="#fff" strokeOpacity={0.75} strokeWidth={1.6} />
      {ringed && (
        // 고리의 앞쪽 절반: 행성 위로 지나가게
        <path
          d={`M ${-(R + 11)} 0 A ${R + 11} 7 0 0 0 ${R + 11} 0`}
          fill="none"
          stroke={light}
          strokeOpacity={0.95}
          strokeWidth={3.2}
          strokeLinecap="round"
          transform={`rotate(${tilt})`}
        />
      )}
    </g>
  );
}
