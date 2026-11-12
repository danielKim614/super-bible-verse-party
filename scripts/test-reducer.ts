// 리듀서 시나리오 테스트: npm run test:reducer
// 보드: 1~2 → 갈림(2) → 3~6 / 7~10 → 11~15 → 갈림(15) → 16~22 / 23~27 → 🏪 → 28~30 → 갈림(30) → 31~34 / 35~38 → 39 → 출발 (출발점은 칸이 아님)
import assert from "node:assert/strict";
import { SPACE_BY_ID, nextSpace } from "../src/game/board";
import { applyEvent, effectiveRedMode, placeStar, finalRanking, initialState, isBoost, replay, usableItems } from "../src/game/reducer";
import { ITEMS } from "../src/game/items";
import { rng } from "../src/game/rng";
import { DEFAULT_SETTINGS, type GameEvent, type GameEventBody, type GameState } from "../src/game/types";

let seq = 0;
const log: GameEvent[] = [];
function ev(s: GameState, body: GameEventBody): GameState {
  seq += 1;
  const e = { ...body, id: seq, seq, voided: false } as GameEvent;
  log.push(e);
  return applyEvent(s, e);
}
const reward = (space: number, s: GameState) => s.settings.rewards[SPACE_BY_ID[space].type] * (isBoost(s) ? 2 : 1);

const teams = ["A", "B", "C", "D", "E", "F"];
let s = initialState();
s = ev(s, { type: "start_game", payload: { teamIds: teams, settings: { ...DEFAULT_SETTINGS, starCount: 2, diceCount: 1 }, seed: 42 } });
assert.equal(s.phase, "pre_roll");
assert.equal(s.stars.length, 2);
for (const t of teams) assert.equal(s.teams[t].talents, 10);

// 스타를 경로 밖에 고정
s = ev(s, { type: "override", payload: { action: "starPositions", stars: [22, 38] } });

// A팀: 출발에서 2칸 → 1, 2절(갈림길 칸에 정확히 도착하면 그냥 암송) → 성공
s = ev(s, { type: "roll", payload: { value: 2 } });
assert.equal(s.teams.A.pos, 2);
assert.equal(s.phase, "recite");
s = ev(s, { type: "recite_result", payload: { success: true, seed: 1 } });
assert.equal(s.teams.A.talents, 10 + s.settings.rewards.blue);
assert.equal(s.teams.A.challengeSuccess, 0);
s = ev(s, { type: "end_turn", payload: {} });

// B팀: 14에서 4칸 → 15(갈림) → 지름길 → 23, 24, 25 도착(아이템 칸) → 실패
s = ev(s, { type: "override", payload: { action: "position", teamId: "B", pos: 14 } });
s = ev(s, { type: "roll", payload: { value: 4 } });
assert.equal(s.phase, "choose_path");
assert.equal(s.teams.B.pos, 15);
s = ev(s, { type: "choose_path", payload: { option: 1 } });
assert.equal(s.teams.B.pos, 25);
assert.equal(s.phase, "recite");
s = ev(s, { type: "recite_result", payload: { success: false, seed: 2 } });
assert.equal(s.teams.B.talents, 10);
assert.equal(s.teams.B.items.length, 0); // 실패 시 아이템 없음
s = ev(s, { type: "end_turn", payload: {} });

