import { FORKS, SPACE_BY_ID, SPACES, T, forwardDistances, nextSpace, type SpaceType } from "./board";
import { ITEMS, RANDOM_ITEM_POOL, type ItemId } from "./items";
import { pick, rng } from "./rng";
import {
  DEFAULT_SETTINGS,
  type Award,
  type HappeningKind,
  type GameEvent,
  type GameEventBody,
  type GameState,
  type TeamState,
  type TurnCtx,
} from "./types";

// ---------------------------------------------------------------------------
// 초기 상태
// ---------------------------------------------------------------------------
export function initialState(): GameState {
  return {
    started: false,
    phase: "setup",
    settings: DEFAULT_SETTINGS,
    teamIds: [],
    teams: {},
    turn: 1,
    teamIndex: 0,
    stars: [],
    ctx: freshCtx(),
    paused: false,
    boostOverride: null,
    goldenRound: null,
    ledger: [],
    feed: [],
    ceremony: null,
    lastSeq: 0,
    moveSeq: 0,
  };
}

function freshCtx(): TurnCtx {
  return { rollMode: "normal", remaining: 0, path: [] };
}

/** 무효화되지 않은 이벤트를 seq 순으로 적용 */
export function replay(events: GameEvent[]): GameState {
  const active = events.filter((e) => !e.voided).sort((a, b) => a.seq - b.seq);
  let s = initialState();
  for (const e of active) s = applyEvent(s, e);
  return s;
}

// ---------------------------------------------------------------------------
// 조회 헬퍼 (UI에서도 사용)
// ---------------------------------------------------------------------------
export function currentTeamId(s: GameState): string | undefined {
  return s.teamIds[s.teamIndex];
}

export function isBoost(s: GameState): boolean {
  if (s.boostOverride !== null) return s.boostOverride;
  if (s.goldenRound === s.turn) return true;
  return s.turn > s.settings.totalTurns - s.settings.finalBoostTurns;
}

/** 꼴찌 팀 (스타 → 달란트 기준, 동점이면 턴 순서 뒤쪽) */
export function lastPlaceTeam(s: GameState): string | undefined {
  const rows = finalRanking(s);
  return rows[rows.length - 1]?.id;
}

/** 칸의 실제 암송 규칙 (방패 적용 시 빨간 칸 → 파란 칸) */
export function effectiveType(s: GameState, space: number): SpaceType {
  const t = SPACE_BY_ID[space]?.type ?? "blue";
  if (t === "red" && s.ctx.shieldOn === space) return "blue";
  return t;
}

export function starPriceFor(s: GameState, coupon: boolean): number {
  return coupon ? s.settings.couponStarPrice : s.settings.starPrice;
}

export function cheapestItemPrice(): number {
  return Math.min(...Object.values(ITEMS).map((i) => i.price));
}

export function canShop(s: GameState, team: TeamState): boolean {
  return team.items.length < s.settings.inventoryLimit && team.talents >= cheapestItemPrice();
}

export function canAffordStar(s: GameState, team: TeamState): boolean {
  if (team.talents >= s.settings.starPrice) return true;
  return team.items.includes("starCoupon") && team.talents >= s.settings.couponStarPrice;
}

export function rollRange(s: GameState): [number, number] {
  switch (s.ctx.rollMode) {
    case "double":
      return [2, 12];
    default:
      return [1, 6];
  }
}

export function mapSelectDice(mode: TurnCtx["rollMode"], face: number): number {
  if (mode === "low") return face > 3 ? face - 3 : face;
  if (mode === "high") return face <= 3 ? face + 3 : face;
  return face;
}

/** 지금 단계에서 사용할 수 있는 아이템 */
export function usableItems(s: GameState): ItemId[] {
  const tid = currentTeamId(s);
  if (!tid || s.paused) return [];
  const team = s.teams[tid];
  const out = new Set<ItemId>();
  for (const item of team.items) {
    const def = ITEMS[item];
    if (def.kind === "move" && s.phase === "pre_roll" && !s.ctx.moveItem) {
      if (item === "warpPipe" && warpTargets(s, tid).length === 0) continue;
      if (item === "goldenPipe" && s.stars.length === 0) continue;
      out.add(item);
    }
    if (def.kind === "recite" && (s.phase === "recite" || s.phase === "star_recite") && !s.ctx.reciteItem) {
      const space = s.phase === "recite" ? s.ctx.landed! : s.ctx.starAt!;
      if (item === "shield" && SPACE_BY_ID[space]?.type !== "red") continue;
      if (item === "doubleTalent" && s.phase !== "recite") continue;
      out.add(item);
    }
  }
  return [...out];
}

