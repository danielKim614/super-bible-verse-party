"use client";

/** 보드를 이루는 그림 조각: 행성 칸, 말, 주사위, 파이프, 배경, 상점 말풍선 등 */
import { memo } from "react";
import { BOARD_H, BOARD_W, ROUTE_D, SHOP_AT, SPACE_BY_ID, T_POS, type SpaceType } from "@/game/board";
import type { TeamInfo } from "@/game/types";
import { ROUTE_IDS, HARD_ROUTES, PIPE_TOP, PIPE_BOTTOM, TOKEN_TAIL, PLANET_R, SHOP_DX, SHOP_DY, SHOP_ALERT_W } from "./shared";
import { type WarpInfo } from "./hooks";

/** 칸 위 아이콘 (자체 SVG). 원점이 아이콘 중심 */
export function GiftIcon() {
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
export function BlessIcon() {
  return (
    <g>
      <circle r={13} fill="#f9a8d4" stroke="#fff" strokeWidth={1.5} />
      <path d="M0 7 C-9 0 -9 -8 -4 -8 C-1 -8 0 -5 0 -4 C0 -5 1 -8 4 -8 C9 -8 9 0 0 7 Z" fill="#be185d" />
      <path d="M-11 -14 l2 -4 l2 4 l4 2 l-4 2 l-2 4 l-2 -4 l-4 -2 z" fill="#fff" />
      <path d="M12 -12 l1.5 -3 l1.5 3 l3 1.5 l-3 1.5 l-1.5 3 l-1.5 -3 l-3 -1.5 z" fill="#fff" />
    </g>
  );
}
export function HappeningIcon() {
  return (
    <g>
      <polygon points="0,-15 13,-7 13,7 0,15 -13,7 -13,-7" fill="#14b8a6" stroke="#fff" strokeWidth={1.5} />
      <text textAnchor="middle" dy={6} fontSize={17} fontWeight={900} fill="#fff">
        ?
      </text>
    </g>
  );
}
export const SPACE_ICON: Record<string, () => React.JSX.Element> = { item: GiftIcon, bless: BlessIcon, happening: HappeningIcon };

/** START에서 1번 칸으로 휘어지는 뭉툭한 화살표 (단색, START 중심에서 1번 칸 중심을 향함) */
export function StartArrow() {
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

export const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, -1], [1, 1]],
  3: [[-1, -1], [0, 0], [1, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};

export function Die({ face, settled, delay, locked }: { face: number; settled: boolean; delay: number; locked?: boolean }) {
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

/**
 * 정지 배경 레이어: 밤하늘, 오로라, 은하수 빛의 띠(블러).
 * 움직이는 요소와 분리해 두어, 애니메이션이 돌 때마다 큰 블러를 다시 그리지 않게 한다.
 */
export const BoardBackdrop = memo(function BoardBackdrop({ roadW }: { roadW: number }) {
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
export function DiceReady({ mode, count, fixed }: { mode: "triple" | "fixed" | "normal"; count: number; fixed?: number }) {
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
export function Pipe({ gold, delay, life }: { gold: boolean; delay: number; life: number }) {
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

/**
 * 팀 말. 동그란 행성 칸과 헷갈리지 않도록 둥근 네모 배지 + 칸을 가리키는 흰 꼬리 + 진한 그림자.
 * point: 꼬리가 가리키는 방향(도, 위쪽이 0). 없으면 꼬리 없음.
 * current: 지금 차례(흰 점선 테두리가 흐름), mine: 내 팀(금색 테두리).
 */
export function TokenPiece({ team, r, point, current, mine }: { team: TeamInfo | undefined; r: number; point?: number; current?: boolean; mine?: boolean }) {
  const rx = r * 0.42;
  const inner = r - 3.5;
  const clipId = `tok-${team?.id ?? "x"}-${r}`;
  return (
    <g>
      {current && (
        <rect x={-r - 6} y={-r - 6} width={(r + 6) * 2} height={(r + 6) * 2} rx={rx + 5} fill="none" stroke="#fff" strokeWidth={3.5} strokeDasharray="6 5" className="animate-dash" />
      )}
      {mine && <rect x={-r - 10} y={-r - 10} width={(r + 10) * 2} height={(r + 10) * 2} rx={rx + 8} fill="none" stroke="#ffd23f" strokeWidth={4} />}
      {/* 그림자 */}
      <rect x={-r} y={-r + 4} width={r * 2} height={r * 2} rx={rx} fill="#000" opacity={0.45} />
      {/* 칸을 가리키는 꼬리 */}
      {point !== undefined && (
        <g transform={`rotate(${point})`}>
          <path d={`M -8 ${-r + 2} L 0 ${-r - TOKEN_TAIL} L 8 ${-r + 2} Z`} fill="#fff" stroke="#0b1033" strokeWidth={1.2} strokeLinejoin="round" />
        </g>
      )}
      {/* 배지: 진한 바깥선 + 두꺼운 흰 테두리 + 팀 색 */}
      <rect x={-r - 1} y={-r - 1} width={r * 2 + 2} height={r * 2 + 2} rx={rx + 1} fill="#0b1033" />
      <rect x={-r + 0.5} y={-r + 0.5} width={r * 2 - 1} height={r * 2 - 1} rx={rx} fill={team?.color ?? "#888"} stroke="#fff" strokeWidth={3.5} />
      {team?.image_url ? (
        <>
          <clipPath id={clipId}>
            <rect x={-inner} y={-inner} width={inner * 2} height={inner * 2} rx={rx - 2} />
          </clipPath>
          <image href={team.image_url} x={-inner} y={-inner} width={inner * 2} height={inner * 2} clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" />
        </>
      ) : (
        <text textAnchor="middle" dy={r * 0.33} fontSize={r * 0.95} fontWeight={900} fill="#fff" stroke="#0b1033" strokeOpacity={0.35} strokeWidth={2} paintOrder="stroke">
          {(team?.name ?? "?").slice(0, 1)}
        </text>
      )}
    </g>
  );
}

export function WarpToken({ team, anim, delay }: { team: TeamInfo | undefined; anim: string; delay: number }) {
  const r = 17;
  return (
    // 파이프 입구 위쪽만 보이게 잘라서, 말이 입구 속으로 들어가고 나오는 것처럼 보이게 한다
    <g clipPath="url(#pipeMouth)">
      <g className={anim} style={{ animationDelay: `${delay}ms` }}>
        <g transform={`translate(0,${PIPE_TOP - r + 2})`}>
          <TokenPiece team={team} r={r} />
        </g>
      </g>
    </g>
  );
}

export function WarpFx({ fx, team }: { fx: WarpInfo; team: TeamInfo | undefined }) {
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

/**
 * 상점 이동 말풍선. 보드 밖으로 나가지 않게 좌우를 밀고, 출발·도착 중 한 곳이라도 위쪽 끝이면 아래에 띄운다.
 * 날아가는 도중에 위아래가 뒤집히거나 옆으로 튀지 않도록 출발·도착 칸을 함께 보고 정한다.
 */
export function ShopAlert({ from, to }: { from: number; to: number }) {
  const ends = [from, to].map((n) => SPACE_BY_ID[n] ?? SPACE_BY_ID[SHOP_AT]).map((sp) => ({ x: sp.x - SHOP_DX, y: sp.y - SHOP_DY }));
  const below = ends.some((p) => p.y < 130);
  const half = SHOP_ALERT_W / 2;
  const shift = (px: number) => Math.max(16 + half - px, Math.min(0, BOARD_W - 16 - half - px));
  const dx = ends.map((p) => shift(p.x)).find((v) => v !== 0) ?? 0;
  const by = below ? 44 : -82;
  return (
    <g transform={`translate(${dx},${by})`}>
      <g className="animate-shop-alert" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <path
          d={below ? `M ${-dx - 9} -18 L ${-dx} -30 L ${-dx + 9} -18 Z` : `M ${-dx - 9} 18 L ${-dx} 30 L ${-dx + 9} 18 Z`}
          fill="#fff"
        />
        <rect x={-half} y={-20} width={SHOP_ALERT_W} height={40} rx={20} fill="#fff" stroke="#fde047" strokeWidth={3} />
        <text textAnchor="middle" dy={7} fontSize={19} className="font-display" fill="#4c1d95">
          어..어엇..?! 상점이 이동한다!!
        </text>
      </g>
    </g>
  );
}

/**
 * 칸 = 작은 행성. 칸 종류 색의 구체에 표면 무늬(줄무늬·크레이터·소용돌이)를 번갈아 입히고,
 * 이벤트 칸에는 고리를 두른다. 무늬는 칸 번호로 정해져 항상 같다.
 */
export function Planet({ id, type, light, dark }: { id: number; type: SpaceType; light: string; dark: string }) {
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
