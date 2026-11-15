"use client";

import { TYPE_FILL, ROUTE_IDS, HARD_ROUTES, posXY, DICE_MS, STAR_FX_MS, STAR_SPAWN_MS, STAR_GAP_MS, PIPE_TOP, TOKEN_TAIL, PLANET_R, SHOP_DX, SHOP_DY, SHOP_FLY_MS } from "./board/shared";
import { useAnimatedPositions, useStartMark, useForkFlash, useDiceRoll, useStarBurst, useSparkles, useWarpFx, useShopMove } from "./board/hooks";
import { SPACE_ICON, StartArrow, Die, BoardBackdrop, DiceReady, TokenPiece, WarpFx, ShopAlert, Planet } from "./board/pieces";
import { GiftRevealFx, SpaceRevealFx, useGiftReveal, useSpaceReveal } from "./SpaceReveal";
import { useJustChanged } from "@/lib/useFresh";
import { useLayoutEffect } from "react";
import { BOARD_H, BOARD_W, FORKS, ROUTE_D, SHOP_AT, SPACES, SPACE_BY_ID, T_POS, nextSpace, type SpaceType } from "@/game/board";
import { FULL_BAG_TALENTS, currentTeamId, diceCount } from "@/game/reducer";
import type { GameState, TeamInfo } from "@/game/types";