function warpTargets(s: GameState, tid: string): number[] {
  const me = s.teams[tid].pos;
  return [...new Set(s.teamIds.filter((id) => id !== tid).map((id) => s.teams[id].pos))].filter(
    (p) => p !== T && p !== me,
  );
}

export function payoutBreakdown(amount: number): { d10: number; d5: number; d1: number } {
  const a = Math.abs(amount);
  return { d10: Math.floor(a / 10), d5: Math.floor((a % 10) / 5), d1: a % 5 };
}

export function payoutText(amount: number): string {
  const b = payoutBreakdown(amount);
  const parts = [];
  if (b.d10) parts.push(`10×${b.d10}`);
  if (b.d5) parts.push(`5×${b.d5}`);
  if (b.d1) parts.push(`1×${b.d1}`);
  return parts.join(", ") || "0";
}

// ---------------------------------------------------------------------------
// 이벤트 적용
// ---------------------------------------------------------------------------
export function applyEvent(prev: GameState, ev: GameEvent | (GameEventBody & { seq: number })): GameState {
  const s: GameState = structuredClone(prev);
  s.lastSeq = ev.seq;
  const seq = ev.seq;

  if (ev.type === "start_game") {
    if (s.started) return prev;
    const { teamIds, settings, seed } = ev.payload;
    s.started = true;
    s.settings = { ...DEFAULT_SETTINGS, ...settings };
    s.teamIds = teamIds;
    for (const id of teamIds) {
      s.teams[id] = {
        id,
        pos: T,
        talents: 0,
        stars: 0,
        bonusStars: 0,
        items: [],
        reciteSuccess: 0,
        challengeSuccess: 0,
        laps: 0,
        recited: [],
      };
      credit(s, seq, id, s.settings.startTalents, "시작 달란트");
    }
    const r = rng(seed);
    for (let i = 0; i < s.settings.starCount; i++) placeStar(s, r);
    s.turn = 1;
    s.teamIndex = 0;
    startTurn(s, seq);
    feed(s, { seq, kind: "info", text: "게임 시작!" });
    return s;
  }

  if (!s.started) return prev;

  if (ev.type === "pause") {
    s.paused = ev.payload.paused;
    return s;
  }

  if (ev.type === "override") return applyOverride(s, prev, ev.payload, seq);

  if (s.paused) return prev;

  if (ev.type === "ceremony_next") {
    if (s.phase !== "ended" || !s.ceremony) return prev;
    const max = s.ceremony.awards.length + 1;
    if (s.ceremony.step >= max) return prev;
    s.ceremony.step += 1;
    const award = s.ceremony.awards[s.ceremony.step - 1];
    if (award) for (const w of award.winners) s.teams[w].bonusStars += 1;
    return s;
  }

  const tid = currentTeamId(s);
  if (!tid) return prev;
  const team = s.teams[tid];
  const ctx = s.ctx;

  switch (ev.type) {
    case "use_item": {
      const { item, choice, seed } = ev.payload;
      if (!usableItems(prev).includes(item)) return prev;
      removeItem(team, item);
      const def = ITEMS[item];
      if (def.kind === "move") ctx.moveItem = item;
      if (def.kind === "recite") ctx.reciteItem = item;
      feed(s, { seq, teamId: tid, kind: "item", text: `${def.name} 사용` });
      if (item === "doubleDice") ctx.rollMode = "double";
      else if (item === "selectDice") ctx.rollMode = choice === "high" ? "high" : "low";
      else if (item === "warpPipe") {
        const r = rng(seed ?? seq);
        const target = pick(r, warpTargets(prev, tid));
        teleport(s, tid, target, seq);
      } else if (item === "goldenPipe") {
        const dist = forwardDistances(team.pos);
        const target = [...s.stars].sort((a, b) => (dist.get(a) ?? 99) - (dist.get(b) ?? 99))[0];
        teleport(s, tid, target, seq);
      } else if (item === "shield") ctx.shieldOn = s.phase === "recite" ? ctx.landed : ctx.starAt;
      else if (item === "doubleTalent") ctx.doubleTalentOn = true;
      else if (item === "hint") ctx.hintUsed = true;
      return s;
    }

    case "roll": {
      if (s.phase !== "pre_roll") return prev;
      const [lo, hi] = rollRange(s);
      const v = Math.round(ev.payload.value);
      if (v < lo || v > hi) return prev;
      const steps = mapSelectDice(ctx.rollMode, v);
      ctx.roll = steps;
      ctx.remaining = steps;
      ctx.path = [];
      s.moveSeq = seq;
      advance(s, tid, seq);
      return s;
    }

    case "choose_path": {
      if (s.phase !== "choose_path") return prev;
      if (!FORKS[team.pos]?.[ev.payload.option]) return prev;
      ctx.forkChoice = ev.payload.option;
      s.moveSeq = seq;
      advance(s, tid, seq);
      return s;
    }

    case "star_decision": {
      if (s.phase !== "star_offer") return prev;
      const { buy, coupon } = ev.payload;
      if (!buy) {
        feed(s, { seq, teamId: tid, kind: "info", text: "스타 구매 안 함" });
        ctx.starAt = undefined;
        if (ctx.starLanding) {
          ctx.starLanding = false;
          s.phase = "resolve";
        } else {
          s.moveSeq = seq;
          advance(s, tid, seq);
        }
        return s;
      }
      const useCoupon = !!coupon && team.items.includes("starCoupon");
      if (team.talents < starPriceFor(s, useCoupon)) return prev;
      ctx.couponUsed = useCoupon;
      if (ctx.starLanding) {
        buyStar(s, tid, seq, { seed: ev.payload.seed });
        ctx.starLanding = false;
        s.phase = "resolve";
      } else {
        s.phase = "star_recite";
      }
      return s;
    }

    case "recite_result": {
      const { success, seed } = ev.payload;
      if (s.phase === "star_recite") {
        const space = ctx.starAt!;
        ctx.starReciteResult = success;
        if (success) {
          team.reciteSuccess += 1;
          const t = effectiveType(s, space);
          if (t === "red" || t === "event") team.challengeSuccess += 1;
          if (!team.recited.includes(space)) team.recited.push(space);
          buyStar(s, tid, seq, { seed });
        } else {
          feed(s, { seq, teamId: tid, kind: "fail", text: `${space}절 암송 실패 — 스타 구매 불가` });
          ctx.couponUsed = false;
        }
        ctx.starAt = undefined;
        s.moveSeq = seq;
        advance(s, tid, seq);
        return s;
      }
      if (s.phase !== "recite") return prev;
      const space = ctx.landed!;
      ctx.reciteResult = success;
      if (!success) {
        feed(s, { seq, teamId: tid, kind: "fail", text: `${space}절 암송 실패` });
        s.phase = "resolve";
        return s;
      }
      const t = effectiveType(s, space);
      team.reciteSuccess += 1;
      if (t === "red" || t === "event") team.challengeSuccess += 1;
      if (!team.recited.includes(space)) team.recited.push(space);
      let amount = s.settings.rewards[t];
      const mult = (isBoost(s) ? 2 : 1) * (ctx.doubleTalentOn ? 2 : 1);
      amount *= mult;
      ctx.payout = amount;
      credit(s, seq, tid, amount, `${space}절 암송 성공${mult > 1 ? ` (×${mult})` : ""}`);
      feed(s, { seq, teamId: tid, kind: "payout", text: `${space}절 암송 성공`, amount });
      if (SPACE_BY_ID[space].type === "item") {
        const r = rng(seed);
        const item = pick(r, RANDOM_ITEM_POOL);
        if (team.items.length < s.settings.inventoryLimit) {
          team.items.push(item);
          ctx.gainedItem = item;
          feed(s, { seq, teamId: tid, kind: "item", text: `${ITEMS[item].name} 획득!` });
        } else {
          ctx.gainedItem = "full";
          feed(s, { seq, teamId: tid, kind: "info", text: "아이템 가방이 가득 차서 받지 못함" });
        }
      }
      if (s.stars.includes(space) && canAffordStar(s, team)) {
        ctx.starAt = space;
        ctx.starLanding = true;
        s.phase = "star_offer";
      } else {
        s.phase = "resolve";
      }
      return s;
    }

    case "shop_buy": {
      if (s.phase !== "shop_offer") return prev;
      const def = ITEMS[ev.payload.item];
      if (!def || team.talents < def.price || team.items.length >= s.settings.inventoryLimit) return prev;
      team.items.push(def.id);
      credit(s, seq, tid, -def.price, `상점: ${def.name}`);
      feed(s, { seq, teamId: tid, kind: "cost", text: `${def.name} 구매`, amount: -def.price });
      return s;
    }

    case "shop_leave": {
      if (s.phase !== "shop_offer") return prev;
      s.moveSeq = seq;
      advance(s, tid, seq);
      return s;
    }

    case "end_turn": {
      if (s.phase !== "resolve") return prev;
      nextTeam(s, seq);
      return s;
    }
  }
  return prev;
}

