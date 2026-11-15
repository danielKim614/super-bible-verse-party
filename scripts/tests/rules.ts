// 규칙: 스타 칸 도착, 축복, 상점 이동, 예전 게임 환급
import assert from "node:assert/strict";
import { applyEvent, replay } from "../../src/game/reducer";
import { DEFAULT_SETTINGS, type GameEvent } from "../../src/game/types";

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

// 예전(환급 1이 기본이던 때) 시작한 게임은 환급 3으로, v:2로 시작한 게임은 설정값 그대로
{
  const old = replay([{ id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B"], settings: { ...DEFAULT_SETTINGS, itemRefund: 1 }, seed: 1 } }] as GameEvent[]);
  assert.equal(old.settings.itemRefund, 3);
  const v2 = replay([{ id: 1, seq: 1, voided: false, type: "start_game", payload: { teamIds: ["A", "B"], settings: { ...DEFAULT_SETTINGS, itemRefund: 1 }, seed: 1, v: 2 } }] as GameEvent[]);
  assert.equal(v2.settings.itemRefund, 1);
  console.log("✅ old games refund 3");
}