export function Board({
  state,
  teamById,
  highlightTeam,
  compact = false,
  onPresented,
}: {
  state: GameState;
  teamById: Record<string, TeamInfo>;
  highlightTeam?: string;
  compact?: boolean;
  /**
   * 보드가 "다 보여 준" 마지막 상태를 알려 줌: 주사위·말 이동·파이프·스타 연출과 해프닝·축복·선물 공개가 끝난 상태.
   * 메인 화면은 이걸로 상황판·알림·순위표가 보드보다 먼저 반응하지 않게 한다.
   */
  onPresented?: (state: GameState) => void;
}) {
  const forkFlash = useForkFlash(state);
  const dice = useDiceRoll(state);
  const { burst: starBurst, hidden: hiddenStar, spawn: starSpawn, pause: starPause } = useStarBurst(state);
  // 스타를 지나가다 산 경우: 획득 연출 → 새 스타 등장이 다 끝난 뒤에 남은 칸을 이동
  const starJustBought = useJustChanged(state.ctx.starBought ? `${state.ctx.startSeq ?? 0}` : null);
  // 주사위를 막 굴린 렌더에서도 바로 알아채서, 주사위 연출(굴림 → 멈춤 → 사라짐)이 다 끝난 뒤에 말이 움직이게
  const rollJust = useJustChanged(state.ctx.roll !== undefined && !state.ctx.teleport ? `${state.ctx.startSeq ?? 0}` : null);
  const shown = useAnimatedPositions(
    state,
    compact ? 260 : 480,
    starJustBought ? STAR_FX_MS + STAR_GAP_MS + STAR_SPAWN_MS : forkFlash ? 700 : rollJust || dice ? DICE_MS + 600 : 0,
  );
  const startMark = useStartMark(state, shown);
  const warp = useWarpFx(state);
  // 이벤트·해프닝 칸 도착 연출 (주사위·파이프 연출이 끝나고 말이 도착한 뒤)
  const spaceReveal = useSpaceReveal(state, shown, !!warp || !!dice);
  const { gift, pending: giftPending } = useGiftReveal(state, FULL_BAG_TALENTS);
  const revealing =
    !!spaceReveal || !!gift || giftPending;
  // 렌더 시점에 계산: 말이 아직 새 위치에 안 갔으면(이동 애니메이션 전·중) 움직이는 중
  const moving = state.teamIds.some((id) => shown[id] !== undefined && shown[id] !== state.teams[id].pos);
  const presented = !dice && !warp && !moving && !starBurst && !starPause && !starSpawn && !revealing;
  // 화면에 그려지기 전에(layout effect) 알려서 상황판이 한 프레임도 먼저 바뀌지 않게
  useLayoutEffect(() => {
    if (presented) onPresented?.(state);
  }, [presented, state, onPresented]);
  const shopMove = useShopMove(state.shopAt ?? SHOP_AT);
  const shopFlying = shopMove.phase === "fly";
  const shopSpace = SPACE_BY_ID[shopMove.at] ?? SPACE_BY_ID[SHOP_AT];
  const shopPos = { x: shopSpace.x - SHOP_DX, y: shopSpace.y - SHOP_DY };
  const sparkles = useSparkles(70);
  const cur = currentTeamId(state);
  const focus =
    state.phase === "recite" ? state.ctx.landed : state.phase === "star_offer" ? state.ctx.starAt : undefined;

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
      {/* 상점: 칸 위에 떠 있는 우주 상점선. 빛줄기가 그 칸을 비춘다. 자리를 옮길 때는 우웅~ 하고 날아감 */}
      <g
        style={{
          transform: `translate(${shopPos.x}px, ${shopPos.y}px)`,
          transition: `transform ${SHOP_FLY_MS}ms cubic-bezier(0.45, 0, 0.25, 1)`,
        }}
      >
        {/* 빛줄기와 UFO가 함께 살짝 떠다님 (진폭 3px). 출발 전엔 덜덜 떨고, 날아가는 동안은 기울어지며 흔들림 */}
        <g className={shopFlying ? "animate-ufo-fly" : shopMove.phase === "shake" ? "animate-ufo-shake" : "animate-ufo"}>
          {/* 칸으로 내려오는 빛줄기 (떨기 시작하면 끔) */}
          {shopMove.phase === "idle" && (
            <path d={`M -12 10 L 12 10 L ${SHOP_DX + 17} ${SHOP_DY - 6} L ${SHOP_DX - 17} ${SHOP_DY - 6} Z`} fill="url(#shopBeam)" className="animate-pop" />
          )}
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
            {sp.verse ? (
              <text textAnchor="middle" dy={6} fontSize={16} fontWeight={800} fill="#fff" stroke={dark} strokeWidth={3.5} strokeLinejoin="round" paintOrder="stroke">
                {sp.verse}
              </text>
            ) : (
              // 이벤트 칸: 절이 아니라 도착하면 뽑음
              <text textAnchor="middle" dy={7} fontSize={20}>
                🎲
              </text>
            )}
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
        // 말이 갈림길 칸에 실제로 도착한 뒤에 보여 줌 (스타 연출·이동 애니메이션 중에는 숨김)
        ((state.phase === "choose_path" && (shown[cur] ?? state.teams[cur].pos) === state.teams[cur].pos) || forkFlash) &&
        (() => {
          const pos = forkFlash ? forkFlash.pos : state.teams[cur].pos;
          const from = posXY(pos);
          const opts = FORKS[pos] ?? [];
          return opts.map((o, i) => {
            // 방향은 그 길의 두 번째 칸 쪽으로, 길이는 고정
            const aim = posXY(nextSpace(o.to) ?? o.to);
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
      {(() => {
        // 칸별로 자리(나란히·START 둘레)를 먼저 계산하고,
        // 그리는 순서는 팀 순서로 고정한다. 순서가 바뀌면 DOM이 옮겨지며 이동 애니메이션이 끊겨 순간이동처럼 보이기 때문
        const place: Record<string, { x: number; y: number; r: number; point: number }> = {};
        for (const [posStr, ids] of Object.entries(byPos)) {
          const base = posXY(Number(posStr));
          const n = ids.length;
          const atStart = Number(posStr) === 0;
          // 말은 칸 아래쪽에 매달리듯 배치해 칸 번호·색이 항상 보이게 한다
          const r = n === 1 ? 21 : n === 2 ? 18 : 15;
          const gap = r * 2 + 5;
          ids.forEach((id, i) => {
            let x = base.x + (i - (n - 1) / 2) * (n === 1 ? 0 : gap);
            // 칸 아래에 꼬리 길이만큼 띄워서 매단다
            let y = base.y + 22 + TOKEN_TAIL + r;
            if (atStart) {
              // START 둘레(길 반대편인 왼쪽 위)를 따라 둥글게 세워 1번 칸·길과 겹치지 않게
              const ring = 34 + TOKEN_TAIL + r + 3;
              const step = n === 1 ? 0 : Math.min(((gap + 2) / ring) * (180 / Math.PI), 250 / (n - 1));
              const ang = ((-135 + (i - (n - 1) / 2) * step) * Math.PI) / 180;
              x = base.x + Math.cos(ang) * ring;
              y = base.y + Math.sin(ang) * ring;
            }
            // 꼬리가 말이 서 있는 칸(또는 START)을 가리킨다
            const point = (Math.atan2(base.y - y, base.x - x) * 180) / Math.PI + 90;
            place[id] = { x, y, r, point };
          });
        }
        // 지금 차례인 말은 맨 위에 보이도록 마지막에 (턴 중에는 순서가 바뀌지 않음)
        const order = [...state.teamIds.filter((id) => id !== cur), ...(cur ? [cur] : [])];
        return order.map((id) => {
          const pl = place[id];
          if (!pl) return null;
          const isCur = id === cur && state.phase !== "ended";
          const isMine = highlightTeam === id;
          return (
            <g key={id} style={{ transform: `translate(${pl.x}px, ${pl.y}px)`, transition: "transform 0.38s ease-in-out" }}>
              <TokenPiece team={teamById[id]} r={pl.r} point={pl.point} current={isCur} mine={isMine} />
            </g>
          );
        });
      })()}
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

      {/* 이벤트·해프닝 칸 도착: 무슨 이벤트/해프닝인지 */}
      {spaceReveal && spaceReveal.type !== "pending" && <SpaceRevealFx key={spaceReveal.key} info={spaceReveal} teamById={teamById} />}
      {/* 선물 칸 성공: 받은 아이템 */}
      {gift && <GiftRevealFx key={gift.key} info={gift} />}

      {/* 주사위 아이템 사용 중: 굴리기 전까지 화면 가운데에 주사위가 준비된 채로 떠 있음 */}
      {!dice && state.phase === "pre_roll" && state.ctx.rollMode !== "normal" && !state.paused && (
        <DiceReady mode={state.ctx.rollMode} count={diceCount(state)} fixed={state.ctx.fixedFace} />
      )}

      {/* 상점이 옮겨 갈 때 말풍선: 칸·말보다 위에 그리고, UFO와 같은 속도로 따라감 (기울지는 않음) */}
      {shopMove.phase !== "idle" && (
        <g
          style={{
            transform: `translate(${shopPos.x}px, ${shopPos.y}px)`,
            transition: `transform ${SHOP_FLY_MS}ms cubic-bezier(0.45, 0, 0.25, 1)`,
          }}
        >
          <ShopAlert from={shopMove.from} to={state.shopAt ?? SHOP_AT} />
        </g>
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
