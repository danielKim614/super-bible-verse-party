"use client";

/** 보드 연출 훅: 말 이동, 주사위, 스타, 파이프, 상점 이동, 출발 표시 등 */
import { splitSum } from "../DieBadge";
import { useEffect, useMemo, useRef, useState } from "react";
import { BOARD_H, BOARD_W, FORKS } from "@/game/board";
import { currentTeamId } from "@/game/reducer";
import type { GameState } from "@/game/types";
import { START_VANISH_MS, DICE_MS, STAR_FX_MS, STAR_SPAWN_MS, STAR_GAP_MS, WARP_MS, SHOP_FLY_MS, SHOP_SHAKE_MS } from "./shared";

/** 말 이동 애니메이션: 현재 팀은 이번 턴 경로(ctx.path)를 따라 한 칸씩 이동 */
export function useAnimatedPositions(state: GameState, stepMs: number, initialDelayMs: number) {
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

export function useStartMark(state: GameState, shown: Record<string, number>): "visible" | "leaving" | "hidden" {
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
export function useForkFlash(state: GameState) {
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

/** 주사위 입력 직후 굴러가는 연출 */
export function useDiceRoll(state: GameState) {
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

export function useStarBurst(state: GameState) {
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

/** 배경 별빛 (결정적) */
export function useSparkles(n: number) {
  return useMemo(() => {
    let a = 12345;
    const r = () => {
      a = (a * 1103515245 + 12345) & 0x7fffffff;
      return a / 0x7fffffff;
    };
    return Array.from({ length: n }, (_, i) => ({ x: r() * BOARD_W, y: r() * BOARD_H, r: 0.8 + r() * 1.6, d: (i % 7) * 0.4 }));
  }, [n]);
}

export interface WarpInfo {
  key: number;
  team: string;
  from: number;
  to: number;
  gold: boolean;
  /** both: 들어갔다 나옴(워프) / enter: 들어가기만(황금 파이프, 나올 칸 입력 대기) / exit: 나오기만 */
  mode: "both" | "enter" | "exit";
}
export function useWarpFx(state: GameState): WarpInfo | null {
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

/**
 * 상점이 다른 칸으로 옮겨질 때: 제자리에서 떨며 "어..어엇..?!" (shake) → 새 칸으로 날아감 (fly) → 원래대로 (idle).
 * at은 화면에 그릴 상점 위치. 떠는 동안은 아직 예전 칸에 둔다.
 */
export type ShopMove = { at: number; from: number; phase: "idle" | "shake" | "fly" };
export function useShopMove(shopAt: number): ShopMove {
  const [move, setMove] = useState<ShopMove>({ at: shopAt, from: shopAt, phase: "idle" });
  const prev = useRef(shopAt);
  useEffect(() => {
    if (prev.current === shopAt) return;
    const from = prev.current;
    prev.current = shopAt;
    setMove({ at: from, from, phase: "shake" });
    const t1 = setTimeout(() => setMove({ at: shopAt, from, phase: "fly" }), SHOP_SHAKE_MS);
    const t2 = setTimeout(() => setMove({ at: shopAt, from: shopAt, phase: "idle" }), SHOP_SHAKE_MS + SHOP_FLY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setMove({ at: shopAt, from: shopAt, phase: "idle" });
    };
  }, [shopAt]);
  return move;
}
