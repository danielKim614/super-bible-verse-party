"use client";

import { splitSum } from "./DieBadge";
import { useEffect, useMemo, useRef, useState } from "react";
import { BOARD_H, BOARD_W, FORKS, ROUTE_D, SHOP_POS, SPACES, SPACE_BY_ID, T_POS, type RouteId } from "@/game/board";
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

const ROUTE_IDS: RouteId[] = ["c0", "a1", "a2", "c1", "b1", "b2", "c2", "d1", "d2", "c3"];
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
  const [dice, setDice] = useState<{ key: number; faces: number[]; show: number[] } | null>(null);
  const prevRoll = useRef<number | undefined>(state.ctx.roll);
  const prevSeq = useRef(state.ctx.startSeq);
  useEffect(() => {
    const hadRoll = prevRoll.current !== undefined && prevSeq.current === state.ctx.startSeq;
    prevRoll.current = state.ctx.roll;
    prevSeq.current = state.ctx.startSeq;
    if (state.ctx.roll === undefined || hadRoll || state.ctx.teleport) return;
    const faces = state.ctx.faces && state.ctx.faces.length ? state.ctx.faces : splitSum(state.ctx.roll);
    const key = Date.now();
    setDice({ key, faces, show: faces.map(() => 1 + Math.floor(Math.random() * 6)) });
    let n = 0;
    const iv = setInterval(() => {
      n += 1;
      setDice((d) => (d && d.key === key ? { ...d, show: d.faces.map(() => 1 + Math.floor(Math.random() * 6)) } : d));
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
const STAR_SPAWN_MS = 1200;

function useStarBurst(state: GameState) {
  const [burst, setBurst] = useState<{ key: number; at: number } | null>(null);
  const [hidden, setHidden] = useState<number | null>(null); // 아직 등장 연출 전인 새 별
  const [spawn, setSpawn] = useState<{ key: number; at: number } | null>(null);
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
    const t1 = setTimeout(() => {
      setBurst((b) => (b && b.key === key ? null : b));
      setHidden(null);
      if (fresh !== null) setSpawn({ key, at: fresh });
    }, STAR_FX_MS);
    const t2 = setTimeout(() => setSpawn((sp) => (sp && sp.key === key ? null : sp)), STAR_FX_MS + STAR_SPAWN_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ctx.starBought, state.ctx.startSeq]);
  return { burst, hidden, spawn };
}

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

function Die({ face, settled, delay }: { face: number; settled: boolean; delay: number }) {
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
  const { burst: starBurst, hidden: hiddenStar, spawn: starSpawn } = useStarBurst(state);
  const shown = useAnimatedPositions(state, compact ? 200 : 320, forkFlash ? 700 : dice ? DICE_MS : 0);
  const startMark = useStartMark(state, shown);
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
      {/* 상점 (지나가며 이용) — 자체 SVG */}
      <g transform={`translate(${SHOP_POS.x},${SHOP_POS.y - 6})`} filter="url(#soft)">
        {/* 몸체 */}
        <rect x={-26} y={-6} width={52} height={30} rx={4} fill="#fde68a" stroke="#b45309" strokeWidth={2} />
        {/* 문·창 */}
        <rect x={-18} y={4} width={12} height={20} rx={2} fill="#7c2d12" />
        <rect x={2} y={4} width={16} height={11} rx={2} fill="#bfdbfe" stroke="#1e3a8a" strokeWidth={1.5} />
        {/* 차양 */}
        <path d="M-32 -6 L32 -6 L26 -20 L-26 -20 Z" fill="#ef4444" />
        {[-26, -14, -2, 10].map((x) => (
          <path key={x} d={`M${x} -20 L${x + 6} -20 L${x + 7} -6 L${x} -6 Z`} fill="#fff" opacity={0.9} />
        ))}
        <path d="M-32 -6 Q-28 2 -24 -6 Q-20 2 -16 -6 Q-12 2 -8 -6 Q-4 2 0 -6 Q4 2 8 -6 Q12 2 16 -6 Q20 2 24 -6 Q28 2 32 -6 Z" fill="#dc2626" />
        {/* 간판 */}
        <rect x={-20} y={-34} width={40} height={14} rx={4} fill="#fff" stroke="#b45309" strokeWidth={1.5} />
        <text textAnchor="middle" y={-23} fontSize={10} className="font-display" fill="#7c2d12">
          상점
        </text>
      </g>

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
            {SPACE_ICON[sp.type] && (
              <g transform="translate(0,-34)" filter="url(#soft)" className="animate-bob">
                {SPACE_ICON[sp.type]()}
              </g>
            )}
          </g>
        );
      })}

      {/* 스타 획득·등장 동안 화면 어둡게 */}
      {(starBurst || starSpawn) && <rect width={BOARD_W} height={BOARD_H} rx={36} fill="#05081f" opacity={0.72} className="animate-dim-in" />}

      {/* 스타: 칸 위에 떠서 Y축 회전 */}
      {state.stars.map((st) => {
        const sp = SPACE_BY_ID[st];
        if (!sp || st === hiddenStar) return null;
        const spawning = starSpawn?.at === st;
        return (
          <g key={`star-${st}`} transform={`translate(${sp.x},${sp.y - 40})`}>
            {spawning && (
              <g className="animate-starfx-rays">
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
          const x = base.x + (i - (n - 1) / 2) * (n === 1 ? 0 : gap);
          const y = atStart ? base.y - 66 : base.y + 22 + r;
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

      {/* 주사위 연출 */}
      {dice && (
        <g transform={`translate(${BOARD_W / 2},${BOARD_H / 2})`}>
          <circle r={110} fill="#000" opacity={0.35} />
          {dice.show.map((f, i) => {
            const off = (i - (dice.show.length - 1) / 2) * (dice.show.length > 2 ? 80 : 90);
            const settled = dice.show[i] === dice.faces[i] && dice.show.every((x, j) => x === dice.faces[j]);
            return (
              <g key={i} transform={`translate(${off},0)`}>
                <Die face={f} settled={settled} delay={i * 120} />
              </g>
            );
          })}
        </g>
      )}
    </svg>
  );
}