// ---------------------------------------------------------------------------
// 진행 로직
// ---------------------------------------------------------------------------
function startTurn(s: GameState, seq: number) {
  s.ctx = { ...freshCtx(), startSeq: seq };
  s.phase = "pre_roll";
}

function nextTeam(s: GameState, seq: number) {
  const wasBoost = isBoost(s);
  s.teamIndex += 1;
  if (s.teamIndex >= s.teamIds.length) {
    s.teamIndex = 0;
    s.turn += 1;
    if (s.turn > s.settings.totalTurns) {
      finishGame(s, seq);
      return;
    }
    if (!wasBoost && isBoost(s)) {
      feed(s, { seq, kind: "boost", text: `마지막 ${s.settings.finalBoostTurns}턴! 달란트 2배` });
    }
  }
  startTurn(s, seq);
}

function advance(s: GameState, tid: string, seq: number) {
  const team = s.teams[tid];
  const ctx = s.ctx;
  while (ctx.remaining > 0) {
    const n = nextSpace(team.pos, FORKS[team.pos] ? ctx.forkChoice : undefined);
    if (n === null) {
      s.phase = "choose_path";
      return;
    }
    if (FORKS[team.pos]) ctx.forkChoice = undefined;
    if (n === 1 && team.pos !== T && !ctx.shopVisited) {
      // 출발점(상점)을 지나감
      ctx.shopVisited = true;
      team.laps += 1;
      if (canShop(s, team)) {
        s.phase = "shop_offer";
        return;
      }
    }
    team.pos = n;
    ctx.path.push(n);
    ctx.remaining -= 1;
    if (ctx.remaining > 0 && s.stars.includes(n) && canAffordStar(s, team)) {
      ctx.starAt = n;
      ctx.starLanding = false;
      s.phase = "star_offer";
      return;
    }
  }
  land(s, tid, team.pos, seq);
}