// C팀: 스타 지나가기 → 구매(암송 없이 바로) → 상점 통과 → 계속 이동
s = ev(s, { type: "override", payload: { action: "talents", teamId: "C", delta: 20 } });
s = ev(s, { type: "override", payload: { action: "position", teamId: "C", pos: 20 } });
s = ev(s, { type: "roll", payload: { value: 5 } }); // 21, 22(★), 🏪, 28, 29, 30
assert.equal(s.phase, "star_offer");
assert.equal(s.ctx.starAt, 22);
s = ev(s, { type: "star_decision", payload: { buy: true, seed: 3 } });
assert.equal(s.teams.C.stars, 1);
assert.equal(s.teams.C.talents, 10);
assert.ok(!s.stars.includes(22));
assert.equal(s.stars.length, 2);
assert.equal(s.phase, "shop_offer"); // 22 다음 상점
assert.equal(s.teams.C.pos, 22);
s = ev(s, { type: "shop_leave", payload: {} });
assert.equal(s.teams.C.pos, 30); // 28, 29, 30 → 30 도착
assert.equal(s.phase, "recite");
const cBefore = s.teams.C.talents;
s = ev(s, { type: "recite_result", payload: { success: true, seed: 4 } });
assert.equal(s.teams.C.talents, cBefore + reward(30, s));
s = ev(s, { type: "end_turn", payload: {} });

// D팀: 1 → 2(갈림) → 아랫길 → 7절(아이템 칸) 도착 → 아이템 획득
s = ev(s, { type: "override", payload: { action: "position", teamId: "D", pos: 1 } });
s = ev(s, { type: "roll", payload: { value: 2 } }); // 2(갈림), 7
assert.equal(s.phase, "choose_path");
s = ev(s, { type: "choose_path", payload: { option: 1 } });
assert.equal(s.teams.D.pos, 7);
s = ev(s, { type: "recite_result", payload: { success: true, seed: 5 } });
assert.equal(s.teams.D.items.length, 1);
s = ev(s, { type: "end_turn", payload: {} });
s = ev(s, { type: "end_turn", payload: {} }); // resolve가 아니면 무시
assert.equal(s.teamIndex, 4);

// E팀: 상점(27→28 사이) 통과 → 구매 → 돈 부족 무시 → 나가기 → 30 도착
s = ev(s, { type: "override", payload: { action: "position", teamId: "E", pos: 27 } });
s = ev(s, { type: "roll", payload: { value: 3 } });
assert.equal(s.phase, "shop_offer");
assert.equal(s.teams.E.pos, 27);
s = ev(s, { type: "shop_buy", payload: { item: "hint" } });
assert.equal(s.teams.E.items[0], "hint");
assert.equal(s.teams.E.talents, 10 - ITEMS.hint.price);
s = ev(s, { type: "shop_buy", payload: { item: "goldenPipe" } });
assert.equal(s.teams.E.items.length, 1);
s = ev(s, { type: "shop_leave", payload: {} });
assert.equal(s.teams.E.pos, 30);
assert.equal(s.phase, "recite");
s = ev(s, { type: "recite_result", payload: { success: true, seed: 6 } });
s = ev(s, { type: "end_turn", payload: {} });

// F팀: 스킵 → 2턴 A
s = ev(s, { type: "override", payload: { action: "skipTurn" } });
assert.equal(s.turn, 2);
assert.equal(s.teamIndex, 0);

// 축복 칸(14): A가 13에서 1칸 → 꼴찌에게 +5
s = ev(s, { type: "override", payload: { action: "position", teamId: "A", pos: 13 } });
const beforeBless = Object.fromEntries(teams.map((t) => [t, s.teams[t].talents]));
s = ev(s, { type: "roll", payload: { value: 1 } });
assert.equal(s.teams.A.pos, 14);
assert.ok(s.ctx.blessTo && s.ctx.blessTo.length > 0);
for (const id of s.ctx.blessTo!) assert.equal(s.teams[id].talents, beforeBless[id] + 5);
s = ev(s, { type: "recite_result", payload: { success: true, seed: 9 } });
s = ev(s, { type: "end_turn", payload: {} });

// 해프닝 칸(19): B가 18에서 1칸
s = ev(s, { type: "override", payload: { action: "position", teamId: "B", pos: 18 } });
s = ev(s, { type: "roll", payload: { value: 1 } });
assert.equal(s.teams.B.pos, 19);
assert.ok(s.ctx.happening?.text);
console.log("happening:", s.ctx.happening?.text);
s = ev(s, { type: "recite_result", payload: { success: false, seed: 10 } });
s = ev(s, { type: "end_turn", payload: {} });

