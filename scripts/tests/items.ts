// 아이템: 선택 다이스, 황금 파이프, 2배권, 같은 아이템 하나씩
import assert from "node:assert/strict";
import { applyEvent, replay, usableItems } from "../../src/game/reducer";
import { ITEMS } from "../../src/game/items";
import { DEFAULT_SETTINGS, type GameEvent } from "../../src/game/types";

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
  // 황금 파이프만 빼고 다 가진 상태로 선물 칸(37) 도착(36에서 1칸) → 무조건 황금 파이프
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