function land(s: GameState, tid: string, space: number, seq: number) {
  s.ctx.landed = space;
  s.phase = "recite";
  const t = SPACE_BY_ID[space]?.type;
  if (t === "bless") {
    const last = lastPlaceTeam(s);
    if (last) {
      s.ctx.blessTo = last;
      credit(s, seq, last, 5, "축복 칸 (꼴찌 응원)");
      feed(s, { seq, teamId: last, kind: "bless", text: "축복! 꼴찌 팀에게", amount: 5 });
    }
  }
  if (t === "happening") applyHappening(s, tid, seq);
}

const HAPPENINGS: HappeningKind[] = ["stars", "rain", "golden", "gift"];

function applyHappening(s: GameState, tid: string, seq: number) {
  const r = rng(seq * 104729 + 7);
  const kind = pick(r, HAPPENINGS);
  let text = "";
  switch (kind) {
    case "stars": {
      const n = s.stars.length;
      s.stars = [];
      for (let i = 0; i < n; i++) placeStar(s, r);
      text = "스타 대이동! 스타가 모두 다른 곳으로";
      break;
    }
    case "rain":
      for (const id of s.teamIds) credit(s, seq, id, 2, "해프닝: 달란트 비");
      text = "달란트 비! 모든 팀 +2";
      break;
    case "golden":
      s.goldenRound = s.turn;
      text = "황금 라운드! 이번 라운드 보상 2배";
      break;
    case "gift": {
      const item = pick(r, RANDOM_ITEM_POOL);
      const team = s.teams[tid];
      if (team.items.length < s.settings.inventoryLimit) {
        team.items.push(item);
        text = `깜짝 선물! ${ITEMS[item].name}`;
      } else {
        credit(s, seq, tid, 3, "해프닝: 깜짝 선물(가방 가득 → 달란트)");
        text = "깜짝 선물! 가방이 가득 차서 +3 달란트";
      }
      break;
    }
  }
  s.ctx.happening = { kind, text };
  feed(s, { seq, teamId: tid, kind: "happening", text });
}