// 다시 A팀 차례로
s = ev(s, { type: "override", payload: { action: "setCurrent", turn: 2, teamIndex: 0 } });
s = ev(s, { type: "override", payload: { action: "position", teamId: "A", pos: 8 } });

// Undo 재생: 마지막 이벤트(A 위치 변경) 무효화
const before = replay(log);
assert.deepEqual(before.teams, s.teams);
log[log.length - 1].voided = true;
assert.equal(replay(log).teams.A.pos, 14);
log[log.length - 1].voided = false;

// 어려운 칸: A 8에서 1칸 → 9(빨간 칸) 성공 → 빨간 칸 보상, 도전 +1
s = ev(s, { type: "roll", payload: { value: 1 } });
assert.equal(s.teams.A.pos, 9);
assert.ok(effectiveRedMode(s, 9));
const beforeShield = s.teams.A.talents;
const challengeBefore = s.teams.A.challengeSuccess;
const mult = isBoost(s) ? 2 : 1;
s = ev(s, { type: "recite_result", payload: { success: true, seed: 7 } });
assert.equal(s.teams.A.talents, beforeShield + s.settings.rewards.red * mult);
assert.equal(s.teams.A.challengeSuccess, challengeBefore + 1);
s = ev(s, { type: "end_turn", payload: {} });

// 출발점 통과: B 39에서 2칸 → 1, 2 (바퀴 +1, 상점 없음)
s = ev(s, { type: "override", payload: { action: "position", teamId: "B", pos: 39 } });
const lapsBefore = s.teams.B.laps;
s = ev(s, { type: "roll", payload: { value: 2 } });
assert.equal(s.teams.B.pos, 2);
assert.equal(s.phase, "recite");
assert.equal(s.teams.B.laps, lapsBefore + 1);
s = ev(s, { type: "recite_result", payload: { success: true, seed: 11 } });
s = ev(s, { type: "end_turn", payload: {} });

// 종반 2배 & 종료
s = ev(s, { type: "override", payload: { action: "setCurrent", turn: 8, teamIndex: 1 } });
s = ev(s, { type: "override", payload: { action: "boost", on: null } });
s = ev(s, { type: "override", payload: { action: "position", teamId: "B", pos: 0 } });
s = ev(s, { type: "roll", payload: { value: 1 } }); // 1절 파란 → 3×2
s = ev(s, { type: "recite_result", payload: { success: true, seed: 8 } });
assert.equal(s.ctx.payout, 6);
s = ev(s, { type: "override", payload: { action: "endGame" } });
assert.equal(s.phase, "ended");
assert.equal(s.ceremony!.awards.length, 3);
for (let i = 0; i < 4; i++) s = ev(s, { type: "ceremony_next", payload: {} });
const rank = finalRanking(s);
assert.equal(rank.length, 6);
console.log("ranking", rank);
console.log("awards", s.ceremony!.awards.map((a) => [a.title, a.winners]));
console.log("✅ reducer tests passed");

// 스타는 말이 서 있는 칸에 생기지 않는다
{
  const base = replay([{ seq: 1, type: "start_game", payload: { teamIds: teams, settings: { ...DEFAULT_SETTINGS, starCount: 2 }, seed: 1 } } as never]);
  for (let seed = 1; seed <= 300; seed++) {
    const t = structuredClone(base);
    const occupied = [5, 9, 12, 20, 33];
    t.teamIds.forEach((id, i) => (t.teams[id].pos = occupied[i % occupied.length]));
    t.stars = [];
    placeStar(t, rng(seed));
    placeStar(t, rng(seed + 1000));
    for (const st of t.stars) assert.ok(!occupied.includes(st), `seed ${seed}: star on occupied ${st}`);
  }
}
console.log("✅ star placement avoids occupied spaces");

// 왼쪽길(31~34)·안쪽길(35~38)은 39에서 합류, 39 다음은 출발을 지나 1
assert.equal(nextSpace(34), 39);
assert.equal(nextSpace(38), 39);
assert.equal(nextSpace(39), 1);
console.log("✅ 39 merge ok");

// 선택 다이스: 하나는 고른 눈(5)으로 고정, 나머지 하나만 굴림 → 5 + 3 = 8칸
{
  let t = replay([
    { id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B"], settings: { ...DEFAULT_SETTINGS, diceCount: 2 }, seed: 3 } } as GameEvent,
    { id: 2, seq: 2, voided: false, type: "override", payload: { action: "addItem", teamId: "A", item: "selectDice" } } as GameEvent,
    { id: 3, seq: 3, voided: false, type: "use_item", payload: { item: "selectDice", face: 5 } } as GameEvent,
  ]);
  assert.equal(t.ctx.rollMode, "fixed");
  assert.equal(t.ctx.fixedFace, 5);
  t = applyEvent(t, { id: 4, seq: 4, voided: false, type: "roll", payload: { value: 3, faces: [3] } } as GameEvent);
  assert.equal(t.ctx.roll, 8);
  assert.deepEqual(t.ctx.faces, [5, 3]);
  console.log("✅ select dice ok");
}

// 황금 파이프: 들어간 뒤 운영자가 고른 칸(20)으로 나옴
{
  let t = replay([
    { id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B"], settings: { ...DEFAULT_SETTINGS }, seed: 3 } } as GameEvent,
    { id: 2, seq: 2, voided: false, type: "override", payload: { action: "addItem", teamId: "A", item: "goldenPipe" } } as GameEvent,
    { id: 3, seq: 3, voided: false, type: "use_item", payload: { item: "goldenPipe" } } as GameEvent,
  ]);
  assert.equal(t.phase, "pipe_choose");
  assert.equal(t.teams.A.items.length, 0);
  t = applyEvent(t, { id: 4, seq: 4, voided: false, type: "pipe_exit", payload: { to: 20 } } as GameEvent);
  assert.equal(t.teams.A.pos, 20);
  assert.ok(t.phase === "recite" || t.phase === "star_offer");
  console.log("✅ golden pipe ok");
}

// 달란트 2배권: 굴리기 전에 사용 → 도착 칸 보상 2배
{
  let t = replay([
    { id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B"], settings: { ...DEFAULT_SETTINGS, diceCount: 1 }, seed: 3 } } as GameEvent,
    { id: 2, seq: 2, voided: false, type: "override", payload: { action: "addItem", teamId: "A", item: "doubleTalent" } } as GameEvent,
  ]);
  assert.ok(usableItems(t).includes("doubleTalent"));
  t = applyEvent(t, { id: 3, seq: 3, voided: false, type: "use_item", payload: { item: "doubleTalent" } } as GameEvent);
  t = applyEvent(t, { id: 4, seq: 4, voided: false, type: "roll", payload: { value: 1, faces: [1] } } as GameEvent);
  const before = t.teams.A.talents;
  t = applyEvent(t, { id: 5, seq: 5, voided: false, type: "recite_result", payload: { success: true, seed: 1 } } as GameEvent);
  assert.equal(t.teams.A.talents, before + t.settings.rewards.blue * 2);
  console.log("✅ double talent before roll ok");
}

// 스타 칸 도착: 구매 의사부터 묻고(사면 즉시 구매), 그다음 암송은 별개
{
  const base = [
    { id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B"], settings: { ...DEFAULT_SETTINGS, diceCount: 1 }, seed: 3 } },
    { id: 2, seq: 2, voided: false, type: "override", payload: { action: "starPositions", stars: [4, 20] } },
    { id: 3, seq: 3, voided: false, type: "override", payload: { action: "talents", teamId: "A", delta: 20 } },
    { id: 4, seq: 4, voided: false, type: "override", payload: { action: "position", teamId: "A", pos: 3 } },
    { id: 5, seq: 5, voided: false, type: "roll", payload: { value: 1, faces: [1] } },
  ] as GameEvent[];
  let t = replay(base);
  assert.equal(t.teams.A.pos, 4);
  assert.equal(t.phase, "star_offer");
  const before = t.teams.A.talents;
  t = applyEvent(t, { id: 6, seq: 6, voided: false, type: "star_decision", payload: { buy: true, seed: 1 } } as GameEvent);
  assert.equal(t.teams.A.stars, 1);
  assert.equal(t.teams.A.talents, before - t.settings.starPrice);
  assert.equal(t.phase, "recite");
  t = applyEvent(t, { id: 7, seq: 7, voided: false, type: "recite_result", payload: { success: false, seed: 2 } } as GameEvent);
  assert.equal(t.teams.A.stars, 1); // 암송 실패해도 산 스타는 그대로
  let u = replay(base);
  u = applyEvent(u, { id: 6, seq: 6, voided: false, type: "star_decision", payload: { buy: false } } as GameEvent);
  assert.equal(u.phase, "recite");
  u = applyEvent(u, { id: 7, seq: 7, voided: false, type: "recite_result", payload: { success: true, seed: 2 } } as GameEvent);
  assert.equal(u.teams.A.stars, 0);
  assert.equal(u.teams.A.talents, before + u.settings.rewards.blue);
  console.log("✅ star landing: buy first, recite separately ok");
}

// 축복 칸: 공동 꼴찌면 모두 +5
{
  let t = replay([
    { id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B", "C"], settings: { ...DEFAULT_SETTINGS, diceCount: 1 }, seed: 3 } },
    { id: 2, seq: 2, voided: false, type: "override", payload: { action: "talents", teamId: "A", delta: 10 } },
    { id: 3, seq: 3, voided: false, type: "override", payload: { action: "position", teamId: "A", pos: 13 } },
  ] as GameEvent[]);
  t = applyEvent(t, { id: 4, seq: 4, voided: false, type: "roll", payload: { value: 1, faces: [1] } } as GameEvent);
  assert.equal(t.teams.A.pos, 14);
  assert.deepEqual([...t.ctx.blessTo!].sort(), ["B", "C"]);
  assert.equal(t.teams.B.talents, 15);
  assert.equal(t.teams.C.talents, 15);
  assert.equal(t.teams.A.talents, 20);
  console.log("✅ bless ties ok");
}

// 상점: 3팀이 지나가면 다른 칸으로 날아감
{
  const base = [
    { id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B", "C", "D"], settings: { ...DEFAULT_SETTINGS, diceCount: 1 }, seed: 3 } },
  ] as GameEvent[];
  let t = replay(base);
  assert.equal(t.shopAt, 28);
  let seq2 = 2;
  const e = (type: string, payload: object) => (t = applyEvent(t, { id: seq2, seq: seq2++, voided: false, type, payload } as GameEvent));
  for (const id of ["A", "B", "C"]) {
    e("override", { action: "position", teamId: id, pos: 27 });
    e("roll", { value: 1, faces: [1] });
    if (t.phase === "shop_offer") e("shop_leave", {});
    if (t.phase === "star_offer") e("star_decision", { buy: false });
    if (t.phase === "recite") e("recite_result", { success: true, seed: 1 });
    e("end_turn", {});
  }
  assert.notEqual(t.shopAt, 28);
  assert.equal(t.shopVisits, 0);
  console.log("✅ shop moves after 3 visits →", t.shopAt);
}

// 상점은 보드 맨 위쪽 칸(3~5절)으로는 날아가지 않는다
{
  for (let k = 0; k < 40; k++) {
    let t = replay([
      { id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B", "C"], settings: { ...DEFAULT_SETTINGS, diceCount: 1 }, seed: k } },
    ] as GameEvent[]);
    let sq = 2 + k * 3;
    const e = (type: string, payload: object) => (t = applyEvent(t, { id: sq, seq: sq++, voided: false, type, payload } as GameEvent));
    for (const id of ["A", "B", "C"]) {
      e("override", { action: "position", teamId: id, pos: 27 });
      e("roll", { value: 1, faces: [1] });
      if (t.phase === "shop_offer") e("shop_leave", {});
      if (t.phase === "star_offer") e("star_decision", { buy: false });
      if (t.phase === "recite") e("recite_result", { success: true, seed: 1 });
      e("end_turn", {});
    }
    assert.ok(![3, 4, 5].includes(t.shopAt), `shop flew to top row ${t.shopAt}`);
  }
  console.log("✅ shop avoids top row");
}

// 같은 아이템은 하나씩만: 상점·강제 개입은 중복을 거절하고, 선물 칸은 아직 없는 종류만 준다
{
  let t = replay([
    { id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B"], settings: { ...DEFAULT_SETTINGS, diceCount: 1, inventoryLimit: 10 }, seed: 5 } },
  ] as GameEvent[]);
  let sq = 2;
  const e = (type: string, payload: object) => (t = applyEvent(t, { id: sq, seq: sq++, voided: false, type, payload } as GameEvent));
  e("override", { action: "starPositions", stars: [10, 20] });
  e("override", { action: "addItem", teamId: "A", item: "hint" });
  e("override", { action: "addItem", teamId: "A", item: "hint" });
  assert.deepEqual(t.teams.A.items, ["hint"]);
  // 상점에서 이미 가진 아이템은 못 산다
  e("override", { action: "talents", teamId: "A", delta: 50 });
  e("override", { action: "position", teamId: "A", pos: 27 });
  e("roll", { value: 2, faces: [2] });
  assert.equal(t.phase, "shop_offer");
  const before = t.teams.A.talents;
  e("shop_buy", { item: "hint" });
  assert.equal(t.teams.A.talents, before);
  assert.deepEqual(t.teams.A.items, ["hint"]);
  e("shop_buy", { item: "selectDice" });
  assert.deepEqual(t.teams.A.items, ["hint", "selectDice"]);
  e("shop_buy", { item: "selectDice" });
  assert.deepEqual(t.teams.A.items, ["hint", "selectDice"]);
  e("shop_leave", {});
  if ((t.phase as string) === "star_offer") e("star_decision", { buy: false });
  if ((t.phase as string) === "recite") e("recite_result", { success: true, seed: 1 });
  e("end_turn", {});
  // 황금 파이프만 빼고 다 가진 상태로 선물 칸(37) 도착 → 무조건 황금 파이프
  for (const it of Object.keys(ITEMS)) if (it !== "goldenPipe") e("override", { action: "addItem", teamId: "B", item: it });
  assert.equal(new Set(t.teams.B.items).size, t.teams.B.items.length);
  for (let k = 0; k < 5; k++) {
    let u = t;
    let q = sq;
    const f = (type: string, payload: object) => (u = applyEvent(u, { id: q, seq: q++, voided: false, type, payload } as GameEvent));
    f("override", { action: "position", teamId: "B", pos: 36 });
    f("roll", { value: 1, faces: [1] });
    if (u.phase === "star_offer") f("star_decision", { buy: false });
    f("recite_result", { success: true, seed: 100 + k });
    assert.ok(u.teams.B.items.includes("goldenPipe"));
    assert.equal(new Set(u.teams.B.items).size, u.teams.B.items.length);
  }
  // 모든 종류를 다 가졌으면 달란트로 대신 받는다
  e("override", { action: "addItem", teamId: "B", item: "goldenPipe" });
  const tb = t.teams.B.talents;
  e("override", { action: "position", teamId: "B", pos: 36 });
  e("roll", { value: 1, faces: [1] });
  if ((t.phase as string) === "star_offer") e("star_decision", { buy: false });
  e("recite_result", { success: true, seed: 7 });
  assert.equal(t.ctx.gainedItem, "full");
  assert.equal(t.teams.B.talents, tb + t.settings.rewards.item + 3);
  console.log("✅ unique items ok");
}