function teleport(s: GameState, tid: string, target: number, seq: number) {
  const team = s.teams[tid];
  team.pos = target;
  s.ctx.path = [target];
  s.ctx.teleport = true;
  s.ctx.remaining = 0;
  s.moveSeq = seq;
  land(s, tid, target, seq);
}

function buyStar(s: GameState, tid: string, seq: number, opts: { seed?: number }) {
  const team = s.teams[tid];
  const ctx = s.ctx;
  const price = starPriceFor(s, !!ctx.couponUsed);
  if (ctx.couponUsed) removeItem(team, "starCoupon");
  team.stars += 1;
  ctx.starBought = true;
  credit(s, seq, tid, -price, `스타 구매${ctx.couponUsed ? " (할인권)" : ""}`);
  feed(s, { seq, teamId: tid, kind: "star", text: "스타 획득!", amount: -price });
  const at = ctx.starAt!;
  s.stars = s.stars.filter((x) => x !== at);
  placeStar(s, rng(opts.seed ?? seq * 7919), team.pos);
}

/** 스타 배치 규칙: 아이템·상점 칸 제외, 구매 팀 앞 6칸 제외, 다른 스타와 거리 확보 */
function placeStar(s: GameState, r: () => number, buyerPos?: number) {
  const blocked = new Set<number>(s.stars);
  if (buyerPos !== undefined) {
    const d = forwardDistances(buyerPos);
    for (const [sp, dist] of d) if (dist <= 6) blocked.add(sp);
    blocked.add(buyerPos);
  }
  const base = SPACES.filter((sp) => sp.type !== "item" && sp.id !== 1 && !blocked.has(sp.id)).map((sp) => sp.id);
  const gapOk = (c: number, gap: number) =>
    s.stars.every((st) => {
      const a = forwardDistances(st).get(c) ?? 99;
      const b = forwardDistances(c).get(st) ?? 99;
      return Math.min(a, b) >= gap;
    });
  for (const gap of [10, 7, 4, 1]) {
    const cands = base.filter((c) => gapOk(c, gap));
    if (cands.length) {
      s.stars.push(pick(r, cands));
      return;
    }
  }
}

function finishGame(s: GameState, seq: number) {
  s.phase = "ended";
  s.turn = s.settings.totalTurns;
  s.teamIndex = s.teamIds.length - 1;
  const refunds: Record<string, number> = {};
  for (const id of s.teamIds) {
    const t = s.teams[id];
    const amt = t.items.length * s.settings.itemRefund;
    refunds[id] = amt;
    if (amt > 0) credit(s, seq, id, amt, `남은 아이템 환급 (${t.items.length}개)`);
    t.items = [];
  }
  const awards: Award[] = [];
  const mk = (key: Award["key"], title: string, desc: string, f: (t: TeamState) => number) => {
    const values = Object.fromEntries(s.teamIds.map((id) => [id, f(s.teams[id])]));
    const max = Math.max(...Object.values(values));
    const winners = max > 0 ? s.teamIds.filter((id) => values[id] === max) : [];
    awards.push({ key, title, desc, values, winners });
  };
  if (s.settings.bonusStars.recite) mk("recite", "암송 스타", "암송 성공 횟수 최다", (t) => t.reciteSuccess);
  if (s.settings.bonusStars.talent) mk("talent", "달란트 스타", "달란트 보유 최다", (t) => t.talents);
  if (s.settings.bonusStars.challenge)
    mk("challenge", "도전 스타", "빨간 칸·이벤트 칸 암송 성공 최다", (t) => t.challengeSuccess);
  s.ceremony = { step: 0, refunds, awards };
  s.ctx = freshCtx();
  feed(s, { seq, kind: "info", text: "게임 종료! 시상식을 시작합니다" });
}

export function finalRanking(s: GameState): { id: string; stars: number; talents: number; rank: number }[] {
  const rows = s.teamIds.map((id) => ({
    id,
    stars: s.teams[id].stars + s.teams[id].bonusStars,
    talents: s.teams[id].talents,
    rank: 0,
  }));
  rows.sort((a, b) => b.stars - a.stars || b.talents - a.talents);
  rows.forEach((r, i) => {
    const p = rows[i - 1];
    r.rank = p && p.stars === r.stars && p.talents === r.talents ? p.rank : i + 1;
  });
  return rows;
}

// ---------------------------------------------------------------------------
// 강제 개입
// ---------------------------------------------------------------------------
function applyOverride(
  s: GameState,
  prev: GameState,
  p: Extract<GameEventBody, { type: "override" }>["payload"],
  seq: number,
): GameState {
  const team = "teamId" in p ? s.teams[p.teamId] : undefined;
  if ("teamId" in p && !team) return prev;
  switch (p.action) {
    case "talents":
      credit(s, seq, p.teamId, p.delta, `수동 조정${p.note ? `: ${p.note}` : ""}`, true);
      break;
    case "stars":
      team!.stars = Math.max(0, team!.stars + p.delta);
      feed(s, { seq, teamId: p.teamId, kind: "info", text: `스타 ${p.delta > 0 ? "+" : ""}${p.delta} (수동)` });
      break;
    case "addItem":
      team!.items.push(p.item);
      break;
    case "removeItem":
      removeItem(team!, p.item);
      break;
    case "position":
      team!.pos = p.pos;
      s.moveSeq = seq;
      if (currentTeamId(s) === p.teamId) s.ctx.path = [p.pos];
      break;
    case "starPositions":
      s.stars = [...new Set(p.stars.filter((x) => SPACE_BY_ID[x]))];
      break;
    case "totalTurns":
      if (p.value >= 1) s.settings.totalTurns = p.value;
      break;
    case "boost":
      s.boostOverride = p.on;
      break;
    case "skipTurn":
      if (s.phase === "ended") return prev;
      nextTeam(s, seq);
      break;
    case "setCurrent":
      if (p.teamIndex < 0 || p.teamIndex >= s.teamIds.length || p.turn < 1) return prev;
      s.turn = p.turn;
      s.teamIndex = p.teamIndex;
      s.ceremony = null;
      startTurn(s, seq);
      break;
    case "forceRecite": {
      const tid = currentTeamId(s);
      if (!tid || s.phase === "ended") return prev;
      const pos = s.teams[tid].pos;
      if (pos === T) return prev;
      s.ctx = { ...freshCtx(), startSeq: s.ctx.startSeq, landed: pos, moveItem: s.ctx.moveItem };
      s.phase = "recite";
      break;
    }
    case "endGame":
      if (s.phase === "ended") return prev;
      finishGame(s, seq);
      break;
  }
  return s;
}

// ---------------------------------------------------------------------------
function credit(s: GameState, seq: number, teamId: string, delta: number, reason: string, manual = false) {
  const t = s.teams[teamId];
  t.talents = Math.max(0, t.talents + delta);
  s.ledger.push({ seq, teamId, delta, balance: t.talents, reason, manual });
}

function feed(s: GameState, f: GameState["feed"][number]) {
  s.feed.push(f);
  if (s.feed.length > 60) s.feed.shift();
}

function removeItem(team: TeamState, item: ItemId) {
  const i = team.items.indexOf(item);
  if (i >= 0) team.items.splice(i, 1);
}
